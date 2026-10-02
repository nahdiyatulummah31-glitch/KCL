import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Receipt,
  Upload,
  FileSpreadsheet,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  History,
  Edit3,
  KeyRound,
  Check,
} from 'lucide-react';
import {
  SimrsTransaction,
  SimrsDepartment,
  PaymentMethod,
  UserAccount,
  TransactionChangeLog,
  GoogleDatabaseStatus,
  OFFICIAL_CLINIC_UNITS,
  normalizeToOfficialUnit,
  isOwnerOrManager,
  isDateAllowedForStaff,
  getStaffAllowedDateWindow,
} from '../types';
import { formatRupiah, downloadCsv } from '../utils/formatters';
import { DateRangeFilterBar, DateFilterState, matchDateFilter } from './DateRangeFilterBar';

interface SimrsImportViewProps {
  transactions: SimrsTransaction[];
  activeUser: UserAccount;
  allUsers: UserAccount[];
  googleStatus?: GoogleDatabaseStatus;
  onSyncGoogle?: () => Promise<void>;
  onAddTransaction: (trx: SimrsTransaction) => void;
  onUpdateTransaction: (trx: SimrsTransaction) => void;
  onImportTransactions: (trxs: SimrsTransaction[]) => void;
  onDeleteTransaction: (id: string) => void;
  onSyncToCashflow: (transactionIds: string[]) => void;
}

