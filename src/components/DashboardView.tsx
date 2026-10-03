import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  PlusCircle,
  Receipt,
  CheckCircle2,
  Calendar,
  Users,
  Building,
  Lock,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import {
  ClinicProfile,
  SimrsTransaction,
  CashFlowEntry,
  ExpenseEntry,
  DebtEntry,
  ReceivableEntry,
  DueNotification,
  UserAccount,
  isOwnerOrManager,
  isDateAllowedForStaff,
  getStaffAllowedDateWindow,
  normalizeToOfficialUnit,
  CLINIC_UNIT_CONFIG,
  OFFICIAL_CLINIC_UNITS,
} from '../types';
import { formatRupiah, downloadCsv } from '../utils/formatters';
import { ModernAreaTrendChart, ModernDonutChart } from './ModernCharts';
import { DateRangeFilterBar, DateFilterState, matchDateFilter } from './DateRangeFilterBar';

interface DashboardViewProps {
  profile: ClinicProfile;
  simrsTransactions: SimrsTransaction[];
  cashFlowEntries: CashFlowEntry[];
  expenses: ExpenseEntry[];
  debts: DebtEntry[];
  receivables: ReceivableEntry[];
  notifications: DueNotification[];
  activeUser?: UserAccount | null;
  onNavigateTab: (tabId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  simrsTransactions,
  cashFlowEntries,
  expenses,
  debts,
  receivables,
  notifications,
  activeUser,
  onNavigateTab,
}) => {
  const isSuperOrManager = isOwnerOrManager(activeUser);
  const refDate = '2026-09-16';
  const staffWindow = getStaffAllowedDateWindow(refDate);

  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    mode: 'all',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    month: '2026-09',
    year: '2026',
  });

  // Filtered datasets based on selected date / range / month / year
  const filteredSimrs = useMemo(() => {
    return simrsTransactions.filter((t) => {
      return matchDateFilter(t.billingTime || t.date, dateFilter);
    });
  }, [simrsTransactions, dateFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => matchDateFilter(e.date, dateFilter));
  }, [expenses, dateFilter]);

  const filteredCashFlows = useMemo(() => {
    return cashFlowEntries.filter((cf) => matchDateFilter(cf.date, dateFilter));
  }, [cashFlowEntries, dateFilter]);

  // Calculations on filtered data
  const totalSimrsRevenue = filteredSimrs.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalSimrsCashier = filteredSimrs.reduce((acc, t) => acc + t.cashierReceived, 0);
  const totalCashFlowInflow = filteredCashFlows
    .filter((cf) => cf.type === 'in')
    .reduce((acc, cf) => acc + cf.amount, 0);

  // Effective received cashier: prefer SIMRS received if available, otherwise cashflow inflow
  const totalReceivedCashier = totalSimrsCashier > 0 ? totalSimrsCashier : totalCashFlowInflow;
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netOperatingIncome = totalReceivedCashier - totalExpenses;

  // Revenue today vs prior days
  const revenueToday = filteredSimrs
    .filter((t) => (t.billingTime || t.date || '').startsWith(staffWindow.today))
    .reduce((acc, t) => acc + t.cashierReceived, 0);

  const revenuePriorDays = filteredSimrs
    .filter((t) => !(t.billingTime || t.date || '').startsWith(staffWindow.today))
    .reduce((acc, t) => acc + t.cashierReceived, 0);

  // Bank Balances & Total Liquid Cash
  const totalLiquidCash = profile.bankAccounts.reduce((acc, b) => acc + b.currentBalance, 0);

  // Debts & Receivables
  const totalUnpaidDebts = debts
    .filter((d) => d.status !== 'paid')
    .reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0);

  const totalUncollectedReceivables = receivables
    .filter((r) => r.status !== 'paid')
    .reduce((acc, r) => acc + (r.claimAmount - r.receivedAmount), 0);

  // Grouping for Donut Chart (12 Official Units breakdown)
  const departmentRevenue: Record<string, number> = {};
  filteredSimrs.forEach((t) => {
    const unit = normalizeToOfficialUnit(t.department);
    departmentRevenue[unit] = (departmentRevenue[unit] || 0) + t.totalAmount;
  });

  const donutData = Object.keys(departmentRevenue).map((dept) => {
    const config = CLINIC_UNIT_CONFIG[dept as keyof typeof CLINIC_UNIT_CONFIG];
    return {
      label: dept,
      value: departmentRevenue[dept],
      color: config ? config.color : '#0d9488',
    };
  });

  // Trend Data: revenue vs expense
  const trendData = [
    { label: '11 Sep', revenue: 7800000, expense: 5200000 },
    { label: '12 Sep', revenue: 6400000, expense: 2100000 },
    { label: '13 Sep', revenue: 5900000, expense: 1800000 },
    { label: '14 Sep', revenue: 5200000, expense: 2500000 },
    { label: '15 Sep', revenue: 5950000, expense: 1950000 },
    { label: '16 Sep (Hari Ini)', revenue: totalReceivedCashier || 7193500, expense: totalExpenses || 3200000 },
  ];

  // Quick CSV export of dashboard summary
  const exportDashboardSummary = () => {
    const headers = ['Indikator Keuangan Klinik', 'Nilai (IDR)', 'Keterangan'];
    const rows = isSuperOrManager
      ? [
          ['Total Pendapatan SIMRS', totalSimrsRevenue, 'Seluruh Billing Kasir'],
          ['Penerimaan Kasir Kas & Bank', totalReceivedCashier, 'Sudah Diterima Tunai/QRIS/EDC'],
          ['Total Beban Operasional', totalExpenses, 'Belanja Obat, Medis, Utilitas'],
          ['Laba Bersih Operasional (Netto)', netOperatingIncome, 'Penerimaan Kasir - Pengeluaran'],
          ['Total Likuiditas Kas & Bank', totalLiquidCash, 'Saldo Rekening Klinik'],
          ['Sisa Utang Belum Terbayar', totalUnpaidDebts, 'Kewajiban ke Vendor / PBF'],
          ['Sisa Piutang Klaim Belum Cair', totalUncollectedReceivables, 'Klaim BPJS Kesehatan'],
        ]
      : [
          ['Total Billing SIMRS', totalSimrsRevenue, 'Billing 3 Hari Terakhir'],
          ['Penerimaan Kasir Diterima', totalReceivedCashier, 'Tunai, QRIS, Transfer (3 Hari)'],
          ['Penerimaan Kasir Hari Ini', revenueToday, `Tanggal ${staffWindow.today}`],
          ['Penerimaan Kasir 2 Hari Sebelumnya', revenuePriorDays, `${staffWindow.twoDaysAgo} s/d ${staffWindow.yesterday}`],
          ['Jumlah Pasien Terlayani', filteredSimrs.length, 'Pasien 3 Hari Terakhir'],
        ];
    downloadCsv(`Dashboard_Keuangan_${dateFilter.mode}_${dateFilter.startDate}`, headers, rows);
  };

  return (
    <div className="space-y-5">

      {/* Alert Banner for Near Due Debts / Receivables (Only for Owner & Manager) */}
      {isSuperOrManager && notifications.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 px-4 py-2.5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-amber-900">
              {notifications.length} Tagihan / Klaim mendekati jatuh tempo
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('debts_receivables')}
            className="text-xs font-bold text-amber-800 hover:text-amber-900 underline whitespace-nowrap cursor-pointer"
          >
            Lihat Tagihan &rarr;
          </button>
        </div>
      )}

      {/* Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            <span>Dasbor Analisis {isSuperOrManager ? 'Keuangan & SIMRS' : 'Pemasukan Kasir Klinik'}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportDashboardSummary}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Tarik Rekap Excel / CSV</span>
          </button>
          <button
            onClick={() => onNavigateTab('cash_flow')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Rekap Kasir & Pemasukan</span>
          </button>
        </div>
      </div>

      {/* Universal Date Filter Component */}
      <DateRangeFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        label={isSuperOrManager ? 'Filter Periode Dasbor Analisis' : 'Filter Periode (Hari Ini & 2 Hari Sebelumnya)'}
      />

      {/* Key Metric Stat Cards - Tailored to Role */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Penerimaan SIMRS (UANG MASUK -> HIJAU CERAH) */}
        <div className="bg-emerald-50/80 p-4 rounded-2xl border-2 border-emerald-400 shadow-xs hover:border-emerald-500 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Uang Masuk Kasir</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-black text-emerald-950 font-mono">
              {formatRupiah(totalReceivedCashier)}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tunai, QRIS & Transfer</span>
            </div>
          </div>
        </div>

        {/* Card 2: Rekapan Pasien SIMRS (BIRU CERAH) */}
        <div className="bg-sky-50/80 p-4 rounded-2xl border-2 border-sky-300 shadow-xs hover:border-sky-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Jumlah Pasien</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-300">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-sky-950 font-mono">
                {filteredSimrs.length}
              </span>
              <span className="text-xs text-sky-800 font-bold">Pasien</span>
            </div>
            <div className="text-[11px] text-sky-700 mt-1 font-medium">
              Terlayani pada filter aktif
            </div>
          </div>
        </div>

        {/* Card 3: Pengeluaran Operasional (UANG KELUAR -> MERAH CERAH) */}
        <div className="bg-rose-50/80 p-4 rounded-2xl border-2 border-rose-300 shadow-xs hover:border-rose-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Uang Keluar (Beban)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-black text-rose-950 font-mono">
              {formatRupiah(totalExpenses)}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-rose-800 font-semibold">
              <span>{filteredExpenses.length} nota belanja terverifikasi</span>
            </div>
          </div>
        </div>

        {/* Card 4: Likuiditas Kas & Bank (SISA SALDO) */}
        <div className="bg-slate-100/90 p-4 rounded-2xl border-2 border-slate-300 shadow-xs hover:border-slate-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sisa Saldo Bank</span>
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-black text-slate-900 font-mono">
              {formatRupiah(totalLiquidCash)}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 font-semibold">
              <span>{profile.bankAccounts.length} rekening aktif operasional</span>
            </div>
          </div>
        </div>

        {/* Card 5: Utang vs Piutang (ORANGE / AMBER CERAH) */}
        <div className="bg-amber-50/80 p-4 rounded-2xl border-2 border-amber-300 shadow-xs hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Utang & Piutang</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-900 font-medium">Utang PBF:</span>
              <span className="font-mono font-bold text-rose-600">{formatRupiah(totalUnpaidDebts)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-900 font-medium">Piutang BPJS:</span>
              <span className="font-mono font-bold text-emerald-700">{formatRupiah(totalUncollectedReceivables)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visual Graphics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (2 cols) */}
        <div className="lg:col-span-2 bg-gradient-to-b from-teal-50/40 to-white p-5 rounded-2xl border-2 border-teal-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-teal-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tren Pendapatan SIMRS vs Pengeluaran Klinik
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan arus kas masuk dan operasional klinik
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-slate-600 font-medium">Pendapatan Masuk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500" />
                <span className="text-slate-600 font-medium">Pengeluaran</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ModernAreaTrendChart data={trendData} height={230} />
          </div>
        </div>

        {/* Donut Chart Breakdown by 12 Official SIMRS Units (1 col) */}
        <div className="bg-gradient-to-b from-blue-50/40 to-white p-5 rounded-2xl border-2 border-blue-200 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="pb-3 border-b border-blue-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Rincian 12 Unit Layanan</span>
              <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-bold">12 Unit</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kontribusi per unit & instalasi medis klinik
            </p>
          </div>

          <div className="py-3 my-auto">
            <ModernDonutChart data={donutData} totalLabel="Omset 12 Unit" size={150} />
          </div>

          <div className="pt-3 border-t border-blue-100 flex items-center justify-between text-xs text-slate-500">
            <span>{Object.keys(departmentRevenue).length} unit aktif transaksi</span>
            <button
              onClick={() => onNavigateTab('cash_flow')}
              className="text-teal-700 font-semibold hover:underline cursor-pointer"
            >
              Lihat Detail &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Liquid Accounts & Recent Activity Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bank & Cash Balances */}
        <div className="bg-gradient-to-b from-emerald-50/30 to-white p-5 rounded-2xl border-2 border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <h3 className="text-sm font-bold text-slate-900">Posisi Kas & Rekening Bank</h3>
            <span className="text-xs font-bold text-teal-800 font-mono">
              {formatRupiah(totalLiquidCash)}
            </span>
          </div>

          <div className="divide-y divide-emerald-50 mt-2">
            {profile.bankAccounts.map((acc) => (
              <div key={acc.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{acc.bankName}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{acc.accountNumber}</p>
                  <p className="text-[10px] text-slate-400">{acc.branch || acc.accountHolder}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-slate-900 text-sm">
                    {formatRupiah(acc.currentBalance)}
                  </span>
                  <span className="block text-[10px] text-emerald-600 font-medium">Aktif</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateTab('cash_flow')}
            className="mt-3 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-bold transition-colors text-center border border-emerald-300 cursor-pointer"
          >
            Buka Mutasi Buku Arus Kas Harian &rarr;
          </button>
        </div>

        {/* Recent SIMRS Billing Feed (2 cols) */}
        <div className="lg:col-span-2 bg-gradient-to-b from-slate-50/60 to-white p-5 rounded-2xl border-2 border-slate-300 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Billing Pasien SIMRS Terbaru
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredSimrs.length} transaksi pada filter aktif
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('cash_flow')}
              className="text-xs font-semibold text-teal-700 hover:underline cursor-pointer"
            >
              Buka Rekap SIMRS Lengkap &rarr;
            </button>
          </div>

          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] text-slate-500 font-semibold uppercase">
                  <th className="py-2.5 px-3">Waktu & RM</th>
                  <th className="py-2.5 px-3">Nama Pasien</th>
                  <th className="py-2.5 px-3">Unit / Instalasi</th>
                  <th className="py-2.5 px-3 text-right">Kasir Diterima</th>
                  <th className="py-2.5 px-3">Metode Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSimrs.slice(0, 6).map((item) => {
                  const unitName = normalizeToOfficialUnit(item.department);
                  const unitConfig = CLINIC_UNIT_CONFIG[unitName];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block font-mono">{item.billingTime || item.date}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{item.patientRm}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block">{item.patientName}</span>
                        <span className="text-[10px] text-slate-500">{item.doctorName || '-'}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            unitConfig ? `${unitConfig.bgLight} ${unitConfig.textDark} ${unitConfig.border}` : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {unitName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(item.cashierReceived)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.paymentMethod === 'Tunai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.paymentMethod === 'QRIS'
                              ? 'bg-blue-100 text-blue-800'
                              : item.paymentMethod === 'Transfer Bank'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {item.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
