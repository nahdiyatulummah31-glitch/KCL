import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  SimrsTransaction,
  ExpenseEntry,
  DebtEntry,
  ReceivableEntry,
  ClinicAsset,
  CashFlowEntry,
  GoogleDatabaseStatus,
  GoogleDriveFile,
} from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with Workspace Scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

// In-Memory & Storage Token Cache
export const GOOGLE_TOKEN_KEY = 'klinik_google_access_token_v3';
export const GOOGLE_TOKEN_EXPIRY_KEY = 'klinik_google_token_expiry_v3';

let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Check synchronously if a valid unexpired token exists in memory or localStorage
export const hasSavedGoogleToken = (): boolean => {
  if (cachedAccessToken) return true;
  try {
    const savedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
    const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
    if (savedToken && expiry && Date.now() < parseInt(expiry, 10)) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

// Max Cell Limits as specified by user
export const MAX_CELLS_CAPACITY = 10_000_000;
export const AUTO_ROLLOVER_THRESHOLD = 9_000_000;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = await getAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        localStorage.removeItem(GOOGLE_TOKEN_KEY);
        localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
      } catch {
        // ignore
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const initWorkspaceAuth = initAuth;

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token otentikasi Google Workspace.');
    }
    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem(GOOGLE_TOKEN_KEY, cachedAccessToken);
      // Valid for ~1 hour (3500 seconds)
      localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, (Date.now() + 3500 * 1000).toString());
    } catch (e) {
      console.warn('Could not store Google OAuth token:', e);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
      console.warn('Sign-in error:', err);
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    try {
      const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
      if (!expiry || Date.now() < parseInt(expiry, 10)) {
        return cachedAccessToken;
      }
      // Token is expired
      cachedAccessToken = null;
    } catch {
      return cachedAccessToken;
    }
  }

  try {
    const savedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
    const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
    if (savedToken && expiry && Date.now() < parseInt(expiry, 10)) {
      cachedAccessToken = savedToken;
      return cachedAccessToken;
    }
  } catch (e) {
    console.warn('Could not read access token from storage:', e);
  }
  return null;
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Error during Google sign-out:', e);
  }
  cachedAccessToken = null;
  try {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
  } catch {
    // ignore
  }
};

// ==========================================
// GOOGLE DRIVE API UTILITIES
// ==========================================

export async function ensureDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<{ id: string; webViewLink?: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Akses Google belum terhubung. Silakan login Google.');

  // Search if folder exists
  let q = `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  }

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return { id: data.files[0].id, webViewLink: data.files[0].webViewLink };
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Gagal membuat folder Google Drive: ${err}`);
  }

  const created = await createRes.json();
  return { id: created.id, webViewLink: created.webViewLink };
}

export async function uploadFileToDrive(
  fileOrBlob: File | Blob,
  fileName: string,
  mimeType: string,
  parentFolderId?: string
): Promise<GoogleDriveFile> {
  const token = await getAccessToken();
  if (!token) throw new Error('Akses Google belum terhubung. Silakan login Google.');

  const metadata = {
    name: fileName,
    mimeType: mimeType || 'application/octet-stream',
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = new FileReader();
  const fileDataPromise = new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(fileOrBlob);
  });

  const fileData = await fileDataPromise;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}\r\n`;
  const fileHeaderPart = `${delimiter}Content-Type: ${metadata.mimeType}\r\n\r\n`;

  const metaBlob = new Blob([metadataPart]);
  const headerBlob = new Blob([fileHeaderPart]);
  const closeBlob = new Blob([closeDelimiter]);

  const multipartBlob = new Blob([metaBlob, headerBlob, fileData, closeBlob], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: multipartBlob,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Gagal upload file ke Google Drive: ${err}`);
  }

  const result = await uploadRes.json();
  return {
    fileId: result.id,
    name: result.name || fileName,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    webContentLink: result.webContentLink,
    size: result.size ? Number(result.size) : undefined,
    uploadedAt: new Date().toISOString(),
  };
}

// ==========================================
// GOOGLE SHEETS DATABASE API & 10M CELL ROLLOVER
// ==========================================

