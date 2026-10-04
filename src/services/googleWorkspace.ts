/**
 * Google Workspace Service
 * 
 * Architecture:
 * Vercel / Client -> Google Identity Services (GIS OAuth 2.0) -> Google Sheets API & Drive API -> Google Spreadsheet
 * 
 * Database:
 * Primary Database: Google Spreadsheet (Active: KLINIK FINANCE DB 001, KLINIK FINANCE DB 002, etc.)
 * Primary Data Tab: APP_DATA (Column A = DATASET, Column B = RECORD_ID, Column C = JSON_DATA, Column D = UPDATED_AT)
 * Auto Rotation Limit: 9,500,000 cells (archives old DB, auto-creates next volume)
 * All devices (HP, Laptop, PC, Vercel) automatically discover and use the same active database.
 * No Google Apps Script. No Firebase database.
 */

import {
  ClinicProfile,
  UserAccount,
  SimrsTransaction,
  ExpenseEntry,
  DebtEntry,
  ReceivableEntry,
  ClinicAsset,
  CashFlowEntry,
  Vendor,
  DailyCashReconciliation,
  EmployeeSalaryRecord,
  AuditLog,
  GoogleDatabaseStatus,
  GoogleDriveFile,
} from '../types';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App for Workspace OAuth Authentication
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);

const firebaseGoogleProvider = new GoogleAuthProvider();
firebaseGoogleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
firebaseGoogleProvider.addScope('https://www.googleapis.com/auth/drive');

// ==========================================
// CONFIGURATION & LIMITS
// ==========================================

export const MAX_CELLS_CAPACITY = 10_000_000;
export const AUTO_ROLLOVER_THRESHOLD = 9_500_000; // 9.5M safe cell threshold

// Google Client ID
const DEFAULT_CLIENT_ID = '254409170668-a2d0kjd0822b3ffm1n9dr88jnoklo2m6.apps.googleusercontent.com';
export const CUSTOM_CLIENT_ID_KEY = 'klinik_custom_google_client_id_v3';

export function getEffectiveGoogleClientId(): string {
  try {
    const custom = localStorage.getItem(CUSTOM_CLIENT_ID_KEY);
    if (custom && custom.trim().length > 10) return custom.trim();
  } catch {}
  return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
}

export function setCustomGoogleClientId(clientId: string): void {
  try {
    if (clientId && clientId.trim()) {
      localStorage.setItem(CUSTOM_CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(CUSTOM_CLIENT_ID_KEY);
    }
    tokenClientInstance = null;
  } catch {}
}

export function setManualGoogleAccessToken(token: string, expiresInMs: number = 3600000): void {
  cachedAccessToken = token;
  try {
    localStorage.setItem(GOOGLE_TOKEN_KEY, token);
    localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, (Date.now() + expiresInMs).toString());
  } catch {}
}

export function setCustomSpreadsheetId(sheetId: string): void {
  try {
    if (sheetId && sheetId.trim()) {
      localStorage.setItem(ACTIVE_DB_SPREADSHEET_ID_KEY, sheetId.trim());
    } else {
      localStorage.removeItem(ACTIVE_DB_SPREADSHEET_ID_KEY);
    }
  } catch {}
}

export const GOOGLE_CLIENT_ID = getEffectiveGoogleClientId();

// Scopes required for Google Sheets Database and Google Drive Receipts
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Token Storage Keys
export const GOOGLE_TOKEN_KEY = 'klinik_google_access_token_v3';
export const GOOGLE_TOKEN_EXPIRY_KEY = 'klinik_google_token_expiry_v3';
export const GOOGLE_USER_INFO_KEY = 'klinik_google_user_info_v3';
export const ACTIVE_DB_SPREADSHEET_ID_KEY = 'klinik_active_db_spreadsheet_id_v3';

// In-Memory Token Cache
let cachedAccessToken: string | null = null;
let cachedUserInfo: { email?: string; name?: string; picture?: string } | null = null;
let tokenClientInstance: any = null;

// ==========================================
// GOOGLE IDENTITY SERVICES (GIS) AUTHENTICATION
// ==========================================

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Check synchronously if a valid unexpired access token exists
 */
export const hasSavedGoogleToken = (): boolean => {
  if (cachedAccessToken) return true;
  try {
    const savedToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
    const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
    if (savedToken && expiry && Date.now() < parseInt(expiry, 10)) {
      cachedAccessToken = savedToken;
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

/**
 * Retrieve current valid access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    try {
      const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
      if (!expiry || Date.now() < parseInt(expiry, 10)) {
        return cachedAccessToken;
      }
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

/**
 * Fetch Google User Profile (name, email, picture) using access token
 */
export async function fetchGoogleUserProfile(token: string): Promise<{
  email: string;
  name: string;
  picture?: string;
}> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const info = await res.json();
      const profile = {
        email: info.email || '',
        name: info.name || info.email || 'Pengguna Google',
        picture: info.picture || '',
      };
      cachedUserInfo = profile;
      try {
        localStorage.setItem(GOOGLE_USER_INFO_KEY, JSON.stringify(profile));
      } catch {
        // ignore
      }
      return profile;
    }
  } catch (err) {
    console.warn('Could not fetch Google user info:', err);
  }

  return { email: '', name: 'Pengguna Google' };
}

