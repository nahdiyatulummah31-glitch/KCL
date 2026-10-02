import React, { useState, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Plus,
  FileText,
  DollarSign,
  Download,
  Calendar,
  UserCheck,
  Building2,
  FileCheck,
} from 'lucide-react';
import { ReceivableEntry, ClinicProfile, UserAccount, InkasoStatus, getClinicAccountOptions } from '../types';
import { formatRupiah, downloadCsv, getDaysRemaining } from '../utils/formatters';

interface InkasoViewProps {
  receivables: ReceivableEntry[];
  profile: ClinicProfile;
  activeUser: UserAccount;
  onAddReceivable: (entry: ReceivableEntry) => void;
  onCollectReceivable: (id: string, amount: number, account: string) => void;
  onUpdateInkasoStatus: (id: string, inkasoStatus: InkasoStatus, collector: string, notes: string) => void;
}

export const InkasoView: React.FC<InkasoViewProps> = ({
  receivables,
  profile,
  activeUser,
  onAddReceivable,
  onCollectReceivable,
  onUpdateInkasoStatus,
}) => {
  const isManagerOrDirector =
    activeUser.role === 'super_admin' || activeUser.role === 'finance_manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [debtorTypeFilter, setDebtorTypeFilter] = useState<string>('all');

  // Modal: Catat Pencairan Inkaso
  const [selectedReceivableForCollection, setSelectedReceivableForCollection] =
    useState<ReceivableEntry | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectAccount, setCollectAccount] = useState<string>('Bank BCA Klinik');
  const [collectError, setCollectError] = useState<string>('');

  // Modal: Update Status Inkaso
  const [selectedReceivableForStatus, setSelectedReceivableForStatus] =
    useState<ReceivableEntry | null>(null);
  const [newStatus, setNewStatus] = useState<InkasoStatus>('proses_penagihan');
  const [collectorName, setCollectorName] = useState<string>(activeUser.name);
  const [statusNotes, setStatusNotes] = useState<string>('');
  const [statusError, setStatusError] = useState<string>('');

  // Modal: Tambah Berkas Inkaso Baru
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({
    debtorName: '',
    debtorType: 'BPJS Kesehatan' as ReceivableEntry['debtorType'],
    claimBatchNumber: '',
    claimDate: new Date().toISOString().slice(0, 10),
    expectedDueDate: '',
    claimAmount: '',
    inkasoCollector: activeUser.name,
    inkasoNotes: '',
    notes: '',
  });
  const [addFormError, setAddFormError] = useState('');

  // Filtering
  const filtered = useMemo(() => {
    return receivables.filter((r) => {
      const matchSearch =
        r.debtorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.claimBatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const currentInkasoStatus = r.inkasoStatus || (r.status === 'paid' ? 'cair_lunas' : 'proses_penagihan');
      const matchStatus = statusFilter === 'all' || currentInkasoStatus === statusFilter;
      const matchType = debtorTypeFilter === 'all' || r.debtorType === debtorTypeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [receivables, searchTerm, statusFilter, debtorTypeFilter]);

  // Aggregate Metrics
  const totalBilled = useMemo(() => receivables.reduce((sum, r) => sum + r.claimAmount, 0), [receivables]);
  const totalCollected = useMemo(() => receivables.reduce((sum, r) => sum + r.receivedAmount, 0), [receivables]);
  const totalOutstanding = totalBilled - totalCollected;
  const recoveryRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0';

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      'No. Batch / Berkas Klaim',
      'Debitur / Penjamin',
      'Jenis Debitur',
      'Tanggal Klaim',
      'Estimasi Cair',
      'Nominal Ditagihkan (Rp)',
      'Sudah Cair (Rp)',
      'Sisa Piutang (Rp)',
      'Status Inkaso',
      'Petugas Kolektor',
      'Catatan Inkaso',
    ];

    const rows = filtered.map((r) => [
      r.claimBatchNumber,
      r.debtorName,
      r.debtorType,
      r.claimDate,
      r.expectedDueDate,
      r.claimAmount,
      r.receivedAmount,
      r.claimAmount - r.receivedAmount,
      r.inkasoStatus || (r.status === 'paid' ? 'cair_lunas' : 'proses_penagihan'),
      r.inkasoCollector || '-',
      r.inkasoNotes || r.notes || '-',
    ]);

    downloadCsv(`Laporan_Inkaso_Klaim_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  // Submit Collect
  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCollectError('');

    if (!selectedReceivableForCollection) return;
    const amountNum = parseFloat(collectAmount) || 0;
    const uncollected = selectedReceivableForCollection.claimAmount - selectedReceivableForCollection.receivedAmount;

    // Strict validation
    if (amountNum <= 0) {
      setCollectError('Nominal pencairan harus lebih dari Rp 0!');
      return;
    }
    if (amountNum > uncollected) {
      setCollectError(`Nominal tidak boleh melebihi sisa tagihan (${formatRupiah(uncollected)})!`);
      return;
    }

    onCollectReceivable(selectedReceivableForCollection.id, amountNum, collectAccount);
    setSelectedReceivableForCollection(null);
    setCollectAmount('');
  };

  // Submit Status Update
  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError('');

    if (!selectedReceivableForStatus) return;
    if (!collectorName.trim()) {
      setStatusError('Nama petugas penagih (kolektor) wajib diisi!');
      return;
    }
    if (!statusNotes.trim()) {
      setStatusError('Catatan perkembangan inkaso wajib diisi!');
      return;
    }

    onUpdateInkasoStatus(selectedReceivableForStatus.id, newStatus, collectorName.trim(), statusNotes.trim());
    setSelectedReceivableForStatus(null);
  };

  // Submit New Inkaso Receivable
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError('');

    // Strict validation
    if (!newForm.debtorName.trim()) {
      setAddFormError('Nama debitur / penjamin klaim wajib diisi!');
      return;
    }
    if (!newForm.claimBatchNumber.trim()) {
      setAddFormError('Nomor berkas klaim / FPK wajib diisi!');
      return;
    }
    const amt = parseFloat(newForm.claimAmount) || 0;
    if (amt <= 0) {
      setAddFormError('Nominal klaim yang ditagihkan harus valid dan lebih dari 0!');
      return;
    }
    if (!newForm.expectedDueDate) {
      setAddFormError('Estimasi tanggal jatuh tempo pencairan wajib dipilih!');
      return;
    }

    const newRec: ReceivableEntry = {
      id: `rec-${Date.now()}`,
      debtorName: newForm.debtorName.trim(),
      debtorType: newForm.debtorType,
      claimBatchNumber: newForm.claimBatchNumber.trim(),
      claimDate: newForm.claimDate,
      expectedDueDate: newForm.expectedDueDate,
      claimAmount: amt,
      receivedAmount: 0,
      status: 'submitted',
      inkasoStatus: 'proses_penagihan',
      inkasoCollector: newForm.inkasoCollector.trim() || activeUser.name,
      inkasoSubmissionDate: newForm.claimDate,
      inkasoNotes: newForm.inkasoNotes.trim() || 'Berkas diajukan untuk penagihan inkaso',
      notes: newForm.notes.trim(),
    };

    onAddReceivable(newRec);
    setShowAddModal(false);
    setNewForm({
      debtorName: '',
      debtorType: 'BPJS Kesehatan',
      claimBatchNumber: '',
      claimDate: new Date().toISOString().slice(0, 10),
      expectedDueDate: '',
      claimAmount: '',
      inkasoCollector: activeUser.name,
      inkasoNotes: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-700/50 backdrop-blur-sm text-xs font-semibold tracking-wide text-blue-100 uppercase border border-blue-400/30 mb-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Modul Inkaso Piutang Klinik
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Pelacakan & Penagihan Inkaso
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" />
              Tambah Berkas Inkaso
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Nilai Inkaso Diajukan
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-2">{formatRupiah(totalBilled)}</div>
          <div className="text-xs text-slate-500 mt-1">{receivables.length} Berkas Klaim Aktif</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Realisasi Dana Cair (Masuk)
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{formatRupiah(totalCollected)}</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            Recovery Rate: {recoveryRate}%
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Sisa Belum Cair (Outstanding)
          </span>
          <div className="text-2xl font-bold text-amber-700 mt-2">{formatRupiah(totalOutstanding)}</div>
          <div className="text-xs text-amber-600 font-medium mt-1">Menunggu Kliring Bank</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            Petugas Penagih (Kolektor)
          </span>
          <div className="text-base font-bold text-blue-900 mt-2 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-blue-600" />
            Nadia, S.E. (Keuangan)
          </div>
          <div className="text-xs text-slate-500 mt-1">Otorisasi Hak Akses: Pimpinan & Keuangan</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor batch klaim, nama penjamin/BPJS, atau catatan..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Status Inkaso</option>
            <option value="proses_penagihan">Proses Penagihan</option>
            <option value="verifikasi_berkas">Verifikasi Berkas</option>
            <option value="cair_sebagian">Cair Sebagian</option>
            <option value="cair_lunas">Cair Lunas</option>
          </select>

          {/* Debtor Type */}
          <select
            value={debtorTypeFilter}
            onChange={(e) => setDebtorTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Jenis Penjamin</option>
            <option value="BPJS Kesehatan">BPJS Kesehatan</option>
            <option value="Asuransi Swasta">Asuransi Swasta</option>
            <option value="Perusahaan Rekanan">Perusahaan Rekanan</option>
            <option value="Pasien Pribadi">Pasien Pribadi</option>
          </select>
        </div>
      </div>

      {/* Main Inkaso Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700" />
            Daftar Berkas Penagihan Inkaso ({filtered.length} Berkas)
          </h2>
          <span className="text-xs text-slate-500">
            Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">No. Batch Klaim</th>
                <th className="py-3 px-3.5">Penjamin / Debitur</th>
                <th className="py-3 px-3.5">Tgl Pengajuan & Jatuh Tempo</th>
                <th className="py-3 px-3.5 text-right">Nilai Klaim</th>
                <th className="py-3 px-3.5 text-right">Sudah Cair</th>
                <th className="py-3 px-3.5 text-right">Sisa Tagihan</th>
                <th className="py-3 px-3.5 text-center">Status Inkaso</th>
                <th className="py-3 px-3.5">Kolektor & Progres</th>
                <th className="py-3 px-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const remaining = item.claimAmount - item.receivedAmount;
                const daysRemaining = getDaysRemaining(item.expectedDueDate);
                const currentStatus =
                  item.inkasoStatus || (item.status === 'paid' ? 'cair_lunas' : 'proses_penagihan');

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-blue-900">
                      <div>{item.claimBatchNumber}</div>
                      <span className="text-[10px] text-slate-500 font-normal">{item.debtorType}</span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-800 font-medium max-w-[200px]">
                      <div>{item.debtorName}</div>
                      <div className="text-[10px] text-slate-500 truncate" title={item.notes}>
                        {item.notes || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">
                      <div>Klaim: {item.claimDate}</div>
                      <div className="text-[11px] font-semibold mt-0.5">
                        {daysRemaining < 0 ? (
                          <span className="text-rose-600">Lewat {Math.abs(daysRemaining)} hr</span>
                        ) : daysRemaining <= 3 ? (
                          <span className="text-amber-600">Jatuh tempo dlm {daysRemaining} hr</span>
                        ) : (
                          <span className="text-slate-500">Est: {item.expectedDueDate}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-slate-900">
                      {formatRupiah(item.claimAmount)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-emerald-700">
                      {formatRupiah(item.receivedAmount)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-amber-700">
                      {formatRupiah(remaining)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {currentStatus === 'cair_lunas' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cair Lunas
                        </span>
                      )}
                      {currentStatus === 'cair_sebagian' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
                          <Clock className="w-3 h-3 text-cyan-600" /> Cair Sebagian
                        </span>
                      )}
                      {currentStatus === 'verifikasi_berkas' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          <FileCheck className="w-3 h-3 text-purple-600" /> Verifikasi FPK
                        </span>
                      )}
                      {currentStatus === 'proses_penagihan' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" /> Ditagihkan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 max-w-[220px]">
                      <div className="font-semibold text-[11px] text-slate-900">
                        {item.inkasoCollector || 'Nadia (Keuangan)'}
                      </div>
                      <div className="text-[10px] text-slate-600 truncate mt-0.5" title={item.inkasoNotes}>
                        {item.inkasoNotes || 'Sedang proses verifikasi berkas'}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {remaining > 0 ? (
                          <button
                            onClick={() => {
                              setSelectedReceivableForCollection(item);
                              setCollectAmount(String(remaining));
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-all"
                            title="Catat Pencairan Dana ke Kasir/Bank"
                          >
                            <DollarSign className="w-3 h-3" /> Cair
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">Selesai</span>
                        )}

                        <button
                          onClick={() => {
                            setSelectedReceivableForStatus(item);
                            setNewStatus((item.inkasoStatus as InkasoStatus) || 'proses_penagihan');
                            setCollectorName(item.inkasoCollector || activeUser.name);
                            setStatusNotes(item.inkasoNotes || '');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium border border-slate-300 transition-all"
                          title="Perbarui Status & Catatan Penagihan"
                        >
                          Status
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Catat Pencairan Inkaso */}
      {selectedReceivableForCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Catat Pencairan Dana Inkaso
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dana yang cair akan otomatis dicatat ke arus kas masuk klinik.
                </p>
              </div>
              <button
                onClick={() => setSelectedReceivableForCollection(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCollectSubmit} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Debitur / Klaim:</span>
                  <span className="font-bold text-slate-900">
                    {selectedReceivableForCollection.debtorName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Batch:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedReceivableForCollection.claimBatchNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Tagihan Belum Cair:</span>
                  <span className="font-bold text-amber-700">
                    {formatRupiah(
                      selectedReceivableForCollection.claimAmount -
                        selectedReceivableForCollection.receivedAmount
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Dana Masuk (Rp) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="number"
                  min="1"
                  max={
                    selectedReceivableForCollection.claimAmount -
                    selectedReceivableForCollection.receivedAmount
                  }
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Masuk ke Rekening / Kas <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={collectAccount || (profile.bankAccounts?.[0] ? `${profile.bankAccounts[0].bankName} - ${profile.bankAccounts[0].accountNumber}` : 'Kas Kasir (Tunai)')}
                  onChange={(e) => setCollectAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {getClinicAccountOptions(profile).map((opt) => (
                    <option key={opt.id} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {collectError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {collectError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReceivableForCollection(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!collectAmount}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Konfirmasi Penerimaan Dana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Status Inkaso */}
      {selectedReceivableForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-blue-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-blue-600" />
                  Perbarui Status Penagihan Inkaso
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update perkembangan penagihan klaim BPJS atau asuransi.
                </p>
              </div>
              <button
                onClick={() => setSelectedReceivableForStatus(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Inkaso Saat Ini <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as InkasoStatus)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="proses_penagihan">Proses Penagihan (Berkas Diajukan)</option>
                  <option value="verifikasi_berkas">Verifikasi Berkas & FPK oleh Penjamin</option>
                  <option value="cair_sebagian">Cair Sebagian</option>
                  <option value="cair_lunas">Cair Lunas (Selesai)</option>
                  <option value="ditolak_banding">Ditolak / Proses Banding</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Petugas Kolektor Penagih <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  placeholder="Nama petugas finance penagih..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Perkembangan Penagihan <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Contoh: Berkas 42 pasien HD sudah diverifikasi verifikator BPJS. Dijadwalkan kliring tanggal 18..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {statusError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {statusError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedReceivableForStatus(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!collectorName.trim() || !statusNotes.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Simpan Status Inkaso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Berkas Inkaso Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-blue-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  Tambah Berkas Penagihan Inkaso
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftarkan klaim BPJS, asuransi, atau korporat baru.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Debitur / Penjamin <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={newForm.debtorType}
                    onChange={(e) =>
                      setNewForm({
                        ...newForm,
                        debtorType: e.target.value as ReceivableEntry['debtorType'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="BPJS Kesehatan">BPJS Kesehatan</option>
                    <option value="Asuransi Swasta">Asuransi Swasta</option>
                    <option value="Perusahaan Rekanan">Perusahaan Rekanan</option>
                    <option value="Pasien Pribadi">Pasien Pribadi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Berkas / FPK / Batch <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="text"
                    value={newForm.claimBatchNumber}
                    onChange={(e) => setNewForm({ ...newForm, claimBatchNumber: e.target.value })}
                    placeholder="Contoh: BPJS-HD-2026-09"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Debitur / Instansi <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={newForm.debtorName}
                  onChange={(e) => setNewForm({ ...newForm, debtorName: e.target.value })}
                  placeholder="Contoh: BPJS Kesehatan Kantor Cabang (Klaim Hemodialisa)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Pengajuan <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="date"
                    value={newForm.claimDate}
                    onChange={(e) => setNewForm({ ...newForm, claimDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Jatuh Tempo <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="date"
                    value={newForm.expectedDueDate}
                    onChange={(e) => setNewForm({ ...newForm, expectedDueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal Klaim (Rp) <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newForm.claimAmount}
                    onChange={(e) => setNewForm({ ...newForm, claimAmount: e.target.value })}
                    placeholder="Contoh: 45000000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Petugas Penagih (Kolektor) <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  value={newForm.inkasoCollector}
                  onChange={(e) => setNewForm({ ...newForm, inkasoCollector: e.target.value })}
                  placeholder="Nama staf keuangan / penagih..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Klaim & Rincian Berkas:
                </label>
                <textarea
                  rows={2}
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  placeholder="Keterangan jumlah berkas pasien, poli/unit HD, kelengkapan FP..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {addFormError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {addFormError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newForm.debtorName || !newForm.claimBatchNumber || !newForm.claimAmount || !newForm.expectedDueDate}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs ${
                    !newForm.debtorName || !newForm.claimBatchNumber || !newForm.claimAmount || !newForm.expectedDueDate
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Simpan Berkas Inkaso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
