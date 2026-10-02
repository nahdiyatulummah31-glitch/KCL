import React, { useState, useMemo } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Users,
  DollarSign,
  FileSpreadsheet,
  Plus,
  Eye,
  Printer,
  CheckCircle2,
  Clock,
  Building,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  EmployeeSalaryRecord,
  UserAccount,
  ClinicProfile,
  canViewSalaryDetails,
} from '../types';
import { formatRupiah, formatDateId } from '../utils/formatters';

interface SalaryPayrollViewProps {
  salaries: EmployeeSalaryRecord[];
  activeUser: UserAccount;
  profile: ClinicProfile;
  onAddSalary?: (record: EmployeeSalaryRecord) => void;
  onUpdateSalary?: (record: EmployeeSalaryRecord) => void;
  onDeleteSalary?: (id: string) => void;
}

export const SalaryPayrollView: React.FC<SalaryPayrollViewProps> = ({
  salaries,
  activeUser,
  profile,
  onAddSalary,
  onUpdateSalary,
  onDeleteSalary,
}) => {
  // Check strict access control: Only Direktur & Bagian Keuangan can see detailed salary per employee!
  const hasDetailAccess = canViewSalaryDetails(activeUser);

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSlip, setActiveSlip] = useState<EmployeeSalaryRecord | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<EmployeeSalaryRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: `EMP-${Math.floor(100 + Math.random() * 900)}`,
    employeeName: '',
    position: '',
    department: 'Unit Hemodialisa (HD)',
    month: '2026-09',
    basicSalary: '',
    allowances: '',
    shiftBonus: '',
    overtime: '',
    deductions: '',
    paymentStatus: 'paid' as 'paid' | 'pending',
    paymentMethod: profile.bankAccounts?.[0] ? `Transfer ${profile.bankAccounts[0].bankName}` : 'Transfer Bank',
    accountNumber: '',
    notes: '',
  });

  // Filter records by month and search
  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      const matchMonth = s.month === selectedMonth;
      const matchSearch =
        s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department.toLowerCase().includes(searchTerm.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [salaries, selectedMonth, searchTerm]);

  // Aggregate totals
  const totalEmployees = filteredSalaries.length;
  const totalBasicSalary = useMemo(
    () => filteredSalaries.reduce((sum, s) => sum + s.basicSalary, 0),
    [filteredSalaries]
  );
  const totalAllowances = useMemo(
    () => filteredSalaries.reduce((sum, s) => sum + s.allowances, 0),
    [filteredSalaries]
  );
  const totalShiftBonus = useMemo(
    () => filteredSalaries.reduce((sum, s) => sum + s.shiftBonus, 0),
    [filteredSalaries]
  );
  const totalOvertime = useMemo(
    () => filteredSalaries.reduce((sum, s) => sum + s.overtime, 0),
    [filteredSalaries]
  );
  const totalDeductions = useMemo(
    () => filteredSalaries.reduce((sum, s) => sum + s.deductions, 0),
    [filteredSalaries]
  );
  const totalNetSalaries = useMemo(
    () => filteredSalaries.reduce((sum, s) => sum + s.netSalary, 0),
    [filteredSalaries]
  );

  // Export payroll recap to native Excel (.xlsx) for Direktur & Bagian Keuangan
  const handleExportExcel = () => {
    if (!hasDetailAccess) return;

    const exportRows = filteredSalaries.map((s, idx) => ({
      'No': idx + 1,
      'NIK / ID': s.employeeId,
      'Nama Karyawan': s.employeeName,
      'Jabatan': s.position,
      'Unit Kerja': s.department,
      'Periode': s.month,
      'Gaji Pokok (Rp)': s.basicSalary,
      'Tunjangan (Rp)': s.allowances,
      'Insentif Shift & Visit (Rp)': s.shiftBonus,
      'Lembur (Rp)': s.overtime,
      'Potongan BPJS / PPh21 (Rp)': s.deductions,
      'Total Gaji Bersih / THP (Rp)': s.netSalary,
      'Status Pembayaran': s.paymentStatus === 'paid' ? 'Lunas' : 'Menunggu',
      'Metode Transfer': s.paymentMethod,
      'No. Rekening': s.accountNumber || '-',
      'Keterangan': s.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 28 },
      { wch: 30 },
      { wch: 24 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 22 },
      { wch: 26 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Gaji Karyawan ${selectedMonth}`);
    XLSX.writeFile(workbook, `Rekap_Gaji_Karyawan_${selectedMonth}_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  // Open Edit Form
  const handleOpenEdit = (record: EmployeeSalaryRecord) => {
    setEditingRecord(record);
    setFormData({
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      position: record.position,
      department: record.department,
      month: record.month,
      basicSalary: record.basicSalary.toString(),
      allowances: record.allowances.toString(),
      shiftBonus: record.shiftBonus.toString(),
      overtime: record.overtime.toString(),
      deductions: record.deductions.toString(),
      paymentStatus: record.paymentStatus,
      paymentMethod: record.paymentMethod,
      accountNumber: record.accountNumber || '',
      notes: record.notes || '',
    });
    setShowAddModal(true);
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const basic = parseFloat(formData.basicSalary) || 0;
    const allow = parseFloat(formData.allowances) || 0;
    const shift = parseFloat(formData.shiftBonus) || 0;
    const ot = parseFloat(formData.overtime) || 0;
    const ded = parseFloat(formData.deductions) || 0;
    const net = basic + allow + shift + ot - ded;

    const newRecord: EmployeeSalaryRecord = {
      id: editingRecord ? editingRecord.id : `sal-${Date.now()}`,
      employeeId: formData.employeeId.trim(),
      employeeName: formData.employeeName.trim(),
      position: formData.position.trim(),
      department: formData.department,
      month: formData.month,
      basicSalary: basic,
      allowances: allow,
      shiftBonus: shift,
      overtime: ot,
      deductions: ded,
      netSalary: net,
      paymentStatus: formData.paymentStatus,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentMethod: formData.paymentMethod,
      accountNumber: formData.accountNumber.trim(),
      notes: formData.notes.trim(),
    };

    if (editingRecord && onUpdateSalary) {
      onUpdateSalary(newRecord);
    } else if (onAddSalary) {
      onAddSalary(newRecord);
    }

    setShowAddModal(false);
    setEditingRecord(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Access Status */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${hasDetailAccess ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-700'}`}>
              {hasDetailAccess ? <Unlock className="w-5 h-5 text-teal-600" /> : <Lock className="w-5 h-5 text-amber-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Rekapitulasi Gaji Karyawan & Payroll
                </h2>
                {hasDetailAccess ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                    Akses Otorisasi Penuh (Pimpinan & Keuangan)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    Akses Terbatas: Hanya Total Gaji
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls: Month Filter & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-1 focus:ring-teal-500"
          >
            <option value="2026-09">September 2026</option>
            <option value="2026-08">Agustus 2026</option>
            <option value="2026-07">Juli 2026</option>
          </select>

          {hasDetailAccess && (
            <>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
                title="Tarik Rekap Gaji Lengkap ke Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              <button
                onClick={() => {
                  setEditingRecord(null);
                  setFormData({
                    employeeId: `EMP-${Math.floor(100 + Math.random() * 900)}`,
                    employeeName: '',
                    position: '',
                    department: 'Unit Hemodialisa (HD)',
                    month: selectedMonth,
                    basicSalary: '',
                    allowances: '',
                    shiftBonus: '',
                    overtime: '',
                    deductions: '',
                    paymentStatus: 'paid',
                    paymentMethod: 'Transfer Bank BCA',
                    accountNumber: '',
                    notes: '',
                  });
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Input Gaji Karyawan</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* CORE KPI CARDS: Total Gaji Seluruh Karyawan (Visible to ALL Employees) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* TOTAL GAJI SELURUH KARYAWAN (Request: "Yg bisa dilihat karyawan hanya total jumlah gaji seluruh karyawan") */}
        <div className="bg-gradient-to-br from-teal-50/80 to-white p-5 rounded-2xl border-2 border-teal-500/40 shadow-xs sm:col-span-2 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                Total Jumlah Gaji Seluruh Karyawan ({selectedMonth})
              </span>
              <p className="text-3xl font-black text-teal-950 font-mono mt-2 tracking-tight">
                {formatRupiah(totalNetSalaries)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-teal-700 bg-teal-100/70 px-2.5 py-0.5 rounded-full border border-teal-200">
                  {totalEmployees} Karyawan Terdaftar
                </span>
                <span className="text-xs text-slate-500">
                  Total akumulasi payroll sah klinik periode {selectedMonth}
                </span>
              </div>
            </div>
            <div className="p-3 bg-teal-600 text-white rounded-xl shadow-sm">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* STATUS OTORISASI / PRIVACY CARD */}
        <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${hasDetailAccess ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
          <div>
            <div className="flex items-center gap-2">
              {hasDetailAccess ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <Lock className="w-5 h-5 text-amber-600" />
              )}
              <span className={`text-xs font-bold uppercase tracking-wider ${hasDetailAccess ? 'text-emerald-800' : 'text-amber-800'}`}>
                Status Hak Akses Payroll
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-2 leading-relaxed">
              {hasDetailAccess ? (
                <>
                  Anda login sebagai <strong>{activeUser.name}</strong>. Anda memiliki otorisasi penuh melihat rincian gaji, slip digital, dan edit nominal per karyawan.
                </>
              ) : (
                <>
                  Anda login sebagai <strong>{activeUser.name}</strong>. Sesuai kebijakan otorisasi klinik, rincian perorangan dikunci. Anda hanya dapat melihat <strong>total jumlah gaji seluruh karyawan</strong>.
                </>
              )}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/60 text-[11px] font-mono text-slate-500">
            {hasDetailAccess ? 'Status: Akses Terbuka' : 'Status: Data Detail Terproteksi'}
          </div>
        </div>
      </div>

      {/* DETAIL ACCESS BRANCHING */}
      {!hasDetailAccess ? (
        /* ================= EMPLOYEE VIEW (RESTRICTED DETAIL) ================= */
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-4 border border-amber-200 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Rincian & Slip Gaji Per Karyawan Terproteksi
          </h3>
          <p className="text-xs text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
            Sesuai kebijakan kerahasiaan dan privasi klinik, rincian slip per nama karyawan, gaji pokok, tunjangan, dan bonus insentif hanya dapat diakses oleh <strong>Pimpinan & Bagian Keuangan</strong>.
          </p>
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>Bulan Periode Penggajian:</span>
              <strong className="text-slate-900">{selectedMonth}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Jumlah Karyawan Terdaftar:</span>
              <strong className="text-slate-900">{totalEmployees} Orang</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600 border-t border-slate-200 pt-2 font-semibold">
              <span className="text-teal-800">Total Beban Gaji Keseluruhan:</span>
              <span className="font-mono text-teal-800 text-sm">{formatRupiah(totalNetSalaries)}</span>
            </div>
          </div>
          <span className="inline-block mt-4 text-[11px] text-slate-400 italic">
            *Untuk penyesuaian gaji atau cetak slip resmi, silakan hubungi Bagian Keuangan atau Pimpinan Klinik.
          </span>
        </div>
      ) : (
        /* ================= AUTHORIZED VIEW (FULL TRANSPARENCY) ================= */
        <div className="space-y-4">
          {/* Detailed Breakdown KPIs - COLOR CODED AS REQUESTED */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-sky-50/90 p-3.5 rounded-xl border-2 border-sky-300 shadow-xs">
              <span className="text-[10px] font-bold text-sky-800 uppercase">Gaji Pokok</span>
              <p className="text-sm font-bold text-sky-950 font-mono mt-1">
                {formatRupiah(totalBasicSalary)}
              </p>
            </div>
            <div className="bg-emerald-50/90 p-3.5 rounded-xl border-2 border-emerald-300 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Tunjangan</span>
              <p className="text-sm font-bold text-emerald-950 font-mono mt-1">
                {formatRupiah(totalAllowances)}
              </p>
            </div>
            <div className="bg-teal-50/90 p-3.5 rounded-xl border-2 border-teal-300 shadow-xs">
              <span className="text-[10px] font-bold text-teal-800 uppercase">Insentif / Visit</span>
              <p className="text-sm font-bold text-teal-950 font-mono mt-1">
                {formatRupiah(totalShiftBonus)}
              </p>
            </div>
            <div className="bg-amber-50/90 p-3.5 rounded-xl border-2 border-amber-300 shadow-xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Uang Lembur</span>
              <p className="text-sm font-bold text-amber-950 font-mono mt-1">
                {formatRupiah(totalOvertime)}
              </p>
            </div>
            <div className="bg-rose-50/90 p-3.5 rounded-xl border-2 border-rose-300 shadow-xs">
              <span className="text-[10px] font-bold text-rose-800 uppercase">Potongan BPJS/PPh21</span>
              <p className="text-sm font-bold text-rose-900 font-mono mt-1">
                - {formatRupiah(totalDeductions)}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3">
            <input
              type="text"
              placeholder="Cari nama karyawan, jabatan, unit kerja..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg flex-1 focus:ring-1 focus:ring-teal-500"
            />
            <span className="text-xs text-slate-500 font-mono">
              {filteredSalaries.length} dari {salaries.length} karyawan
            </span>
          </div>

          {/* Detailed Payroll Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 text-center w-10">#</th>
                    <th className="py-3 px-3.5">Karyawan & NIK</th>
                    <th className="py-3 px-3.5">Jabatan / Unit</th>
                    <th className="py-3 px-3.5 text-right font-mono">Gaji Pokok</th>
                    <th className="py-3 px-3.5 text-right font-mono">Tunjangan</th>
                    <th className="py-3 px-3.5 text-right font-mono">Bonus/Visit</th>
                    <th className="py-3 px-3.5 text-right font-mono text-rose-700">Potongan</th>
                    <th className="py-3 px-3.5 text-right font-mono font-black text-slate-900">
                      Take Home Pay
                    </th>
                    <th className="py-3 px-3.5 text-center">Rekening</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSalaries.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        Tidak ada data gaji karyawan untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredSalaries.map((rec, idx) => (
                      <tr key={rec.id} className="hover:bg-teal-50/30 transition-colors">
                        <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{rec.employeeName}</div>
                          <span className="text-[10px] font-mono text-slate-400">{rec.employeeId}</span>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-medium text-slate-800">{rec.position}</div>
                          <span className="text-[10px] text-teal-700 font-semibold">{rec.department}</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-700">
                          {formatRupiah(rec.basicSalary)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-700">
                          {formatRupiah(rec.allowances)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-700">
                          {formatRupiah(rec.shiftBonus + rec.overtime)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-rose-700">
                          - {formatRupiah(rec.deductions)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 text-sm">
                          {formatRupiah(rec.netSalary)}
                        </td>
                        <td className="py-3 px-3.5 text-center text-[11px] text-slate-600">
                          <div>{rec.paymentMethod}</div>
                          <span className="text-[10px] font-mono text-slate-400">{rec.accountNumber}</span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Lunas
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setActiveSlip(rec)}
                              className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold transition-colors flex items-center gap-1"
                              title="Lihat / Cetak Slip Gaji Digital"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Slip</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(rec)}
                              className="p-1 text-slate-400 hover:text-teal-700 rounded transition-colors"
                              title="Edit Data Gaji"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteSalary && (
                              <button
                                onClick={() => onDeleteSalary(rec.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan={3} className="py-3 px-3.5 uppercase tracking-wider">
                      TOTAL BEBAN GAJI KARYAWAN ({selectedMonth})
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-800">
                      {formatRupiah(totalBasicSalary)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-800">
                      {formatRupiah(totalAllowances)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-800">
                      {formatRupiah(totalShiftBonus + totalOvertime)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-rose-800">
                      - {formatRupiah(totalDeductions)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-sm font-black text-teal-900">
                      {formatRupiah(totalNetSalaries)}
                    </td>
                    <td colSpan={3} className="py-3 px-3.5 text-center text-slate-500 font-normal italic">
                      *Diverifikasi Bagian Keuangan & Disahkan Pimpinan Klinik
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK SLIP GAJI DIGITAL */}
      {activeSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Slip Gaji Digital Karyawan ({activeSlip.month})
                </h3>
              </div>
              <button
                onClick={() => setActiveSlip(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Slip Paper Container */}
            <div className="mt-4 p-6 bg-slate-50/50 rounded-xl border border-slate-200 text-slate-800 text-xs font-sans space-y-4">
              {/* Slip Header */}
              <div className="text-center border-b border-slate-200 pb-3">
                <h4 className="font-black text-base uppercase text-slate-900 tracking-wide">
                  {profile.name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{profile.address}, {profile.city}</p>
                <div className="inline-block mt-2 px-3 py-0.5 bg-teal-100 text-teal-800 rounded-full font-bold text-[11px] border border-teal-200">
                  SLIP GAJI BULANAN — {activeSlip.month}
                </div>
              </div>

              {/* Employee Bio */}
              <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-200 pb-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">Nama Karyawan:</span>
                  <strong className="text-slate-900">{activeSlip.employeeName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">NIK / ID Pegawai:</span>
                  <span className="font-mono font-bold text-slate-800">{activeSlip.employeeId}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Jabatan / Posisi:</span>
                  <span className="text-slate-800">{activeSlip.position}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Unit Penempatan:</span>
                  <span className="text-slate-800 font-semibold">{activeSlip.department}</span>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Gaji Pokok (Basic Salary):</span>
                  <span className="font-mono font-semibold text-slate-900">{formatRupiah(activeSlip.basicSalary)}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Tunjangan Jabatan & Medis:</span>
                  <span className="font-mono font-semibold text-slate-900">{formatRupiah(activeSlip.allowances)}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Insentif Tindakan & Visit:</span>
                  <span className="font-mono font-semibold text-slate-900">{formatRupiah(activeSlip.shiftBonus)}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Uang Lembur (Overtime):</span>
                  <span className="font-mono font-semibold text-slate-900">{formatRupiah(activeSlip.overtime)}</span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100 text-rose-700">
                  <span>Potongan BPJS & PPh21:</span>
                  <span className="font-mono font-semibold">- {formatRupiah(activeSlip.deductions)}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-t-2 border-slate-300 font-black text-slate-900 bg-white p-2 rounded-lg">
                  <span className="text-teal-900">TOTAL GAJI BERSIH (TAKE HOME PAY):</span>
                  <span className="font-mono text-teal-800 text-base">{formatRupiah(activeSlip.netSalary)}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-4 text-center text-xs">
                <div>
                  <span className="text-slate-500 text-[10px]">Disiapkan oleh (Keuangan):</span>
                  <div className="mt-8 font-bold text-slate-900 border-t border-slate-300 pt-1">
                    Bagian Keuangan
                  </div>
                  <span className="text-[10px] text-slate-400">Manajer Keuangan</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">Disetujui oleh:</span>
                  <div className="mt-8 font-bold text-slate-900 border-t border-slate-300 pt-1">
                    dr. H. Hendra Wijaya, Sp.PK
                  </div>
                  <span className="text-[10px] text-slate-400">Direktur Klinik</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Slip Gaji</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT / EDIT GAJI KARYAWAN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {editingRecord ? 'Edit Data Penggajian Karyawan' : 'Input Catatan Gaji Karyawan'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRecord(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIK / ID Karyawan *</label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Periode Bulan *</label>
                  <input
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Karyawan *</label>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                  placeholder="Contoh: dr. Anita Wijayanti, Sp.PD"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan / Posisi *</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    placeholder="Contoh: DPJP Spesialis Penyakit Dalam"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Kerja *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Unit Hemodialisa (HD)">Unit Hemodialisa (HD)</option>
                    <option value="Unit Instalasi Farmasi">Unit Instalasi Farmasi</option>
                    <option value="Unit Laboratorium Klinik">Unit Laboratorium Klinik</option>
                    <option value="Unit Poli Umum & Interna">Unit Poli Umum & Interna</option>
                    <option value="Unit Kasir & Manajemen">Unit Kasir & Manajemen</option>
                    <option value="Unit Sarpras & RO/Genset">Unit Sarpras & RO/Genset</option>
                  </select>
                </div>
              </div>

              {/* Financial components */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gaji Pokok (Rp) *</label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono bg-white"
                    placeholder="Contoh: 5000000"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tunjangan Jabatan (Rp)</label>
                  <input
                    type="number"
                    value={formData.allowances}
                    onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono bg-white"
                    placeholder="Contoh: 1500000"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Insentif Shift / Visit (Rp)</label>
                  <input
                    type="number"
                    value={formData.shiftBonus}
                    onChange={(e) => setFormData({ ...formData, shiftBonus: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono bg-white"
                    placeholder="Contoh: 800000"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">Potongan BPJS/PPh21 (Rp)</label>
                  <input
                    type="number"
                    value={formData.deductions}
                    onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                    className="w-full p-2 border border-rose-300 rounded-lg font-mono bg-white"
                    placeholder="Contoh: 350000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Tunai">Tunai</option>
                    {profile.bankAccounts && profile.bankAccounts.length > 0 ? (
                      profile.bankAccounts.map((b) => (
                        <option key={b.id} value={`Transfer ${b.bankName}`}>
                          Transfer {b.bankName} ({b.accountNumber})
                        </option>
                      ))
                    ) : (
                      <option value="Transfer Bank">Transfer Bank</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Rekening Bank</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                    placeholder="Contoh: 8820-192-881 (BCA)"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {editingRecord ? 'Simpan Perubahan' : 'Simpan Data Gaji'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