/**
 * Get cached user info if available
 */
export function getSavedGoogleUserInfo(): { email?: string; name?: string; picture?: string } | null {
  if (cachedUserInfo) return cachedUserInfo;
  try {
    const str = localStorage.getItem(GOOGLE_USER_INFO_KEY);
    if (str) {
      cachedUserInfo = JSON.parse(str);
      return cachedUserInfo;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Initialize Google Identity Services OAuth 2.0 Token Client
 */
export function initGoogleTokenClient(): Promise<any> {
  return new Promise((resolve, reject) => {
    const effectiveClientId = getEffectiveGoogleClientId();
    if (tokenClientInstance && (tokenClientInstance as any)._clientId === effectiveClientId) {
      resolve(tokenClientInstance);
      return;
    }

    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    const checkGsi = () => {
      if (window.google?.accounts?.oauth2) {
        try {
          const clientId = getEffectiveGoogleClientId();
          tokenClientInstance = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: WORKSPACE_SCOPES.join(' '),
            callback: () => {}, // overridden per request
          });
          (tokenClientInstance as any)._clientId = clientId;
          resolve(tokenClientInstance);
        } catch (e: any) {
          reject(new Error(`Gagal inisialisasi Google Auth Client: ${e?.message || e}`));
        }
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          reject(
            new Error(
              'Google Identity Services (GSI) belum termuat. Periksa koneksi internet Anda atau pastikan script Google tidak diblokir.'
            )
          );
        } else {
          setTimeout(checkGsi, 100);
        }
      }
    };

    checkGsi();
  });
}

/**
 * Authenticate with Google using Google Identity Services (GIS)
 */
export const googleSignInGIS = async (): Promise<{
  user: { email: string; displayName: string; photoURL?: string };
  accessToken: string;
}> => {
  const client = await initGoogleTokenClient();

  return new Promise((resolve, reject) => {
    let resolved = false;

    client.callback = async (response: any) => {
      resolved = true;
      if (response.error) {
        console.error('GIS Error:', response);
        const errDesc = response.error_description || response.error;
        const err: any = new Error(errDesc);
        if (response.error === 'access_denied') {
          err.friendlyMessage = 'Izin akses Google ditolak oleh pengguna.';
        } else if (response.error === 'popup_closed_by_user') {
          err.friendlyMessage = 'Jendela login Google ditutup sebelum selesai.';
        } else if (response.error === 'origin_mismatch' || String(errDesc).includes('origin')) {
          err.friendlyMessage =
            'Domain aplikasi belum terdaftar di Authorized JavaScript Origins pada Google Cloud Console. Masukkan Google Client ID Anda sendiri di pengaturan.';
        }
        reject(err);
        return;
      }

      const token = response.access_token;
      if (!token) {
        reject(new Error('Gagal mendapatkan token akses dari Google.'));
        return;
      }

      cachedAccessToken = token;
      const expiresInSec = response.expires_in ? parseInt(response.expires_in, 10) : 3500;
      const expiryTimestamp = Date.now() + expiresInSec * 1000;

      try {
        localStorage.setItem(GOOGLE_TOKEN_KEY, token);
        localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTimestamp.toString());
      } catch (e) {
        console.warn('Could not cache token to localStorage:', e);
      }

      const userInfo = await fetchGoogleUserProfile(token);

      resolve({
        user: {
          email: userInfo.email,
          displayName: userInfo.name,
          photoURL: userInfo.picture,
        },
        accessToken: token,
      });
    };

    try {
      client.requestAccessToken({ prompt: '' });
    } catch (e) {
      if (!resolved) reject(e);
    }
  });
};

export const isExternalOrVercel = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('.vercel.app') || (host !== 'localhost' && host !== '127.0.0.1' && !host.includes('run.app'));
};

/**
 * Connect directly using a Google OAuth Access Token
 * Useful for Vercel deployments and instant device pairing
 */
export async function connectWithAccessToken(token: string): Promise<{
  user: { email: string; displayName: string; photoURL?: string };
  accessToken: string;
}> {
  if (!token || !token.trim()) {
    throw new Error('Access Token Google tidak boleh kosong.');
  }
  const cleanToken = token.trim();
  const userInfo = await fetchGoogleUserProfile(cleanToken);
  if (!userInfo.email) {
    throw new Error('Access Token tidak valid atau sudah kadaluarsa. Pastikan token memiliki scope spreadsheets & drive.');
  }

  cachedAccessToken = cleanToken;
  const expiryTimestamp = Date.now() + 3600 * 1000;
  try {
    localStorage.setItem(GOOGLE_TOKEN_KEY, cleanToken);
    localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTimestamp.toString());
  } catch {}

  return {
    user: {
      email: userInfo.email,
      displayName: userInfo.name,
      photoURL: userInfo.picture,
    },
    accessToken: cleanToken,
  };
}