export async function createDatabaseSpreadsheet(
  volumeNumber: number,
  folderId?: string
): Promise<{ id: string; url: string; name: string; totalCells: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Akses Google belum terhubung.');

  const title = `Klinik_Finance_DB_Vol${volumeNumber}`;

  const createBody = {
    properties: {
      title,
      locale: 'id_ID',
      timeZone: 'Asia/Jakarta',
    },
    sheets: [
      {
        properties: {
          title: 'SIMRS_Transactions',
          gridProperties: { rowCount: 1000, columnCount: 15, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Beban_Operasional',
          gridProperties: { rowCount: 500, columnCount: 11, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Hutang_Vendor',
          gridProperties: { rowCount: 500, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Piutang_Klaim_BPJS',
          gridProperties: { rowCount: 500, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Inventory_Obat_Alkes',
          gridProperties: { rowCount: 500, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Cash_Ledger_Mutasi',
          gridProperties: { rowCount: 1000, columnCount: 8, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'System_Metadata',
          gridProperties: { rowCount: 50, columnCount: 5, frozenRowCount: 1 },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gagal membuat spreadsheet Google Sheets: ${err}`);
  }

  const sheetData = await res.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl =
    sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Move spreadsheet into target Drive folder
  if (folderId) {
    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${folderId}&fields=id,parents`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (moveErr) {
      console.warn('Could not move sheet to folder:', moveErr);
    }
  }

  // Calculate initial cells
  let initialCells = 0;
  sheetData.sheets?.forEach((s: any) => {
    const rows = s.properties?.gridProperties?.rowCount || 0;
    const cols = s.properties?.gridProperties?.columnCount || 0;
    initialCells += rows * cols;
  });

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    name: title,
    totalCells: initialCells,
  };
}

export async function getSpreadsheetTotalCells(spreadsheetId: string): Promise<number> {
  const token = await getAccessToken();
  if (!token) return 0;

  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(gridProperties(rowCount,columnCount)))`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) return 0;
    const data = await res.json();

    let total = 0;
    data.sheets?.forEach((s: any) => {
      const rows = s.properties?.gridProperties?.rowCount || 0;
      const cols = s.properties?.gridProperties?.columnCount || 0;
      total += rows * cols;
    });
    return total;
  } catch {
    return 0;
  }
}

export interface SyncPayload {
  transactions: SimrsTransaction[];
  expenses: ExpenseEntry[];
  debts: DebtEntry[];
  receivables: ReceivableEntry[];
  inventory: ClinicAsset[];
  cashFlow: CashFlowEntry[];
  currentStatus: GoogleDatabaseStatus;
}

export async function syncAllToGoogleDatabase(
  payload: SyncPayload,
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<GoogleDatabaseStatus> {
  const token = await getAccessToken();
  if (!token) throw new Error('Google belum terhubung. Silakan login akun Google Anda.');

  onProgress?.({ message: 'Memeriksa folder Google Drive...', percent: 10 });

  // 1. Ensure Root Folder
  const mainFolder = await ensureDriveFolder('[Klinik Finance] Database & Arsip Medis');
  const uploadsFolder = await ensureDriveFolder('Bukti_Nota_Kwitansi_PDF', mainFolder.id);

  onProgress?.({ message: 'Memeriksa spreadsheet database aktif...', percent: 25 });

  let currentVolume = payload.currentStatus.volumeNumber || 1;
  let activeSpreadsheetId = payload.currentStatus.spreadsheetId;
  let activeSpreadsheetUrl = payload.currentStatus.spreadsheetUrl;
  let activeSpreadsheetName = payload.currentStatus.spreadsheetName;

  // Check if spreadsheet exists
  if (!activeSpreadsheetId) {
    onProgress?.({ message: `Membuat Google Spreadsheet Database Vol ${currentVolume}...`, percent: 35 });
    const newSheet = await createDatabaseSpreadsheet(currentVolume, mainFolder.id);
    activeSpreadsheetId = newSheet.id;
    activeSpreadsheetUrl = newSheet.url;
    activeSpreadsheetName = newSheet.name;
  }

  // Check capacity & 9,000,000 cell auto-rollover rule
  onProgress?.({ message: 'Memeriksa kuota sel spreadsheet (Batas 10 Juta Sel)...', percent: 45 });
  let totalCells = await getSpreadsheetTotalCells(activeSpreadsheetId);

  // If cell count exceeds 9,000,000, auto-generate next volume
  if (totalCells >= AUTO_ROLLOVER_THRESHOLD) {
    currentVolume += 1;
    onProgress?.({
      message: `Volume ${currentVolume - 1} hampir penuh (${totalCells.toLocaleString()} sel). Otomatis generate Vol ${currentVolume}...`,
      percent: 50,
    });
    const nextSheet = await createDatabaseSpreadsheet(currentVolume, mainFolder.id);
    activeSpreadsheetId = nextSheet.id;
    activeSpreadsheetUrl = nextSheet.url;
    activeSpreadsheetName = nextSheet.name;
    totalCells = nextSheet.totalCells;
  }

  onProgress?.({ message: 'Menyiapkan format data tabel & baris...', percent: 60 });

  // Prepare Rows for SIMRS_Transactions
  const simrsHeader = [
    'No Invoice / Billing',
    'Waktu Billing',
    'No Rekam Medis',
    'Nama Pasien',
    'Poliklinik / Layanan',
    'Dokter',
    'Metode Pembayaran',
    'Total Tagihan (Rp)',
    'Kasir Terima (Rp)',
    'Kembalian (Rp)',
    'Shift',
    'Kasir Bertugas',
    'Catatan',
  ];
  const simrsRows = payload.transactions.map((t) => [
    t.invoiceNo,
    t.billingTime,
    t.patientRm,
    t.patientName,
    t.department,
    t.doctorName,
    t.paymentMethod,
    t.totalAmount,
    t.cashierReceived,
    Math.max(0, t.cashierReceived - t.totalAmount),
    t.shift,
    t.cashierName,
    t.notes || '-',
  ]);

  // Prepare Rows for Beban_Operasional
  const expenseHeader = [
    'ID Pengeluaran',
    'No Bukti / Kwitansi',
    'Tanggal',
    'Kategori Beban',
    'Deskripsi / Keperluan',
    'Jumlah (Rp)',
    'Sumber Dana Akun',
    'Dicatat Oleh',
    'Nama Vendor',
    'Status Nota',
    'Link Bukti Google Drive',
  ];
  const expenseRows = payload.expenses.map((e) => [
    e.id,
    e.invoiceNumber || '-',
    e.date,
    e.category,
    e.title ? `${e.title} - ${e.description}` : e.description,
    e.amount,
    e.payFromAccount,
    e.createdBy,
    e.vendorName || '-',
    e.receiptUrl ? 'Ada Nota' : 'Tanpa Nota',
    e.receiptUrl || '-',
  ]);

  // Prepare Rows for Hutang_Vendor
  const debtHeader = [
    'ID Hutang',
    'Vendor / PBF',
    'No Faktur',
    'Total Hutang (Rp)',
    'Sudah Bayar (Rp)',
    'Sisa Hutang (Rp)',
    'Jatuh Tempo',
    'Status',
    'Tanggal Bayar Terakhir',
    'Catatan',
  ];
  const debtRows = payload.debts.map((d) => [
    d.id,
    d.creditorName,
    d.invoiceNumber,
    d.totalAmount,
    d.paidAmount,
    Math.max(0, d.totalAmount - d.paidAmount),
    d.dueDate,
    d.status,
    d.lastPaymentDate || '-',
    d.notes || '-',
  ]);

  // Prepare Rows for Piutang_Klaim_BPJS
  const receivableHeader = [
    'ID Piutang / Klaim',
    'No Batch Klaim / SEP',
    'Debitur / Penjamin',
    'Tanggal Klaim',
    'Jumlah Klaim (Rp)',
    'Diterima / Cair (Rp)',
    'Sisa Belum Cair (Rp)',
    'Status Klaim',
    'Perkiraan Jatuh Tempo',
    'Status Inkaso',
    'Kolektor Inkaso',
    'Keterangan',
  ];
  const receivableRows = payload.receivables.map((r) => [
    r.id,
    r.claimBatchNumber,
    r.debtorName,
    r.claimDate,
    r.claimAmount,
    r.receivedAmount,
    Math.max(0, r.claimAmount - r.receivedAmount),
    r.status,
    r.expectedDueDate,
    r.inkasoStatus || 'belum_ditagih',
    r.inkasoCollector || '-',
    r.notes || '-',
  ]);

  // Prepare Rows for Inventory_Obat_Alkes
  const inventoryHeader = [
    'Kode Aset / Inventaris',
    'Nama Barang / Alat Medis',
    'Kategori',
    'Lokasi Ruangan',
    'Kondisi',
    'Harga Perolehan (Rp)',
    'Tanggal Beli',
    'Vendor',
    'Penanggung Jawab',
  ];
  const inventoryRows = payload.inventory.map((i) => [
    i.assetCode,
    i.name,
    i.category,
    i.location,
    i.condition,
    i.purchasePrice,
    i.purchaseDate,
    i.vendorName || '-',
    i.personInCharge,
  ]);

  // Prepare Rows for Cash_Ledger_Mutasi
  const cashHeader = [
    'ID Mutasi',
    'Tanggal',
    'Jenis Aliran',
    'Akun / Bank',
    'Kategori',
    'Keterangan',
    'Nominal (Rp)',
    'Pencatat',
  ];
  const cashRows = payload.cashFlow.map((c) => [
    c.id,
    c.date,
    c.type === 'in' ? 'Uang Masuk (+)' : 'Uang Keluar (-)',
    c.account,
    c.category,
    c.description,
    c.amount,
    c.createdBy,
  ]);

  // System Metadata
  const nowStr = new Date().toLocaleString('id-ID');
  const metadataRows = [
    ['Parameter Sistem', 'Nilai Konfigurasi'],
    ['Database Title', activeSpreadsheetName || 'Klinik_Finance_DB_Vol1'],
    ['Volume Database', `Vol ${currentVolume}`],
    ['Kapasitas Maksimal Google Sheets', `${MAX_CELLS_CAPACITY.toLocaleString()} Sel`],
    ['Batas Auto-Generate Volume Baru', `${AUTO_ROLLOVER_THRESHOLD.toLocaleString()} Sel`],
    ['Total Sel Digunakan Saat Ini', `${totalCells.toLocaleString()} Sel`],
    ['Persentase Kapasitas Digunakan', `${((totalCells / MAX_CELLS_CAPACITY) * 100).toFixed(2)}%`],
    ['Total Transaksi SIMRS', payload.transactions.length.toString()],
    ['Total Nota Pengeluaran', payload.expenses.length.toString()],
    ['Total Faktur Hutang', payload.debts.length.toString()],
    ['Total Klaim BPJS / Piutang', payload.receivables.length.toString()],
    ['Total Aset / Inventaris', payload.inventory.length.toString()],
    ['Waktu Sinkronisasi Terakhir', nowStr],
    ['ID Folder Google Drive Utama', mainFolder.id],
    ['ID Folder Bukti Nota Drive', uploadsFolder.id],
  ];

  onProgress?.({ message: 'Mengunggah seluruh data ke Google Sheets...', percent: 80 });

  // Batch update all sheets
  const updateData = [
    { range: 'SIMRS_Transactions!A1', values: [simrsHeader, ...simrsRows] },
    { range: 'Beban_Operasional!A1', values: [expenseHeader, ...expenseRows] },
    { range: 'Hutang_Vendor!A1', values: [debtHeader, ...debtRows] },
    { range: 'Piutang_Klaim_BPJS!A1', values: [receivableHeader, ...receivableRows] },
    { range: 'Inventory_Obat_Alkes!A1', values: [inventoryHeader, ...inventoryRows] },
    { range: 'Cash_Ledger_Mutasi!A1', values: [cashHeader, ...cashRows] },
    { range: 'System_Metadata!A1', values: metadataRows },
  ];

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${activeSpreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updateData,
      }),
    }
  );

  if (!batchRes.ok) {
    const err = await batchRes.text();
    throw new Error(`Gagal menulis data ke Google Sheets: ${err}`);
  }

  // Recalculate cell capacity
  const updatedTotalCells = await getSpreadsheetTotalCells(activeSpreadsheetId);

  onProgress?.({ message: 'Sinkronisasi database Google Sheets & Drive selesai!', percent: 100 });

  return {
    isConnected: true,
    userEmail: payload.currentStatus.userEmail,
    userName: payload.currentStatus.userName,
    userAvatar: payload.currentStatus.userAvatar,
    spreadsheetId: activeSpreadsheetId,
    spreadsheetUrl: activeSpreadsheetUrl,
    spreadsheetName: activeSpreadsheetName,
    driveFolderId: mainFolder.id,
    driveFolderUrl: mainFolder.webViewLink,
    driveUploadsFolderId: uploadsFolder.id,
    volumeNumber: currentVolume,
    totalCellsUsed: updatedTotalCells || totalCells,
    maxCellsCapacity: MAX_CELLS_CAPACITY,
    autoRolloverThreshold: AUTO_ROLLOVER_THRESHOLD,
    lastSyncedAt: nowStr,
    lastSyncStatus: 'success',
  };
}
