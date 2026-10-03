import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Building,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  FileText,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  Share2,
} from 'lucide-react';
import {
  ClinicProfile,
  SimrsTransaction,
  CashFlowEntry,
  ExpenseEntry,
  DebtEntry,
  ReceivableEntry,
  SimrsDepartment,
  UserAccount,
  EmployeeSalaryRecord,
  canViewSalaryDetails,
  normalizeToOfficialUnit,
  OFFICIAL_CLINIC_UNITS,
  isOwnerOrManager,
} from '../types';
import { formatRupiah, downloadCsv, formatDateId } from '../utils/formatters';
import { generateAuditPrintWhatsAppText } from '../utils/whatsappFormatter';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { SalaryPayrollView } from './SalaryPayrollView';

interface MonthlyReportViewProps {
  profile: ClinicProfile;
  simrsTransactions: SimrsTransaction[];
  cashFlowEntries: CashFlowEntry[];
  expenses: ExpenseEntry[];
  debts: DebtEntry[];
  receivables: ReceivableEntry[];
  salaries?: EmployeeSalaryRecord[];
  activeUser?: UserAccount;
  onNavigatePrint: (filterState?: { mode: 'shift' | 'harian' | 'bulanan'; date: string; shift: string; month: string }) => void;
  onAddSalary?: (record: EmployeeSalaryRecord) => void;
  onUpdateSalary?: (record: EmployeeSalaryRecord) => void;
  onDeleteSalary?: (id: string) => void;
}