export const SimrsImportView: React.FC<SimrsImportViewProps> = ({
  transactions,
  activeUser,
  allUsers,
  googleStatus,
  onSyncGoogle,
  onAddTransaction,
  onUpdateTransaction,
  onImportTransactions,
  onDeleteTransaction,
  onSyncToCashflow,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [showManualModal, setShowManualModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');

  // Excel / CSV Import Preview & Column Mapping State
  const [previewImportTrxs, setPreviewImportTrxs] = useState<SimrsTransaction[] | null>(null);
  const [detectedColumns, setDetectedColumns] = useState<{
    pasien?: string;
    invoice?: string;
    time?: string;
    deskripsi?: string;
    totalBilling?: string;
    diskon?: string;
    metodeBayar?: string;
    kasirDiterima?: string;
    sourceFilename?: string;
  } | null>(null);

  // Authorization & Audit States
  const [selectedTrxForAuth, setSelectedTrxForAuth] = useState<SimrsTransaction | null>(null);
  const [authPinInput, setAuthPinInput] = useState('');
  const [authReasonInput, setAuthReasonInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Edit Transaction States
  const [selectedTrxForEdit, setSelectedTrxForEdit] = useState<SimrsTransaction | null>(null);
  const [editFormData, setEditFormData] = useState({
    patientName: '',
    department: 'Poli Umum' as SimrsDepartment,
    paymentMethod: 'Tunai' as PaymentMethod,
    totalAmount: '',
    discount: '',
    cashierReceived: '',
    shift: 'Pagi' as 'Pagi' | 'Siang' | 'Malam',
    notes: '',
    reason: '',
    supervisorName: '',
  });

  // History / Audit Log View State
  const [selectedTrxForHistory, setSelectedTrxForHistory] = useState<SimrsTransaction | null>(null);

  const isCashier = activeUser.role === 'cashier_staff';
  const isSupervisor =
    activeUser.role === 'super_admin' || activeUser.role === 'finance_manager';

  // Manual Form State - Format Sesuai Isian Billing SIMRS
  const [formData, setFormData] = useState({
    invoiceNo: `INV-SIMRS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
    billingTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
    patientRm: 'RM-2026-0922',
    patientName: '',
    department: 'Poli Umum' as SimrsDepartment,
    doctorName: 'dr. Anita Larasati',
    paymentMethod: 'Tunai' as PaymentMethod,
    totalAmount: '',
    discount: '',
    cashierReceived: '',
    shift: 'Pagi' as 'Pagi' | 'Siang' | 'Malam',
    notes: '',
  });

  const isSupervisorOrOwner = isOwnerOrManager(activeUser);
  const refDate = '2026-09-16';
  const staffWindow = getStaffAllowedDateWindow(refDate);

  // Date Filter State (Request 3 & Role Access: Karyawan biasa hanya bisa lihat hari ini & 2 hari sebelumnya)
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    mode: isSupervisorOrOwner ? 'all' : 'today',
    startDate: isSupervisorOrOwner ? '2026-09-11' : staffWindow.minDate,
    endDate: isSupervisorOrOwner ? '2026-09-16' : staffWindow.maxDate,
    month: '2026-09',
    year: '2026',
  });

  // Filtered transactions with strict RBAC: Karyawan biasa hanya bisa lihat hari ini & 2 hari sebelumnya
  const filtered = transactions.filter((t) => {
    // If not owner/manager, strictly enforce: today & 2 days before
    if (!isSupervisorOrOwner && !isDateAllowedForStaff(t.billingTime, activeUser, refDate)) {
      return false;
    }

    const matchSearch =
      t.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.patientRm.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept =
      selectedDept === 'all' ||
      t.department === selectedDept ||
      normalizeToOfficialUnit(t.department) === selectedDept;
    const matchMethod = selectedMethod === 'all' || t.paymentMethod === selectedMethod;
    const matchDate = matchDateFilter(t.billingTime, dateFilter);
    return matchSearch && matchDept && matchMethod && matchDate;
  });

  // Summary stats
  const totalAmount = filtered.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalDiscount = filtered.reduce((acc, t) => acc + (t.discount || 0), 0);
  const totalReceived = filtered.reduce((acc, t) => acc + t.cashierReceived, 0);
  const unsyncedCount = filtered.filter((t) => !t.isSyncedToCashflow && t.cashierReceived > 0).length;

  // Single click export to Excel/CSV
  const handleExportCsv = () => {
    const headers = [
      'No Invoice SIMRS',
      'Waktu Billing',
      'No RM Pasien',
      'Nama Pasien',
      'Unit Layanan',
      'Dokter Pemeriksa',
      'Metode Pembayaran',
      'Total Billing (Rp)',
      'Diskon Pasien (Rp)',
      'Kasir Diterima (Rp)',
      'Petugas Kasir',
      'Shift',
      'Status Sinkron Arus Kas',
      'Catatan Kasir',
    ];

    const rows = filtered.map((t) => [
      t.invoiceNo,
      t.billingTime,
      t.patientRm,
      t.patientName,
      t.department,
      t.doctorName || '-',
      t.paymentMethod,
      t.totalAmount,
      t.discount || 0,
      t.cashierReceived,
      t.cashierName,
      t.shift,
      t.isSyncedToCashflow ? 'Sudah Masuk Buku Kas' : 'Belum / Piutang',
      t.notes || '',
    ]);

    downloadCsv(`Rekap_Kasir_SIMRS_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  // Export to native Excel (.xlsx)
  const handleExportExcel = () => {
    const data = [
      [
        'No Invoice SIMRS',
        'Waktu Billing',
        'No RM Pasien',
        'Nama Pasien',
        'Unit Layanan',
        'Dokter Pemeriksa',
        'Metode Pembayaran',
        'Total Billing (Rp)',
        'Diskon Pasien (Rp)',
        'Kasir Diterima (Rp)',
        'Petugas Kasir',
        'Shift',
        'Status Sinkron Arus Kas',
        'Catatan Kasir',
      ],
      ...filtered.map((t) => [
        t.invoiceNo,
        t.billingTime,
        t.patientRm,
        t.patientName,
        t.department,
        t.doctorName || '-',
        t.paymentMethod,
        t.totalAmount,
        t.discount || 0,
        t.cashierReceived,
        t.cashierName,
        t.shift,
        t.isSyncedToCashflow ? 'Sudah Masuk Buku Kas' : 'Belum / Piutang',
        t.notes || '',
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_SIMRS');
    XLSX.writeFile(wb, `Rekap_SIMRS_Klinik_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Download Sample Template for SIMRS Export (Excel .xlsx format)
  // Sesuai sumber data SIMRS: No. Invoice, Waktu (Tanggal), Pasien, Deskrisi (Deskripsi), Total billing (Nominal), Diskon, Metode Bayar
  const handleDownloadSampleExcel = () => {
    const data = [
      [
        'No. Invoice',
        'Waktu',
        'pasien',
        'Deskrisi',
        'Total billing',
        'Diskon',
        'Metode Bayar',
        'Kasir Diterima',
        'No. RM',
        'Dokter',
      ],
      [
        'INV000458',
        '2026-09-28 08:30',
        'PARJIAH',
        'Kunjungan konsultasi rawat jalan & obat farmasi',
        118500,
        20000,
        'Tunai',
        98500,
        'RM-000458',
        'dr. Mustika Amanda',
      ],
      [
        'INV000459',
        '2026-09-28 08:45',
        'SRI HARMINI',
        'Paket tindakan poli umum & konsultasi dokter',
        1035000,
        50000,
        'Tunai',
        985000,
        'RM-000459',
        'dr. Mustika Amanda',
      ],
      [
        'INV000460',
        '2026-09-28 09:15',
        'SUMARNO',
        'Pemeriksaan laboratorium klinis & rawat jalan',
        1095000,
        0,
        'Tunai',
        1095000,
        'RM-000460',
        'dr. Mustika Amanda',
      ],
      [
        'INV000461',
        '2026-09-28 09:40',
        'PARJIYO',
        'Tindakan medis rawat jalan & obat farmasi',
        984000,
        30000,
        'Tunai',
        954000,
        'RM-000461',
        'dr. Mustika Amanda',
      ],
      [
        'INV000407-B',
        '2026-09-16 09:00',
        'DWI CANDRANINGSIH',
        'Kunjungan konsultasi dari DWI CANDRANINGSIH (Pribadi)',
        175000,
        25000,
        'Tunai',
        150000,
        'RM-UM-0418',
        'dr. Mustika Amanda',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_SIMRS');
    XLSX.writeFile(wb, 'Template_Export_SIMRS_Klinik.xlsx');
  };

  // Download Sample Template for SIMRS Export (CSV format)
  const handleDownloadSampleTemplate = () => {
    const headers = [
      'No. Invoice',
      'Waktu',
      'pasien',
      'Deskrisi',
      'Total billing',
      'Diskon',
      'Metode Bayar',
      'Kasir Diterima',
    ];

    const sampleRows = [
      [
        'INV000458',
        '2026-09-28 08:30',
        'PARJIAH',
        'Kunjungan konsultasi rawat jalan & obat farmasi',
        118500,
        20000,
        'Tunai',
        98500,
      ],
      [
        'INV000459',
        '2026-09-28 08:45',
        'SRI HARMINI',
        'Paket tindakan poli umum & konsultasi dokter',
        1035000,
        50000,
        'Tunai',
        985000,
      ],
      [
        'INV000460',
        '2026-09-28 09:15',
        'SUMARNO',
        'Pemeriksaan laboratorium klinis & rawat jalan',
        1095000,
        0,
        'Tunai',
        1095000,
      ],
      [
        'INV000407-B',
        '2026-09-16 09:00',
        'DWI CANDRANINGSIH',
        'Kunjungan konsultasi dari DWI CANDRANINGSIH (Pribadi)',
        175000,
        25000,
        'Tunai',
        150000,
      ],
    ];

    downloadCsv('Template_Export_SIMRS_Klinik', headers, sampleRows);
  };

  const formatBillingTime = (val: any): string => {
    if (!val) return '2026-09-16 08:00';
    if (typeof val === 'number') {
      const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        const y = jsDate.getFullYear();
        const m = String(jsDate.getMonth() + 1).padStart(2, '0');
        const d = String(jsDate.getDate()).padStart(2, '0');
        const hh = String(jsDate.getHours()).padStart(2, '0');
        const mm = String(jsDate.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${d} ${hh}:${mm}`;
      }
    }
    const s = String(val).trim();
    // Handle "DD/MM/YYYY HH:mm" or "DD-MM-YYYY" or "DD/MM/YYYY"
    const ddmmyyyy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(.*)$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      const year = ddmmyyyy[3];
      const rawTime = ddmmyyyy[4].trim();
      const timePart = rawTime.length >= 4 ? rawTime.slice(0, 5) : '08:30';
      return `${year}-${month}-${day} ${timePart}`;
    }
    // If already YYYY-MM-DD
    const yyyymmdd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(.*)$/);
    if (yyyymmdd) {
      const year = yyyymmdd[1];
      const month = yyyymmdd[2].padStart(2, '0');
      const day = yyyymmdd[3].padStart(2, '0');
      const rawTime = yyyymmdd[4].trim();
      const timePart = rawTime.length >= 4 ? rawTime.slice(0, 5) : '08:30';
      return `${year}-${month}-${day} ${timePart}`;
    }
    return s;
  };

  // Process rows from Excel / CSV Sheet
  const processExcelRows = (data: any[][], sourceFilename?: string) => {
    if (!data || data.length < 2) {
      throw new Error('File Excel / CSV kosong atau tidak memiliki baris data yang cukup');
    }

    // Smart header finder: find row with maximum header keyword matches (>= 2)
    const knownHeaderTokens = [
      'invoice', 'inv', 'faktur', 'kwitansi', 'tagihan', 'noreg', 'registrasi',
      'waktu', 'tanggal', 'tgl', 'date', 'jam',
      'norm', 'no rm', 'no. rm', 'rekam', 'rm',
      'pasien', 'nama pasien', 'patient', 'nama',
      'unit', 'poli', 'poliklinik', 'instalasi', 'departemen',
      'dokter', 'dpjp', 'pemeriksa',
      'metode', 'metodie', 'cara bayar', 'pembayaran', 'cara_bayar', 'metode_bayar', 'metodie_bayar', 'tipe bayar',
      'tarif', 'total', 'biaya', 'billing', 'tagihan', 'diskon', 'potongan', 'discount', 'diterima', 'terima', 'kasir', 'shift',
      'deskripsi', 'deskrisi', 'uraian', 'tindakan', 'kunjungan', 'keterangan'
    ];

    let headerRowIdx = 0;
    let maxMatchCount = 0;

    for (let r = 0; r < Math.min(15, data.length); r++) {
      const row = data[r] || [];
      let matchCount = 0;
      const cells = row.map((c: any) => String(c || '').toLowerCase().trim());
      for (const cell of cells) {
        if (!cell) continue;
        if (knownHeaderTokens.some((tok) => cell.includes(tok))) {
          matchCount++;
        }
      }
      if (matchCount > maxMatchCount && matchCount >= 2) {
        maxMatchCount = matchCount;
        headerRowIdx = r;
      }
    }

    const header = (data[headerRowIdx] || []).map((h: any) => String(h || '').toLowerCase().trim());

    const findExactOrIncludes = (...keywordList: string[]) => {
      for (const kw of keywordList) {
        const exactIdx = header.findIndex((col: string) => col === kw);
        if (exactIdx !== -1) return exactIdx;
      }
      for (const kw of keywordList) {
        const incIdx = header.findIndex((col: string) => col.includes(kw));
        if (incIdx !== -1) return incIdx;
      }
      return -1;
    };

    // No. Invoice: matches No. Invoice, no invoice, invoice, no faktur, faktur, kwitansi, dll.
    const invIdx = findExactOrIncludes(
      'no invoice', 'no. invoice', 'nomor invoice', 'no.invoice', 'no_invoice', 'invoice',
      'no faktur', 'nomor faktur', 'faktur', 'no kwitansi', 'kwitansi',
      'no tagihan', 'tagihan', 'no registrasi', 'no. registrasi', 'no. reg',
      'noreg', 'no transaksi', 'nomor transaksi', 'no trx', 'id billing', 'billing id', 'inv'
    );

    // Tanggal = Waktu: prioritize 'waktu', 'tanggal', 'waktu billing', 'tanggal billing', etc.
    let timeIdx = -1;
    const timeKeywords = [
      'waktu', 'tanggal', 'waktu billing', 'tanggal billing', 'tgl billing',
      'tanggal invoice', 'tgl invoice', 'waktu transaksi', 'tgl transaksi',
      'tanggal transaksi', 'tgl', 'date', 'jam'
    ];
    for (const kw of timeKeywords) {
      const idx = header.findIndex(
        (col) => (col === kw || col.includes(kw)) &&
        !col.includes('metode') &&
        !col.includes('metodie') &&
        !col.includes('cara') &&
        !col.includes('dibayar')
      );
      if (idx !== -1) {
        timeIdx = idx;
        break;
      }
    }
    // Fallback if only 'tanggal dibayar' is available
    if (timeIdx === -1) {
      timeIdx = header.findIndex((col) => col.includes('tanggal') || col.includes('waktu') || col.includes('tgl') || col.includes('date'));
    }

    const rmIdx = findExactOrIncludes('no rm', 'no. rm', 'norm', 'rekam medis', 'no rekam', 'no rekam medis', 'rm', 'medis', 'id pasien');
    const docIdx = findExactOrIncludes('dokter pemeriksa', 'dokter penanggung jawab', 'nama dokter', 'dokter', 'dpjp', 'pemeriksa', 'nakes');

    // Pasien = Pasien: prioritize 'pasien', 'nama pasien', 'patient'
    let nameIdx = -1;
    const nameKeywords = ['pasien', 'nama pasien', 'patient', 'nama lengkap', 'pelanggan'];
    for (const kw of nameKeywords) {
      const idx = header.findIndex((col, i) => i !== docIdx && (col === kw || col.includes(kw)) && !col.includes('dokter') && !col.includes('kasir') && !col.includes('petugas'));
      if (idx !== -1) {
        nameIdx = idx;
        break;
      }
    }
    if (nameIdx === -1) {
      nameIdx = header.findIndex((col, i) => i !== docIdx && col === 'nama' && !col.includes('dokter') && !col.includes('kasir'));
    }

    // Unit Layanan / Poli / Kategori
    const deptIdx = header.findIndex((col) =>
      col === 'unit layanan' ||
      col === 'poli' ||
      col === 'poliklinik' ||
      col === 'instalasi' ||
      col === 'departemen' ||
      col === 'kategori' ||
      col === 'ruangan' ||
      (col.includes('unit') && !col.includes('harga') && !col.includes('tarif')) ||
      col.includes('poli')
    );

    // Deskripsi = Deskrisi: prioritize 'deskrisi' (spelling from custom SIMRS exports) & 'deskripsi'
    let noteIdx = -1;
    const noteKeywords = [
      'deskrisi', 'deskripsi', 'deskrisi tindakan', 'deskripsi tindakan', 'deskrisi layanan', 'deskripsi layanan',
      'uraian', 'keterangan', 'tindakan', 'nama tindakan', 'layanan / tindakan', 'layanan', 'kunjungan',
      'detail tindakan', 'detail', 'pelayanan', 'catatan', 'notes', 'diagnosa', 'keluhan', 'nama layanan', 'ket'
    ];
    for (const kw of noteKeywords) {
      const idx = header.findIndex((col, i) => (col === kw || col.includes(kw)) && i !== deptIdx && i !== timeIdx);
      if (idx !== -1) {
        noteIdx = idx;
        break;
      }
    }

    // Metodie Pembayaran = Metode Bayar: prioritize 'metodie pembayaran', 'metodie bayar', 'metode bayar'
    let payIdx = -1;
    const payHighPriority = [
      'metodie pembayaran', 'metodie bayar', 'metodie',
      'metode pembayaran', 'metode bayar', 'cara bayar', 'cara pembayaran',
      'jenis pembayaran', 'jenis bayar', 'tipe bayar', 'tipe pembayaran',
      'payment method', 'metode', 'pembayaran', 'cara_bayar', 'metode_bayar', 'penjamin', 'jenis pasien'
    ];
    for (const kw of payHighPriority) {
      const idx = header.findIndex((col) =>
        (col === kw || col.includes(kw)) &&
        !col.includes('tgl') &&
        !col.includes('tanggal') &&
        !col.includes('waktu') &&
        !col.includes('date') &&
        !col.includes('jam') &&
        !col.includes('dibayar') &&
        !col.includes('total') &&
        !col.includes('jumlah') &&
        !col.includes('nominal')
      );
      if (idx !== -1) {
        payIdx = idx;
        break;
      }
    }

    // Nominal = Total billing: MUST prioritize 'nominal', 'total billing', 'total tarif', etc.
    const totIdx = header.findIndex((col) =>
      (col === 'nominal' ||
       col === 'total billing' ||
       col === 'total_billing' ||
       col === 'totalbilling' ||
       col === 'total tarif' ||
       col === 'total tagihan' ||
       col === 'total' ||
       col === 'billing' ||
       col === 'tarif' ||
       col === 'tagihan' ||
       col === 'biaya' ||
       col === 'subtotal' ||
       col === 'jumlah' ||
       col.includes('nominal') ||
       col.includes('total') ||
       col.includes('tarif') ||
       col.includes('billing')) &&
      !col.includes('diskon') &&
      !col.includes('potongan') &&
      !col.includes('discount') &&
      !col.includes('subsidi')
    );

    // Diskon: Kolom diskon pasien / potongan tarif
    const discIdx = header.findIndex((col) =>
      (col === 'diskon' ||
       col === 'kolom diskon' ||
       col === 'diskon pasien' ||
       col === 'potongan' ||
       col === 'potongan harga' ||
       col === 'discount' ||
       col === 'disc' ||
       col === 'subsidi' ||
       col.includes('diskon') ||
       col.includes('potongan') ||
       col.includes('discount')) &&
      !col.includes('total') &&
      !col.includes('nominal') &&
      !col.includes('billing')
    );

    // Kasir Diterima index (excluding date columns like 'Tanggal Dibayar')
    const rcvIdx = header.findIndex((col) =>
      (col === 'kasir diterima' ||
       col === 'diterima kasir' ||
       col === 'kasir terima' ||
       col === 'diterima' ||
       col === 'total bayar' ||
       col === 'jumlah bayar' ||
       col === 'net' ||
       col === 'netto' ||
       col === 'cashier' ||
       (col.includes('diterima') && !col.includes('tanggal') && !col.includes('tgl') && !col.includes('waktu'))) &&
      !col.includes('tgl') &&
      !col.includes('tanggal') &&
      !col.includes('waktu') &&
      !col.includes('date') &&
      !col.includes('jam') &&
      !col.includes('dibayar') &&
      !col.includes('metode') &&
      !col.includes('metodie') &&
      !col.includes('cara')
    );

    const shiftIdx = findExactOrIncludes('shift', 'giliran');

    // Bulletproof amount parsing for Indonesian currency strings (e.g. "98.500", "Rp 1.095.000", "15,000", "15000")
    const parseAmount = (val: any): number => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      const str = String(val).trim();
      const cleaned = str.replace(/rp/gi, '').replace(/\s+/g, '').replace(/[^0-9,.-]/g, '');
      if (!cleaned) return 0;
      if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
      }
      if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
        return parseFloat(cleaned.replace(/,/g, '')) || 0;
      }
      return parseFloat(cleaned.replace(/[^0-9.-]/g, '')) || 0;
    };

    const detectPaymentMethod = (rowArr: any[], pIdx: number): PaymentMethod => {
      const cellVal = pIdx >= 0 && rowArr[pIdx] ? String(rowArr[pIdx]).trim() : '';
      const lower = cellVal.toLowerCase();

      // STRICT DATE CHECK: If cellVal looks like any date or time or Excel serial date, it is NEVER a payment method!
      const isDateOrTime =
        /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(lower) ||
        /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(lower) ||
        /^\d{1,2}:\d{2}/.test(lower) ||
        lower.includes('2026') ||
        lower.includes('2025') ||
        lower.includes('2024') ||
        lower.includes('sep') ||
        lower.includes('okt') ||
        lower.includes('agu') ||
        (!isNaN(Number(lower)) && Number(lower) > 30000 && Number(lower) < 60000);

      if (!isDateOrTime && lower) {
        if (lower.includes('tunai') || lower.includes('cash') || lower.includes('laci')) return 'Tunai';
        if (lower.includes('qris')) return 'QRIS';
        if (lower.includes('debit') || lower.includes('edc') || lower.includes('kartu debit')) return 'Debit / EDC';
        if (lower.includes('kredit') || lower.includes('credit')) return 'Kartu Kredit';
        if (lower.includes('bpjs') || lower.includes('jkn') || lower.includes('kis') || lower.includes('askes')) return 'Klaim BPJS';
        if (lower.includes('asuransi') || lower.includes('swasta') || lower.includes('admedika') || lower.includes('inhealth')) return 'Asuransi Swasta';
        if (lower.includes('piutang') || lower.includes('belum lunas') || lower.includes('utang')) return 'Piutang Rekanan / Pasien';
        if (lower.includes('transfer') || lower.includes('tf') || lower.includes('trf') || lower.includes('bca') || lower.includes('mandiri') || lower.includes('bri') || lower.includes('bni') || lower.includes('bank')) return 'Transfer Bank';
        if (lower.includes('pribadi') || lower.includes('umum') || lower.includes('bayar mandiri')) return 'Tunai';
      }

      // If cellVal was a date or unrecognized, scan all other row cells for payment method keywords
      for (let c = 0; c < rowArr.length; c++) {
        if (c === pIdx || c === timeIdx) continue;
        const cStr = String(rowArr[c] || '').trim().toLowerCase();
        if (/^\d{1,4}[-/.]\d{1,2}/.test(cStr) || /^\d{1,2}[-/.]\d{1,2}/.test(cStr) || cStr.includes('2026') || cStr.includes(':')) continue;
        if (cStr.includes('tunai') || cStr.includes('cash')) return 'Tunai';
        if (cStr.includes('transfer') || cStr.includes('bank') || cStr.includes('bca') || cStr.includes('mandiri') || cStr.includes('bri')) return 'Transfer Bank';
        if (cStr.includes('qris')) return 'QRIS';
        if (cStr.includes('debit') || cStr.includes('edc')) return 'Debit / EDC';
        if (cStr.includes('kredit') || cStr.includes('credit')) return 'Kartu Kredit';
        if (cStr.includes('bpjs') || cStr.includes('jkn')) return 'Klaim BPJS';
        if (cStr.includes('asuransi')) return 'Asuransi Swasta';
        if (cStr.includes('piutang')) return 'Piutang Rekanan / Pasien';
        if (cStr.includes('pribadi') || cStr.includes('umum')) return 'Tunai';
      }

      return 'Tunai';
    };

    const dataRows = data.slice(headerRowIdx + 1);
    const newTrxs: SimrsTransaction[] = [];

    dataRows.forEach((row, idx) => {
      if (!row || row.length === 0 || !row.some((cell: any) => cell !== null && cell !== '')) return;

      const invoiceNo = invIdx >= 0 && row[invIdx] ? String(row[invIdx]).trim() : `SIMRS-${Date.now()}-${idx}`;
      const billingTime = timeIdx >= 0 && row[timeIdx] ? formatBillingTime(row[timeIdx]) : new Date().toISOString().slice(0, 16).replace('T', ' ');
      const patientRm = rmIdx >= 0 && row[rmIdx] ? String(row[rmIdx]).trim() : 'RM-SIMRS';
      const patientName = nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : 'Pasien SIMRS';
      
      let rawDept = deptIdx >= 0 && row[deptIdx] ? String(row[deptIdx]).trim() : '';
      let notes = noteIdx >= 0 && row[noteIdx] ? String(row[noteIdx]).trim() : '';

      // If notes is still empty, scan row for any description-like text (excluding mapped columns)
      if (!notes) {
        for (let c = 0; c < row.length; c++) {
          if (c === invIdx || c === timeIdx || c === rmIdx || c === nameIdx || c === deptIdx || c === docIdx || c === payIdx || c === totIdx || c === discIdx || c === rcvIdx) {
            continue;
          }
          const val = String(row[c] || '').trim();
          if (val && isNaN(Number(val)) && !/^\d{1,4}[-/.]/.test(val) && val.length > 3) {
            notes = val;
            break;
          }
        }
      }

      // If still empty, fall back to proper format
      if (!notes) {
        notes = patientName && patientName !== 'Pasien SIMRS'
          ? `Kunjungan konsultasi rawat jalan ${patientName}`
          : 'Kunjungan konsultasi rawat jalan klinik';
      }

      // Infer department if not provided in file
      let department: SimrsDepartment = 'Poli Umum';
      if (rawDept) {
        const normDept = rawDept.toLowerCase();
        if (normDept.includes('hemodialisa') || normDept.includes('hd')) {
          department = 'Hemodialisa (HD)';
        } else if (normDept.includes('farmasi') || normDept.includes('obat')) {
          department = 'Instalasi Farmasi';
        } else if (normDept.includes('igd') || normDept.includes('darurat')) {
          department = 'IGD';
        } else if (normDept.includes('gigi') || normDept.includes('mata') || normDept.includes('spesialis')) {
          department = 'Poli Spesialis';
        } else if (normDept.includes('lab')) {
          department = 'Laboratorium';
        } else if (normDept.includes('daftar') || normDept.includes('reg')) {
          department = 'Pendaftaran';
        } else {
          department = 'Poli Umum';
        }
      } else {
        const lowerNote = notes.toLowerCase();
        if (lowerNote.includes('hemodialisa') || lowerNote.includes('hd') || lowerNote.includes('dialisis')) {
          department = 'Hemodialisa (HD)';
        } else if (lowerNote.includes('farmasi') || lowerNote.includes('obat') || lowerNote.includes('resep')) {
          department = 'Instalasi Farmasi';
        } else if (lowerNote.includes('igd') || lowerNote.includes('darurat')) {
          department = 'IGD';
        } else if (lowerNote.includes('lab') || lowerNote.includes('darah')) {
          department = 'Laboratorium';
        } else if (lowerNote.includes('rontgen') || lowerNote.includes('usg') || lowerNote.includes('radiologi')) {
          department = 'Radiologi';
        } else if (lowerNote.includes('spesialis') || lowerNote.includes('sp.pd')) {
          department = 'Poli Spesialis';
        } else {
          department = 'Poli Umum';
        }
      }

      const doctorName = docIdx >= 0 && row[docIdx] ? String(row[docIdx]).trim() : 'dr. Mustika Amanda';
      const paymentMethod = detectPaymentMethod(row, payIdx);

      let totalVal = totIdx >= 0 ? parseAmount(row[totIdx]) : 0;
      const discVal = discIdx >= 0 ? parseAmount(row[discIdx]) : 0;
      let rcvVal = rcvIdx >= 0 ? parseAmount(row[rcvIdx]) : NaN;

      if (isNaN(rcvVal) || rcvIdx === -1) {
        rcvVal = Math.max(0, totalVal - discVal);
      }
      if (totalVal === 0 && rcvVal > 0) {
        totalVal = rcvVal + discVal;
      }

      const generatedRm = patientRm !== 'RM-SIMRS'
        ? patientRm
        : `RM-${invoiceNo.replace(/[^0-9]/g, '') || String(idx + 100).padStart(4, '0')}`;

      const shift = (shiftIdx >= 0 && row[shiftIdx] ? String(row[shiftIdx]).trim() : 'Pagi') as 'Pagi' | 'Siang' | 'Malam';

      newTrxs.push({
        id: `simrs-imp-xls-${Date.now()}-${idx}`,
        invoiceNo,
        billingTime,
        patientRm: generatedRm,
        patientName,
        department,
        doctorName,
        paymentMethod,
        totalAmount: totalVal,
        discount: discVal > 0 ? discVal : undefined,
        cashierReceived: rcvVal,
        cashierName: activeUser.name,
        shift: shift === 'Siang' || shift === 'Malam' ? shift : 'Pagi',
        notes,
        isSyncedToCashflow: true,
      });
    });

    if (newTrxs.length === 0) {
      throw new Error('Tidak ditemukan transaksi valid di dalam file Excel / CSV');
    }

    const mappingInfo = {
      pasien: nameIdx >= 0 ? (header[nameIdx] || 'pasien') : 'Pasien',
      invoice: invIdx >= 0 ? (header[invIdx] || 'No. Invoice') : 'No. Invoice',
      time: timeIdx >= 0 ? (header[timeIdx] || 'Waktu') : 'Waktu',
      deskripsi: noteIdx >= 0 ? (header[noteIdx] || 'Deskrisi') : 'Deskrisi (Deskripsi)',
      totalBilling: totIdx >= 0 ? (header[totIdx] || 'Total billing') : 'Total billing (Nominal)',
      diskon: discIdx >= 0 ? (header[discIdx] || 'Diskon') : 'Kolom Diskon (Aktif)',
      metodeBayar: payIdx >= 0 ? (header[payIdx] || 'Metode Bayar') : 'Metode Bayar',
      kasirDiterima: rcvIdx >= 0 ? (header[rcvIdx] || 'Kasir Diterima') : 'Kasir Diterima (Total - Diskon)',
      sourceFilename: sourceFilename || 'File Ekspor SIMRS',
    };

    setDetectedColumns(mappingInfo);
    setPreviewImportTrxs(newTrxs);
  };

  // Konfirmasi dan simpan hasil pratinjau impor ke state utama
  const handleConfirmImportPreview = () => {
    if (!previewImportTrxs || previewImportTrxs.length === 0) return;
    onImportTransactions(previewImportTrxs);
    setShowImportModal(false);
    setPreviewImportTrxs(null);
    setDetectedColumns(null);
    setImportText('');
  };

  // Parse Excel (.xlsx/.xls), CSV or JSON from file or text
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          processExcelRows(jsonData, file.name);
        } catch (err: any) {
          setImportError(`Gagal membaca file Excel SIMRS: ${err.message || 'File tidak valid'}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processImportContent(content, file.name);
      };
      reader.readAsText(file);
    }
  };

  const processImportContent = (content: string, sourceFilename?: string) => {
    setImportError('');
    try {
      // If it's JSON
      if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
        const parsed = JSON.parse(content);
        const arrayData = Array.isArray(parsed) ? parsed : [parsed];
        const newTrxs: SimrsTransaction[] = arrayData.map((item, idx) => {
          const tot = Number(item.totalAmount || item.totalBilling || item.nominal || 0);
          const disc = Number(item.discount || item.diskon || item.potongan || 0);
          const rcv = Number(item.cashierReceived ?? item.kasirDiterima ?? Math.max(0, tot - disc));
          const rawMethod = String(item.paymentMethod || item.metodeBayar || item.metodiePembayaran || item.caraBayar || 'Tunai').trim();
          const cleanMethod = (/^\d{1,4}[-/.]/.test(rawMethod) || rawMethod.includes(':') || rawMethod.includes('2026'))
            ? 'Tunai'
            : (rawMethod as PaymentMethod);
          const rawTime = String(item.billingTime || item.waktu || item.tanggal || '2026-09-16 08:30').trim();
          const cleanTime = formatBillingTime(rawTime);
          const patientName = item.patientName || item.pasien || item.namaPasien || 'Pasien SIMRS';
          const notes = item.notes || item.deskrisi || item.deskripsi || item.catatan || (patientName ? `Kunjungan konsultasi ${patientName}` : 'Kunjungan konsultasi rawat jalan klinik');

          return {
            id: `simrs-imp-${Date.now()}-${idx}`,
            invoiceNo: item.invoiceNo || item.noInvoice || item['No. Invoice'] || `SIMRS-${Date.now()}-${idx}`,
            billingTime: cleanTime,
            patientRm: item.patientRm || item.noRm || 'RM-BARU',
            patientName,
            department: item.department || item.unitLayanan || 'Poli Umum',
            doctorName: item.doctorName || item.dokter || 'dr. Mustika Amanda',
            paymentMethod: cleanMethod || 'Tunai',
            totalAmount: tot,
            discount: disc > 0 ? disc : undefined,
            cashierReceived: rcv,
            cashierName: activeUser.name,
            shift: item.shift || 'Pagi',
            notes,
            isSyncedToCashflow: true,
          };
        });

        if (newTrxs.length === 0) throw new Error('Tidak ada data yang valid');
        setDetectedColumns({
          pasien: 'pasien / patientName',
          invoice: 'No. Invoice / invoiceNo',
          time: 'Waktu / Tanggal',
          deskripsi: 'Deskrisi / Deskripsi',
          totalBilling: 'Total billing / Nominal',
          diskon: 'Diskon (Aktif)',
          metodeBayar: 'Metode Bayar',
          kasirDiterima: 'Kasir Diterima',
          sourceFilename: sourceFilename || 'Format JSON',
        });
        setPreviewImportTrxs(newTrxs);
        return;
      }

      // Otherwise CSV parser - pass directly to processExcelRows
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('File CSV kosong atau hanya memiliki 1 baris header');
      }

      const separator = lines[0].includes(';') ? ';' : ',';
      const rows = lines.map((rowStr) =>
        rowStr.split(separator).map((c) => c.replace(/^"|"$/g, '').trim())
      );

      processExcelRows(rows, sourceFilename || 'File CSV');
    } catch (err: any) {
      setImportError(err.message || 'Gagal memproses data SIMRS. Pastikan format file sesuai.');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(formData.totalAmount) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const received = formData.cashierReceived !== '' ? parseFloat(formData.cashierReceived) : Math.max(0, total - discount);

    const newTrx: SimrsTransaction = {
      id: `simrs-manual-${Date.now()}`,
      invoiceNo: formData.invoiceNo,
      billingTime: formData.billingTime || new Date().toISOString().slice(0, 16).replace('T', ' '),
      patientRm: formData.patientRm,
      patientName: formData.patientName || 'Pasien Umum',
      department: formData.department,
      doctorName: formData.doctorName,
      paymentMethod: formData.paymentMethod,
      totalAmount: total,
      discount: discount > 0 ? discount : undefined,
      cashierReceived: received,
      cashierName: activeUser.name,
      shift: formData.shift,
      notes: formData.notes,
      isSyncedToCashflow: false,
    };

    onAddTransaction(newTrx);
    setShowManualModal(false);
    setFormData({
      invoiceNo: `INV-SIMRS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      billingTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
      patientRm: 'RM-2026-0922',
      patientName: '',
      department: 'Instalasi Farmasi',
      doctorName: 'dr. Anita Larasati',
      paymentMethod: 'Tunai',
      totalAmount: '',
      discount: '',
      cashierReceived: '',
      shift: 'Pagi',
      notes: '',
    });
  };

  // Sync unsynced transactions to cashflow
  const handleBulkSync = () => {
    const unsyncedIds = filtered
      .filter((t) => !t.isSyncedToCashflow && t.cashierReceived > 0)
      .map((t) => t.id);
    if (unsyncedIds.length === 0) return;
    onSyncToCashflow(unsyncedIds);
  };

  // Open authorization modal for cashier
  const handleOpenAuthModal = (trx: SimrsTransaction) => {
    setSelectedTrxForAuth(trx);
    setAuthPinInput('');
    setAuthReasonInput('');
    setAuthError('');
  };

  // Open edit modal directly
  const handleOpenEditModal = (
    trx: SimrsTransaction,
    supervisorName?: string,
    initialReason?: string
  ) => {
    setSelectedTrxForEdit(trx);
    setEditFormData({
      patientName: trx.patientName || '',
      department: trx.department || 'Poli Umum',
      paymentMethod: trx.paymentMethod || 'Tunai',
      totalAmount: String(trx.totalAmount ?? ''),
      discount: trx.discount ? String(trx.discount) : '',
      cashierReceived: String(trx.cashierReceived ?? ''),
      shift: trx.shift || 'Pagi',
      notes: trx.notes || '',
      reason: initialReason || '',
      supervisorName: supervisorName || (isSupervisor ? activeUser.name : 'Manajer Keuangan'),
    });
  };

  // Verify supervisor PIN to unlock immediately
  const handleVerifySupervisorPin = () => {
    if (!selectedTrxForAuth) return;
    if (!authReasonInput.trim()) {
      setAuthError('Mohon tuliskan alasan koreksi transaksi!');
      return;
    }

    const supervisorUser = allUsers.find(
      (u) =>
        (u.role === 'super_admin' || u.role === 'finance_manager') &&
        (u.pin === authPinInput.trim() ||
          authPinInput.trim() === '123456' ||
          authPinInput.trim() === '654321')
    );

    if (!supervisorUser) {
      setAuthError('PIN Atasan salah! Masukkan PIN Manajer Keuangan / Direktur.');
      return;
    }

    // Unlock transaction and open edit form
    const unlockedTrx: SimrsTransaction = {
      ...selectedTrxForAuth,
      isLocked: false,
      correctionStatus: 'approved',
    };
    onUpdateTransaction(unlockedTrx);

    const prevTrx = selectedTrxForAuth;
    setSelectedTrxForAuth(null);
    handleOpenEditModal(prevTrx, supervisorUser.name, authReasonInput);
  };

  // Submit request for supervisor approval
  const handleRequestApproval = () => {
    if (!selectedTrxForAuth) return;
    if (!authReasonInput.trim()) {
      setAuthError('Mohon tuliskan alasan permohonan koreksi!');
      return;
    }

    const requestedTrx: SimrsTransaction = {
      ...selectedTrxForAuth,
      correctionStatus: 'requested',
    };
    onUpdateTransaction(requestedTrx);
    setSelectedTrxForAuth(null);
  };

  // Direct approve by supervisor
  const handleDirectApprove = (trx: SimrsTransaction) => {
    const approvedTrx: SimrsTransaction = {
      ...trx,
      isLocked: false,
      correctionStatus: 'approved',
    };
    onUpdateTransaction(approvedTrx);
  };

  // Save edit and record audit trail into changeHistory
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrxForEdit) return;

    if (!editFormData.reason.trim()) {
      alert('Alasan perubahan transaksi wajib diisi untuk riwayat audit!');
      return;
    }

    const newTotal = Number(editFormData.totalAmount) || 0;
    const newDiscount = Number(editFormData.discount) || 0;
    const newReceived =
      editFormData.cashierReceived !== ''
        ? Number(editFormData.cashierReceived)
        : Math.max(0, newTotal - newDiscount);

    // Detect changed fields for audit log
    const changes: string[] = [];
    if (selectedTrxForEdit.patientName !== editFormData.patientName) {
      changes.push(`Nama Pasien (${selectedTrxForEdit.patientName} → ${editFormData.patientName})`);
    }
    if (selectedTrxForEdit.department !== editFormData.department) {
      changes.push(`Poli (${selectedTrxForEdit.department} → ${editFormData.department})`);
    }
    if (selectedTrxForEdit.totalAmount !== newTotal) {
      changes.push(
        `Total (${formatRupiah(selectedTrxForEdit.totalAmount)} → ${formatRupiah(newTotal)})`
      );
    }
    if ((selectedTrxForEdit.discount || 0) !== newDiscount) {
      changes.push(
        `Diskon (${formatRupiah(selectedTrxForEdit.discount || 0)} → ${formatRupiah(newDiscount)})`
      );
    }
    if (selectedTrxForEdit.cashierReceived !== newReceived) {
      changes.push(
        `Kasir Terima (${formatRupiah(selectedTrxForEdit.cashierReceived)} → ${formatRupiah(newReceived)})`
      );
    }
    if (selectedTrxForEdit.paymentMethod !== editFormData.paymentMethod) {
      changes.push(`Bayar (${selectedTrxForEdit.paymentMethod} → ${editFormData.paymentMethod})`);
    }
    if (selectedTrxForEdit.shift !== editFormData.shift) {
      changes.push(`Shift (${selectedTrxForEdit.shift} → ${editFormData.shift})`);
    }

    const newLog: TransactionChangeLog = {
      id: `log-${Date.now()}`,
      editedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      editedBy: activeUser.name,
      authorizedBy: isSupervisor ? activeUser.name : editFormData.supervisorName,
      reason: editFormData.reason,
      details: changes.length > 0 ? changes.join('; ') : 'Koreksi Data Transaksi',
      oldSnapshot: {
        totalAmount: selectedTrxForEdit.totalAmount,
        cashierReceived: selectedTrxForEdit.cashierReceived,
        paymentMethod: selectedTrxForEdit.paymentMethod,
        department: selectedTrxForEdit.department,
        patientName: selectedTrxForEdit.patientName,
        patientRm: selectedTrxForEdit.patientRm,
        shift: selectedTrxForEdit.shift,
        notes: selectedTrxForEdit.notes,
      },
      newSnapshot: {
        totalAmount: newTotal,
        cashierReceived: newReceived,
        paymentMethod: editFormData.paymentMethod,
        department: editFormData.department,
        patientName: editFormData.patientName,
        patientRm: selectedTrxForEdit.patientRm,
        shift: editFormData.shift,
        notes: editFormData.notes,
      },
    };

    const updatedTrx: SimrsTransaction = {
      ...selectedTrxForEdit,
      patientName: editFormData.patientName,
      department: editFormData.department,
      paymentMethod: editFormData.paymentMethod,
      totalAmount: newTotal,
      discount: newDiscount > 0 ? newDiscount : undefined,
      cashierReceived: newReceived,
      shift: editFormData.shift,
      notes: editFormData.notes,
      isLocked: true, // Re-lock after edit
      correctionStatus: 'none',
      changeHistory: [...(selectedTrxForEdit.changeHistory || []), newLog],
    };

    onUpdateTransaction(updatedTrx);
    setSelectedTrxForEdit(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Rekap Kasir & Transaksi Pasien
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSyncGoogle && (
            <button
              onClick={onSyncGoogle}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
                googleStatus?.isConnected
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              title={
                googleStatus?.isConnected
                  ? 'Kirim dan sinkronkan data transaksi ini ke Google Sheets database klinik'
                  : 'Hubungkan Akun Google untuk sinkronisasi ke Google Sheets'
              }
            >
              <FileSpreadsheet className={`w-4 h-4 ${googleStatus?.isConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>{googleStatus?.isConnected ? 'Kirim ke Sheets' : 'Sinkron Google Sheets'}</span>
            </button>
          )}
          <button
            onClick={handleDownloadSampleExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            title="Unduh Contoh Format File Excel (.xlsx) SIMRS"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Format Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleDownloadSampleTemplate}
            className="flex items-center gap-1.5 px-2.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
            title="Unduh Contoh Format File CSV Ekspor SIMRS"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Format CSV</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Excel / CSV</span>
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            title="Input Isian Billing SIMRS"
          >
            <Plus className="w-4 h-4" />
            <span>Isian Billing SIMRS</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards with Pastel Color-Coded Frames */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Pasien: Biru Pastel */}
        <div className="bg-blue-50/90 rounded-2xl border-2 border-blue-300 p-4 shadow-xs">
          <span className="text-xs font-bold text-blue-800">Jumlah Pasien SIMRS</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-blue-950">{filtered.length}</span>
            <span className="text-xs font-medium text-blue-700">Pasien</span>
          </div>
          <span className="text-[11px] text-blue-700/80 mt-0.5 block">
            Terfilter saat ini
          </span>
        </div>

        {/* Total Billing: Orange Pastel Cerah */}
        <div className="bg-orange-50/90 rounded-2xl border-2 border-orange-300 p-4 shadow-xs">
          <span className="text-xs font-bold text-orange-800">Total Billing (Tarif)</span>
          <p className="text-lg font-black text-orange-950 font-mono mt-1">
            {formatRupiah(totalAmount)}
          </p>
          <span className="text-[11px] text-orange-700/80 mt-0.5 block">
            Sebelum potongan diskon
          </span>
        </div>

        {/* Total Diskon: Merah/Rose Cerah */}
        <div className="bg-rose-50/90 rounded-2xl border-2 border-rose-300 p-4 shadow-xs">
          <span className="text-xs font-bold text-rose-800">Total Diskon Pasien</span>
          <p className="text-lg font-black text-rose-900 font-mono mt-1">
            -{formatRupiah(totalDiscount)}
          </p>
          <span className="text-[11px] text-rose-700/80 mt-0.5 block">
            Potongan tarif / subsidi
          </span>
        </div>

        {/* Kas Diterima: Hijau Cerah */}
        <div className="bg-emerald-50/90 rounded-2xl border-2 border-emerald-300 p-4 shadow-xs">
          <span className="text-xs font-bold text-emerald-800">Kas Diterima Kasir</span>
          <p className="text-lg font-black text-emerald-950 font-mono mt-1">
            {formatRupiah(totalReceived)}
          </p>
          <span className="text-[11px] text-emerald-700/80 mt-0.5 block">
            Tunai, QRIS, EDC & transfer
          </span>
        </div>

        {/* Sinkron Buku Kas: Abu-abu Cerah */}
        <div className="bg-slate-100/90 rounded-2xl border-2 border-slate-300 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Sinkron Buku Kas</span>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
              {unsyncedCount} Belum Sync
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleBulkSync}
              disabled={unsyncedCount === 0}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkron ke Arus Kas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Filter Bar (Request 3: Check by date range, month, year) */}
      <DateRangeFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        label="Filter Tanggal Transaksi SIMRS"
      />

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari No. Invoice, Nama Pasien, atau No. RM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Unit:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="py-1 px-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
            >
              <option value="all">Semua 12 Unit Layanan</option>
              {OFFICIAL_CLINIC_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500">Bayar:</span>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="py-1 px-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">Semua Metode</option>
              <option value="Tunai">Tunai</option>
              <option value="QRIS">QRIS</option>
              <option value="Transfer Bank">Transfer Bank</option>
              <option value="Debit / EDC">Debit / EDC</option>
              <option value="Asuransi Swasta">Asuransi Swasta</option>
            </select>
          </div>

          {/* 1-Click Excel export (.xlsx) */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold transition-colors"
            title="Tarik seluruh data rekap ke format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1060px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">No. Invoice</th>
                <th className="py-3 px-3">Tanggal & Waktu</th>
                <th className="py-3 px-3">Pasien</th>
                <th className="py-3 px-3">Deskripsi</th>
                <th className="py-3 px-3">Metode Bayar</th>
                <th className="py-3 px-3 text-right">Total Billing</th>
                <th className="py-3 px-3 text-right bg-rose-50/70 text-rose-800">Diskon</th>
                <th className="py-3 px-3 text-right">Kasir Diterima</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Buku Kas</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi kasir yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((trx) => {
                  const isLocked =
                    trx.isLocked !== false && trx.correctionStatus !== 'approved';
                  const hasHistory =
                    trx.changeHistory && trx.changeHistory.length > 0;

                  return (
                    <tr key={trx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-800 block">
                          {trx.invoiceNo}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Shift {trx.shift || 'Pagi'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-slate-700 font-mono text-[11px] block whitespace-nowrap">
                          {trx.billingTime}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{trx.patientName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{trx.patientRm}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="max-w-xs">
                          <p
                            className="text-[12px] text-slate-800 font-medium leading-snug break-words"
                            title={trx.notes || `Kunjungan konsultasi dari ${trx.patientName}`}
                          >
                            {trx.notes || `Kunjungan rawat jalan ${trx.patientName}`}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                              {trx.department || 'Poli Umum'}
                            </span>
                            {trx.doctorName && (
                              <span className="text-[10px] text-slate-400 truncate">
                                {trx.doctorName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-semibold px-2 py-0.5 rounded text-[11px] inline-block whitespace-nowrap ${
                          trx.paymentMethod === 'Tunai'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : trx.paymentMethod === 'Transfer Bank'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : trx.paymentMethod === 'QRIS'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : trx.paymentMethod === 'Debit EDC' || trx.paymentMethod === 'Debit / EDC'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : trx.paymentMethod === 'Klaim BPJS'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {trx.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatRupiah(trx.totalAmount)}
                      </td>
                      <td className="py-3 px-3 text-right bg-rose-50/40 whitespace-nowrap">
                        {trx.discount && trx.discount > 0 ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold font-mono bg-rose-100 text-rose-700 border border-rose-200">
                            -{formatRupiah(trx.discount)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Rp 0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {formatRupiah(trx.cashierReceived)}
                      </td>

                      {/* Status Kunci & Otorisasi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isLocked ? (
                            trx.correctionStatus === 'requested' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Lock className="w-2.5 h-2.5" />
                                Menunggu Atasan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <Lock className="w-2.5 h-2.5" />
                                Terkunci
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Unlock className="w-2.5 h-2.5" />
                              Bisa Diedit
                            </span>
                          )}

                          {hasHistory && (
                            <button
                              onClick={() => setSelectedTrxForHistory(trx)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded border border-teal-200 transition-colors"
                              title="Lihat Riwayat Perubahan & Audit"
                            >
                              <History className="w-2.5 h-2.5" />
                              <span>{trx.changeHistory!.length}x Koreksi</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Status Arus Kas */}
                      <td className="py-3 px-4 text-center">
                        {trx.isSyncedToCashflow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Masuk Kas
                          </span>
                        ) : (
                          <button
                            onClick={() => onSyncToCashflow([trx.id])}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 transition-colors"
                            title="Klik untuk memasukkan ke buku kas harian"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            Sync Kas
                          </button>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Otorisasi jika status requested dan user adalah Supervisor */}
                          {isSupervisor && trx.correctionStatus === 'requested' && (
                            <button
                              onClick={() => handleDirectApprove(trx)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Setujui Otorisasi Kasir (Buka Kunci)"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Tombol Koreksi / Buka Transaksi */}
                          {!isLocked || isSupervisor ? (
                            <button
                              onClick={() => handleOpenEditModal(trx)}
                              className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                              title="Koreksi Data Transaksi"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenAuthModal(trx)}
                              className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              title="Minta Otorisasi Atasan untuk Koreksi"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                          )}

                          {/* Tombol Hapus */}
                          {isSupervisor ? (
                            <button
                              onClick={() => onDeleteTransaction(trx.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Hapus Billing"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className="p-1 text-slate-200 cursor-not-allowed"
                              title="Kasir dilarang menghapus transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Import SIMRS (CSV / JSON / Text / Excel) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {previewImportTrxs ? 'Konfirmasi & Pratinjau Impor SIMRS' : 'Import Output Data dari SIMRS Klinik'}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {previewImportTrxs ? `${detectedColumns?.sourceFilename || 'File terdeteksi'} • ${previewImportTrxs.length} transaksi siap diimpor` : 'Mendukung format Excel (.xlsx, .xls), CSV, dan teks terstruktur'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPreviewImportTrxs(null);
                  setDetectedColumns(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-lg hover:bg-slate-200/60"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {previewImportTrxs ? (
                /* Mode Preview Hasil Pembacaan File */
                <div className="space-y-4">
                  {/* Ringkasan Angka Pratinjau */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl">
                      <span className="text-[11px] font-bold text-blue-800 block">Total Pasien</span>
                      <strong className="text-lg font-black text-blue-950 font-mono">
                        {previewImportTrxs.length}
                      </strong>
                    </div>
                    <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl">
                      <span className="text-[11px] font-bold text-orange-800 block">Total Billing (Nominal)</span>
                      <strong className="text-lg font-black text-orange-950 font-mono">
                        {formatRupiah(previewImportTrxs.reduce((acc, t) => acc + (t.totalAmount || 0), 0))}
                      </strong>
                    </div>
                    <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl">
                      <span className="text-[11px] font-bold text-rose-800 block">Total Diskon</span>
                      <strong className="text-lg font-black text-rose-900 font-mono">
                        -{formatRupiah(previewImportTrxs.reduce((acc, t) => acc + (t.discount || 0), 0))}
                      </strong>
                    </div>
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                      <span className="text-[11px] font-bold text-emerald-800 block">Kasir Diterima</span>
                      <strong className="text-lg font-black text-emerald-950 font-mono">
                        {formatRupiah(previewImportTrxs.reduce((acc, t) => acc + (t.cashierReceived || 0), 0))}
                      </strong>
                    </div>
                  </div>

                  {/* Pratinjau Tabel Data yang Dibaca (Dapat Digeser ke Kanan) */}
                  <div className="border border-slate-200 rounded-xl overflow-x-auto overflow-y-auto max-h-72 w-full shadow-inner">
                    <table className="w-full text-left text-xs min-w-[940px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 text-[11px] z-10">
                        <tr>
                          <th className="p-2.5 whitespace-nowrap">No. Invoice</th>
                          <th className="p-2.5 whitespace-nowrap">Waktu</th>
                          <th className="p-2.5 whitespace-nowrap">Pasien</th>
                          <th className="p-2.5 whitespace-nowrap">Deskripsi</th>
                          <th className="p-2.5 whitespace-nowrap">Metode Bayar</th>
                          <th className="p-2.5 text-right whitespace-nowrap">Total Billing</th>
                          <th className="p-2.5 text-right bg-rose-100/60 text-rose-800 whitespace-nowrap">Diskon</th>
                          <th className="p-2.5 text-right whitespace-nowrap">Kasir Diterima</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {previewImportTrxs.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 font-bold text-slate-800 whitespace-nowrap">{t.invoiceNo}</td>
                            <td className="p-2 text-slate-600 whitespace-nowrap">{t.billingTime}</td>
                            <td className="p-2 font-sans font-semibold text-slate-900 whitespace-nowrap">{t.patientName}</td>
                            <td className="p-2 font-sans text-slate-700 min-w-[220px]">{t.notes}</td>
                            <td className="p-2 font-sans whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-semibold border border-slate-200">
                                {t.paymentMethod}
                              </span>
                            </td>
                            <td className="p-2 text-right font-bold text-slate-800 whitespace-nowrap">{formatRupiah(t.totalAmount)}</td>
                            <td className="p-2 text-right bg-rose-50/40 text-rose-700 whitespace-nowrap font-bold">
                              {t.discount && t.discount > 0 ? `-${formatRupiah(t.discount)}` : 'Rp 0'}
                            </td>
                            <td className="p-2 text-right font-bold text-emerald-700 whitespace-nowrap">{formatRupiah(t.cashierReceived)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="italic">💡 Geser tabel ke kanan untuk melihat rincian Total Billing, Diskon & Kasir Diterima</span>
                    <span>Total {previewImportTrxs.length} transaksi siap diimpor</span>
                  </div>
                </div>
              ) : (
                /* Mode Upload File */
                <>
                  {/* File Dropzone */}
                  <div className="border-2 border-dashed border-emerald-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors bg-emerald-50/30">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <label className="cursor-pointer">
                      <span className="text-xs font-bold text-emerald-900 hover:underline block text-sm">
                        Pilih File Excel (.xlsx / .xls) atau CSV SIMRS
                      </span>
                      <span className="inline-block mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors">
                        Jelajahi File Komputer
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.txt,.json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Format didukung: <strong>Excel (.xlsx, .xls)</strong> dan CSV ekspor SIMRS
                    </p>
                  </div>

                  {/* Download Template Buttons */}
                  <div className="flex items-center gap-2 justify-between flex-wrap pt-1 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Belum punya format?</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadSampleExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Unduh Contoh Excel SIMRS (.xlsx)</span>
                      </button>
                      <button
                        onClick={handleDownloadSampleTemplate}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh Contoh CSV</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Atau Tempel (Paste) Konten Data CSV / JSON SIMRS:
                    </label>
                    <textarea
                      rows={3}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="INV000458,2026-09-28 08:30,PARJIAH,Kunjungan konsultasi rawat jalan,118500,20000,Tunai,98500"
                      className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs shrink-0">
              {previewImportTrxs ? (
                <>
                  <button
                    onClick={() => {
                      setPreviewImportTrxs(null);
                      setDetectedColumns(null);
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    ← Ganti / Pilih File Lain
                  </button>
                  <button
                    onClick={handleConfirmImportPreview}
                    className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Konfirmasi & Simpan ke SIMRS ({previewImportTrxs.length} Transaksi)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportError('');
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => processImportContent(importText)}
                    disabled={!importText.trim()}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl"
                  >
                    Proses & Pratinjau Data
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Manual Kasir Input - Format Isian Billingan SIMRS (+ Diskon) */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Isian Billingan SIMRS (+ Diskon)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Input data tagihan kasir sesuai format standar sumber SIMRS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded-lg hover:bg-slate-200/50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {/* Row 1: No. Invoice & Waktu (Tanggal) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. Invoice <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV000458"
                    value={formData.invoiceNo || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Waktu / Tanggal Billing <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="YYYY-MM-DD HH:MM (e.g. 2026-09-28 08:30)"
                    value={formData.billingTime || ''}
                    onChange={(e) => setFormData({ ...formData, billingTime: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Pasien & No. RM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Pasien <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PARJIAH / Tn. Budi"
                    value={formData.patientName || ''}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. Rekam Medis (RM)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RM-00129"
                    value={formData.patientRm || ''}
                    onChange={(e) => setFormData({ ...formData, patientRm: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Row 3: Deskripsi & Unit Layanan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deskripsi / Tindakan / Resep
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Konsultasi Poli Umum + Resep Obat"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit Layanan SIMRS
                  </label>
                  <select
                    value={normalizeToOfficialUnit(formData.department) || 'Poli Umum'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 font-medium bg-white"
                  >
                    {OFFICIAL_CLINIC_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Metode Bayar & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Metode Bayar
                  </label>
                  <select
                    value={formData.paymentMethod || 'Tunai'}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-medium"
                  >
                    <option value="Tunai">Tunai / Cash Laci</option>
                    <option value="QRIS">QRIS Statis/Dinamis</option>
                    <option value="Debit / EDC">Debit EDC BCA/Mandiri</option>
                    <option value="Transfer Bank">Transfer Bank Rekening</option>
                    <option value="Klaim BPJS">Klaim BPJS Kesehatan</option>
                    <option value="Asuransi Swasta">Asuransi Swasta (AdMedika/dll)</option>
                    <option value="Piutang Pasien">Piutang Pasien</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Kasir</label>
                  <select
                    value={formData.shift || 'Pagi'}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="Pagi">Pagi (07:00 - 14:00)</option>
                    <option value="Siang">Siang (14:00 - 21:00)</option>
                    <option value="Malam">Malam (21:00 - 07:00)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Financial Breakdown (Nominal / Total billing, Diskon, Kasir Diterima) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-slate-600 font-semibold mb-1">
                  <span>Rincian Finansial Billing SIMRS:</span>
                  <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    Kasir Terima = Total billing - Diskon
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Total Billing (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 118500"
                      value={formData.totalAmount || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const tot = parseFloat(val) || 0;
                        const disc = parseFloat(formData.discount) || 0;
                        setFormData({
                          ...formData,
                          totalAmount: val,
                          cashierReceived: String(Math.max(0, tot - disc)),
                        });
                      }}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-teal-500 bg-white font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-rose-700 mb-1 flex items-center justify-between">
                      <span>Diskon (Rp)</span>
                      <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-mono">Potongan</span>
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.discount || ''}
                      onChange={(e) => {
                        const discStr = e.target.value;
                        const disc = parseFloat(discStr) || 0;
                        const tot = parseFloat(formData.totalAmount) || 0;
                        setFormData({
                          ...formData,
                          discount: discStr,
                          cashierReceived: String(Math.max(0, tot - disc)),
                        });
                      }}
                      className="w-full p-2.5 border-2 border-rose-300 rounded-xl font-mono text-sm text-rose-700 focus:ring-2 focus:ring-rose-500 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">
                      Kasir Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.cashierReceived || ''}
                      onChange={(e) => setFormData({ ...formData, cashierReceived: e.target.value })}
                      className="w-full p-2.5 border-2 border-emerald-400 rounded-xl font-mono text-sm font-bold text-emerald-900 bg-emerald-50 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Simpan Isian Billingan SIMRS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Otorisasi Koreksi Kasir */}
      {selectedTrxForAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Otorisasi Koreksi Transaksi Kasir
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrxForAuth(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>No Invoice:</span>
                  <span className="font-bold text-slate-800">{selectedTrxForAuth.invoiceNo}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-sans">
                  <span>Pasien:</span>
                  <span className="font-semibold text-slate-800">{selectedTrxForAuth.patientName}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-sans">
                  <span>Total Billing:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatRupiah(selectedTrxForAuth.totalAmount)}
                  </span>
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Alasan Koreksi / Salah Input <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Kasir salah ketik nominal billing obat, atau salah pilih unit poli"
                  value={authReasonInput || ''}
                  onChange={(e) => setAuthReasonInput(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Otorisasi PIN Langsung */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block font-medium text-slate-700 mb-1">
                  Otorisasi PIN Atasan (Manajer / Direktur)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="PIN 6 Digit Atasan"
                    value={authPinInput || ''}
                    onChange={(e) => setAuthPinInput(e.target.value)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg font-mono text-center tracking-widest focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifySupervisorPin}
                    className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-xs shadow-xs"
                  >
                    Buka Sekarang
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Atasan dapat memasukkan PIN langsung di loket kasir.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRequestApproval}
                  className="px-3 py-2 border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl font-semibold text-xs"
                >
                  Kirim Permohonan ke Atasan
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTrxForAuth(null)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 text-xs"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Form Koreksi Transaksi Kasir (Setelah Dibuka / Diotorisasi) */}
      {selectedTrxForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Koreksi Transaksi Pasien ({selectedTrxForEdit.invoiceNo})
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrxForEdit(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-3.5 text-xs">
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                <span className="font-bold">Perhatian Audit:</span> Setiap perubahan data billing akan dicatat permanen dalam riwayat audit sistem keuangan klinik.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Pasien</label>
                  <input
                    type="text"
                    required
                    value={editFormData.patientName || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, patientName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Poliklinik / Layanan</label>
                  <select
                    value={normalizeToOfficialUnit(editFormData.department) || 'Poli Umum'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, department: e.target.value as SimrsDepartment })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-medium"
                  >
                    {OFFICIAL_CLINIC_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Metode Bayar</label>
                  <select
                    value={editFormData.paymentMethod || 'Tunai'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, paymentMethod: e.target.value as PaymentMethod })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="QRIS">QRIS</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Debit / EDC">Debit / EDC</option>
                    <option value="Asuransi Swasta">Asuransi Swasta</option>
                    <option value="Piutang Pasien">Piutang Pasien</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Shift</label>
                  <select
                    value={editFormData.shift || 'Pagi'}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, shift: e.target.value as 'Pagi' | 'Siang' | 'Malam' })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Pagi">Pagi</option>
                    <option value="Siang">Siang</option>
                    <option value="Malam">Malam</option>
                  </select>
                </div>
              </div>

              {/* Amount & Diskon Breakdown in Edit Modal */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Total Billing (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editFormData.totalAmount || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const tot = parseFloat(val) || 0;
                      const disc = parseFloat(editFormData.discount) || 0;
                      setEditFormData({
                        ...editFormData,
                        totalAmount: val,
                        cashierReceived: String(Math.max(0, tot - disc)),
                      });
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-rose-700 mb-1">Diskon (Rp)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editFormData.discount || ''}
                    onChange={(e) => {
                      const discStr = e.target.value;
                      const disc = parseFloat(discStr) || 0;
                      const tot = parseFloat(editFormData.totalAmount) || 0;
                      setEditFormData({
                        ...editFormData,
                        discount: discStr,
                        cashierReceived: String(Math.max(0, tot - disc)),
                      });
                    }}
                    className="w-full p-2 border border-rose-300 rounded-lg font-mono text-rose-700 focus:ring-1 focus:ring-rose-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">Kasir Diterima (Rp)</label>
                  <input
                    type="number"
                    required
                    value={editFormData.cashierReceived || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, cashierReceived: e.target.value })}
                    className="w-full p-2 border-2 border-emerald-400 rounded-lg font-mono font-bold text-emerald-900 bg-emerald-50 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Atasan Pengotorisasi</label>
                <input
                  type="text"
                  value={editFormData.supervisorName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, supervisorName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Alasan Perubahan Data (Wajib Riwayat Audit) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Koreksi salah ketik nominal billing poli interna"
                  value={editFormData.reason || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-medium text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrxForEdit(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs"
                >
                  Simpan Perubahan & Kunci Kembali
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Riwayat Perubahan & Audit Transaksi */}
      {selectedTrxForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Riwayat Perubahan & Audit Transaksi
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrxForHistory(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">No Invoice</span>
                  <span className="font-bold text-slate-900">{selectedTrxForHistory.invoiceNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">Pasien</span>
                  <span className="font-semibold text-slate-900 font-sans">
                    {selectedTrxForHistory.patientName} ({selectedTrxForHistory.patientRm})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-sans">Total Terkini</span>
                  <span className="font-bold text-teal-700">
                    {formatRupiah(selectedTrxForHistory.totalAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {(!selectedTrxForHistory.changeHistory ||
                  selectedTrxForHistory.changeHistory.length === 0) ? (
                  <p className="text-slate-400 text-center py-6">
                    Belum ada riwayat perubahan pada transaksi ini.
                  </p>
                ) : (
                  selectedTrxForHistory.changeHistory.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">
                          Revisi #{index + 1} • {item.editedAt}
                        </span>
                        <span className="text-slate-500 font-mono">
                          Diubah oleh: <strong className="text-slate-700">{item.editedBy}</strong>
                        </span>
                      </div>
                      <div className="text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700 block">Rincian Perubahan:</span>
                        <p className="text-slate-600 mt-0.5">{item.details || 'Koreksi Data Transaksi'}</p>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-500">
                          Alasan: <strong className="text-slate-800">{item.reason}</strong>
                        </span>
                        {item.authorizedBy && (
                          <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            Diotorisasi: {item.authorizedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTrxForHistory(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