/**
 * Main Google Sign-In:
 * On AI Studio preview: Uses Firebase Auth popup (provisioned with Google Workspace scopes).
 * On Vercel / custom domains: Uses Google Identity Services (GIS) directly to prevent auth/unauthorized-domain errors.
 */
export const googleSignIn = async (): Promise<{
  user: { email: string; displayName: string; photoURL?: string };
  accessToken: string;
}> => {
  // If running on Vercel or custom domain, do NOT call Firebase Auth (prevents auth/unauthorized-domain)
  if (!isExternalOrVercel()) {
    try {
      const result = await signInWithPopup(firebaseAuth, firebaseGoogleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const token = credential.accessToken;
        cachedAccessToken = token;
        const expiryTimestamp = Date.now() + 3500 * 1000;
        try {
          localStorage.setItem(GOOGLE_TOKEN_KEY, token);
          localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTimestamp.toString());
        } catch {}

        const userObj = {
          email: result.user.email || '',
          displayName: result.user.displayName || result.user.email || 'Pengguna Google',
          photoURL: result.user.photoURL || undefined,
        };
        cachedUserInfo = { email: userObj.email, name: userObj.displayName, picture: userObj.photoURL };
        try {
          localStorage.setItem(GOOGLE_USER_INFO_KEY, JSON.stringify(cachedUserInfo));
        } catch {}

        return {
          user: userObj,
          accessToken: token,
        };
      }
    } catch (firebaseErr: any) {
      console.warn('Firebase Auth popup notice, falling back to GIS:', firebaseErr);
      if (
        firebaseErr?.code === 'auth/popup-closed-by-user' ||
        firebaseErr?.code === 'auth/cancelled-popup-request'
      ) {
        const err: any = new Error('Jendela login Google ditutup sebelum selesai.');
        err.friendlyMessage = 'Jendela login Google ditutup sebelum selesai.';
        throw err;
      }
    }
  }

  // 2. Google Identity Services (GIS)
  return await googleSignInGIS();
};

/**
 * Initialize workspace auth listener / restore saved session
 */
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: { email?: string; displayName?: string; photoURL?: string }) => void,
  onAuthFailure?: () => void
) => {
  if (hasSavedGoogleToken()) {
    const savedUser = getSavedGoogleUserInfo();
    if (onAuthSuccess) {
      onAuthSuccess({
        email: savedUser?.email,
        displayName: savedUser?.name,
        photoURL: savedUser?.picture,
      });
    }
  }

  const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
    if (user && hasSavedGoogleToken()) {
      onAuthSuccess?.({
        email: user.email || undefined,
        displayName: user.displayName || undefined,
        photoURL: user.photoURL || undefined,
      });
    } else if (!hasSavedGoogleToken()) {
      onAuthFailure?.();
    }
  });

  return unsubscribe;
};

export const initAuth = initWorkspaceAuth;

/**
 * Logout Google and clear stored session
 */
export const logoutGoogle = async () => {
  try {
    await signOut(firebaseAuth);
  } catch {}

  const token = cachedAccessToken;
  if (token && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch {
      // ignore
    }
  }

  cachedAccessToken = null;
  cachedUserInfo = null;
  try {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(GOOGLE_USER_INFO_KEY);
    localStorage.removeItem(ACTIVE_DB_SPREADSHEET_ID_KEY);
  } catch {
    // ignore
  }
};

// ==========================================
// GOOGLE DRIVE API UTILITIES & FOLDER CREATION
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
// ACTIVE DATABASE DISCOVERY & AUTO ROTATION
// ==========================================

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

/**
 * Format spreadsheet name by volume number:
 * 1 -> KLINIK FINANCE DB 001
 * 2 -> KLINIK FINANCE DB 002
 */
export function formatDatabaseName(volume: number): string {
  return `KLINIK FINANCE DB ${String(volume).padStart(3, '0')}`;
}

/**
 * Parse volume number from spreadsheet name:
 * 'KLINIK FINANCE DB 001' -> 1
 * 'KLINIK FINANCE DB 002' -> 2
 */
