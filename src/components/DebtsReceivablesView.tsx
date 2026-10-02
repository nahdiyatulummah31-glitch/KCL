import React, { useState } from 'react';
import {
  Scale,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Calendar,
  Building,
  DollarSign,
  Search,
  Edit3,
  Trash2,
} from 'lucide-react';
import { DebtEntry, ReceivableEntry, UserAccount, ClinicProfile, getClinicAccountOptions } from '../types';
import { formatRupiah, downloadCsv, getDaysRemaining, formatDateId } from '../utils/formatters';
import { DateRangeFilterBar, DateFilterState, matchDateFilter } from './DateRangeFilterBar';

interface DebtsReceivablesViewProps {
  debts: DebtEntry[];
  receivables: ReceivableEntry[];
  profile: ClinicProfile;
  activeUser: UserAccount;
  onAddDebt: (debt: DebtEntry) => void;
  onPayDebt: (debtId: string, amount: number, account: string) => void;
  onAddReceivable: (rec: ReceivableEntry) => void;
  onCollectReceivable: (recId: string, amount: number, account: string) => void;
  onUpdateDebt?: (debt: DebtEntry) => void;
  onDeleteDebt?: (id: string) => void;
  onUpdateReceivable?: (rec: ReceivableEntry) => void;
  onDeleteReceivable?: (id: string) => void;
  highlightItemId?: string;
}

