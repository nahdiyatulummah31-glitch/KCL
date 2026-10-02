export type UserRole = 'super_admin' | 'finance_manager' | 'cashier_staff' | 'auditor';

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  password?: string;
  email: string;
  role: UserRole;
  avatar?: string;
  lastLogin: string;
  pin?: string;
  isActive: boolean;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  currentBalance: number;
}

export interface ClinicProfile {
  name: string;
  tagline?: string;
  legalEntity: string; // e.g. PT Medika Sehat Sentosa
  licenseNumber: string; // No. Izin Operasional Klinik
  operationalLicense?: string;
  taxNumber: string; // NPWP
  taxId?: string;
  nib: string; // Nomor Induk Berusaha
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  logoUrl?: string;
  // Audit sign-offs
  directorName: string;
  directorTitle: string;
  directorSip?: string;
  financeManagerName: string;
  financeManagerTitle: string;
  headCashierName: string;
  headCashierTitle: string;
  bankAccounts: BankAccount[];
}

export type SimrsDepartment =
  | 'Pendaftaran'
  | 'IGD'
  | 'Farmasi'
  | 'Poli Spesialis'
  | 'Hemodialisa'
  | 'Poli Umum'
  | 'Poli CPMI'
  | 'Poli Vaksin'
  | 'Laboratorium'
  | 'Radiologi'
  | 'Kebersihan'
  | 'Laundry'
  // Backwards compatibility aliases
  | 'Hemodialisa (HD)'
  | 'Instalasi Farmasi'
  | 'Laboratorium Klinik'
  | 'Poli Interna'
  | 'Poli Gizi Klinik';

export const OFFICIAL_CLINIC_UNITS = [
  'Pendaftaran',
  'IGD',
  'Farmasi',
  'Poli Spesialis',
  'Hemodialisa',
  'Poli Umum',
  'Poli CPMI',
  'Poli Vaksin',
  'Laboratorium',
  'Radiologi',
  'Kebersihan',
  'Laundry',
] as const;

export type ClinicUnit = (typeof OFFICIAL_CLINIC_UNITS)[number];

export const CLINIC_UNIT_CONFIG: Record<
  ClinicUnit,
  { label: string; color: string; bgLight: string; textDark: string; border: string; desc: string }
> = {
  'Pendaftaran': {
    label: 'Pendaftaran',
    color: '#0284c7',
    bgLight: 'bg-sky-50',
    textDark: 'text-sky-700',
    border: 'border-sky-200',
    desc: 'Registrasi Pasien, Rekam Medis & Admisi',
  },
  'IGD': {
    label: 'IGD',
    color: '#e11d48',
    bgLight: 'bg-rose-50',
    textDark: 'text-rose-700',
    border: 'border-rose-200',
    desc: 'Instalasi Gawat Darurat & Triase 24 Jam',
  },
  'Farmasi': {
    label: 'Farmasi',
    color: '#059669',
    bgLight: 'bg-emerald-50',
    textDark: 'text-emerald-700',
    border: 'border-emerald-200',
    desc: 'Depo Obat, Resep & Alat Kesehatan',
  },
  'Poli Spesialis': {
    label: 'Poli Spesialis',
    color: '#7c3aed',
    bgLight: 'bg-purple-50',
    textDark: 'text-purple-700',
    border: 'border-purple-200',
    desc: 'Spesialis Penyakit Dalam, Jantung & Gizi',
  },
  'Hemodialisa': {
    label: 'Hemodialisa',
    color: '#2563eb',
    bgLight: 'bg-blue-50',
    textDark: 'text-blue-700',
    border: 'border-blue-200',
    desc: 'Tindakan Dialisis & Perawatan Ginjal',
  },
  'Poli Umum': {
    label: 'Poli Umum',
    color: '#0d9488',
    bgLight: 'bg-teal-50',
    textDark: 'text-teal-700',
    border: 'border-teal-200',
    desc: 'Pemeriksaan Rawat Jalan Dokter Umum',
  },
  'Poli CPMI': {
    label: 'Poli CPMI',
    color: '#0891b2',
    bgLight: 'bg-cyan-50',
    textDark: 'text-cyan-700',
    border: 'border-cyan-200',
    desc: 'Medical Check Up Calon Pekerja Migran',
  },
  'Poli Vaksin': {
    label: 'Poli Vaksin',
    color: '#ea580c',
    bgLight: 'bg-orange-50',
    textDark: 'text-orange-700',
    border: 'border-orange-200',
    desc: 'Vaksinasi Dewasa, Umrah & Booster',
  },
  'Laboratorium': {
    label: 'Laboratorium',
    color: '#d97706',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-700',
    border: 'border-amber-200',
    desc: 'Hematologi, Kimia Darah & Urinalisis',
  },
  'Radiologi': {
    label: 'Radiologi',
    color: '#4f46e5',
    bgLight: 'bg-indigo-50',
    textDark: 'text-indigo-700',
    border: 'border-indigo-200',
    desc: 'Rontgen Thorax, USG & Diagnostik Citra',
  },
  'Kebersihan': {
    label: 'Kebersihan',
    color: '#10b981',
    bgLight: 'bg-green-50',
    textDark: 'text-green-700',
    border: 'border-green-200',
    desc: 'Sanitasi Medis, Desinfeksi & Pengelolaan B3',
  },
  'Laundry': {
    label: 'Laundry',
    color: '#6366f1',
    bgLight: 'bg-violet-50',
    textDark: 'text-violet-700',
    border: 'border-violet-200',
    desc: 'Linen Medis, Sprei Rawat & Sterilisasi Kain',
  },
};

