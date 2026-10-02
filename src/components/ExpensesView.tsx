import React, { useState } from 'react';
import {
  TrendingDown,
  Upload,
  FileSpreadsheet,
  Plus,
  Filter,
  FileText,
  Eye,
  CheckCircle,
  Clock,
  Trash2,
  Paperclip,
  Check,
  X,
  Search,
  Building,
  Edit3,
} from 'lucide-react';
import { ExpenseEntry, ExpenseCategory, UserAccount, ClinicProfile, Vendor, GoogleDatabaseStatus, canViewSalaryDetails, getClinicAccountOptions } from '../types';
import { formatRupiah, downloadCsv, formatDateId } from '../utils/formatters';
import { ReceiptModal } from './ReceiptModal';
import { uploadFileToDrive } from '../services/googleWorkspace';
import { DateRangeFilterBar, DateFilterState, matchDateFilter } from './DateRangeFilterBar';

interface ExpensesViewProps {
  expenses: ExpenseEntry[];
  profile: ClinicProfile;
  activeUser: UserAccount;
  vendors?: Vendor[];
  googleStatus?: GoogleDatabaseStatus;
  onAddExpense: (expense: ExpenseEntry) => void;
  onApproveExpense: (expenseId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateExpense?: (expense: ExpenseEntry) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  profile,
  activeUser,
  vendors = [],
  googleStatus,
  onAddExpense,
  onApproveExpense,
  onDeleteExpense,
  onUpdateExpense,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  // Date Filter State (Request 3)
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    mode: 'today',
    startDate: '2026-09-11',
    endDate: '2026-09-11',
    month: '2026-09',
    year: '2026',
  });

  // Receipt Modal viewer state
  const [activeReceipt, setActiveReceipt] = useState<ExpenseEntry | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseEntry | null>(null);

  // Add Expense Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Pembelian Obat & Alkes' as ExpenseCategory,
    title: '',
    description: '',
    amount: '',
    payFromAccount: 'Kas Kasir (Tunai)',
    vendorName: '',
    invoiceNumber: '',
    receiptUrl: '',
    receiptFileName: '',
  });

  const canApprove = activeUser.role === 'super_admin' || activeUser.role === 'finance_manager';

  // Routine Expenses Calculations (Filtered by dateFilter)
  const routineStats = {
    snackDpjp: expenses.filter(e => (e.category === 'Snack DPJP (Dokter Penanggung Jawab)' || e.category === 'Snack DPJP') && matchDateFilter(e.date, dateFilter)).reduce((sum, e) => sum + e.amount, 0),
    airHd: expenses.filter(e => e.category === 'Air HD (Water Treatment RO Hemodialisa)' && matchDateFilter(e.date, dateFilter)).reduce((sum, e) => sum + e.amount, 0),
    oksigen: expenses.filter(e => e.category === 'Oksigen Medis (Tabung O2)' && matchDateFilter(e.date, dateFilter)).reduce((sum, e) => sum + e.amount, 0),
    airGalon: expenses.filter(e => e.category === 'Air Galon Minum Klinik' && matchDateFilter(e.date, dateFilter)).reduce((sum, e) => sum + e.amount, 0),
    alatKebersihan: expenses.filter(e => (e.category === 'Alat & Bahan Kebersihan' || e.category === 'Dana & Bahan Kebersihan (Mingguan)') && matchDateFilter(e.date, dateFilter)).reduce((sum, e) => sum + e.amount, 0),
    makanHd: expenses.filter(e => e.category === 'Makan & Nutrisi Pasien HD' && matchDateFilter(e.date, dateFilter)).reduce((sum, e) => sum + e.amount, 0),
    lainLain: expenses.filter(e => (e.category === 'Lain-lain' || e.category === 'Beban Rutin Lain-lain' || e.category === 'Beban Lain-lain') && matchDateFilter(e.date, dateFilter)).reduce((sum, e) => sum + e.amount, 0),
  };

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      category: 'Pembelian Obat & Alkes',
      title: '',
      description: '',
      amount: '',
      payFromAccount: 'Kas Kasir (Tunai)',
      vendorName: '',
      invoiceNumber: '',
      receiptUrl: '',
      receiptFileName: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (expense: ExpenseEntry) => {
    setEditingExpenseId(expense.id);
    setFormData({
      date: expense.date,
      category: expense.category,
      title: expense.title,
      description: expense.description,
      amount: String(expense.amount),
      payFromAccount: expense.payFromAccount,
      vendorName: expense.vendorName || '',
      invoiceNumber: expense.invoiceNumber || '',
      receiptUrl: expense.receiptUrl || '',
      receiptFileName: expense.receiptFileName || '',
    });
    setShowAddModal(true);
  };

  const handleQuickRoutine = (type: 'snack' | 'air_hd' | 'o2' | 'galon' | 'kebersihan' | 'makan_hd' | 'lain_lain') => {
    setEditingExpenseId(null);
    if (type === 'snack') {
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        category: 'Snack DPJP (Dokter Penanggung Jawab)',
        title: 'Snack & Konsumsi DPJP dr. Bambang Pudjijanto (Unit HD)',
        description: 'Snack box premium & buah potong visit DPJP hemodialisa sesi pagi',
        amount: '85000',
        payFromAccount: 'Kas Kasir (Tunai)',
        vendorName: 'Bakery & Snack Klinik Mandiri',
        invoiceNumber: `SNACK-DPJP-${new Date().toISOString().slice(5, 10).replace('-', '')}`,
        receiptUrl: '',
        receiptFileName: '',
      });
    } else if (type === 'air_hd') {
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        category: 'Air HD (Water Treatment RO Hemodialisa)',
        title: 'Garam Industri Softener RO & Filter Dialisis',
        description: 'Pengadaan garam murni non-yodium regenerasi resin softener mesin RO dialisis',
        amount: '1750000',
        payFromAccount: 'Bank BCA Klinik',
        vendorName: 'PT Karya Gemilang Bimasakti',
        invoiceNumber: `RO-SALT-${Date.now().toString().slice(-4)}`,
        receiptUrl: '',
        receiptFileName: '',
      });
    } else if (type === 'o2') {
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        category: 'Oksigen Medis (Tabung O2)',
        title: 'Isi Ulang Tabung Oksigen Medis 6m3 Unit HD & IGD',
        description: 'Refill tabung O2 medis kemurnian tinggi 99.5% untuk pasien hemodialisa',
        amount: '480000',
        payFromAccount: 'Kas Kasir (Tunai)',
        vendorName: 'Alkes Tn. Joyo (Bukan PT / Perorangan)',
        invoiceNumber: `O2-JOYO-${Date.now().toString().slice(-4)}`,
        receiptUrl: '',
        receiptFileName: '',
      });
    } else if (type === 'galon') {
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        category: 'Air Galon Minum Klinik',
        title: 'Pengadaan Air Minum Galon Ruang Tunggu & Unit HD',
        description: 'Air mineral galon steril dispenser ruang nakes dan ruang tunggu pasien',
        amount: '300000',
        payFromAccount: 'Kas Kasir (Tunai)',
        vendorName: 'Agen Air Mineral Barokah',
        invoiceNumber: `GALON-${Date.now().toString().slice(-4)}`,
        receiptUrl: '',
        receiptFileName: '',
      });
    } else if (type === 'kebersihan') {
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        category: 'Alat & Bahan Kebersihan',
        title: 'Pengadaan Alat & Bahan Kebersihan Medis Klinik',
        description: 'Klorin desinfeksi lantai HD, karbol wangi, sabun cuci tangan chlorhexidine, kantong kuning medis B3',
        amount: '450000',
        payFromAccount: 'Kas Kasir (Tunai)',
        vendorName: 'PT Bersama Kita Melangkah',
        invoiceNumber: `CLN-${new Date().toISOString().slice(5, 10).replace('-', '')}`,
        receiptUrl: '',
        receiptFileName: '',
      });
    } else if (type === 'makan_hd') {
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        category: 'Makan & Nutrisi Pasien HD',
        title: 'Katering Nutrisi Pasien Hemodialisa Sesi 1 & 2',
        description: 'Menu diet khusus ginjal (rendah kalium/garam/fosfat) 16 porsi pasien dialisis',
        amount: '560000',
        payFromAccount: 'Kas Kasir (Tunai)',
        vendorName: 'Katering Sehat Dietetik Medika',
        invoiceNumber: `KAT-HD-${Date.now().toString().slice(-4)}`,
        receiptUrl: '',
        receiptFileName: '',
      });
    } else if (type === 'lain_lain') {
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        category: 'Lain-lain',
        title: 'Beban Operasional Rutin Lain-lain',
        description: 'Pengeluaran operasional klinik rutin lainnya',
        amount: '250000',
        payFromAccount: 'Kas Kasir (Tunai)',
        vendorName: 'Operasional Klinik',
        invoiceNumber: `LAIN-${Date.now().toString().slice(-4)}`,
        receiptUrl: '',
        receiptFileName: '',
      });
    }
    setShowAddModal(true);
  };

  const filtered = expenses.filter((e) => {
    const matchSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vendorName && e.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
    const matchStatus = selectedStatus === 'all' || e.status === selectedStatus;
    const matchDate = matchDateFilter(e.date, dateFilter);
    return matchSearch && matchCat && matchStatus && matchDate;
  });

  const totalExpense = filtered.reduce((acc, e) => acc + e.amount, 0);
  const approvedTotal = filtered
    .filter((e) => e.status === 'approved')
    .reduce((acc, e) => acc + e.amount, 0);
  const pendingCount = filtered.filter((e) => e.status === 'pending').length;

  // Single click export to Excel
  const handleExportCsv = () => {
    const headers = [
      'Tanggal Pengeluaran',
      'Kategori Beban',
      'Judul Pengeluaran',
      'Keterangan Lengkap',
      'Penerima / Vendor',
      'No. Nota / Faktur',
      'Sumber Rekening Bayar',
      'Nominal (Rp)',
      'Status Nota / Bukti',
      'Status Approval',
      'Disetujui Oleh',
      'Petugas Penginput',
    ];

    const rows = filtered.map((e) => [
      e.date,
      e.category,
      e.title,
      e.description,
      e.vendorName || '-',
      e.invoiceNumber || '-',
      e.payFromAccount,
      e.amount,
      e.receiptUrl ? 'Ada Bukti Terlampir' : 'Tanpa Bukti',
      e.status.toUpperCase(),
      e.approvedBy || '-',
      e.createdBy,
    ]);

    downloadCsv(`Laporan_Pengeluaran_Klinik_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        receiptUrl: dataUrl,
        receiptFileName: file.name,
      }));

      // If Google Drive is connected, upload directly to the receipts folder
      if (googleStatus?.isConnected) {
        try {
          setIsUploadingToDrive(true);
          const uploaded = await uploadFileToDrive(
            file,
            `Nota_${Date.now()}_${file.name}`,
            file.type || 'application/octet-stream',
            googleStatus.receiptsFolderId || googleStatus.driveFolderId
          );
          if (uploaded.webViewLink) {
            setFormData((prev) => ({
              ...prev,
              receiptUrl: uploaded.webViewLink,
              receiptFileName: uploaded.name,
            }));
          }
        } catch (err) {
          console.warn('Gagal upload ke Google Drive, file disimpan secara lokal:', err);
        } finally {
          setIsUploadingToDrive(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formData.amount) || 0;
    if (amountVal <= 0) return;

    const isAutoApprove = canApprove;

    const newExpense: ExpenseEntry = {
      id: `exp-${Date.now()}`,
      date: formData.date,
      category: formData.category,
      title: formData.title,
      description: formData.description,
      amount: amountVal,
      payFromAccount: formData.payFromAccount,
      vendorName: formData.vendorName,
      invoiceNumber: formData.invoiceNumber,
      receiptUrl: formData.receiptUrl,
      receiptFileName: formData.receiptFileName,
      status: isAutoApprove ? 'approved' : 'pending',
      approvedBy: isAutoApprove ? activeUser.name : undefined,
      createdBy: activeUser.name,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    if (editingExpenseId) {
      const existing = expenses.find((e) => e.id === editingExpenseId);
      if (existing) {
        const updated: ExpenseEntry = {
          ...existing,
          date: formData.date,
          category: formData.category,
          title: formData.title,
          description: formData.description,
          amount: amountVal,
          payFromAccount: formData.payFromAccount,
          vendorName: formData.vendorName,
          invoiceNumber: formData.invoiceNumber,
          receiptUrl: formData.receiptUrl,
          receiptFileName: formData.receiptFileName,
        };
        onUpdateExpense?.(updated);
      }
    } else {
      onAddExpense(newExpense);
    }

    setShowAddModal(false);
    setEditingExpenseId(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      category: 'Pembelian Obat & Alkes',
      title: '',
      description: '',
      amount: '',
      payFromAccount: 'Kas Kasir (Tunai)',
      vendorName: '',
      invoiceNumber: '',
      receiptUrl: '',
      receiptFileName: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengeluaran Klinik & Bukti Nota / Invoice
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            title="Export Rekap Pengeluaran ke CSV/Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Tarik Excel / CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran & Nota</span>
          </button>
        </div>
      </div>

      {/* Universal Date Filter Component (Request 3) */}
      <DateRangeFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        label="Filter Periode Pengeluaran & Nota"
      />

      {/* Summary KPI Cards - WITH COLOR FRAMES AS REQUESTED (Request 2) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Beban: UANG KELUAR -> MERAH CERAH */}
        <div className="bg-rose-50/80 p-4 rounded-2xl border-2 border-rose-300 shadow-xs hover:border-rose-400 transition-colors">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Beban Terdata (Uang Keluar)</span>
          <p className="text-xl font-black text-rose-950 font-mono mt-1">
            {formatRupiah(totalExpense)}
          </p>
          <span className="text-[11px] text-rose-800/80 mt-0.5 block font-medium">
            {filtered.length} transaksi pada filter aktif
          </span>
        </div>

        {/* Disetujui: HIJAU CERAH */}
        <div className="bg-emerald-50/80 p-4 rounded-2xl border-2 border-emerald-400 shadow-xs hover:border-emerald-500 transition-colors">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Pengeluaran Disetujui (Sah Masuk Buku)</span>
          <p className="text-xl font-black text-emerald-950 font-mono mt-1">
            {formatRupiah(approvedTotal)}
          </p>
          <span className="text-[11px] text-emerald-800/80 mt-0.5 block font-medium">
            Sah masuk buku laporan rugi laba
          </span>
        </div>

        {/* Menunggu Otorisasi: ORANGE/AMBER PASTEL */}
        <div className="bg-amber-50/80 p-4 rounded-2xl border-2 border-amber-300 shadow-xs hover:border-amber-400 transition-colors">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Menunggu Otorisasi Supervisor</span>
          <p className="text-xl font-black text-amber-950 font-mono mt-1">
            {pendingCount} Transaksi
          </p>
          <span className="text-[11px] text-amber-800/80 mt-0.5 block font-medium">
            {canApprove ? 'Anda memiliki akses otorisasi' : 'Perlu persetujuan Manajer/Direktur'}
          </span>
        </div>
      </div>

      {/* Routine Expenses Monitor Cards (Snack DPJP, Air HD, Oksigen, Air Galon, Alat & Bahan Kebersihan, Makan Pasien HD, Lain-lain) */}
      <div className="bg-gradient-to-br from-teal-50/40 to-white rounded-2xl border-2 border-teal-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
              Pengeluaran Rutin Terpantau Klinik
            </h3>
            <p className="text-xs text-slate-500">
              Monitoring 7 pos pengeluaran klinik: Snack DPJP, Air HD RO, Oksigen Medis, Air Galon, Alat & Bahan Kebersihan, Makan Pasien HD, dan Lain-lain.
            </p>
          </div>
          <span className="text-[11px] font-bold text-teal-900 bg-teal-100 px-2.5 py-1 rounded-full border border-teal-300 self-start sm:self-auto">
            Klik "+ Catat Cepat" untuk auto-fill form
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* 1. Snack DPJP */}
          <div className="bg-amber-50/50 p-3 rounded-xl border-2 border-amber-200 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Snack DPJP
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {formatRupiah(routineStats.snackDpjp)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Visit Dokter HD</span>
            </div>
            <button
              onClick={() => handleQuickRoutine('snack')}
              className="mt-3 w-full py-1 px-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              + Catat Cepat
            </button>
          </div>

          {/* 2. Air HD (Water Treatment RO) */}
          <div className="bg-cyan-50/50 p-3 rounded-xl border-2 border-cyan-200 shadow-2xs hover:border-cyan-400 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider">
                Air HD (RO)
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {formatRupiah(routineStats.airHd)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Garam & Filter RO</span>
            </div>
            <button
              onClick={() => handleQuickRoutine('air_hd')}
              className="mt-3 w-full py-1 px-1.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              + Catat Cepat
            </button>
          </div>

          {/* 3. Oksigen Medis */}
          <div className="bg-blue-50/50 p-3 rounded-xl border-2 border-blue-200 shadow-2xs hover:border-blue-400 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                Oksigen Medis
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {formatRupiah(routineStats.oksigen)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Refill Tabung O2</span>
            </div>
            <button
              onClick={() => handleQuickRoutine('o2')}
              className="mt-3 w-full py-1 px-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              + Catat Cepat
            </button>
          </div>

          {/* 4. Air Galon Minum */}
          <div className="bg-emerald-50/50 p-3 rounded-xl border-2 border-emerald-200 shadow-2xs hover:border-emerald-400 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Air Galon Minum
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {formatRupiah(routineStats.airGalon)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Dispenser Pasien</span>
            </div>
            <button
              onClick={() => handleQuickRoutine('galon')}
              className="mt-3 w-full py-1 px-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              + Catat Cepat
            </button>
          </div>

          {/* 5. Alat & Bahan Kebersihan */}
          <div className="bg-purple-50/50 p-3 rounded-xl border-2 border-purple-200 shadow-2xs hover:border-purple-400 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                Alat & Bahan Kebersihan
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {formatRupiah(routineStats.alatKebersihan)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Bahan Pembersih</span>
            </div>
            <button
              onClick={() => handleQuickRoutine('kebersihan')}
              className="mt-3 w-full py-1 px-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              + Catat Cepat
            </button>
          </div>

          {/* 6. Makan Pasien HD */}
          <div className="bg-rose-50/50 p-3 rounded-xl border-2 border-rose-200 shadow-2xs hover:border-rose-400 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                Makan Pasien HD
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {formatRupiah(routineStats.makanHd)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Diet Ginjal Sesi 1-2</span>
            </div>
            <button
              onClick={() => handleQuickRoutine('makan_hd')}
              className="mt-3 w-full py-1 px-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              + Catat Cepat
            </button>
          </div>

          {/* 7. Lain-lain */}
          <div className="bg-slate-100/70 p-3 rounded-xl border-2 border-slate-300 shadow-2xs hover:border-slate-400 transition-all flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Lain-lain
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">
                {formatRupiah(routineStats.lainLain)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">Beban Operasional</span>
            </div>
            <button
              onClick={() => handleQuickRoutine('lain_lain')}
              className="mt-3 w-full py-1 px-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
            >
              + Catat Cepat
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari judul, vendor, atau no. nota/invoice..."
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Kategori:</span>
            <select
              value={selectedCategory || 'all'}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1 px-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="Pembelian Obat & Alkes">Pembelian Obat & Alkes</option>
              <option value="Jasa Medis & Honor Dokter">Jasa Medis & Honor Dokter</option>
              <option value="Gaji & Tunjangan Staf">Gaji & Tunjangan Staf</option>
              <option value="Listrik, Air & Internet">Listrik, Air & Internet</option>
              <option value="Pemeliharaan Alat Medis & Sarana">Pemeliharaan Alat Medis</option>
              <option value="Pengelolaan Limbah Medis B3">Pengelolaan Limbah Medis B3</option>
              <option value="Logistik & ATK Klinik">Logistik & ATK Klinik</option>
              <option value="Pajak, Izin & Legalitas">Pajak & Izin</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-500">Status:</span>
            <select
              value={selectedStatus || 'all'}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-1 px-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">Semua Status</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="pending">Menunggu Persetujuan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Tanggal & Vendor</th>
                <th className="py-3 px-4">Kategori & Judul Beban</th>
                <th className="py-3 px-4">Akun Sumber Bayar</th>
                <th className="py-3 px-4 text-center">Bukti Nota / Invoice</th>
                <th className="py-3 px-4 text-right">Nominal Beban</th>
                <th className="py-3 px-4 text-center">Otorisasi</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi pengeluaran yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isSalary = item.category === 'Gaji & Tunjangan Staf';
                  const hasDetailAccess = canViewSalaryDetails(activeUser);
                  const isShielded = isSalary && !hasDetailAccess;

                  const displayTitle = isShielded
                    ? 'Rekapitulasi Total Beban Gaji Seluruh Karyawan'
                    : item.title;

                  const displayDesc = isShielded
                    ? '🔒 Rincian per nama karyawan terproteksi otorisasi khusus Pimpinan & Bagian Keuangan.'
                    : item.description;

                  const displayVendor = isShielded
                    ? 'Seluruh Karyawan & Medis (Payroll Kolektif)'
                    : item.vendorName || '-';

                  const hasReceipt = Boolean(item.receiptUrl);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{item.date}</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {displayVendor}
                        </span>
                        {item.invoiceNumber && !isShielded && (
                          <span className="text-[10px] font-mono text-slate-400 block">
                            No: {item.invoiceNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-100 mb-1">
                          {item.category}
                        </span>
                        <p className="font-semibold text-slate-900 leading-snug">{displayTitle}</p>
                        <p className={`text-[11px] max-w-sm truncate mt-0.5 ${isShielded ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
                          {displayDesc}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.payFromAccount}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          Oleh: {item.createdBy}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isShielded ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Slip gaji per karyawan hanya bisa dibuka oleh Pimpinan & Keuangan">
                            🔒 Terkunci
                          </span>
                        ) : hasReceipt ? (
                          <button
                            onClick={() => setActiveReceipt(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-[11px] font-semibold transition-colors"
                            title="Klik untuk melihat bukti foto / nota"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Nota</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Tanpa Bukti</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatRupiah(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.status === 'approved' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </span>
                            <span className="block text-[9px] text-slate-400 mt-0.5 truncate max-w-[100px]">
                              {item.approvedBy}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mb-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                            {canApprove && (
                              <button
                                onClick={() => onApproveExpense(item.id)}
                                className="block mx-auto text-[10px] font-bold text-emerald-700 hover:text-emerald-800 underline"
                              >
                                Setujui
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {canApprove ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                              title="Edit Pengeluaran"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpenseToDelete(item)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Hapus Pengeluaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Terkunci</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Visual Viewer Modal */}
      {activeReceipt && (
        <ReceiptModal
          isOpen={Boolean(activeReceipt)}
          onClose={() => setActiveReceipt(null)}
          receiptUrl={activeReceipt.receiptUrl}
          receiptFileName={activeReceipt.receiptFileName}
          title={activeReceipt.title}
          vendorName={activeReceipt.vendorName}
          invoiceNumber={activeReceipt.invoiceNumber}
          amount={activeReceipt.amount}
          date={activeReceipt.date}
        />
      )}

      {/* Modal Input Pengeluaran & Upload Bukti Nota */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingExpenseId ? 'Edit Catatan Pengeluaran & Nota' : 'Catat Pengeluaran & Upload Bukti Nota/Invoice'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal Beban</label>
                  <input
                    type="date"
                    required
                    value={formData.date || ''}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kategori Akun</label>
                  <select
                    value={formData.category || 'Pembelian Obat & Alkes'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Pembelian Obat & Alkes">Pembelian Obat & Alkes</option>
                    <option value="Jasa Medis & Honor Dokter">Jasa Medis & Honor Dokter</option>
                    <option value="Gaji & Tunjangan Staf">Gaji & Tunjangan Staf</option>
                    <option value="Listrik, Air & Internet">Listrik, Air & Internet</option>
                    <option value="Pemeliharaan Alat Medis & Sarana">Pemeliharaan Alat Medis & Sarana</option>
                    <option value="Pengelolaan Limbah Medis B3">Pengelolaan Limbah B3</option>
                    <option value="Logistik & ATK Klinik">Logistik & ATK Klinik</option>
                    <option value="Pajak, Izin & Legalitas">Pajak, Izin & Legalitas</option>
                    <option value="Snack DPJP (Dokter Penanggung Jawab)">Snack DPJP</option>
                    <option value="Air HD (Water Treatment RO Hemodialisa)">Air HD (RO Hemodialisa)</option>
                    <option value="Oksigen Medis (Tabung O2)">Oksigen Medis (Tabung O2)</option>
                    <option value="Air Galon Minum Klinik">Air Galon Minum Klinik</option>
                    <option value="Alat & Bahan Kebersihan">Alat & Bahan Kebersihan</option>
                    <option value="Makan & Nutrisi Pasien HD">Makan & Nutrisi Pasien HD</option>
                    <option value="Lain-lain">Lain-lain</option>
                    <option value="Beban Lain-lain">Beban Lain-lain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Judul Pengeluaran</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pembelian Vaksin Influenza 20 Vial"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg font-semibold focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Vendor / Penerima</label>
                  <input
                    type="text"
                    list="registered-vendors-list"
                    placeholder="e.g. PT Kimia Farma Trading"
                    value={formData.vendorName || ''}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                  <datalist id="registered-vendors-list">
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name} ({v.category} - {v.city})
                      </option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">No. Faktur / Kuitansi</label>
                  <input
                    type="text"
                    placeholder="e.g. FP-2026/KF-091"
                    value={formData.invoiceNumber || ''}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nominal Beban (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4500000"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sumber Rekening Kas</label>
                  <select
                    value={formData.payFromAccount || 'Kas Kasir (Tunai)'}
                    onChange={(e) => setFormData({ ...formData, payFromAccount: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    {getClinicAccountOptions(profile).map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan alokasi kebutuhan unit/instalasi..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Upload Nota / File Picker */}
              <div className="p-3 border border-dashed border-slate-300 rounded-xl bg-slate-50/70">
                <label className="block font-semibold text-slate-700 mb-1">
                  Upload Foto Bukti Nota / Kuitansi / Struk Resmi:
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Foto / Dokumen</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {formData.receiptFileName || 'Belum ada file dipilih'}
                  </span>
                </div>

                {isUploadingToDrive && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
                    <span className="w-3 h-3 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Mengunggah berkas ke Google Drive...</span>
                  </div>
                )}

                {!isUploadingToDrive && formData.receiptUrl && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {formData.receiptUrl.includes('drive.google.com')
                        ? 'Tersimpan otomatis di Google Drive: '
                        : 'File siap dilampirkan: '}
                      {formData.receiptFileName}
                    </span>
                  </div>
                )}
              </div>

              {(!formData.title.trim() || !formData.amount || parseFloat(formData.amount) <= 0) && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  ⚠️ <strong>Data belum komplit:</strong> Judul pengeluaran dan nominal wajib diisi sebelum data dapat disimpan.
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!formData.title.trim() || !formData.amount || parseFloat(formData.amount) <= 0}
                  className={`px-4 py-2 font-semibold rounded-xl text-xs shadow-xs transition-all ${
                    !formData.title.trim() || !formData.amount || parseFloat(formData.amount) <= 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-98 cursor-pointer'
                  }`}
                >
                  {editingExpenseId ? 'Simpan Perubahan' : 'Simpan Pengeluaran & Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* In-App Confirmation Modal: Delete Expense */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Pengeluaran?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus data pengeluaran <strong>&quot;{expenseToDelete.title}&quot;</strong> senilai <strong>{formatRupiah(expenseToDelete.amount)}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