export const DebtsReceivablesView: React.FC<DebtsReceivablesViewProps> = ({
  debts,
  receivables,
  profile,
  activeUser,
  onAddDebt,
  onPayDebt,
  onAddReceivable,
  onCollectReceivable,
  onUpdateDebt,
  onDeleteDebt,
  onUpdateReceivable,
  onDeleteReceivable,
  highlightItemId,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'debts' | 'receivables'>('debts');
  const [filterDueOnly, setFilterDueOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<{ id: string; creditorName: string } | null>(null);
  const [showPayDebtModal, setShowPayDebtModal] = useState<DebtEntry | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccount, setPayAccount] = useState('Bank BCA Klinik');

  const [showAddRecModal, setShowAddRecModal] = useState(false);
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [recToDelete, setRecToDelete] = useState<{ id: string; debtorName: string } | null>(null);
  const [showCollectRecModal, setShowCollectRecModal] = useState<ReceivableEntry | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectAccount, setCollectAccount] = useState('Bank Mandiri Klinik');

  // Form State for new Debt
  const [newDebt, setNewDebt] = useState({
    creditorName: '',
    creditorType: 'PBF Obat' as DebtEntry['creditorType'],
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    totalAmount: '',
    notes: '',
  });

  // Form State for new Receivable
  const [newRec, setNewRec] = useState({
    debtorName: '',
    debtorType: 'BPJS Kesehatan' as ReceivableEntry['debtorType'],
    claimBatchNumber: '',
    claimDate: new Date().toISOString().slice(0, 10),
    expectedDueDate: '',
    claimAmount: '',
    notes: '',
  });

  // Calculations for Debts
  const totalDebtsUnpaid = debts
    .filter((d) => d.status !== 'paid')
    .reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0);

  const debtsOverdueOrCritical = debts.filter((d) => {
    if (d.status === 'paid') return false;
    const days = getDaysRemaining(d.dueDate);
    return days <= 7;
  });

  // Calculations for Receivables
  const totalRecsUncollected = receivables
    .filter((r) => r.status !== 'paid')
    .reduce((acc, r) => acc + (r.claimAmount - r.receivedAmount), 0);

  const recsOverdueOrCritical = receivables.filter((r) => {
    if (r.status === 'paid') return false;
    const days = getDaysRemaining(r.expectedDueDate);
    return days <= 7;
  });

  // Date Filter State (Request 3: Check by date range, month, year)
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    mode: 'all',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    month: '2026-09',
    year: '2026',
  });

  // Filtered Debts
  const filteredDebts = debts.filter((d) => {
    const matchSearch =
      d.creditorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const days = getDaysRemaining(d.dueDate);
    const matchDue = !filterDueOnly || (d.status !== 'paid' && days <= 7);
    const matchDate = matchDateFilter(d.invoiceDate || d.dueDate, dateFilter);
    return matchSearch && matchDue && matchDate;
  });

  // Filtered Receivables
  const filteredReceivables = receivables.filter((r) => {
    const matchSearch =
      r.debtorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.claimBatchNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const days = getDaysRemaining(r.expectedDueDate);
    const matchDue = !filterDueOnly || (r.status !== 'paid' && days <= 7);
    const matchDate = matchDateFilter(r.claimDate || r.expectedDueDate, dateFilter);
    return matchSearch && matchDue && matchDate;
  });

  // Export CSV
  const handleExportCsv = () => {
    if (activeSubTab === 'debts') {
      const headers = [
        'Nama Kreditor / PBF',
        'Jenis Kreditor',
        'No. Faktur Tagihan',
        'Tanggal Faktur',
        'Tanggal Jatuh Tempo',
        'Hari Tersisa',
        'Total Tagihan (Rp)',
        'Terbayar (Rp)',
        'Sisa Utang (Rp)',
        'Status Pembayaran',
        'Catatan',
      ];
      const rows = filteredDebts.map((d) => {
        const days = getDaysRemaining(d.dueDate);
        return [
          d.creditorName,
          d.creditorType,
          d.invoiceNumber,
          d.invoiceDate,
          d.dueDate,
          days < 0 ? `Terlambat ${Math.abs(days)} hari` : `${days} hari lagi`,
          d.totalAmount,
          d.paidAmount,
          d.totalAmount - d.paidAmount,
          d.status.toUpperCase(),
          d.notes || '',
        ];
      });
      downloadCsv(`Buku_Utang_Klinik_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    } else {
      const headers = [
        'Nama Debitur / Instansi',
        'Jenis Debitur',
        'No. Berkas Klaim',
        'Tanggal Pengajuan',
        'Estimasi Jatuh Tempo',
        'Hari Tersisa',
        'Total Nilai Klaim (Rp)',
        'Sudah Diterima (Rp)',
        'Sisa Piutang (Rp)',
        'Status Klaim',
        'Catatan',
      ];
      const rows = filteredReceivables.map((r) => {
        const days = getDaysRemaining(r.expectedDueDate);
        return [
          r.debtorName,
          r.debtorType,
          r.claimBatchNumber,
          r.claimDate,
          r.expectedDueDate,
          days < 0 ? `Melewati ${Math.abs(days)} hari` : `${days} hari lagi`,
          r.claimAmount,
          r.receivedAmount,
          r.claimAmount - r.receivedAmount,
          r.status.toUpperCase(),
          r.notes || '',
        ];
      });
      downloadCsv(`Buku_Piutang_Klaim_Klinik_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    }
  };

  const handleOpenAddDebt = () => {
    setEditingDebtId(null);
    setNewDebt({
      creditorName: '',
      creditorType: 'PBF Obat',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      totalAmount: '',
      notes: '',
    });
    setShowAddDebtModal(true);
  };

  const handleOpenEditDebt = (debt: DebtEntry) => {
    setEditingDebtId(debt.id);
    setNewDebt({
      creditorName: debt.creditorName,
      creditorType: debt.creditorType,
      invoiceNumber: debt.invoiceNumber,
      invoiceDate: debt.invoiceDate,
      dueDate: debt.dueDate,
      totalAmount: String(debt.totalAmount),
      notes: debt.notes || '',
    });
    setShowAddDebtModal(true);
  };

  const handleDeleteDebt = (id: string, creditorName: string) => {
    setDebtToDelete({ id, creditorName });
  };

  const handleOpenAddRec = () => {
    setEditingRecId(null);
    setNewRec({
      debtorName: '',
      debtorType: 'BPJS Kesehatan',
      claimBatchNumber: '',
      claimDate: new Date().toISOString().slice(0, 10),
      expectedDueDate: '',
      claimAmount: '',
      notes: '',
    });
    setShowAddRecModal(true);
  };

  const handleOpenEditReceivable = (rec: ReceivableEntry) => {
    setEditingRecId(rec.id);
    setNewRec({
      debtorName: rec.debtorName,
      debtorType: rec.debtorType,
      claimBatchNumber: rec.claimBatchNumber,
      claimDate: rec.claimDate,
      expectedDueDate: rec.expectedDueDate,
      claimAmount: String(rec.claimAmount),
      notes: rec.notes || '',
    });
    setShowAddRecModal(true);
  };

  const handleDeleteReceivable = (id: string, debtorName: string) => {
    setRecToDelete({ id, debtorName });
  };

  const submitNewDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newDebt.totalAmount) || 0;
    if (amountVal <= 0 || !newDebt.dueDate) return;

    if (editingDebtId) {
      const existing = debts.find((d) => d.id === editingDebtId);
      if (existing) {
        const updated: DebtEntry = {
          ...existing,
          creditorName: newDebt.creditorName,
          creditorType: newDebt.creditorType,
          invoiceNumber: newDebt.invoiceNumber || existing.invoiceNumber,
          invoiceDate: newDebt.invoiceDate,
          dueDate: newDebt.dueDate,
          totalAmount: amountVal,
          notes: newDebt.notes,
        };
        onUpdateDebt?.(updated);
      }
    } else {
      const entry: DebtEntry = {
        id: `debt-${Date.now()}`,
        creditorName: newDebt.creditorName,
        creditorType: newDebt.creditorType,
        invoiceNumber: newDebt.invoiceNumber || `FP-${Date.now().toString().slice(-5)}`,
        invoiceDate: newDebt.invoiceDate,
        dueDate: newDebt.dueDate,
        totalAmount: amountVal,
        paidAmount: 0,
        status: 'unpaid',
        notes: newDebt.notes,
      };
      onAddDebt(entry);
    }

    setShowAddDebtModal(false);
    setEditingDebtId(null);
    setNewDebt({
      creditorName: '',
      creditorType: 'PBF Obat',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      totalAmount: '',
      notes: '',
    });
  };

  const submitPayDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayDebtModal) return;
    const amountVal = parseFloat(payAmount) || 0;
    if (amountVal <= 0) return;

    onPayDebt(showPayDebtModal.id, amountVal, payAccount);
    setShowPayDebtModal(null);
    setPayAmount('');
  };

  const submitNewReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(newRec.claimAmount) || 0;
    if (amountVal <= 0 || !newRec.expectedDueDate) return;

    if (editingRecId) {
      const existing = receivables.find((r) => r.id === editingRecId);
      if (existing) {
        const updated: ReceivableEntry = {
          ...existing,
          debtorName: newRec.debtorName,
          debtorType: newRec.debtorType,
          claimBatchNumber: newRec.claimBatchNumber || existing.claimBatchNumber,
          claimDate: newRec.claimDate,
          expectedDueDate: newRec.expectedDueDate,
          claimAmount: amountVal,
          notes: newRec.notes,
        };
        onUpdateReceivable?.(updated);
      }
    } else {
      const entry: ReceivableEntry = {
        id: `rec-${Date.now()}`,
        debtorName: newRec.debtorName,
        debtorType: newRec.debtorType,
        claimBatchNumber: newRec.claimBatchNumber || `KLM-${Date.now().toString().slice(-5)}`,
        claimDate: newRec.claimDate,
        expectedDueDate: newRec.expectedDueDate,
        claimAmount: amountVal,
        receivedAmount: 0,
        status: 'submitted',
        notes: newRec.notes,
      };
      onAddReceivable(entry);
    }

    setShowAddRecModal(false);
    setEditingRecId(null);
    setNewRec({
      debtorName: '',
      debtorType: 'BPJS Kesehatan',
      claimBatchNumber: '',
      claimDate: new Date().toISOString().slice(0, 10),
      expectedDueDate: '',
      claimAmount: '',
      notes: '',
    });
  };

  const submitCollectReceivable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCollectRecModal) return;
    const amountVal = parseFloat(collectAmount) || 0;
    if (amountVal <= 0) return;

    onCollectReceivable(showCollectRecModal.id, amountVal, collectAccount);
    setShowCollectRecModal(null);
    setCollectAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Manajemen Utang & Piutang Klinik
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            title="Tarik Data ke Format Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Tarik Excel / CSV</span>
          </button>
          {activeSubTab === 'debts' ? (
            <button
              onClick={handleOpenAddDebt}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tagihan Utang PBF</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddRec}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Berkas Klaim BPJS</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher: Utang vs Piutang */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => {
            setActiveSubTab('debts');
            setFilterDueOnly(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'debts'
              ? 'bg-rose-50 text-rose-800 border border-rose-200/80 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-rose-600" />
          <span>Buku Utang Klinik (AP)</span>
          <span className="bg-rose-200/60 text-rose-900 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {formatRupiah(totalDebtsUnpaid)}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('receivables');
            setFilterDueOnly(false);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'receivables'
              ? 'bg-sky-50 text-sky-800 border border-sky-200/80 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-sky-600" />
          <span>Buku Piutang & Klaim (AR)</span>
          <span className="bg-sky-200/60 text-sky-900 px-2 py-0.5 rounded-full text-[10px] font-mono">
            {formatRupiah(totalRecsUncollected)}
          </span>
        </button>
      </div>

      {/* Urgency Alert & Quick Filter Box - With Pastel Color Theme */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50/70 p-4 rounded-2xl border-2 border-amber-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Peringatan Otomatis Jatuh Tempo
            </h4>
            <p className="text-[11px] text-amber-900/80 mt-0.5">
              {activeSubTab === 'debts'
                ? `Terdapat ${debtsOverdueOrCritical.length} tagihan distributor farmasi yang perlu segera dibayar.`
                : `Terdapat ${recsOverdueOrCritical.length} berkas klaim yang melewati estimasi tanggal pencairan.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterDueOnly(!filterDueOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border-2 cursor-pointer ${
              filterDueOnly
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{filterDueOnly ? 'Tampilkan Semua Data' : 'Filter Tagihan Jatuh Tempo Saja'}</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar (Request 3: Check by date range, month, year) */}
      <DateRangeFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        label="Filter Tanggal Faktur & Berkas Klaim"
      />

      {/* KPI Stat Cards - VIBRANT PASTEL THEMED (Request 2, 4, 5) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {activeSubTab === 'debts' ? (
          <>
            <div className="bg-rose-50/90 p-4 rounded-2xl border-2 border-rose-300 shadow-xs">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Sisa Utang Belum Lunas</span>
              <p className="text-lg font-black text-rose-950 font-mono mt-1">
                {formatRupiah(totalDebtsUnpaid)}
              </p>
              <span className="text-[10px] text-rose-700 mt-0.5 block font-medium">Kewajiban ke distributor PBF</span>
            </div>

            <div className="bg-amber-50/90 p-4 rounded-2xl border-2 border-amber-300 shadow-xs">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Jatuh Tempo / Kritis</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-amber-950 font-mono">{debtsOverdueOrCritical.length}</span>
                <span className="text-xs text-amber-800 font-bold">Faktur</span>
              </div>
              <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">Prioritas pembayaran kasir</span>
            </div>

            <div className="bg-emerald-50/90 p-4 rounded-2xl border-2 border-emerald-300 shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Utang Sudah Lunas</span>
              <p className="text-lg font-black text-emerald-950 font-mono mt-1">
                {formatRupiah(debts.filter(d => d.status === 'paid').reduce((acc, d) => acc + d.totalAmount, 0))}
              </p>
              <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">Faktur terselesaikan</span>
            </div>

            <div className="bg-sky-50/90 p-4 rounded-2xl border-2 border-sky-300 shadow-xs">
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Total Faktur Terdata</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-sky-950 font-mono">{debts.length}</span>
                <span className="text-xs text-sky-800 font-bold">Berkas</span>
              </div>
              <span className="text-[10px] text-sky-700 mt-0.5 block font-medium">Buku utang operasional</span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-sky-50/90 p-4 rounded-2xl border-2 border-sky-300 shadow-xs">
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Piutang Belum Cair</span>
              <p className="text-lg font-black text-sky-950 font-mono mt-1">
                {formatRupiah(totalRecsUncollected)}
              </p>
              <span className="text-[10px] text-sky-700 mt-0.5 block font-medium">Klaim BPJS & Asuransi</span>
            </div>

            <div className="bg-amber-50/90 p-4 rounded-2xl border-2 border-amber-300 shadow-xs">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Melewati Estimasi Cair</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-amber-950 font-mono">{recsOverdueOrCritical.length}</span>
                <span className="text-xs text-amber-800 font-bold">Berkas</span>
              </div>
              <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">Perlu follow-up penagihan</span>
            </div>

            <div className="bg-emerald-50/90 p-4 rounded-2xl border-2 border-emerald-300 shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Klaim Berhasil Cair</span>
              <p className="text-lg font-black text-emerald-950 font-mono mt-1">
                {formatRupiah(receivables.reduce((acc, r) => acc + r.receivedAmount, 0))}
              </p>
              <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">Sudah masuk rekening klinik</span>
            </div>

            <div className="bg-purple-50/90 p-4 rounded-2xl border-2 border-purple-300 shadow-xs">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Total Berkas Klaim</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-purple-950 font-mono">{receivables.length}</span>
                <span className="text-xs text-purple-800 font-bold">Pengajuan</span>
              </div>
              <span className="text-[10px] text-purple-700 mt-0.5 block font-medium">Piutang layanan faskes</span>
            </div>
          </>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              activeSubTab === 'debts'
                ? 'Cari nama distributor PBF atau nomor faktur...'
                : 'Cari nama BPJS / asuransi atau nomor berkas klaim...'
            }
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {activeSubTab === 'debts' ? filteredDebts.length : filteredReceivables.length} Data Terdaftar
        </span>
      </div>

      {/* Content Table: Debts (AP) */}
      {activeSubTab === 'debts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Distributor / PBF</th>
                  <th className="py-3 px-4">No. Faktur & Tgl</th>
                  <th className="py-3 px-4">Jatuh Tempo (Due Date)</th>
                  <th className="py-3 px-4 text-right">Total Faktur</th>
                  <th className="py-3 px-4 text-right">Terbayar</th>
                  <th className="py-3 px-4 text-right">Sisa Utang</th>
                  <th className="py-3 px-4 text-center">Status Tempo</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDebts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Tidak ada data tagihan utang yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredDebts.map((item) => {
                    const days = getDaysRemaining(item.dueDate);
                    const remaining = item.totalAmount - item.paidAmount;
                    const isPaid = item.status === 'paid';
                    const isTarget = highlightItemId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isTarget
                            ? 'bg-amber-50/80 ring-2 ring-amber-400'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {item.creditorName}
                          </span>
                          <span className="inline-block px-1.5 py-0.2 text-[10px] rounded bg-slate-100 text-slate-600 mt-0.5">
                            {item.creditorType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-800 block">
                            {item.invoiceNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Faktur: {item.invoiceDate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {formatDateId(item.dueDate)}
                          </span>
                          {!isPaid && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                                days < 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : days <= 3
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : days <= 7
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {days < 0
                                ? `LEWAT TEMPO (${Math.abs(days)} HARI)`
                                : days === 0
                                ? 'HARI INI JATUH TEMPO'
                                : `${days} hari lagi`}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                          {formatRupiah(item.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">
                          {formatRupiah(item.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                          {formatRupiah(remaining)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Lunas
                            </span>
                          ) : days < 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Terlambat
                            </span>
                          ) : item.paidAmount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                              Cicilan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                              Belum Dibayar
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!isPaid && (
                              <button
                                onClick={() => {
                                  setShowPayDebtModal(item);
                                  setPayAmount(String(remaining));
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Bayar Tagihan
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditDebt(item)}
                              className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                              title="Edit Data Utang"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDebt(item.id, item.creditorName)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Hapus Utang"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* Content Table: Receivables (AR) */}
      {activeSubTab === 'receivables' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Debitur / Pihak Penjamin</th>
                  <th className="py-3 px-4">No. Berkas Klaim & Tgl</th>
                  <th className="py-3 px-4">Estimasi Pencairan (Due)</th>
                  <th className="py-3 px-4 text-right">Nilai Klaim</th>
                  <th className="py-3 px-4 text-right">Sudah Diterima</th>
                  <th className="py-3 px-4 text-right">Sisa Piutang</th>
                  <th className="py-3 px-4 text-center">Status Verifikasi</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReceivables.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Tidak ada data piutang klaim yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredReceivables.map((item) => {
                    const days = getDaysRemaining(item.expectedDueDate);
                    const remaining = item.claimAmount - item.receivedAmount;
                    const isPaid = item.status === 'paid';
                    const isTarget = highlightItemId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isTarget
                            ? 'bg-amber-50/80 ring-2 ring-amber-400'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block">
                            {item.debtorName}
                          </span>
                          <span className="inline-block px-1.5 py-0.2 text-[10px] rounded bg-slate-100 text-slate-600 mt-0.5">
                            {item.debtorType}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-800 block">
                            {item.claimBatchNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Pengajuan: {item.claimDate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {formatDateId(item.expectedDueDate)}
                          </span>
                          {!isPaid && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block mt-0.5 ${
                                days < 0
                                  ? 'bg-rose-100 text-rose-700'
                                  : days <= 3
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {days < 0
                                ? `MELEWATI JADWAL (${Math.abs(days)} HARI)`
                                : days === 0
                                ? 'HARI INI ESTIMASI CAIR'
                                : `${days} hari lagi`}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                          {formatRupiah(item.claimAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">
                          {formatRupiah(item.receivedAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sky-700 text-sm">
                          {formatRupiah(remaining)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Lunas / Cair
                            </span>
                          ) : item.status === 'verified' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                              Siap Cair
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Verifikasi Berkas
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!isPaid && (
                              <button
                                onClick={() => {
                                  setShowCollectRecModal(item);
                                  setCollectAmount(String(remaining));
                                }}
                                className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Catat Pencairan
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditReceivable(item)}
                              className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                              title="Edit Berkas Piutang"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReceivable(item.id, item.debtorName)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Hapus Berkas Piutang"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* Modal Tambah Utang PBF Baru */}
      {showAddDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingDebtId ? 'Edit Faktur Tagihan Utang Distributor' : 'Tambah Faktur Utang Tempo Distributor (PBF)'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddDebtModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitNewDebt} className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nama Distributor / Vendor</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PT Enseval Putera Megatrading"
                    value={newDebt.creditorName || ''}
                    onChange={(e) => setNewDebt({ ...newDebt, creditorName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jenis Kreditor</label>
                  <select
                    value={newDebt.creditorType || 'PBF Obat'}
                    onChange={(e) => setNewDebt({ ...newDebt, creditorType: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="PBF Obat">PBF Obat (Pedagang Besar Farmasi)</option>
                    <option value="Distributor Alkes">Distributor Alkes</option>
                    <option value="Vendor Lab">Vendor Lab Rujukan</option>
                    <option value="Jasa Medis">Jasa Medis Rekanan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nomor Faktur PBF</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FP-2026/ENS/09812"
                    value={newDebt.invoiceNumber || ''}
                    onChange={(e) => setNewDebt({ ...newDebt, invoiceNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Total Nilai Tagihan (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 6500000"
                    value={newDebt.totalAmount || ''}
                    onChange={(e) => setNewDebt({ ...newDebt, totalAmount: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal Faktur</label>
                  <input
                    type="date"
                    required
                    value={newDebt.invoiceDate || ''}
                    onChange={(e) => setNewDebt({ ...newDebt, invoiceDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1 text-rose-700 font-bold">
                    Tanggal Jatuh Tempo (Due Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={newDebt.dueDate || ''}
                    onChange={(e) => setNewDebt({ ...newDebt, dueDate: e.target.value })}
                    className="w-full p-2 border border-rose-300 rounded-lg bg-rose-50/40 focus:ring-1 focus:ring-rose-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Rincian Barang / Catatan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan obat & alkes tempo..."
                  value={newDebt.notes || ''}
                  onChange={(e) => setNewDebt({ ...newDebt, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDebtModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs"
                >
                  Simpan Tagihan Utang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bayar Tagihan Utang PBF */}
      {showPayDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Catat Pembayaran Faktur Utang
              </h3>
              <button
                onClick={() => setShowPayDebtModal(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitPayDebt} className="p-6 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">{showPayDebtModal.creditorName}</p>
                <p className="text-slate-500 font-mono">No Faktur: {showPayDebtModal.invoiceNumber}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 font-mono">
                  <span>Sisa Tagihan:</span>
                  <span className="font-bold text-rose-600">
                    {formatRupiah(showPayDebtModal.totalAmount - showPayDebtModal.paidAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nominal Pembayaran (Rp)</label>
                <input
                  type="number"
                  required
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Sumber Rekening Kas / Bank</label>
                <select
                  value={payAccount || (profile.bankAccounts?.[0] ? `${profile.bankAccounts[0].bankName} - ${profile.bankAccounts[0].accountNumber}` : 'Kas Kasir (Tunai)')}
                  onChange={(e) => setPayAccount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                >
                  {getClinicAccountOptions(profile).map((opt) => (
                    <option key={opt.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Pembayaran akan otomatis dicatat sebagai pengeluaran pada buku arus kas harian.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayDebtModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Piutang BPJS / Asuransi Baru */}
      {showAddRecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingRecId ? 'Edit Berkas Klaim Piutang' : 'Tambah Berkas Klaim Piutang (BPJS / Asuransi)'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddRecModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitNewReceivable} className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Debitur / Instansi Penjamin</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BPJS Kesehatan Cabang Jaksel"
                    value={newRec.debtorName || ''}
                    onChange={(e) => setNewRec({ ...newRec, debtorName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Jenis Piutang</label>
                  <select
                    value={newRec.debtorType || 'BPJS Kesehatan'}
                    onChange={(e) => setNewRec({ ...newRec, debtorType: e.target.value as any })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="BPJS Kesehatan">BPJS Kesehatan (Faskes Tingkat 1)</option>
                    <option value="Asuransi Swasta">Asuransi Swasta (AdMedika/dll)</option>
                    <option value="Perusahaan Rekanan">Perusahaan Rekanan (MCU Korporat)</option>
                    <option value="Pasien Umum">Piutang Pasien Umum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">No. Berkas / Batch Klaim</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KLAIM-BPJS-SEP26-02"
                    value={newRec.claimBatchNumber || ''}
                    onChange={(e) => setNewRec({ ...newRec, claimBatchNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Nilai Pengajuan Klaim (Rp)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 18500000"
                    value={newRec.claimAmount || ''}
                    onChange={(e) => setNewRec({ ...newRec, claimAmount: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal Pengajuan Berkas</label>
                  <input
                    type="date"
                    required
                    value={newRec.claimDate || ''}
                    onChange={(e) => setNewRec({ ...newRec, claimDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1 text-sky-700 font-bold">
                    Estimasi Tanggal Pencairan (Due Date)
                  </label>
                  <input
                    type="date"
                    required
                    value={newRec.expectedDueDate || ''}
                    onChange={(e) => setNewRec({ ...newRec, expectedDueDate: e.target.value })}
                    className="w-full p-2 border border-sky-300 rounded-lg bg-sky-50/40 focus:ring-1 focus:ring-sky-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Catatan / Jumlah Berkas Tindakan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan berkas klaim tindakan/rawat..."
                  value={newRec.notes || ''}
                  onChange={(e) => setNewRec({ ...newRec, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRecModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs"
                >
                  Simpan Berkas Klaim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catat Pencairan Klaim Piutang */}
      {showCollectRecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Catat Penerimaan Pencairan Klaim
              </h3>
              <button
                onClick={() => setShowCollectRecModal(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitCollectReceivable} className="p-6 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">{showCollectRecModal.debtorName}</p>
                <p className="text-slate-500 font-mono">No Batch: {showCollectRecModal.claimBatchNumber}</p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 font-mono">
                  <span>Sisa Belum Cair:</span>
                  <span className="font-bold text-sky-600">
                    {formatRupiah(showCollectRecModal.claimAmount - showCollectRecModal.receivedAmount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nominal yang Dicairkan (Rp)</label>
                <input
                  type="number"
                  required
                  value={collectAmount || ''}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Masuk ke Rekening Bank Klinik</label>
                <select
                  value={collectAccount || (profile.bankAccounts?.[0] ? `${profile.bankAccounts[0].bankName} - ${profile.bankAccounts[0].accountNumber}` : 'Kas Kasir (Tunai)')}
                  onChange={(e) => setCollectAccount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                >
                  {getClinicAccountOptions(profile).map((opt) => (
                    <option key={opt.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Pencairan akan otomatis tercatat sebagai arus kas masuk pada buku kas harian.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCollectRecModal(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs"
                >
                  Konfirmasi Penerimaan Dana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
