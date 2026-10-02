import React, { useState, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  Building2,
  Calendar,
  ArrowLeft,
  Settings,
  Users,
  Layers,
  Wallet,
  TrendingDown,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import {
  ClinicProfile,
  SimrsTransaction,
  CashFlowEntry,
  ExpenseEntry,
  DebtEntry,
  ReceivableEntry,
  UserAccount,
  SimrsDepartment,
  normalizeToOfficialUnit,
} from '../types';
import { formatRupiah, downloadCsv, formatDateId } from '../utils/formatters';
import { generateAuditPrintWhatsAppText } from '../utils/whatsappFormatter';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface AuditPrintViewProps {
  profile: ClinicProfile;
  simrsTransactions: SimrsTransaction[];
  cashFlowEntries: CashFlowEntry[];
  expenses: ExpenseEntry[];
  debts: DebtEntry[];
  receivables: ReceivableEntry[];
  activeUser: UserAccount;
  initialFilter?: {
    mode: 'shift' | 'harian' | 'bulanan';
    date: string;
    shift: string;
    month: string;
  };
  onGoBack: () => void;
  onGoSettings: () => void;
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

export const AuditPrintView: React.FC<AuditPrintViewProps> = ({
  profile,
  simrsTransactions,
  cashFlowEntries,
  expenses,
  debts,
  receivables,
  activeUser,
  initialFilter,
  onGoBack,
  onGoSettings,
}) => {
  const [filterMode, setFilterMode] = useState<'shift' | 'harian' | 'bulanan'>(
    initialFilter?.mode || 'bulanan'
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    initialFilter?.date || (simrsTransactions[0]?.billingTime?.slice(0, 10) || '2026-09-28')
  );
  const [selectedShift, setSelectedShift] = useState<string>(
    initialFilter?.shift || 'Semua'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    initialFilter?.month || (simrsTransactions[0]?.billingTime?.slice(0, 7) || '2026-09')
  );

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return simrsTransactions.filter((t) => {
      const txDate = t.billingTime.slice(0, 10);
      if (filterMode === 'shift') {
        const matchesDate = txDate === selectedDate;
        const matchesShift = selectedShift === 'Semua' || t.shift === selectedShift;
        return matchesDate && matchesShift;
      }
      if (filterMode === 'harian') {
        return txDate === selectedDate;
      }
      if (filterMode === 'bulanan') {
        return txDate.startsWith(selectedMonth);
      }
      return true;
    });
  }, [simrsTransactions, filterMode, selectedDate, selectedShift, selectedMonth]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = e.date.slice(0, 10);
      if (filterMode === 'shift' || filterMode === 'harian') {
        return expDate === selectedDate;
      }
      if (filterMode === 'bulanan') {
        return expDate.startsWith(selectedMonth);
      }
      return true;
    });
  }, [expenses, filterMode, selectedDate, selectedMonth]);

  // Totals
  const totalPatients = filteredTransactions.length;
  const totalRevenue = filteredTransactions.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalCashCollected = filteredTransactions.reduce((acc, t) => acc + t.cashierReceived, 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netIncome = totalCashCollected - totalExpenses;

  // Breakdown by payment
  const totalCash = filteredTransactions
    .filter((t) => t.paymentMethod === 'Tunai')
    .reduce((acc, t) => acc + t.cashierReceived, 0);

  const totalTransfer = filteredTransactions
    .filter((t) => t.paymentMethod === 'Transfer Bank')
    .reduce((acc, t) => acc + t.cashierReceived, 0);

  const totalQris = filteredTransactions
    .filter((t) => t.paymentMethod === 'QRIS' || t.paymentMethod === 'Debit / EDC' || t.paymentMethod === 'Kartu Kredit')
    .reduce((acc, t) => acc + t.cashierReceived, 0);

  const totalBpjs = filteredTransactions
    .filter((t) => t.paymentMethod === 'Klaim BPJS' || t.paymentMethod === 'Asuransi Swasta' || t.paymentMethod === 'Piutang Pasien')
    .reduce((acc, t) => acc + t.totalAmount, 0);

  // Poli breakdown
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
        total: number;
      }
    > = {};

    PRIMARY_POLIS.forEach((dept) => {
      map[dept] = {
        dept,
        patientCount: 0,
        cash: 0,
        transfer: 0,
        qris: 0,
        bpjs: 0,
        total: 0,
      };
    });

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
          total: 0,
        };
      }
      map[deptKey].patientCount += 1;
      map[deptKey].total += t.totalAmount;

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
        map[deptKey].bpjs += t.totalAmount;
      }
    });

    return Object.values(map).filter(
      (item) => PRIMARY_POLIS.includes(item.dept) || item.patientCount > 0
    );
  }, [filteredTransactions]);

  const periodLabel = useMemo(() => {
    if (filterMode === 'shift') {
      return `Shift ${selectedShift} - ${formatDateId(selectedDate)}`;
    }
    if (filterMode === 'harian') {
      return `Harian - ${formatDateId(selectedDate)}`;
    }
    const [y, m] = selectedMonth.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return `Bulan ${d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
  }, [filterMode, selectedDate, selectedShift, selectedMonth]);

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [filteredExpenses]);

  const whatsAppText = useMemo(() => {
    return generateAuditPrintWhatsAppText({
      profile,
      periodLabel,
      activeUser,
      totalRevenue,
      totalReceived: totalCashCollected,
      totalCash,
      totalTransfer,
      totalQris,
      totalBpjs,
      totalExpenses,
      netIncome,
      patientCount: filteredTransactions.length,
      poliSummary: poliStats,
      expensesSummary: Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount: Number(amount),
      })),
    });
  }, [
    profile,
    periodLabel,
    activeUser,
    totalRevenue,
    totalCashCollected,
    totalCash,
    totalTransfer,
    totalQris,
    totalBpjs,
    totalExpenses,
    netIncome,
    filteredTransactions.length,
    poliStats,
    expensesByCategory,
  ]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const filename = `Laporan_Kasir_${filterMode}_${selectedDate || selectedMonth}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const headers = [
      'Unit Poliklinik',
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
    rows.push(['GRAND TOTAL', totalPatients, totalCash, totalTransfer, totalQris, totalBpjs, totalRevenue]);

    rows.push([]);
    rows.push(['--- RINCIAN PENGELUARAN OPERASIONAL ---']);
    rows.push(['Tanggal', 'Kategori', 'Vendor / Rekanan', 'Keperluan', 'Rekening Bayar', 'No. Nota', 'Nominal (Rp)']);
    filteredExpenses.forEach((e) => {
      rows.push([
        e.date,
        e.category,
        e.vendorName || '-',
        e.title,
        e.payFromAccount,
        e.invoiceNumber || '-',
        e.amount,
      ]);
    });
    rows.push(['TOTAL PENGELUARAN', '', '', '', '', '', totalExpenses]);
    rows.push(['SISA KAS BERSIH', '', '', '', '', '', netIncome]);

    downloadCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Non-Printable Top Action Bar */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onGoBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Format Cetak & Rekap Keuangan
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowWhatsAppModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share WhatsApp</span>
          </button>

          <button
            onClick={onGoSettings}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Kop & TTD</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Tarik CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF / Print A4</span>
          </button>
        </div>
      </div>

      {/* Filter Selector (Print hidden) */}
      <div className="print:hidden bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-slate-700">Filter Periode:</span>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterMode('shift')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
              filterMode === 'shift' ? 'bg-teal-700 text-white' : 'text-slate-600'
            }`}
          >
            Per Shift
          </button>
          <button
            onClick={() => setFilterMode('harian')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
              filterMode === 'harian' ? 'bg-teal-700 text-white' : 'text-slate-600'
            }`}
          >
            Per Hari
          </button>
          <button
            onClick={() => setFilterMode('bulanan')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
              filterMode === 'bulanan' ? 'bg-teal-700 text-white' : 'text-slate-600'
            }`}
          >
            Per Bulan
          </button>
        </div>

        {filterMode === 'shift' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
            />
            <select
              value={selectedShift || 'Semua'}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="Semua">Semua Shift</option>
              <option value="Pagi">Shift Pagi</option>
              <option value="Siang">Shift Siang</option>
              <option value="Malam">Shift Malam</option>
            </select>
          </div>
        )}

        {filterMode === 'harian' && (
          <input
            type="date"
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
          />
        )}

        {filterMode === 'bulanan' && (
          <select
            value={selectedMonth || '2026-09'}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
          >
            <option value="2026-09">September 2026</option>
            <option value="2026-08">Agustus 2026</option>
            <option value="2026-07">Juli 2026</option>
          </select>
        )}
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-slate-100/60 p-4 md:p-8 rounded-2xl flex justify-center print:bg-white print:p-0">
        <div
          id="printable-report-a4"
          className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-8 md:p-10 shadow-xl print:shadow-none print:w-full print:max-w-none print:p-6 print:m-0 border border-slate-200 print:border-none flex flex-col justify-between"
        >
          {/* Document Content */}
          <div className="space-y-5">
            {/* 1. KOP SURAT KLINIK */}
            <div className="border-b-2 border-slate-900 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xl print:border print:border-slate-800">
                    {profile.name.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                      {profile.name}
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">
                      {profile.tagline || profile.legalEntity}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {profile.address}, {profile.city} | No. Izin: {profile.operationalLicense || profile.licenseNumber}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Telp: {profile.phone} | Email: {profile.email}
                    </p>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-500 shrink-0">
                  <span className="font-bold text-slate-800 block text-xs">REKAP KASIR & KEUANGAN</span>
                  <span>NPWP: {profile.taxId || profile.taxNumber}</span>
                  <span className="block">Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                </div>
              </div>
            </div>

            {/* 2. JUDUL LAPORAN */}
            <div className="text-center py-1">
              <h2 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
                LAPORAN PENDAPATAN & PENGELUARAN OPERASIONAL
              </h2>
              <p className="text-xs text-slate-700 font-bold">
                Periode: <span className="underline">{periodLabel}</span>
              </p>
            </div>

            {/* 3. KOTAK REKAPITULASI CEPAT */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] font-semibold text-slate-500 block">Total Pasien</span>
                <span className="text-base font-black text-slate-900">{totalPatients} Orang</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] font-semibold text-slate-500 block">Pendapatan Billing</span>
                <span className="text-sm font-black text-slate-900 font-mono">{formatRupiah(totalRevenue)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] font-semibold text-slate-500 block">Penerimaan Kasir</span>
                <span className="text-sm font-black text-teal-800 font-mono">{formatRupiah(totalCashCollected)}</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] font-semibold text-slate-500 block">Beban Pengeluaran</span>
                <span className="text-sm font-black text-rose-700 font-mono">{formatRupiah(totalExpenses)}</span>
              </div>
            </div>

            {/* 4. TABEL REKAP PENDAPATAN PER POLIKLINIK */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>I. Rekapitulasi Pasien & Pendapatan per Unit Layanan</span>
              </h3>
              <table className="w-full text-[10.5px] border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="py-1.5 px-2 text-left border-r border-slate-200">Unit Poliklinik</th>
                    <th className="py-1.5 px-1.5 text-center border-r border-slate-200">Pasien</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200">Tunai / Cash</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200">Transfer Bank</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200">QRIS / EDC</th>
                    <th className="py-1.5 px-2 text-right border-r border-slate-200">Klaim BPJS</th>
                    <th className="py-1.5 px-2 text-right font-black">Total Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {poliStats.map((item) => (
                    <tr key={item.dept}>
                      <td className="py-1 px-2 font-medium text-slate-800 border-r border-slate-200">
                        {item.dept}
                      </td>
                      <td className="py-1 px-1.5 text-center font-bold border-r border-slate-200">
                        {item.patientCount}
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                        {item.cash > 0 ? formatRupiah(item.cash) : '-'}
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                        {item.transfer > 0 ? formatRupiah(item.transfer) : '-'}
                      </td>
                      <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                        {item.qris > 0 ? formatRupiah(item.qris) : '-'}
                      </td>
                      <td className="py-1 px-2 text-right font-mono text-amber-800 border-r border-slate-200">
                        {item.bpjs > 0 ? formatRupiah(item.bpjs) : '-'}
                      </td>
                      <td className="py-1 px-2 text-right font-bold font-mono text-slate-900">
                        {formatRupiah(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td className="py-1.5 px-2 uppercase border-r border-slate-300">TOTAL PENDAPATAN</td>
                    <td className="py-1.5 px-1.5 text-center font-black text-teal-800 border-r border-slate-300">
                      {totalPatients}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-slate-300">
                      {formatRupiah(totalCash)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-slate-300">
                      {formatRupiah(totalTransfer)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono border-r border-slate-300">
                      {formatRupiah(totalQris)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-amber-800 border-r border-slate-300">
                      {formatRupiah(totalBpjs)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-black text-teal-900">
                      {formatRupiah(totalRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. TABEL RINCIAN PENGELUARAN */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <span>II. Rincian Pengeluaran Operasional Klinik</span>
              </h3>
              <table className="w-full text-[10.5px] border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="py-1.5 px-2 text-left border-r border-slate-200">Tanggal</th>
                    <th className="py-1.5 px-2 text-left border-r border-slate-200">Kategori</th>
                    <th className="py-1.5 px-2 text-left border-r border-slate-200">Vendor / Rekanan</th>
                    <th className="py-1.5 px-2 text-left border-r border-slate-200">Rincian Keperluan</th>
                    <th className="py-1.5 px-2 text-left border-r border-slate-200">Sumber Kas</th>
                    <th className="py-1.5 px-2 text-right font-black">Nominal (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="py-1 px-2 font-mono whitespace-nowrap border-r border-slate-200">
                        {exp.date}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200">{exp.category}</td>
                      <td className="py-1 px-2 font-semibold border-r border-slate-200">
                        {exp.vendorName || '-'}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200">
                        {exp.title}
                        {exp.invoiceNumber && ` (Nota: ${exp.invoiceNumber})`}
                      </td>
                      <td className="py-1 px-2 border-r border-slate-200">{exp.payFromAccount}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold text-rose-700">
                        {formatRupiah(exp.amount)}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-slate-400">
                        Tidak ada transaksi beban operasional pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={5} className="py-1.5 px-2 uppercase text-right border-r border-slate-300">
                      TOTAL PENGELUARAN OPERASIONAL
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-black text-rose-800">
                      {formatRupiah(totalExpenses)}
                    </td>
                  </tr>
                  <tr className="bg-teal-50/70 border-t border-slate-300">
                    <td colSpan={5} className="py-1.5 px-2 uppercase text-right font-black text-teal-900 border-r border-slate-300">
                      SISA KAS BERSIH OPERASIONAL (PENERIMAAN KASIR - PENGELUARAN)
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-black text-teal-900">
                      {formatRupiah(netIncome)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 6. KOLOM TANDA TANGAN */}
          <div className="pt-6 border-t border-slate-300 mt-6">
            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <p className="text-[10.5px] text-slate-600">Dibuat Oleh (Kasir / Staf Keuangan),</p>
                <div className="h-14 flex items-center justify-center">
                  <span className="text-[9px] text-slate-300 italic">[Tanda Tangan]</span>
                </div>
                <p className="font-bold text-slate-900 underline">{activeUser.name}</p>
                <p className="text-[10px] text-slate-500">Staf Kasir & Keuangan Klinik</p>
              </div>

              <div>
                <p className="text-[10.5px] text-slate-600">Mengetahui (Pimpinan Klinik / Direktur),</p>
                <div className="h-14 flex items-center justify-center">
                  <span className="text-[9px] text-slate-300 italic">[Cap Klinik & TTD]</span>
                </div>
                <p className="font-bold text-slate-900 underline">{profile.directorName}</p>
                <p className="text-[10px] text-slate-500">Direktur / Penanggung Jawab Klinik</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="Bagikan Rekap Laporan Keuangan ke WhatsApp"
        recipientNote="Pimpinan & Manajemen Klinik"
        content={whatsAppText}
      />
    </div>
  );
};