// Helper to normalize any department/unit string to the 12 official units
export const normalizeToOfficialUnit = (rawUnit?: string): ClinicUnit => {
  if (!rawUnit) return 'Poli Umum';
  const u = rawUnit.trim().toLowerCase();
  if (u.includes('hemodialisa') || u.includes('hd')) return 'Hemodialisa';
  if (u.includes('farmasi') || u.includes('obat') || u.includes('apotek')) return 'Farmasi';
  if (u.includes('laboratorium') || u.includes('lab')) return 'Laboratorium';
  if (u.includes('radiologi') || u.includes('rontgen') || u.includes('x-ray') || u.includes('usg')) return 'Radiologi';
  if (u.includes('pendaftaran') || u.includes('admisi') || u.includes('registrasi') || u.includes('loket')) return 'Pendaftaran';
  if (u.includes('igd') || u.includes('darurat') || u.includes('emergency')) return 'IGD';
  if (u.includes('kebersihan') || u.includes('sanitasi') || u.includes('cleaning')) return 'Kebersihan';
  if (u.includes('laundry') || u.includes('linen') || u.includes('cuci')) return 'Laundry';
  if (u.includes('cpmi') || u.includes('tki')) return 'Poli CPMI';
  if (u.includes('vaksin')) return 'Poli Vaksin';
  if (u.includes('spesialis') || u.includes('interna') || u.includes('gizi') || u.includes('sp.pd') || u.includes('sp.gk')) return 'Poli Spesialis';
  if (u.includes('umum')) return 'Poli Umum';

  // Direct match in OFFICIAL_CLINIC_UNITS
  const match = OFFICIAL_CLINIC_UNITS.find(unit => unit.toLowerCase() === u);
  if (match) return match;
  return 'Poli Umum';
};

export type VendorCategory =
  | 'PBF Obat'
  | 'Distributor Alkes'
  | 'Vendor Lab'
  | 'Nutrisi & Gizi Medis'
  | 'Limbah B3'
  | 'Logistik & ATK'
  | 'Teknisi & Maintenance'
  | 'Utilitas & Lainnya';

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory;
  phone: string;
  contactPerson: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  npwp?: string;
  address?: string;
  notes?: string;
}

export type PaymentMethod =
  | 'Tunai'
  | 'QRIS'
  | 'Transfer Bank'
  | 'Debit / EDC'
  | 'Kartu Kredit'
  | 'Asuransi Swasta'
  | 'Klaim BPJS'
  | 'Piutang Rekanan / Pasien';

