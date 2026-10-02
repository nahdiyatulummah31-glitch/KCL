import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Building2,
  Receipt,
  FileCheck,
  Lock,
  Plus,
  Printer,
  ChevronDown,
  Info,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  SimrsTransaction,
  CashFlowEntry,
  ExpenseEntry,
  ClinicProfile,
  UserAccount,
  DailyCashReconciliation,
  DenominationBreakdown,
  isDateAllowedForStaff,
  getStaffAllowedDateWindow,
} from '../types';
import { formatRupiah } from '../utils/formatters';
import { generateDailyCashWhatsAppText } from '../utils/whatsappFormatter';
import { WhatsAppShareModal } from './WhatsAppShareModal';

interface DailyCashReportViewProps {
  profile: ClinicProfile;
  activeUser: UserAccount;
  simrsTransactions: SimrsTransaction[];
  cashFlowEntries: CashFlowEntry[];
  expenses: ExpenseEntry[];
  reconciliations: DailyCashReconciliation[];
  onSaveReconciliation: (rec: DailyCashReconciliation) => void;
  onDeleteReconciliation?: (id: string) => void;
}

export const DailyCashReportView: React.FC<DailyCashReportViewProps> = ({
  profile,
  activeUser,
  simrsTransactions,
  cashFlowEntries,
  expenses,
  reconciliations,
  onSaveReconciliation,
  onDeleteReconciliation,
}) => {
  const isManagerOrDirector =
    activeUser.role === 'super_admin' || activeUser.role === 'finance_manager';
  const refDate = '2026-09-16';
  const staffWindow = getStaffAllowedDateWindow(refDate);

  // Selected date and shift
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-16');
  const [selectedShift, setSelectedShift] = useState<'Pagi' | 'Siang' | 'Malam' | 'Harian Penuh'>('Pagi');

  // Starting Balances (Editable by user)
  const [startingCash, setStartingCash] = useState<number>(2500000); // Modal uang tunai di laci kasir
  const [startingTransfer, setStartingTransfer] = useState<number>(14500000); // Saldo awal bank

  // Physical cash counted (Hitungan Uang Nyata di Laci Kasir)
  const [physicalCashBalance, setPhysicalCashBalance] = useState<number>(2500000);
  const [reconciliationToDelete, setReconciliationToDelete] = useState<{
    id: string;
    date: string;
    cashierName: string;
  } | null>(null);

  const [notes, setNotes] = useState<string>(
    'Hitungan fisik kasir shift pagi cocok dan seimbang. Tidak ada uang palsu maupun selisih kasir.'
  );
  const [cashierName, setCashierName] = useState<string>(activeUser.name);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Calculate transactions for selected date
  const dayTransactions = useMemo(() => {
    return simrsTransactions.filter((t) => {
      const trxDate = t.billingTime ? t.billingTime.slice(0, 10) : '';
      const matchDate = trxDate === selectedDate;
      const matchShift = selectedShift === 'Harian Penuh' || t.shift === selectedShift;
      return matchDate && matchShift;
    });
  }, [simrsTransactions, selectedDate, selectedShift]);

  // Cash Inflows: Cash vs Transfer
  const cashIn = useMemo(() => {
    return dayTransactions
      .filter((t) => t.paymentMethod === 'Tunai')
      .reduce((sum, t) => sum + (t.cashierReceived || t.totalAmount), 0);
  }, [dayTransactions]);

  const transferIn = useMemo(() => {
    return dayTransactions
      .filter((t) => t.paymentMethod === 'Transfer Bank' || t.paymentMethod === 'QRIS' || t.paymentMethod === 'Debit EDC')
      .reduce((sum, t) => sum + (t.cashierReceived || t.totalAmount), 0);
  }, [dayTransactions]);

  const totalIn = cashIn + transferIn;

  // Expenses for the day
  const dayExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchDate = e.date === selectedDate;
      return matchDate;
    });
  }, [expenses, selectedDate]);

  const cashOut = useMemo(() => {
    return dayExpenses
      .filter((e) => e.payFromAccount.toLowerCase().includes('kasir') || e.payFromAccount.toLowerCase().includes('tunai'))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [dayExpenses]);

  const transferOut = useMemo(() => {
    return dayExpenses
      .filter((e) => !e.payFromAccount.toLowerCase().includes('kasir') && !e.payFromAccount.toLowerCase().includes('tunai'))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [dayExpenses]);

  const totalOut = cashOut + transferOut;

  // Final Balances according to system
  const finalCashBalance = startingCash + cashIn - cashOut;
  const finalTransferBalance = startingTransfer + transferIn - transferOut;
  const totalFinalBalance = finalCashBalance + finalTransferBalance;

  // Auto-sync physical cash input when system final cash balance changes initially
  useEffect(() => {
    setPhysicalCashBalance(finalCashBalance);
  }, [finalCashBalance]);

  // Discrepancy (Selisih Antara Real Fisik & Laporan Sistem)
  const difference = physicalCashBalance - finalCashBalance;

  // Status
  let reconciliationStatus: 'balanced' | 'surplus' | 'shortage' = 'balanced';
  if (difference > 0) reconciliationStatus = 'surplus';
  else if (difference < 0) reconciliationStatus = 'shortage';

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const whatsAppText = useMemo(() => {
    return generateDailyCashWhatsAppText({
      profile,
      date: selectedDate,
      shift: selectedShift,
      cashierName,
      startingCash,
      startingTransfer,
      cashIn,
      transferIn,
      totalIn,
      cashOut,
      transferOut,
      totalOut,
      finalCashBalance,
      finalTransferBalance,
      totalFinalBalance,
      physicalCashBalance,
      difference,
      reconciliationStatus,
      notes,
    });
  }, [
    profile,
    selectedDate,
    selectedShift,
    cashierName,
    startingCash,
    startingTransfer,
    cashIn,
    transferIn,
    totalIn,
    cashOut,
    transferOut,
    totalOut,
    finalCashBalance,
    finalTransferBalance,
    totalFinalBalance,
    physicalCashBalance,
    difference,
    reconciliationStatus,
    notes,
  ]);

  const handleSave = () => {
    setValidationError('');
    setSaveSuccessMsg('');

    // Strict validation: Data cannot be saved if fields are incomplete
    if (!selectedDate.trim()) {
      setValidationError('Tanggal rekonsiliasi wajib dipilih!');
      return;
    }
    if (!cashierName.trim()) {
      setValidationError('Nama petugas kasir wajib diisi sebelum menyimpan data!');
      return;
    }
    if (startingCash <= 0 && startingCash !== 0) {
      setValidationError('Uang modal awal kasir wajib diisi dengan benar!');
      return;
    }
    if (!notes.trim()) {
      setValidationError('Catatan berita acara penutupan kas wajib diisi!');
      return;
    }

    const newRec: DailyCashReconciliation = {
      id: `rec-cash-${Date.now()}`,
      date: selectedDate,
      shift: selectedShift,
      startingCashBalance: startingCash,
      totalCashIn: cashIn,
      totalCashOut: cashOut,
      systemCashBalance: finalCashBalance,
      physicalCashBalance,
      difference,
      status: reconciliationStatus,
      notes: notes.trim(),
      cashierName: cashierName.trim(),
      verifiedBy: activeUser.name,
      verifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    onSaveReconciliation(newRec);
    setSaveSuccessMsg('Rekonsiliasi kas harian berhasil disimpan dan dikunci ke sistem audit!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-600/50 backdrop-blur-sm text-xs font-semibold tracking-wide text-teal-100 uppercase border border-teal-400/30 mb-1.5">
              <Scale className="w-3.5 h-3.5" /> Laporan Harian & Selisih Kas
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Data Kas Harian & Rekonsiliasi Real
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share ke WhatsApp</span>
            </button>
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-200" />
              <span>
                <strong>{activeUser.name}</strong> ({activeUser.role === 'super_admin' ? 'Direktur / Pimpinan' : activeUser.role === 'finance_manager' ? 'Manajer Keuangan' : 'Staf Kasir'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Date & Shift Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              min={!isManagerOrDirector ? staffWindow.minDate : undefined}
              max={!isManagerOrDirector ? staffWindow.maxDate : undefined}
              onChange={(e) => {
                const val = e.target.value;
                if (!isManagerOrDirector && !isDateAllowedForStaff(val, activeUser, refDate)) {
                  return;
                }
                setSelectedDate(val);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Quick Date Presets for Staff */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDate(staffWindow.today)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                selectedDate === staffWindow.today
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(staffWindow.yesterday)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                selectedDate === staffWindow.yesterday
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(staffWindow.twoDaysAgo)}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                selectedDate === staffWindow.twoDaysAgo
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              2 Hari Lalu
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Shift:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-medium">
              {(['Pagi', 'Siang', 'Malam', 'Harian Penuh'] as const).map((shift) => (
                <button
                  key={shift}
                  onClick={() => setSelectedShift(shift)}
                  className={`px-3 py-1 rounded-md transition-all ${
                    selectedShift === shift
                      ? 'bg-teal-700 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1.5 self-end sm:self-center">
          <Receipt className="w-4 h-4 text-slate-400" />
          <span>{dayTransactions.length} Transaksi SIMRS ditemukan</span>
        </div>
      </div>

      {/* 4 Core Metric Panels: Uang Awal (Orange Pastel), Masuk (Hijau Cerah), Keluar (Merah Cerah), Saldo Akhir (Abu-abu Cerah) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. UANG AWAL - Bingkai Orange Pastel Cerah */}
        <div className="bg-orange-50/90 rounded-2xl border-2 border-orange-300 p-5 shadow-xs flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">
                1. Uang Awal (Modal)
              </span>
              <span className="p-1.5 bg-orange-100 text-orange-700 rounded-lg">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-orange-950 mt-2">
              {formatRupiah(startingCash + startingTransfer)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-orange-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-orange-900">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-orange-600" /> Modal Laci Kasir (Cash):
              </span>
              <div className="font-semibold text-orange-950">
                {isManagerOrDirector ? (
                  <input
                    type="number"
                    value={startingCash}
                    onChange={(e) => setStartingCash(Number(e.target.value) || 0)}
                    className="w-24 text-right px-1.5 py-0.5 border border-orange-300 rounded text-xs focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                ) : (
                  formatRupiah(startingCash)
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-orange-900">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-orange-600" /> Saldo Bank Awal:
              </span>
              <div className="font-semibold text-orange-950">
                {isManagerOrDirector ? (
                  <input
                    type="number"
                    value={startingTransfer}
                    onChange={(e) => setStartingTransfer(Number(e.target.value) || 0)}
                    className="w-24 text-right px-1.5 py-0.5 border border-orange-300 rounded text-xs focus:ring-1 focus:ring-orange-500 bg-white"
                  />
                ) : (
                  formatRupiah(startingTransfer)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. UANG MASUK - Bingkai Hijau Cerah */}
        <div className="bg-emerald-50/90 rounded-2xl border-2 border-emerald-300 p-5 shadow-xs flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                2. Uang Masuk
              </span>
              <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-800 mt-2">
              +{formatRupiah(totalIn)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-emerald-900">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-600" /> Masuk Cash (Tunai):
              </span>
              <span className="font-bold text-emerald-950">{formatRupiah(cashIn)}</span>
            </div>
            <div className="flex items-center justify-between text-emerald-900">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Masuk Transfer/QRIS:
              </span>
              <span className="font-bold text-emerald-950">{formatRupiah(transferIn)}</span>
            </div>
          </div>
        </div>

        {/* 3. UANG KELUAR - Bingkai Merah Cerah */}
        <div className="bg-rose-50/90 rounded-2xl border-2 border-rose-300 p-5 shadow-xs flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                3. Uang Keluar
              </span>
              <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-rose-800 mt-2">
              -{formatRupiah(totalOut)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rose-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-rose-900">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-rose-600" /> Keluar Cash (Kasir):
              </span>
              <span className="font-bold text-rose-950">{formatRupiah(cashOut)}</span>
            </div>
            <div className="flex items-center justify-between text-rose-900">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-rose-600" /> Keluar Transfer:
              </span>
              <span className="font-bold text-rose-950">{formatRupiah(transferOut)}</span>
            </div>
          </div>
        </div>

        {/* 4. SALDO AKHIR - Bingkai Abu-abu Cerah */}
        <div className="bg-slate-100/90 rounded-2xl border-2 border-slate-300 p-5 shadow-xs flex flex-col justify-between transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Sisa Saldo (Sistem)
              </span>
              <span className="p-1.5 bg-slate-200 text-slate-700 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {formatRupiah(totalFinalBalance)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-slate-600 font-bold" /> Saldo Kasir (Cash):
              </span>
              <span className="font-bold text-slate-950">{formatRupiah(finalCashBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-600 font-bold" /> Saldo Bank (Transfer):
              </span>
              <span className="font-bold text-slate-950">{formatRupiah(finalTransferBalance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rekonsiliasi Kasir & Uji Selisih */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-700" />
              <h2 className="text-lg font-bold text-slate-900">
                Rekonsiliasi & Uji Selisih Saldo Kasir (Fisik vs Laporan)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan total uang tunai fisik yang ada di laci kasir untuk membuktikan ada tidaknya selisih dengan sistem.
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3">
            {reconciliationStatus === 'balanced' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                SEIMBANG / PAS (Selisih Rp 0)
              </div>
            )}
            {reconciliationStatus === 'shortage' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                SELISIH KURANG: -{formatRupiah(Math.abs(difference))}
              </div>
            )}
            {reconciliationStatus === 'surplus' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold shadow-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                SELISIH LEBIH: +{formatRupiah(difference)}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sisi Kiri: Hitungan Fisik Uang Nyata Kasir & Perbandingan */}
          <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Hitungan Uang Fisik Kasir (Cash Counted)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Total Uang Tunai Fisik di Laci Kasir (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={physicalCashBalance || ''}
                    onChange={(e) => setPhysicalCashBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-bold font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span>Terbilang: {formatRupiah(physicalCashBalance)}</span>
                  <button
                    type="button"
                    onClick={() => setPhysicalCashBalance(finalCashBalance)}
                    className="text-teal-700 hover:text-teal-800 font-semibold cursor-pointer underline"
                  >
                    Samakan dengan Sistem
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-medium">Saldo Kasir Laporan Sistem:</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">{formatRupiah(finalCashBalance)}</span>
                </div>

                <div
                  className={`flex items-center justify-between p-3 rounded-xl border font-bold text-sm ${
                    difference === 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : difference < 0
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <span>Selisih (Fisik - Sistem):</span>
                  <span className="font-mono">{difference >= 0 ? `+${formatRupiah(difference)}` : formatRupiah(difference)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Pengesahan Berita Acara & Tombol Simpan */}
          <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <FileCheck className="w-4 h-4 text-teal-600" />
                <span>Pengesahan Berita Acara Kasir</span>
              </h4>

              {/* Form Validation Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Petugas Kasir Pelapor <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    placeholder="Nama lengkap kasir..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Berita Acara Kasir <span className="text-rose-500">*</span>:
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Keterangan fisik uang, kondisi laci, alasan selisih bila ada..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Validation & Save Button */}
            <div>
              {validationError && (
                <div className="mb-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="mb-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={!cashierName.trim() || !notes.trim()}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all ${
                  !cashierName.trim() || !notes.trim()
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-900/10 active:scale-98'
                }`}
                title={
                  !cashierName.trim() || !notes.trim()
                    ? 'Lengkapi nama kasir dan catatan sebelum menyimpan'
                    : 'Simpan berita acara rekonsiliasi'
                }
              >
                <FileCheck className="w-4 h-4" />
                Simpan & Kunci Rekonsiliasi Harian
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-1">
                Data tidak dapat disimpan jika pengisian belum komplit.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History of Saved Reconciliations */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Riwayat Berita Acara Rekonsiliasi Kasir
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {reconciliations.length} Dokumen Tersimpan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Tanggal & Shift</th>
                <th className="py-2.5 px-3">Kasir & Verifikator</th>
                <th className="py-2.5 px-3 text-right">Modal Awal</th>
                <th className="py-2.5 px-3 text-right">Kas Masuk</th>
                <th className="py-2.5 px-3 text-right">Kas Keluar</th>
                <th className="py-2.5 px-3 text-right">Saldo Sistem</th>
                <th className="py-2.5 px-3 text-right">Hitungan Fisik</th>
                <th className="py-2.5 px-3 text-center">Status Selisih</th>
                <th className="py-2.5 px-3">Catatan</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reconciliations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Belum ada dokumen berita acara rekonsiliasi kasir yang disimpan.
                  </td>
                </tr>
              ) : (
                reconciliations.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div>{rec.date}</div>
                    <span className="text-[10px] text-slate-500 font-normal">Shift: {rec.shift || 'Pagi'}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    <div className="font-medium">{rec.cashierName}</div>
                    <div className="text-[10px] text-teal-700">Otorisasi: {rec.verifiedBy || 'Nadia (Keuangan)'}</div>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {formatRupiah(rec.startingCashBalance)}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-emerald-700">
                    +{formatRupiah(rec.totalCashIn)}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-rose-700">
                    -{formatRupiah(rec.totalCashOut)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">
                    {formatRupiah(rec.systemCashBalance)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-teal-800">
                    {formatRupiah(rec.physicalCashBalance)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {rec.difference === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Pas (Rp 0)
                      </span>
                    ) : rec.difference < 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Kurang {formatRupiah(Math.abs(rec.difference))}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Lebih +{formatRupiah(rec.difference)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={rec.notes}>
                    {rec.notes || '-'}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setReconciliationToDelete({
                          id: rec.id,
                          date: rec.date,
                          cashierName: rec.cashierName,
                        })
                      }
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Hapus Rekonsiliasi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )))
            }
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Confirmation Modal: Delete Reconciliation Record */}
      {reconciliationToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Rekonsiliasi?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Yakin ingin menghapus berita acara rekonsiliasi kasir tanggal <strong>{reconciliationToDelete.date}</strong> ({reconciliationToDelete.cashierName})?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReconciliationToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteReconciliation?.(reconciliationToDelete.id);
                  setReconciliationToDelete(null);
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

      {/* WhatsApp Text Share Modal */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        title="Bagikan Laporan Kas Harian ke WhatsApp"
        recipientNote="Direktur & Manajemen Keuangan"
        content={whatsAppText}
      />
    </div>
  );
};
