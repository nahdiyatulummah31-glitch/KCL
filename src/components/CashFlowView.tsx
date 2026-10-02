import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  FileSpreadsheet,
  Plus,
  Calendar,
  Wallet,
  Building,
  CheckCircle,
  Clock,
  Search,
  Banknote,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  CashFlowEntry,
  CashFlowType,
  ClinicProfile,
  UserAccount,
  isOwnerOrManager,
  getStaffAllowedDateWindow,
  getClinicAccountOptions,
} from '../types';
import { formatRupiah, downloadCsv } from '../utils/formatters';
import { DateRangeFilterBar, DateFilterState, matchDateFilter } from './DateRangeFilterBar';

interface CashFlowViewProps {
  entries: CashFlowEntry[];
  profile: ClinicProfile;
  activeUser: UserAccount;
  onAddEntry: (entry: CashFlowEntry) => void;
  onUpdateEntry?: (entry: CashFlowEntry) => void;
  onDeleteEntry?: (id: string) => void;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  entries,
  profile,
  activeUser,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}) => {
  const isSupervisorOrOwner = isOwnerOrManager(activeUser);
  const refDate = '2026-09-16';
  const staffWindow = getStaffAllowedDateWindow(refDate);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<CashFlowEntry | null>(null);

  // Dynamic clinic accounts from profile
  const accountOptions = useMemo(() => getClinicAccountOptions(profile), [profile]);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    mode: 'all',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    month: '2026-09',
    year: '2026',
  });

  // New Cashflow Form State
  const [formData, setFormData] = useState({
    date: '2026-09-16',
    type: 'in' as CashFlowType,
    category: 'Pendapatan Kasir SIMRS (Tunai)',
    description: '',
    amount: '',
    account: 'Kas Kasir (Tunai)',
    refNumber: `MUT-${Date.now().toString().slice(-6)}`,
  });

  const filtered = useMemo(() => {
    return entries.filter((item) => {
      const matchSearch =
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.refNumber && item.refNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType = selectedType === 'all' || item.type === selectedType;
      const matchAccount =
        selectedAccount === 'all' ||
        item.account === selectedAccount ||
        (selectedAccount.includes('BCA') && item.account.includes('BCA')) ||
        (selectedAccount.includes('Mandiri') && item.account.includes('Mandiri'));
      const matchDate = matchDateFilter(item.date, dateFilter);
      return matchSearch && matchType && matchAccount && matchDate;
    });
  }, [entries, searchTerm, selectedType, selectedAccount, dateFilter]);

  // Modal Awal Kasir / Kas Laci
  const startingCash = 1500000;

  // Calculations
  const totalInflow = filtered
    .filter((e) => e.type === 'in')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalOutflow = filtered
    .filter((e) => e.type === 'out')
    .reduce((acc, e) => acc + e.amount, 0);

  const netCashflow = totalInflow - totalOutflow;
  const finalCalculatedBalance = startingCash + netCashflow;

  // Single click export
  const handleExportCsv = () => {
    const headers = [
      'ID Mutasi',
      'Tanggal',
      'Jenis Arus Kas',
      'Kategori',
      'Keterangan Transaksi',
      'Nominal (IDR)',
      'Akun / Rekening',
      'No Referensi',
      'Pencatat',
      'Status',
    ];
    const rows = filtered.map((e) => [
      e.id,
      e.date,
      e.type === 'in' ? 'KAS MASUK (DEBIT)' : 'KAS KELUAR (KREDIT)',
      e.category,
      e.description,
      e.amount,
      e.account,
      e.refNumber || '-',
      e.createdBy,
      e.status,
    ]);
    downloadCsv(`Buku_Arus_Kas_${dateFilter.mode}_${dateFilter.startDate}`, headers, rows);
  };

  const handleOpenAddModal = () => {
    setEditingEntryId(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      type: 'in',
      category: 'Pendapatan Kasir SIMRS (Tunai)',
      description: '',
      amount: '',
      account: 'Kas Kasir (Tunai)',
      refNumber: `MUT-${Date.now().toString().slice(-6)}`,
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: CashFlowEntry) => {
    setEditingEntryId(item.id);
    setFormData({
      date: item.date,
      type: item.type,
      category: item.category,
      description: item.description,
      amount: String(item.amount),
      account: item.account,
      refNumber: item.refNumber || '',
    });
    setShowAddModal(true);
  };

  const handleDeleteEntry = (item: CashFlowEntry) => {
    setEntryToDelete(item);
  };

  const handleSubmitNewEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Keterangan dan nominal mutasi valid wajib diisi!');
      return;
    }

    if (editingEntryId) {
      const existing = entries.find((e) => e.id === editingEntryId);
      if (existing) {
        const updated: CashFlowEntry = {
          ...existing,
          date: formData.date,
          type: formData.type,
          category: formData.category,
          description: formData.description.trim(),
          amount: parseFloat(formData.amount),
          account: formData.account,
          refNumber: formData.refNumber.trim(),
        };
        onUpdateEntry?.(updated);
      }
    } else {
      const newEntry: CashFlowEntry = {
        id: `cf-${Date.now()}`,
        date: formData.date,
        type: formData.type,
        category: formData.category,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        account: formData.account,
        refNumber: formData.refNumber.trim(),
        source: 'manual_expense',
        createdBy: activeUser.name,
        status: 'confirmed',
      };
      onAddEntry(newEntry);
    }

    setShowAddModal(false);
    setEditingEntryId(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      type: 'in',
      category: 'Pendapatan Kasir SIMRS (Tunai)',
      description: '',
      amount: '',
      account: 'Kas Kasir (Tunai)',
      refNumber: `MUT-${Date.now().toString().slice(-6)}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Regular staff notice banner */}
      {!isSupervisorOrOwner && (
        <div className="bg-amber-50/90 border-2 border-amber-300 p-3.5 rounded-2xl shadow-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">Akses Karyawan</span>
            <p className="text-xs text-amber-900 font-medium">
              Menampilkan data pemasukan arus kas untuk <strong>hari ini ({staffWindow.today})</strong> dan <strong>2 hari sebelumnya ({staffWindow.minDate} s/d {staffWindow.today})</strong>. Seluruh mutasi pengeluaran & data historis hanya dapat dilihat oleh Owner dan Manajer.
            </p>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-200/70 text-amber-900 border border-amber-300">
            Pemasukan 3 Hari
          </span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan Arus Kas Harian (Daily Cash Flow Ledger)
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title="Export Buku Arus Kas ke CSV/Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Tarik Excel / CSV</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Mutasi Kas</span>
          </button>
        </div>
      </div>

      {/* Date Filter Bar Component (Request 3) */}
      <DateRangeFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        label="Filter Periode Arus Kas Harian"
      />

      {/* 4 COLOR-CODED BOXES AS SPECIFIED (Request 2):
          - Uang awal: orange pastel cerah
          - Uang masuk: hijau cerah
          - Uang keluar: merah cerah
          - Sisa saldo: abu2 cerah */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: UANG AWAL (ORANGE PASTEL CERAH) */}
        <div className="bg-orange-50/70 p-4 rounded-2xl border-2 border-orange-300 shadow-xs hover:border-orange-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Uang Awal (Modal Kasir)</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center border border-orange-300">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-orange-950 font-mono mt-2">
            {formatRupiah(startingCash)}
          </p>
          <span className="text-[11px] text-orange-800/80 mt-0.5 block font-medium">
            Kas laci awal operasional klinik
          </span>
        </div>

        {/* Box 2: UANG MASUK (HIJAU CERAH) */}
        <div className="bg-emerald-50/80 p-4 rounded-2xl border-2 border-emerald-400 shadow-xs hover:border-emerald-500 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Uang Masuk (Inflow)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-950 font-mono mt-2">
            {formatRupiah(totalInflow)}
          </p>
          <span className="text-[11px] text-emerald-800/80 mt-0.5 block font-medium">
            Penerimaan SIMRS, tunai, QRIS & klaim
          </span>
        </div>

        {/* Box 3: UANG KELUAR (MERAH CERAH) */}
        <div className="bg-rose-50/80 p-4 rounded-2xl border-2 border-rose-300 shadow-xs hover:border-rose-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Uang Keluar (Outflow)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-950 font-mono mt-2">
            {formatRupiah(totalOutflow)}
          </p>
          <span className="text-[11px] text-rose-800/80 mt-0.5 block font-medium">
            Operasional, snack dokter, & utang obat
          </span>
        </div>

        {/* Box 4: SISA SALDO (ABU2 CERAH) */}
        <div className="bg-slate-100/90 p-4 rounded-2xl border-2 border-slate-300 shadow-xs hover:border-slate-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sisa Saldo Kas & Bank</span>
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl font-black font-mono mt-2 ${
              finalCalculatedBalance >= 0 ? 'text-slate-900' : 'text-rose-700'
            }`}
          >
            {formatRupiah(finalCalculatedBalance)}
          </p>
          <span className="text-[11px] text-slate-600 mt-0.5 block font-medium">
            Modal Awal + (Masuk - Keluar)
          </span>
        </div>
      </div>

      {/* Filter & Search Bar - With Pastel Trim */}
      <div className="bg-gradient-to-r from-teal-50/40 to-white p-4 rounded-2xl border-2 border-teal-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari deskripsi, kategori, atau no referensi..."
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">Jenis:</span>
            <select
              value={selectedType || 'all'}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-0.5 px-1 border-none text-slate-800 font-bold focus:outline-none"
            >
              <option value="all">Semua Arus Kas</option>
              <option value="in">Kas Masuk (Inflow)</option>
              <option value="out">Kas Keluar (Outflow)</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-slate-600 font-medium">Akun:</span>
            <select
              value={selectedAccount || 'all'}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="py-0.5 px-1 border-none text-slate-800 font-bold focus:outline-none"
            >
              <option value="all">Semua Rekening Kas</option>
              {accountOptions.map((opt) => (
                <option key={opt.id} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table - With Pastel Border */}
      <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Tanggal & Ref</th>
                <th className="py-3 px-4">Kategori & Keterangan</th>
                <th className="py-3 px-4">Rekening / Akun Kas</th>
                <th className="py-3 px-4 text-right">Debit (Kas Masuk)</th>
                <th className="py-3 px-4 text-right">Kredit (Kas Keluar)</th>
                <th className="py-3 px-4">Pencatat</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada catatan mutasi kas yang cocok dengan pencarian dan filter tanggal.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isIn = item.type === 'in';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">{item.date}</span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {item.refNumber || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{item.category}</span>
                        <span className="text-[11px] text-slate-500 block max-w-sm">
                          {item.description}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {item.account}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {isIn ? (
                          <span className="text-emerald-700">+{formatRupiah(item.amount)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {!isIn ? (
                          <span className="text-rose-600">-{formatRupiah(item.amount)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{item.createdBy}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          <span>Terkonfirmasi</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                            title="Edit Catatan Kas"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(item)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Catatan Kas"
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

      {/* Modal Catat / Edit Mutasi Kas */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-slate-200 shadow-xl p-6">
            <h3 className="font-bold text-base text-slate-900 mb-4">
              {editingEntryId ? 'Edit Catatan Mutasi Arus Kas' : 'Catat Mutasi Arus Kas Manual'}
            </h3>
            <form onSubmit={handleSubmitNewEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Jenis Arus Kas</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as CashFlowType })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="in">Kas Masuk (Debit)</option>
                    <option value="out">Kas Keluar (Kredit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Kategori</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Misal: Infaq, Parkir, Snack, Utilitas..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Keterangan Transaksi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Jelaskan keperluan atau sumber dana..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nominal (Rp)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Contoh: 150000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Akun / Rekening</label>
                  <select
                    value={formData.account}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        account: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    {accountOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold cursor-pointer"
                >
                  {editingEntryId ? 'Simpan Perubahan' : 'Simpan Mutasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* In-App Confirmation Modal: Delete Cash Flow Entry */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Catatan Mutasi Kas?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Yakin ingin menghapus catatan <strong>&quot;{entryToDelete.description}&quot;</strong> ({formatRupiah(entryToDelete.amount)})?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteEntry?.(entryToDelete.id);
                  setEntryToDelete(null);
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