export interface TransactionChangeLog {
  id: string;
  editedAt: string;
  editedBy: string; // Nama kasir / staf pemohon
  authorizedBy: string; // Nama atasan (Super Admin / Manajer Keuangan)
  reason: string; // Alasan koreksi
  details?: string;
  oldSnapshot?: {
    totalAmount: number;
    cashierReceived: number;
    paymentMethod: PaymentMethod;
    department: SimrsDepartment;
    patientName: string;
    patientRm: string;
    shift: string;
    notes?: string;
  };
  newSnapshot?: {
    totalAmount: number;
    cashierReceived: number;
    paymentMethod: PaymentMethod;
    department: SimrsDepartment;
    patientName: string;
    patientRm: string;
    shift: string;
    notes?: string;
  };
}

export interface SimrsTransaction {
  id: string;
  invoiceNo: string;
  billingTime: string; // ISO date string
  invoiceDate?: string; // Tanggal Invoice (e.g. 2026-09-28)
  paidDate?: string; // Tanggal Dibayar (e.g. 2026-09-28)
  category?: string; // Kategori layanan (e.g. Apotek rawat jalan, Poli Umum)
  patientRm: string; // No. Rekam Medis
  patientName: string;
  department: SimrsDepartment;
  doctorName?: string;
  paymentMethod: PaymentMethod;
  totalAmount: number; // Tarif / Total Tagihan / Nominal
  discount?: number; // Diskon / Potongan Pasien
  cashierReceived: number; // Kasir Diterima / Net
  cashierName: string;
  shift: 'Pagi' | 'Siang' | 'Malam';
  notes?: string; // Deskripsi tindakan / layanan
  isSyncedToCashflow: boolean;
  // Otorisasi & Riwayat Koreksi Transaksi Kasir
  isLocked?: boolean; // Default true: level kasir tidak bisa langsung edit
  correctionStatus?: 'none' | 'requested' | 'approved';
  correctionRequestNote?: string;
  correctionRequestedBy?: string;
  correctionRequestedAt?: string;
  changeHistory?: TransactionChangeLog[];
}

export type CashFlowType = 'in' | 'out';

export interface CashFlowEntry {
  id: string;
  date: string;
  type: CashFlowType;
  category: string;
  description: string;
  amount: number;
  account: string;
  source: 'simrs' | 'manual_expense' | 'debt_payment' | 'receivable_collection' | 'manual_income';
  refNumber?: string;
  createdBy: string;
  status: 'confirmed' | 'pending';
}

export type ExpenseCategory =
  | 'Pembelian Obat & Alkes'
  | 'Jasa Medis & Honor Dokter'
  | 'Gaji & Tunjangan Staf'
  | 'Listrik, Air & Internet'
  | 'Pemeliharaan Alat Medis & Sarana'
  | 'Pengelolaan Limbah Medis B3'
  | 'Logistik & ATK Klinik'
  | 'Pajak, Izin & Legalitas'
  | 'Snack DPJP (Dokter Penanggung Jawab)'
  | 'Snack DPJP'
  | 'Air HD (Water Treatment RO Hemodialisa)'
  | 'Oksigen Medis (Tabung O2)'
  | 'Air Galon Minum Klinik'
  | 'Alat & Bahan Kebersihan'
  | 'Dana & Bahan Kebersihan (Mingguan)'
  | 'Makan & Nutrisi Pasien HD'
  | 'Lain-lain'
  | 'Beban Rutin Lain-lain'
  | 'Beban Lain-lain';

export interface ExpenseEntry {
  id: string;
  date: string;
  category: ExpenseCategory;
  title: string;
  description: string;
  amount: number;
  payFromAccount: string;
  vendorId?: string;
  vendorName?: string;
  invoiceNumber?: string;
  receiptUrl?: string; // base64 or mock image
  receiptFileName?: string;
  status: 'approved' | 'pending' | 'rejected';
  approvedBy?: string;
  createdBy: string;
  createdAt: string;
}