const PRIMARY_POLIS: string[] = [
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
];

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  profile,
  simrsTransactions,
  cashFlowEntries,
  expenses,
  debts,
  receivables,
  salaries = [],
  activeUser,
  onNavigatePrint,
  onAddSalary,
  onUpdateSalary,
  onDeleteSalary,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'ringkasan' | 'payroll'>('ringkasan');
  // Filter states: Default to 'semua' or 'bulanan' so imported transactions are immediately integrated
  const [filterMode, setFilterMode] = useState<'semua' | 'shift' | 'harian' | 'rentang' | 'bulanan' | 'tahunan'>('semua');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (simrsTransactions.length > 0) {
      const dates = simrsTransactions.map(t => t.billingTime?.slice(0, 10)).filter(Boolean);
      dates.sort();
      return dates[dates.length - 1] || '2026-09-28';
    }
    return '2026-09-28';
  });
  const [selectedShift, setSelectedShift] = useState<string>('Semua');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>(() => {
    if (simrsTransactions.length > 0) {
      const dates = simrsTransactions.map(t => t.billingTime?.slice(0, 10)).filter(Boolean);
      dates.sort();
      return dates[dates.length - 1] || '2026-09-30';
    }
    return '2026-09-30';
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (simrsTransactions.length > 0) {
      const dates = simrsTransactions.map(t => t.billingTime?.slice(0, 7)).filter(Boolean);
      dates.sort();
      return dates[dates.length - 1] || '2026-09';
    }
    return '2026-09';
  });
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Otomatis update filter jika ada import baru transaksi SIMRS
  useEffect(() => {
    if (simrsTransactions.length > 0) {
      const dates = simrsTransactions.map(t => t.billingTime?.slice(0, 10)).filter(Boolean);
      dates.sort();
      const latest = dates[dates.length - 1];
      if (latest) {
        setSelectedDate(latest);
        setSelectedMonth(latest.slice(0, 7));
        setSelectedYear(latest.slice(0, 4));
        setEndDate(latest);
      }
    }
  }, [simrsTransactions]);

  // Filter transactions based on selection
  const filteredTransactions = useMemo(() => {
    return simrsTransactions.filter((t) => {
      const txDate = t.billingTime ? t.billingTime.slice(0, 10) : '';
      if (filterMode === 'semua') {
        return true;
      }
      if (filterMode === 'shift') {
        const matchesDate = txDate === selectedDate;
        const matchesShift = selectedShift === 'Semua' || t.shift === selectedShift;
        return matchesDate && matchesShift;
      }
      if (filterMode === 'harian') {
        return txDate === selectedDate;
      }
      if (filterMode === 'rentang') {
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
        return true;
      }
      if (filterMode === 'bulanan') {
        return txDate.startsWith(selectedMonth);
      }
      if (filterMode === 'tahunan') {
        return txDate.startsWith(selectedYear);
      }
      return true;
    });
  }, [simrsTransactions, filterMode, selectedDate, selectedShift, startDate, endDate, selectedMonth, selectedYear]);

  // Filter expenses based on selection
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = e.date ? e.date.slice(0, 10) : '';
      if (filterMode === 'semua') {
        return true;
      }
      if (filterMode === 'shift' || filterMode === 'harian') {
        return expDate === selectedDate;
      }
      if (filterMode === 'rentang') {
        if (startDate && expDate < startDate) return false;
        if (endDate && expDate > endDate) return false;
        return true;
      }
      if (filterMode === 'bulanan') {
        return expDate.startsWith(selectedMonth);
      }
      if (filterMode === 'tahunan') {
        return expDate.startsWith(selectedYear);
      }
      return true;
    });
  }, [expenses, filterMode, selectedDate, startDate, endDate, selectedMonth, selectedYear]);

  // Key totals
  const totalPatientCount = filteredTransactions.length;
  const totalRevenue = filteredTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalDiscount = filteredTransactions.reduce((acc, t) => acc + (t.discount || 0), 0);
  const totalCashCollected = filteredTransactions.reduce((acc, t) => acc + t.cashierReceived, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netIncome = totalCashCollected - totalExpenses;

  // Breakdown by payment method
  const totalCash = filteredTransactions
    .filter((t) => t.paymentMethod === 'Tunai')
    .reduce((acc, t) => acc + t.cashierReceived, 0);

  const totalTransfer = filteredTransactions
    .filter((t) => t.paymentMethod === 'Transfer Bank')
    .reduce((acc, t) => acc + t.cashierReceived, 0);

  const totalQris = filteredTransactions
    .filter((t) => t.paymentMethod === 'QRIS' || t.paymentMethod === 'Debit / EDC' || t.paymentMethod === 'Kartu Kredit')
    .reduce((acc, t) => acc + t.cashierReceived, 0);

  const totalBpjsPiutang = filteredTransactions
    .filter((t) => t.paymentMethod === 'Klaim BPJS' || t.paymentMethod === 'Asuransi Swasta' || t.paymentMethod === 'Piutang Pasien')
    .reduce((acc, t) => acc + t.totalAmount, 0);

  // Detailed breakdown per poliklinik
  const poliStats = useMemo(() => {
    const map: Record<
      string,
      {
        dept: string;
        patientCount: number;
        cash: number;
        transfer: number;
        qris: number;
        bpjs: number;
        discount: number;
        total: number;
      }
    > = {};

    // Initialize with primary requested departments
    PRIMARY_POLIS.forEach((dept) => {
      map[dept] = {
        dept,
        patientCount: 0,
        cash: 0,
        transfer: 0,
        qris: 0,
        bpjs: 0,
        discount: 0,
        total: 0,
      };
    });

    // Populate with actual transactions
    filteredTransactions.forEach((t) => {
      const deptKey = normalizeToOfficialUnit(t.department);
      if (!map[deptKey]) {
        map[deptKey] = {
          dept: deptKey,
          patientCount: 0,
          cash: 0,
          transfer: 0,
          qris: 0,
          bpjs: 0,
          discount: 0,
          total: 0,
        };
      }

      map[deptKey].patientCount += 1;
      map[deptKey].total += t.totalAmount;
      map[deptKey].discount += (t.discount || 0);

      if (t.paymentMethod === 'Tunai') {
        map[deptKey].cash += t.cashierReceived;
      } else if (t.paymentMethod === 'Transfer Bank') {
        map[deptKey].transfer += t.cashierReceived;
      } else if (
        t.paymentMethod === 'QRIS' ||
        t.paymentMethod === 'Debit / EDC' ||
        t.paymentMethod === 'Kartu Kredit'
      ) {
        map[deptKey].qris += t.cashierReceived;
      } else {
        // Klaim BPJS / Asuransi / Piutang
        map[deptKey].bpjs += t.totalAmount;
      }
    });

    // Return only departments that either are primary or have transactions
    return Object.values(map).filter(
      (item) => PRIMARY_POLIS.includes(item.dept) || item.patientCount > 0
    );
  }, [filteredTransactions]);

  // Label for current filter
  const filterLabel = useMemo(() => {
    if (filterMode === 'semua') {
      return `Semua Data (${filteredTransactions.length} Transaksi Terintegrasi)`;
    }
    if (filterMode === 'shift') {
      return `Shift ${selectedShift} - ${formatDateId(selectedDate)}`;
    }
    if (filterMode === 'harian') {
      return `Harian - ${formatDateId(selectedDate)}`;
    }
    if (filterMode === 'rentang') {
      return `Rentang: ${formatDateId(startDate)} s/d ${formatDateId(endDate)}`;
    }
    if (filterMode === 'bulanan') {
      const [year, month] = selectedMonth.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      return `Bulan ${dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    }
    if (filterMode === 'tahunan') {
      return `Tahun ${selectedYear}`;
    }
    return 'Semua Periode';
  }, [filterMode, selectedDate, selectedShift, startDate, endDate, selectedMonth, selectedYear, filteredTransactions.length]);

  // Single Click Tarik Excel / CSV
  const handleExportCsv = () => {
    const filename = `Laporan_Keuangan_${filterMode}_${selectedDate || selectedMonth}`.replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );

    const headers = [
      'Unit Poliklinik / Layanan',
      'Jumlah Pasien',
      'Tunai / Cash (Rp)',
      'Transfer Bank (Rp)',
      'QRIS / EDC (Rp)',
      'Klaim BPJS / Piutang (Rp)',
      'Total Pendapatan Unit (Rp)',
    ];

    const rows: (string | number)[][] = poliStats.map((p) => [
      p.dept,
      p.patientCount,
      p.cash,
      p.transfer,
      p.qris,
      p.bpjs,
      p.total,
    ]);

    // Add total row
    rows.push([
      'GRAND TOTAL PENDAPATAN',
      totalPatientCount,
      totalCash,
      totalTransfer,
      totalQris,
      totalBpjsPiutang,
      totalRevenue,
    ]);

    // Space and expenses
    rows.push([]);
    rows.push(['--- RINCIAN PENGELUARAN OPERASIONAL ---']);
    rows.push([
      'Tanggal',
      'Kategori',
      'Vendor / Rekanan',
      'Keterangan Keperluan',
      'Rekening Bayar',
      'No. Nota / Bukti',
      'Nominal (Rp)',
    ]);

    filteredExpenses.forEach((e) => {
      rows.push([
        e.date,
        e.category,
        e.vendorName || '-',
        e.title + (e.description ? ` (${e.description})` : ''),
        e.payFromAccount,
        e.invoiceNumber || '-',
        e.amount,
      ]);
    });

    rows.push(['TOTAL PENGELUARAN', '', '', '', '', '', totalExpenses]);
    rows.push(['SISA KAS BERSIH OPERASIONAL (PENERIMAAN - PENGELUARAN)', '', '', '', '', '', netIncome]);

    downloadCsv(filename, headers, rows);
  };

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [filteredExpenses]);

  const whatsAppText = useMemo(() => {
    const periodLabel =
      filterMode === 'shift'
        ? `${formatDateId(selectedDate)} (Shift: ${selectedShift})`
        : filterMode === 'harian'
        ? formatDateId(selectedDate)
        : `Bulan ${selectedMonth}`;

    const effectiveUser: UserAccount = activeUser || {
      id: 'default',
      name: 'Nadia',
      role: 'finance_manager',
      createdAt: '',
    };

    return generateAuditPrintWhatsAppText({
      profile,
      periodLabel,
      activeUser: effectiveUser,
      totalRevenue,
      totalReceived: totalCashCollected,
      totalCash,
      totalTransfer,
      totalQris,
      totalBpjs: totalBpjsPiutang,
      totalExpenses,
      netIncome,
      patientCount: totalPatientCount,
      poliSummary: poliStats,
      expensesSummary: Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount: Number(amount),
      })),
    });
  }, [
    profile,
    filterMode,
    selectedDate,
    selectedShift,
    selectedMonth,
    activeUser,
    totalRevenue,
    totalCashCollected,
    totalCash,
    totalTransfer,
    totalQris,
    totalBpjsPiutang,
    totalExpenses,
    netIncome,
    totalPatientCount,
    poliStats,
    expensesByCategory,
  ]);

  return (
    <div className="space-y-6">
      {/* Top Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveReportTab('ringkasan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeReportTab === 'ringkasan'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ringkasan Laba Rugi & Kasir</span>
        </button>

        <button
          onClick={() => setActiveReportTab('payroll')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeReportTab === 'payroll'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Rekapitulasi Gaji Karyawan</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-200 font-bold">
            Privasi Terproteksi
          </span>
        </button>
      </div>

      {activeReportTab === 'payroll' ? (
        <SalaryPayrollView
          salaries={salaries}
          activeUser={activeUser || { id: 'usr-2', name: 'Nadia, S.E.', role: 'finance_manager', username: 'keuangan' }}
          profile={profile}
          onAddSalary={onAddSalary}
          onUpdateSalary={onUpdateSalary}
          onDeleteSalary={onDeleteSalary}
        />
      ) : (
        <>
          {/* Top Header & Export/Print Actions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-teal-600" />
                Laporan Pendapatan & Pengeluaran Kasir
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowWhatsAppModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Tarik Excel / CSV</span>
              </button>
              <button
                onClick={() => onNavigatePrint({ mode: filterMode === 'semua' ? 'bulanan' : filterMode, date: selectedDate, shift: selectedShift, month: selectedMonth })}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF A4</span>
              </button>
            </div>
          </div>

      {/* Filter Selection Panel: Shift / Per Hari / Per Bulan */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
            <button
              onClick={() => setFilterMode('semua')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterMode === 'semua'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Data (Otomatis)
            </button>
            <button
              onClick={() => setFilterMode('bulanan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterMode === 'bulanan'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Bulan
            </button>
            <button
              onClick={() => setFilterMode('harian')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterMode === 'harian'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Hari
            </button>
            <button
              onClick={() => setFilterMode('shift')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterMode === 'shift'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Shift
            </button>
            <button
              onClick={() => setFilterMode('rentang')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterMode === 'rentang'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rentang Tanggal
            </button>
            <button
              onClick={() => setFilterMode('tahunan')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                filterMode === 'tahunan'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Tahun
            </button>
          </div>

          <div className="text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200/60 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>Menampilkan: {filterLabel}</span>
          </div>
        </div>

        {/* Dynamic Controls based on selected mode */}
        <div className="flex flex-wrap items-center gap-3">
          {filterMode === 'semua' && (
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl w-full">
              <span className="font-bold text-emerald-800">✓ Integrasi Otomatis Aktif:</span>
              <span>Seluruh {filteredTransactions.length} transaksi pendapatan kasir SIMRS dan pengeluaran terintegrasi langsung secara realtime.</span>
            </div>
          )}

          {filterMode === 'shift' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Tanggal:</span>
                <input
                  type="date"
                  value={selectedDate || ''}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Shift Kasir:</span>
                <div className="flex items-center gap-1">
                  {['Semua', 'Pagi', 'Siang', 'Malam'].map((shift) => (
                    <button
                      key={shift}
                      onClick={() => setSelectedShift(shift)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        selectedShift === shift
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {shift === 'Semua' ? 'Semua Shift' : `Shift ${shift}`}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {filterMode === 'harian' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Pilih Hari:</span>
                <input
                  type="date"
                  value={selectedDate || ''}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedDate(selectedDate)}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md cursor-pointer"
                >
                  Hari Terpilih ({selectedDate})
                </button>
              </div>
            </div>
          )}

          {filterMode === 'rentang' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Dari Tanggal:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Sampai Tanggal:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(`${selectedMonth}-01`);
                    setEndDate(selectedDate || '2026-09-30');
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md cursor-pointer"
                >
                  Bulan Berjalan Penuh
                </button>
              </div>
            </div>
          )}

          {filterMode === 'bulanan' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Pilih Bulan:</span>
              <select
                value={selectedMonth || '2026-09'}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
              >
                <option value="2026-09">September 2026</option>
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-07">Juli 2026</option>
              </select>
            </div>
          )}

          {filterMode === 'tahunan' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Pilih Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 font-bold"
              >
                <option value="2026">Tahun 2026</option>
                <option value="2025">Tahun 2025</option>
                <option value="2024">Tahun 2024</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Primary Key Indicator Cards - WITH COLOR AS REQUESTED */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Pasien (Sky / Biru Cerah) */}
        <div className="bg-sky-50/90 p-4 rounded-2xl border-2 border-sky-300 shadow-xs hover:border-sky-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Pasien</span>
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-300">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-sky-950 font-mono">{totalPatientCount}</span>
            <span className="text-xs text-sky-800 font-bold">Orang</span>
          </div>
          <span className="text-[11px] text-sky-700 mt-1 block font-medium">Pasien terlayani</span>
        </div>

        {/* Card 2: Total Billing (Orange Pastel) */}
        <div className="bg-orange-50/90 p-4 rounded-2xl border-2 border-orange-300 shadow-xs hover:border-orange-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Total Billing</span>
            <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center border border-orange-300">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-black text-orange-950 font-mono">{formatRupiah(totalRevenue)}</div>
          <span className="text-[11px] text-orange-700 mt-1 block font-medium">Tagihan SIMRS</span>
        </div>

        {/* Card 3: Total Diskon (Rose Pastel) */}
        <div className="bg-rose-50/90 p-4 rounded-2xl border-2 border-rose-300 shadow-xs hover:border-rose-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Diskon</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
              <span className="text-xs font-bold font-mono">%</span>
            </div>
          </div>
          <div className="mt-2 text-base font-black text-rose-900 font-mono">-{formatRupiah(totalDiscount)}</div>
          <span className="text-[11px] text-rose-700 mt-1 block font-medium">Potongan tarif</span>
        </div>

        {/* Card 4: Penerimaan Kasir (Hijau Cerah) */}
        <div className="bg-emerald-50/90 p-4 rounded-2xl border-2 border-emerald-400 shadow-xs hover:border-emerald-500 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Penerimaan</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-black text-emerald-950 font-mono">{formatRupiah(totalCashCollected)}</div>
          <span className="text-[11px] text-emerald-700 mt-1 block font-medium">Kasir diterima</span>
        </div>

        {/* Card 5: Total Pengeluaran (Merah Cerah) */}
        <div className="bg-amber-50/90 p-4 rounded-2xl border-2 border-amber-300 shadow-xs hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pengeluaran</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-base font-black text-amber-950 font-mono">{formatRupiah(totalExpenses)}</div>
          <span className="text-[11px] text-amber-700 mt-1 block font-medium">{filteredExpenses.length} nota beban</span>
        </div>

        {/* Card 6: Sisa Kas Bersih (Indigo / Violet Pastel) */}
        <div className="bg-indigo-50/90 p-4 rounded-2xl border-2 border-indigo-300 shadow-xs hover:border-indigo-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Sisa Bersih</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center border border-indigo-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className={`mt-2 text-base font-black font-mono ${netIncome >= 0 ? 'text-indigo-950' : 'text-rose-700'}`}>
            {formatRupiah(netIncome)}
          </div>
          <span className="text-[11px] text-indigo-700 mt-1 block font-medium">Penerimaan - Beban</span>
        </div>
      </div>

      {/* TABEL 1: Rincian Pendapatan per Poliklinik & Metode Pembayaran */}
      <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-teal-100 bg-teal-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-700" />
              1. Rekap Pendapatan per Poliklinik & Metode Pembayaran
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100/90 text-emerald-900 border border-emerald-300 font-medium">
              Tunai: <strong>{formatRupiah(totalCash)}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-100/90 text-sky-900 border border-sky-300 font-medium">
              Transfer: <strong>{formatRupiah(totalTransfer)}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-100/90 text-purple-900 border border-purple-300 font-medium">
              QRIS/EDC: <strong>{formatRupiah(totalQris)}</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Unit Poliklinik</th>
                <th className="px-3 py-3 text-center">Pasien</th>
                <th className="px-4 py-3 text-right">Tunai / Cash</th>
                <th className="px-4 py-3 text-right">Transfer Bank</th>
                <th className="px-4 py-3 text-right">QRIS / EDC</th>
                <th className="px-4 py-3 text-right">Klaim BPJS / Piutang</th>
                <th className="px-4 py-3 text-right bg-rose-50 text-rose-800">Diskon</th>
                <th className="px-4 py-3 text-right font-black">Total Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {poliStats.map((item) => (
                <tr
                  key={item.dept}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.patientCount > 0 ? 'text-slate-800' : 'text-slate-400 bg-slate-50/30'
                  }`}
                >
                  <td className="px-4 py-3 font-semibold flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.patientCount > 0 ? 'bg-teal-500' : 'bg-slate-300'
                      }`}
                    ></span>
                    {item.dept}
                  </td>
                  <td className="px-3 py-3 text-center font-bold">
                    {item.patientCount > 0 ? (
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md">
                        {item.patientCount}
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {item.cash > 0 ? formatRupiah(item.cash) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {item.transfer > 0 ? formatRupiah(item.transfer) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {item.qris > 0 ? formatRupiah(item.qris) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-700">
                    {item.bpjs > 0 ? formatRupiah(item.bpjs) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-rose-700 bg-rose-50/30">
                    {item.discount > 0 ? `-${formatRupiah(item.discount)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-slate-900">
                    {formatRupiah(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-200">
              <tr>
                <td className="px-4 py-3 uppercase tracking-wider">TOTAL KESELURUHAN</td>
                <td className="px-3 py-3 text-center text-sm font-black text-teal-800">
                  {totalPatientCount}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatRupiah(totalCash)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatRupiah(totalTransfer)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatRupiah(totalQris)}</td>
                <td className="px-4 py-3 text-right font-mono text-amber-800">
                  {formatRupiah(totalBpjsPiutang)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-rose-800 bg-rose-50/50">
                  -{formatRupiah(totalDiscount)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-black text-teal-900">
                  {formatRupiah(totalRevenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* TABEL 2: Rincian Pengeluaran Operasional */}
      <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-rose-100 bg-rose-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              2. Rincian Pengeluaran Operasional & Bukti Nota
            </h3>
          </div>

          <div className="text-xs font-bold text-rose-800 bg-rose-100/90 px-3 py-1 rounded-lg border border-rose-300">
            Total Pengeluaran: {formatRupiah(totalExpenses)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Vendor / Suplier</th>
                <th className="px-4 py-3">Rincian Keperluan</th>
                <th className="px-4 py-3">Sumber Dana</th>
                <th className="px-4 py-3">Bukti Nota</th>
                <th className="px-4 py-3 text-right font-black">Nominal (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => {
                const isSalary = exp.category === 'Gaji & Tunjangan Staf';
                const hasDetailAccess = canViewSalaryDetails(activeUser);
                const isShielded = isSalary && !hasDetailAccess;

                const displayTitle = isShielded
                  ? 'Rekapitulasi Total Beban Gaji Seluruh Karyawan'
                  : exp.title;

                const displayDesc = isShielded
                  ? '🔒 Rincian gaji terproteksi otorisasi Pimpinan.'
                  : exp.description;

                const displayVendor = isShielded
                  ? 'Seluruh Staf Medis & Non-Medis'
                  : exp.vendorName || '-';

                return (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{exp.date}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {displayVendor}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="font-medium">{displayTitle}</div>
                      {displayDesc && (
                        <div className={`text-[11px] mt-0.5 ${isShielded ? 'text-amber-700 font-semibold' : 'text-slate-400'}`}>
                          {displayDesc}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{exp.payFromAccount}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      {isShielded ? '🔒 Terproteksi' : exp.invoiceNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-rose-700">
                      {formatRupiah(exp.amount)}
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada transaksi pengeluaran pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={6} className="px-4 py-3 uppercase tracking-wider text-right">
                    TOTAL BEBAN PENGELUARAN
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-black text-rose-800">
                    {formatRupiah(totalExpenses)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="Bagikan Laporan Pendapatan & Pengeluaran ke WhatsApp"
        recipientNote="Pimpinan & Manajemen Klinik"
        content={whatsAppText}
      />
      </>
    )}
  </div>
  );
};