export function parseVolumeNumber(name: string): number {
  const match = name.match(/KLINIK\s+FINANCE\s+DB\s+(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 1;
}

/**
 * Create a new database spreadsheet with APP_DATA tab and human-readable tabs
 */
export async function createDatabaseSpreadsheet(
  volumeNumber: number,
  folderId?: string
): Promise<{ id: string; url: string; name: string; totalCells: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Akses Google belum terhubung.');

  const title = formatDatabaseName(volumeNumber);

  const createBody = {
    properties: {
      title,
      timeZone: 'Asia/Jakarta',
    },
    sheets: [
      {
        // TAB UTAMA APLIKASI: APP_DATA (Column A = DATASET, B = RECORD_ID, C = JSON_DATA, D = UPDATED_AT)
        properties: {
          title: 'APP_DATA',
          gridProperties: { rowCount: 1500, columnCount: 5, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'SIMRS_Transactions',
          gridProperties: { rowCount: 1000, columnCount: 15, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Beban_Operasional',
          gridProperties: { rowCount: 500, columnCount: 12, frozenRowCount: 1 },
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
          gridProperties: { rowCount: 500, columnCount: 12, frozenRowCount: 1 },
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
    let errMsg = await res.text();
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed.error?.message) {
        errMsg = parsed.error.message;
      }
    } catch {
      // keep
    }
    throw new Error(`Gagal membuat database Google Spreadsheet: ${errMsg}`);
  }

  const sheetData = await res.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl =
    sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Move into target Google Drive folder if provided
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

  // Set Header for APP_DATA tab immediately
  const initHeaderData = [
    {
      range: 'APP_DATA!A1:D1',
      values: [['DATASET', 'RECORD_ID', 'JSON_DATA', 'UPDATED_AT']],
    },
    {
      range: 'System_Metadata!A1:B4',
      values: [
        ['Parameter Sistem', 'Nilai Konfigurasi'],
        ['Database Title', title],
        ['Volume Database', `Vol ${volumeNumber}`],
        ['Dibuat Pada', new Date().toISOString()],
      ],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: initHeaderData,
    }),
  });

  // Calculate total initial cells
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

/**
 * Find the Active Database Spreadsheet from Google Drive.
 * 
 * All devices (HP, Laptop, PC, Vercel) search Google Drive for "KLINIK FINANCE DB" spreadsheets.
 * The file with the highest volume number (e.g. KLINIK FINANCE DB 001, KLINIK FINANCE DB 002)
 * is automatically identified as the ACTIVE DATABASE.
 * 
 * If none exists, it automatically creates "KLINIK FINANCE DB 001".
 */
export async function findOrCreateActiveDatabase(
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<{
  id: string;
  url: string;
  name: string;
  volumeNumber: number;
  totalCells: number;
  folderId: string;
  folderUrl?: string;
  uploadsFolderId: string;
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('Akses Google belum terhubung. Silakan login Google.');

  onProgress?.({ message: 'Memeriksa folder Google Drive...', percent: 15 });

  // 1. Ensure Root Folder exists (resilient fallback to root if folder creation is restricted)
  let mainFolder: { id: string; webViewLink?: string } = { id: '', webViewLink: '' };
  let uploadsFolder: { id: string } = { id: '' };
  try {
    mainFolder = await ensureDriveFolder('[Klinik Finance] Database & Arsip Medis');
    uploadsFolder = await ensureDriveFolder('Bukti_Nota_Kwitansi_PDF', mainFolder.id);
  } catch (driveErr) {
    console.warn('Drive folder notice (proceeding with root Google Drive):', driveErr);
  }

  onProgress?.({ message: 'Mencari database aktif di Google Drive...', percent: 30 });

  // 2. Query Google Drive for all spreadsheets containing 'KLINIK FINANCE DB'
  const q = `name contains 'KLINIK FINANCE DB' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`;
  let existingDatabases: Array<{ id: string; name: string; webViewLink?: string; volume: number }> = [];

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&orderBy=name desc,modifiedTime desc&fields=files(id,name,webViewLink,createdTime,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingDatabases = searchData.files
          .filter((f: any) => /KLINIK\s+FINANCE\s+DB/i.test(f.name))
          .map((f: any) => ({
            id: f.id,
            name: f.name,
            webViewLink: f.webViewLink,
            volume: parseVolumeNumber(f.name),
          }))
          .sort((a: any, b: any) => b.volume - a.volume); // Highest volume number first
      }
    }
  } catch (searchErr) {
    console.warn('Could not query Google Drive for DB files:', searchErr);
  }

  // 3. If database exists, verify its capacity and rotation limit (9,500,000 cells)
  if (existingDatabases.length > 0) {
    const latestDb = existingDatabases[0];
    const totalCells = await getSpreadsheetTotalCells(latestDb.id);

    // If approaching 9.5M cells, auto-rotate to next volume!
    if (totalCells >= AUTO_ROLLOVER_THRESHOLD) {
      const nextVolume = latestDb.volume + 1;
      onProgress?.({
        message: `Database Vol ${latestDb.volume} hampir penuh (${totalCells.toLocaleString()} sel). Otomatis membuat ${formatDatabaseName(nextVolume)}...`,
        percent: 50,
      });

      const newDb = await createDatabaseSpreadsheet(nextVolume, mainFolder.id || undefined);
      localStorage.setItem(ACTIVE_DB_SPREADSHEET_ID_KEY, newDb.id);

      return {
        id: newDb.id,
        url: newDb.url,
        name: newDb.name,
        volumeNumber: nextVolume,
        totalCells: newDb.totalCells,
        folderId: mainFolder.id,
        folderUrl: mainFolder.webViewLink,
        uploadsFolderId: uploadsFolder.id,
      };
    }

    // Active Database is valid and within safe limit
    localStorage.setItem(ACTIVE_DB_SPREADSHEET_ID_KEY, latestDb.id);
    return {
      id: latestDb.id,
      url: latestDb.webViewLink || `https://docs.google.com/spreadsheets/d/${latestDb.id}/edit`,
      name: latestDb.name,
      volumeNumber: latestDb.volume,
      totalCells,
      folderId: mainFolder.id,
      folderUrl: mainFolder.webViewLink,
      uploadsFolderId: uploadsFolder.id,
    };
  }

  // Check if we already have a cached active spreadsheet ID before creating new
  const cachedSheetId = localStorage.getItem(ACTIVE_DB_SPREADSHEET_ID_KEY);
  if (cachedSheetId) {
    const totalCells = await getSpreadsheetTotalCells(cachedSheetId);
    if (totalCells > 0) {
      return {
        id: cachedSheetId,
        url: `https://docs.google.com/spreadsheets/d/${cachedSheetId}/edit`,
        name: 'KLINIK FINANCE DB 001',
        volumeNumber: 1,
        totalCells,
        folderId: mainFolder.id,
        folderUrl: mainFolder.webViewLink,
        uploadsFolderId: uploadsFolder.id,
      };
    }
  }

  // 4. No existing database found -> Auto-create "KLINIK FINANCE DB 001"
  onProgress?.({ message: 'Membuat database utama: KLINIK FINANCE DB 001...', percent: 50 });
  const created = await createDatabaseSpreadsheet(1, mainFolder.id || undefined);
  localStorage.setItem(ACTIVE_DB_SPREADSHEET_ID_KEY, created.id);

  return {
    id: created.id,
    url: created.url,
    name: created.name,
    volumeNumber: 1,
    totalCells: created.totalCells,
    folderId: mainFolder.id,
    folderUrl: mainFolder.webViewLink,
    uploadsFolderId: uploadsFolder.id,
  };
}

// ==========================================
// AUTO LOAD & SYNC IMPLEMENTATION (APP_DATA TAB)
// ==========================================

export interface SyncPayload {
  transactions: SimrsTransaction[];
  expenses: ExpenseEntry[];
  debts: DebtEntry[];
  receivables: ReceivableEntry[];
  inventory: ClinicAsset[];
  cashFlow: CashFlowEntry[];
  vendors: Vendor[];
  salaries: EmployeeSalaryRecord[];
  reconciliations: DailyCashReconciliation[];
  profile: ClinicProfile;
  users: UserAccount[];
  logs?: AuditLog[];
  currentStatus: GoogleDatabaseStatus;
}

export interface PulledDatabaseData {
  transactions: SimrsTransaction[];
  expenses: ExpenseEntry[];
  debts: DebtEntry[];
  receivables: ReceivableEntry[];
  inventory: ClinicAsset[];
  cashFlow: CashFlowEntry[];
  vendors: Vendor[];
  salaries: EmployeeSalaryRecord[];
  reconciliations: DailyCashReconciliation[];
  profile?: ClinicProfile;
  users?: UserAccount[];
  logs?: AuditLog[];
  status: GoogleDatabaseStatus;
}

/**
 * AUTO LOAD:
 * Load all clinic data from the Google Spreadsheet active database (APP_DATA tab).
 */
export async function loadAllFromGoogleDatabase(
  spreadsheetIdOverride?: string,
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<PulledDatabaseData | null> {
  const token = await getAccessToken();
  if (!token) return null;

  onProgress?.({ message: 'Mencari database aktif di Google Drive...', percent: 20 });

  let activeDb: {
    id: string;
    url: string;
    name: string;
    volumeNumber: number;
    totalCells: number;
    folderId: string;
    folderUrl?: string;
    uploadsFolderId: string;
  };

  if (spreadsheetIdOverride) {
    const totalCells = await getSpreadsheetTotalCells(spreadsheetIdOverride);
    activeDb = {
      id: spreadsheetIdOverride,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetIdOverride}/edit`,
      name: 'KLINIK FINANCE DB',
      volumeNumber: 1,
      totalCells,
      folderId: '',
      uploadsFolderId: '',
    };
  } else {
    activeDb = await findOrCreateActiveDatabase(onProgress);
  }

  onProgress?.({ message: 'Mengambil data dari Google Spreadsheet...', percent: 50 });

  // Read APP_DATA tab: Range A2:D (DATASET, RECORD_ID, JSON_DATA, UPDATED_AT)
  const appDataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${activeDb.id}/values/APP_DATA!A2:D`;
  const res = await fetch(appDataUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn('Could not read APP_DATA tab, might be newly created');
    return null;
  }

  const dataJson = await res.json();
  const rows: any[][] = dataJson.values || [];

  if (rows.length === 0) {
    // Database is empty (new spreadsheet)
    return null;
  }

  // Parse datasets from APP_DATA
  const transactions: SimrsTransaction[] = [];
  const expenses: ExpenseEntry[] = [];
  const debts: DebtEntry[] = [];
  const receivables: ReceivableEntry[] = [];
  const inventory: ClinicAsset[] = [];
  const cashFlow: CashFlowEntry[] = [];
  const vendors: Vendor[] = [];
  const salaries: EmployeeSalaryRecord[] = [];
  const reconciliations: DailyCashReconciliation[] = [];
  const logs: AuditLog[] = [];
  let profile: ClinicProfile | undefined = undefined;
  const users: UserAccount[] = [];

  for (const row of rows) {
    if (!row || row.length < 3) continue;
    const dataset = String(row[0] || '').trim().toLowerCase();
    const jsonStr = row[2];

    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed) continue;

      switch (dataset) {
        case 'simrs':
          transactions.push(parsed);
          break;
        case 'expenses':
          expenses.push(parsed);
          break;
        case 'debts':
          debts.push(parsed);
          break;
        case 'receivables':
          receivables.push(parsed);
          break;
        case 'inventory':
        case 'assets':
          inventory.push(parsed);
          break;
        case 'cashflow':
          cashFlow.push(parsed);
          break;
        case 'vendors':
          vendors.push(parsed);
          break;
        case 'salaries':
          salaries.push(parsed);
          break;
        case 'reconciliations':
          reconciliations.push(parsed);
          break;
        case 'profile':
          profile = parsed;
          break;
        case 'users':
          users.push(parsed);
          break;
        case 'logs':
          logs.push(parsed);
          break;
        default:
          break;
      }
    } catch {
      // ignore invalid json line
    }
  }

  onProgress?.({ message: 'Data Google Spreadsheet berhasil dimuat!', percent: 100 });

  const userInfo = getSavedGoogleUserInfo();

  return {
    transactions,
    expenses,
    debts,
    receivables,
    inventory,
    cashFlow,
    vendors,
    salaries,
    reconciliations,
    profile,
    users: users.length > 0 ? users : undefined,
    logs,
    status: {
      isConnected: true,
      userEmail: userInfo?.email,
      userName: userInfo?.name,
      userAvatar: userInfo?.picture,
      spreadsheetId: activeDb.id,
      spreadsheetUrl: activeDb.url,
      spreadsheetName: activeDb.name,
      driveFolderId: activeDb.folderId,
      driveFolderUrl: activeDb.folderUrl,
      driveUploadsFolderId: activeDb.uploadsFolderId,
      volumeNumber: activeDb.volumeNumber,
      totalCellsUsed: activeDb.totalCells,
      maxCellsCapacity: MAX_CELLS_CAPACITY,
      autoRolloverThreshold: AUTO_ROLLOVER_THRESHOLD,
      lastSyncedAt: new Date().toLocaleString('id-ID'),
      lastSyncStatus: 'success',
    },
  };
}

/**
 * AUTO SYNC:
 * Synchronize all React State changes directly into Google Spreadsheet APP_DATA tab
 * and human-readable reporting tabs.
 */
export async function syncAllToGoogleDatabase(
  payload: SyncPayload,
  onProgress?: (progress: { message: string; percent: number }) => void
): Promise<GoogleDatabaseStatus> {
  const token = await getAccessToken();
  if (!token) throw new Error('Akses Google belum terhubung. Silakan login Google.');

  onProgress?.({ message: 'Memeriksa database aktif di Google Drive...', percent: 15 });

  // 1. Discover or create active database (auto-rotation aware)
  const activeDb = await findOrCreateActiveDatabase(onProgress);

  onProgress?.({ message: 'Menyiapkan baris dataset APP_DATA...', percent: 40 });

  const nowIso = new Date().toISOString();

  // 2. Prepare APP_DATA Rows (Format: DATASET | RECORD_ID | JSON_DATA | UPDATED_AT)
  const appDataRows: string[][] = [];

  // Profile
  if (payload.profile) {
    appDataRows.push(['profile', 'clinic_profile_master', JSON.stringify(payload.profile), nowIso]);
  }

  // Users
  if (payload.users && payload.users.length > 0) {
    payload.users.forEach((u) => {
      appDataRows.push(['users', u.id, JSON.stringify(u), nowIso]);
    });
  }

  // SIMRS Transactions
  payload.transactions.forEach((t) => {
    appDataRows.push(['simrs', t.id || t.invoiceNo, JSON.stringify(t), nowIso]);
  });

  // Expenses
  payload.expenses.forEach((e) => {
    appDataRows.push(['expenses', e.id, JSON.stringify(e), nowIso]);
  });

  // Debts
  payload.debts.forEach((d) => {
    appDataRows.push(['debts', d.id, JSON.stringify(d), nowIso]);
  });

  // Receivables
  payload.receivables.forEach((r) => {
    appDataRows.push(['receivables', r.id, JSON.stringify(r), nowIso]);
  });

  // Inventory / Assets
  payload.inventory.forEach((a) => {
    appDataRows.push(['inventory', a.id, JSON.stringify(a), nowIso]);
  });

  // Cashflow Entries
  payload.cashFlow.forEach((c) => {
    appDataRows.push(['cashflow', c.id, JSON.stringify(c), nowIso]);
  });

  // Vendors
  if (payload.vendors) {
    payload.vendors.forEach((v) => {
      appDataRows.push(['vendors', v.id, JSON.stringify(v), nowIso]);
    });
  }

  // Salaries
  if (payload.salaries) {
    payload.salaries.forEach((s) => {
      appDataRows.push(['salaries', s.id, JSON.stringify(s), nowIso]);
    });
  }

  // Reconciliations
  if (payload.reconciliations) {
    payload.reconciliations.forEach((rec) => {
      appDataRows.push(['reconciliations', rec.id, JSON.stringify(rec), nowIso]);
    });
  }

  // Logs
  if (payload.logs) {
    payload.logs.forEach((l) => {
      appDataRows.push(['logs', l.id, JSON.stringify(l), nowIso]);
    });
  }

  // 3. Human-Readable Rows for Inspection
  const simrsHeader = [
    'No Invoice',
    'Waktu Billing',
    'No RM',
    'Nama Pasien',
    'Poliklinik',
    'Dokter',
    'Metode Bayar',
    'Total Tagihan (Rp)',
    'Kasir Terima (Rp)',
    'Kembalian (Rp)',
    'Shift',
    'Kasir',
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

  const expenseHeader = [
    'ID Pengeluaran',
    'No Bukti',
    'Tanggal',
    'Kategori',
    'Keperluan',
    'Jumlah (Rp)',
    'Sumber Dana',
    'Dicatat Oleh',
    'Vendor',
    'Nota',
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
    e.receiptUrl || '-',
  ]);

  const debtHeader = [
    'ID Faktur',
    'Vendor',
    'No Faktur',
    'Total (Rp)',
    'Bayar (Rp)',
    'Sisa (Rp)',
    'Jatuh Tempo',
    'Status',
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
    d.notes || '-',
  ]);

  const recHeader = [
    'ID Klaim',
    'No Batch / SEP',
    'Debitur / BPJS',
    'Tgl Klaim',
    'Jumlah Klaim (Rp)',
    'Cair (Rp)',
    'Sisa (Rp)',
    'Status',
    'Estimasi Tempo',
    'Keterangan',
  ];
  const recRows = payload.receivables.map((r) => [
    r.id,
    r.claimBatchNumber,
    r.debtorName,
    r.claimDate,
    r.claimAmount,
    r.receivedAmount,
    Math.max(0, r.claimAmount - r.receivedAmount),
    r.status,
    r.expectedDueDate,
    r.notes || '-',
  ]);

  const invHeader = [
    'Kode Aset',
    'Nama Barang / Alkes',
    'Kategori',
    'Ruangan',
    'Kondisi',
    'Harga (Rp)',
    'Tgl Beli',
    'PJ',
  ];
  const invRows = payload.inventory.map((i) => [
    i.assetCode,
    i.name,
    i.category,
    i.location,
    i.condition,
    i.purchasePrice,
    i.purchaseDate,
    i.personInCharge,
  ]);

  const cashHeader = [
    'ID Mutasi',
    'Tanggal',
    'Jenis',
    'Akun Bank',
    'Kategori',
    'Keterangan',
    'Nominal (Rp)',
    'Pencatat',
  ];
  const cashRows = payload.cashFlow.map((c) => [
    c.id,
    c.date,
    c.type === 'in' ? 'Masuk (+)' : 'Keluar (-)',
    c.account,
    c.category,
    c.description,
    c.amount,
    c.createdBy,
  ]);

  const nowStr = new Date().toLocaleString('id-ID');
  const metadataRows = [
    ['Parameter Sistem', 'Nilai Konfigurasi'],
    ['Database Title', activeDb.name],
    ['Volume Database', `Vol ${activeDb.volumeNumber}`],
    ['Kapasitas Batas Rotasi', `${AUTO_ROLLOVER_THRESHOLD.toLocaleString()} Sel (Aman)`],
    ['Kapasitas Maksimal', `${MAX_CELLS_CAPACITY.toLocaleString()} Sel`],
    ['Total Sel Digunakan', `${activeDb.totalCells.toLocaleString()} Sel`],
    ['Total Baris Record APP_DATA', appDataRows.length.toString()],
    ['Total Transaksi SIMRS', payload.transactions.length.toString()],
    ['Total Beban Pengeluaran', payload.expenses.length.toString()],
    ['Waktu Sinkronisasi Terakhir', nowStr],
    ['ID Folder Google Drive Utama', activeDb.folderId],
    ['Status Database', 'ONLINE (ACTIVE)'],
  ];

  // Deduplicate appDataRows by RECORD_ID per dataset (A=DATASET, B=RECORD_ID, C=JSON_DATA)
  const recordMap = new Map<string, string[]>();
  for (const row of appDataRows) {
    const key = `${row[0]}::${row[1]}`;
    recordMap.set(key, row);
  }
  const uniqueAppDataRows = Array.from(recordMap.values());

  onProgress?.({ message: 'Mengirim data ke Google Spreadsheet...', percent: 75 });

  // 4. Ensure all sheets exist before writing batch update
  const requiredSheetTitles = [
    'APP_DATA',
    'SIMRS_Transactions',
    'Beban_Operasional',
    'Hutang_Vendor',
    'Piutang_Klaim_BPJS',
    'Inventory_Obat_Alkes',
    'Cash_Ledger_Mutasi',
    'System_Metadata',
  ];

  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${activeDb.id}?fields=sheets(properties(title))`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      const existingSheetTitles = new Set(
        metaData.sheets?.map((s: any) => s.properties?.title) || []
      );
      const missingTitles = requiredSheetTitles.filter((t) => !existingSheetTitles.has(t));
      if (missingTitles.length > 0) {
        const addRequests = missingTitles.map((title) => ({
          addSheet: { properties: { title } },
        }));
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${activeDb.id}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: addRequests }),
        });
      }
    }
  } catch (sheetCheckErr) {
    console.warn('Could not verify/create missing sheet tabs:', sheetCheckErr);
  }

  // Clear APP_DATA range to prevent orphaned records on deletes
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${activeDb.id}/values/APP_DATA!A2:D:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (clearErr) {
    console.warn('Could not clear APP_DATA range before write:', clearErr);
  }

  const updateBatch = [
    {
      range: 'APP_DATA!A1',
      values: [['DATASET', 'RECORD_ID', 'JSON_DATA', 'UPDATED_AT'], ...uniqueAppDataRows],
    },
    { range: 'SIMRS_Transactions!A1', values: [simrsHeader, ...simrsRows] },
    { range: 'Beban_Operasional!A1', values: [expenseHeader, ...expenseRows] },
    { range: 'Hutang_Vendor!A1', values: [debtHeader, ...debtRows] },
    { range: 'Piutang_Klaim_BPJS!A1', values: [recHeader, ...recRows] },
    { range: 'Inventory_Obat_Alkes!A1', values: [invHeader, ...invRows] },
    { range: 'Cash_Ledger_Mutasi!A1', values: [cashHeader, ...cashRows] },
    { range: 'System_Metadata!A1', values: metadataRows },
  ];

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${activeDb.id}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updateBatch,
      }),
    }
  );

  if (!batchRes.ok) {
    const errText = await batchRes.text();
    throw new Error(`Gagal menulis data ke Google Spreadsheet: ${errText}`);
  }

  // 5. Recalculate total cells used
  const updatedCells = await getSpreadsheetTotalCells(activeDb.id);

  onProgress?.({ message: 'Tersimpan otomatis di Google Spreadsheet!', percent: 100 });

  const userInfo = getSavedGoogleUserInfo();

  return {
    isConnected: true,
    userEmail: userInfo?.email || payload.currentStatus.userEmail,
    userName: userInfo?.name || payload.currentStatus.userName,
    userAvatar: userInfo?.picture || payload.currentStatus.userAvatar,
    spreadsheetId: activeDb.id,
    spreadsheetUrl: activeDb.url,
    spreadsheetName: activeDb.name,
    driveFolderId: activeDb.folderId,
    driveFolderUrl: activeDb.folderUrl,
    driveUploadsFolderId: activeDb.uploadsFolderId,
    volumeNumber: activeDb.volumeNumber,
    totalCellsUsed: updatedCells || activeDb.totalCells,
    maxCellsCapacity: MAX_CELLS_CAPACITY,
    autoRolloverThreshold: AUTO_ROLLOVER_THRESHOLD,
    lastSyncedAt: nowStr,
    lastSyncStatus: 'success',
  };
}