export interface DebtEntry {
  id: string;
  vendorId?: string;
  creditorName: string; // e.g. PT Enseval Putera Megatrading / Kimia Farma
  creditorType: 'PBF Obat' | 'Distributor Alkes' | 'Vendor Lab' | 'Jasa Medis' | 'Lainnya';
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  notes?: string;
  paymentProofUrl?: string;
  lastPaymentDate?: string;
}

export type InkasoStatus =
  | 'belum_ditagih'
  | 'proses_penagihan'
  | 'verifikasi_berkas'
  | 'cair_sebagian'
  | 'cair_lunas';

export interface ReceivableEntry {
  id: string;
  debtorName: string; // e.g. BPJS Kesehatan, Asuransi Sinarmas, MCU Korporat, Pasien
  debtorType: 'BPJS Kesehatan' | 'Asuransi Swasta' | 'Perusahaan Rekanan' | 'Instansi / BUMN' | 'Pasien Umum';
  claimBatchNumber: string;
  claimDate: string;
  expectedDueDate: string;
  claimAmount: number;
  receivedAmount: number;
  status: 'submitted' | 'verified' | 'paid' | 'disputed';
  inkasoStatus?: InkasoStatus;
  inkasoCollector?: string; // Petugas penagih / staf keuangan
  inkasoSubmissionDate?: string;
  inkasoNotes?: string;
  notes?: string;
  lastReceivedDate?: string;
}

export type AssetCategory =
  | 'Alat Medis Hemodialisa'
  | 'Alat Medis Poli / Lab'
  | 'Instalasi & Sarana (RO/Genset)'
  | 'Tabung Gas Medis (O2)'
  | 'Elektronik & Komputer Kasir'
  | 'Mebel & Fasilitas Pasien';

export type AssetCondition = 'Baik' | 'Perlu Servis' | 'Rusak';

export interface ClinicAsset {
  id: string;
  assetCode: string;
  name: string;
  category: AssetCategory;
  unit?: string; // Unit monitoring: 'Unit Hemodialisa (HD)', 'Unit Laboratorium', 'Unit Instalasi Farmasi', 'Unit Poli Umum & Interna', 'Unit Kasir & Manajemen', 'Unit Sarpras & RO/Genset'
  quantity?: number; // Jumlah unit
  unitPrice?: number; // Harga satuan (Rp)
  serialNumber?: string;
  purchaseDate: string;
  purchasePrice: number;
  vendorName?: string;
  location: string;
  condition: AssetCondition;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  personInCharge: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface EmployeeSalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  department: string;
  month: string; // Format YYYY-MM e.g. '2026-09'
  basicSalary: number; // Gaji Pokok (Rp)
  allowances: number; // Tunjangan Jabatan & Medis (Rp)
  shiftBonus: number; // Insentif Shift & Visit Pasien (Rp)
  overtime: number; // Uang Lembur (Rp)
  deductions: number; // Potongan BPJS & PPh21 (Rp)
  netSalary: number; // Take Home Pay (Rp)
  paymentStatus: 'paid' | 'pending';
  paymentDate?: string;
  paymentMethod: string;
  accountNumber?: string;
  notes?: string;
}

// Access control helper: Pimpinan / Direktur & Manajer Keuangan can see detailed salary per employee; others see total aggregate only
export const canViewSalaryDetails = (user?: UserAccount | null): boolean => {
  return isOwnerOrManager(user);
};

// Check if user is Owner / Direktur or Manajer Keuangan (Full access to all clinic data, historical records, expenses, debts, reports, settings)
export const isOwnerOrManager = (user?: UserAccount | null): boolean => {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'finance_manager') return true;
  const username = (user.username || '').toLowerCase();
  const name = (user.name || '').toLowerCase();
  return (
    username === 'owner' ||
    username === 'direktur' ||
    username === 'manajer' ||
    username === 'keuangan' ||
    username === 'nadia' ||
    name.includes('direktur') ||
    name.includes('owner') ||
    name.includes('manajer') ||
    name.includes('keuangan') ||
    name.includes('hendra') ||
    name.includes('nadia')
  );
};

// Check if user is regular employee
export const isRegularStaff = (user?: UserAccount | null): boolean => {
  return !isOwnerOrManager(user);
};

// Helper: dynamic clinic accounts options from profile
export const getClinicAccountOptions = (
  profile?: ClinicProfile
): { id: string; label: string; value: string; isBank: boolean }[] => {
  const options = [
    { id: 'cash', label: 'Kas Kasir (Tunai)', value: 'Kas Kasir (Tunai)', isBank: false },
    { id: 'qris', label: 'Dompet Digital QRIS', value: 'Dompet Digital QRIS', isBank: false },
  ];
  if (profile?.bankAccounts && profile.bankAccounts.length > 0) {
    profile.bankAccounts.forEach((b) => {
      options.push({
        id: b.id,
        label: `${b.bankName} - ${b.accountNumber} (${b.accountHolder || 'Klinik'})`,
        value: `${b.bankName} - ${b.accountNumber}`,
        isBank: true,
      });
    });
  } else {
    options.push({
      id: 'default-bank',
      label: 'Rekening Bank Klinik',
      value: 'Rekening Bank Klinik',
      isBank: true,
    });
  }
  return options;
};

// Per User Request: Karyawan biasa memiliki semua akses kecuali menu Pengaturan Klinik & Gaji Karyawan.
// All historical and current dates are accessible so no transactions or summary boxes are hidden.
export const isDateAllowedForStaff = (
  dateStr: string | undefined,
  user?: UserAccount | null,
  referenceDate?: string
): boolean => {
  return true;
};

// Get the 3-day allowed dates window labels for staff
export const getStaffAllowedDateWindow = (referenceDate?: string) => {
  const ref = referenceDate || '2026-09-16';
  const [refY, refM, refD] = ref.split('-').map(Number);
  const d0 = new Date(refY, refM - 1, refD);
  const d1 = new Date(d0.getTime() - 1 * 24 * 60 * 60 * 1000);
  const d2 = new Date(d0.getTime() - 2 * 24 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    today: fmt(d0),
    yesterday: fmt(d1),
    twoDaysAgo: fmt(d2),
    minDate: fmt(d2),
    maxDate: fmt(d0),
  };
};

export interface DenominationBreakdown {
  c100k: number; // lembar Rp 100.000
  c50k: number;  // lembar Rp 50.000
  c20k: number;  // lembar Rp 20.000
  c10k: number;  // lembar Rp 10.000
  c5k: number;   // lembar Rp 5.000
  c2k: number;   // lembar Rp 2.000
  c1k: number;   // lembar Rp 1.000
  coins: number; // koin
}

export interface DailyCashReconciliation {
  id: string;
  date: string;
  shift?: 'Pagi' | 'Siang' | 'Malam' | 'Harian Penuh';
  startingCashBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  systemCashBalance: number; // saldo buku kasir
  physicalCashBalance: number; // hitungan fisik nyata di laci
  difference: number; // physical - system (0 = match, >0 = lebih, <0 = selisih kurang)
  status: 'balanced' | 'surplus' | 'shortage';
  notes?: string;
  cashierName: string;
  verifiedBy?: string;
  verifiedAt?: string;
  denominations?: DenominationBreakdown;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  category: 'SIMRS' | 'CashFlow' | 'Expense' | 'Debt' | 'Receivable' | 'Settings' | 'Auth';
  details: string;
}

export interface DueNotification {
  id: string;
  type: 'debt' | 'receivable';
  itemId: string;
  title: string;
  counterparty: string;
  amount: number;
  dueDate: string;
  daysRemaining: number;
  urgency: 'overdue' | 'critical' | 'warning' | 'info'; // critical <= 3 days, warning <= 7 days
}

export interface GoogleDriveFile {
  fileId: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  size?: number;
  uploadedAt: string;
}

export interface GoogleDatabaseStatus {
  isConnected: boolean;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveUploadsFolderId?: string;
  volumeNumber: number;
  totalCellsUsed: number;
  maxCellsCapacity: number; // 10_000_000
  autoRolloverThreshold: number; // 9_000_000
  lastSyncedAt?: string;
  lastSyncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}

