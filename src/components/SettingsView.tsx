import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  Save,
  Plus,
  Trash2,
  CreditCard,
  Lock,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  KeyRound,
  Database,
  HardDrive,
  Download,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  Edit3,
  X,
} from 'lucide-react';
import { ClinicProfile, UserAccount, UserRole, GoogleDatabaseStatus, BankAccount } from '../types';
import { formatRupiah } from '../utils/formatters';
import { GoogleWorkspacePanel } from './GoogleWorkspacePanel';
import { SpreadsheetGuideModal } from './SpreadsheetGuideModal';

interface SettingsViewProps {
  profile: ClinicProfile;
  users: UserAccount[];
  activeUser: UserAccount;
  onUpdateProfile: (profile: ClinicProfile) => void;
  onUpdateUsers: (users: UserAccount[]) => void;
  onResetData: () => void;
  googleStatus: GoogleDatabaseStatus;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onSyncGoogle: () => Promise<void>;
  onRestoreGoogle?: () => Promise<void>;
  isSyncingGoogle: boolean;
  syncProgress?: { message: string; percent: number };
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  users,
  activeUser,
  onUpdateProfile,
  onUpdateUsers,
  onResetData,
  googleStatus,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncGoogle,
  onRestoreGoogle,
  isSyncingGoogle,
  syncProgress,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'rbac' | 'banks' | 'database'>('profile');
  const [showSpreadsheetGuide, setShowSpreadsheetGuide] = useState(false);
  const [formData, setFormData] = useState<ClinicProfile>(() => ({
    name: profile.name || '',
    tagline: profile.tagline || '',
    legalEntity: profile.legalEntity || '',
    licenseNumber: profile.licenseNumber || '',
    operationalLicense: profile.operationalLicense || '',
    taxNumber: profile.taxNumber || '',
    taxId: profile.taxId || '',
    nib: profile.nib || '',
    phone: profile.phone || '',
    email: profile.email || '',
    address: profile.address || '',
    city: profile.city || '',
    province: profile.province || '',
    postalCode: profile.postalCode || '',
    logoUrl: profile.logoUrl || '',
    directorName: profile.directorName || '',
    directorTitle: profile.directorTitle || '',
    directorSip: profile.directorSip || '',
    financeManagerName: profile.financeManagerName || '',
    financeManagerTitle: profile.financeManagerTitle || '',
    headCashierName: profile.headCashierName || '',
    headCashierTitle: profile.headCashierTitle || '',
    bankAccounts: profile.bankAccounts || [],
  }));

  useEffect(() => {
    setFormData({
      name: profile.name || '',
      tagline: profile.tagline || '',
      legalEntity: profile.legalEntity || '',
      licenseNumber: profile.licenseNumber || '',
      operationalLicense: profile.operationalLicense || '',
      taxNumber: profile.taxNumber || '',
      taxId: profile.taxId || '',
      nib: profile.nib || '',
      phone: profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      city: profile.city || '',
      province: profile.province || '',
      postalCode: profile.postalCode || '',
      logoUrl: profile.logoUrl || '',
      directorName: profile.directorName || '',
      directorTitle: profile.directorTitle || '',
      directorSip: profile.directorSip || '',
      financeManagerName: profile.financeManagerName || '',
      financeManagerTitle: profile.financeManagerTitle || '',
      headCashierName: profile.headCashierName || '',
      headCashierTitle: profile.headCashierTitle || '',
      bankAccounts: profile.bankAccounts || [],
    });
  }, [profile]);

  const [userList, setUserList] = useState<UserAccount[]>([...users]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState(true);

  // Modal State for Bank Account Edit & Create
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankToDelete, setBankToDelete] = useState<{ id: string; bankName: string } | null>(null);
  const [bankModalError, setBankModalError] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    branch: '',
    currentBalance: '0',
  });

  // New/Edit User Form State
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    pin: '',
    email: '',
    role: 'cashier_staff' as UserRole,
  });

  const isSuperAdmin = activeUser.role === 'super_admin' || activeUser.role === 'owner' || activeUser.role === 'finance_manager';

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveLicense = formData.operationalLicense || formData.licenseNumber || '';
    const normalizedData = {
      ...formData,
      operationalLicense: effectiveLicense,
      licenseNumber: effectiveLicense,
    };
    setFormData(normalizedData);
    onUpdateProfile(normalizedData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updated = { ...formData, logoUrl: base64 };
      setFormData(updated);
      onUpdateProfile(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    const updated = { ...formData, logoUrl: '' };
    setFormData(updated);
    onUpdateProfile(updated);
  };

  const handleOpenAddUser = () => {
    setEditingUserId(null);
    setNewUser({
      name: '',
      username: '',
      password: '',
      pin: '',
      email: '',
      role: 'cashier_staff',
    });
    setShowAddUserModal(true);
  };

  const handleOpenEditUser = (u: UserAccount) => {
    setEditingUserId(u.id);
    setNewUser({
      name: u.name,
      username: u.username,
      password: u.password || '',
      pin: u.pin || '',
      email: u.email || '',
      role: u.role,
    });
    setShowAddUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.username.trim()) return;

    if (editingUserId) {
      const updated = userList.map((u) => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: newUser.name.trim(),
            username: newUser.username.toLowerCase().replace(/\s+/g, ''),
            password: newUser.password || u.password,
            pin: newUser.pin || u.pin,
            email: newUser.email.trim() || `${newUser.username.toLowerCase()}@klinik.co.id`,
            role: newUser.role,
          };
        }
        return u;
      });
      setUserList(updated);
      onUpdateUsers(updated);
    } else {
      const created: UserAccount = {
        id: `usr-${Date.now()}`,
        name: newUser.name.trim(),
        username: newUser.username.toLowerCase().replace(/\s+/g, ''),
        password: newUser.password || 'klinik123',
        pin: newUser.pin || '123456',
        email: newUser.email.trim() || `${newUser.username.toLowerCase()}@klinik.co.id`,
        role: newUser.role,
        isActive: true,
        lastLogin: 'Baru dibuat',
      };
      const updated = [...userList, created];
      setUserList(updated);
      onUpdateUsers(updated);
    }

    setShowAddUserModal(false);
    setEditingUserId(null);
    setNewUser({
      name: '',
      username: '',
      password: '',
      pin: '',
      email: '',
      role: 'cashier_staff',
    });
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.id === activeUser.id) {
      return;
    }
    const updated = userList.filter((u) => u.id !== userToDelete.id);
    setUserList(updated);
    onUpdateUsers(updated);
    setUserToDelete(null);
  };

  const handleOpenAddBank = () => {
    setEditingBankId(null);
    setBankModalError(null);
    setBankForm({
      bankName: '',
      accountNumber: '',
      accountHolder: formData.name || 'Klinik Hemodialisa Utama',
      branch: '',
      currentBalance: '0',
    });
    setBankModalOpen(true);
  };

  const handleOpenEditBank = (bank: BankAccount) => {
    setEditingBankId(bank.id);
    setBankModalError(null);
    setBankForm({
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountHolder: bank.accountHolder || formData.name,
      branch: bank.branch || '',
      currentBalance: String(bank.currentBalance || 0),
    });
    setBankModalOpen(true);
  };

  const handleSaveBankModal = (e: React.FormEvent) => {
    e.preventDefault();
    setBankModalError(null);
    if (!bankForm.bankName.trim() || !bankForm.accountNumber.trim()) {
      setBankModalError('Nama Bank / Akun Kas dan Nomor Rekening wajib diisi.');
      return;
    }
    const cleanNum = bankForm.currentBalance.replace(/[^0-9.-]+/g, '');
    const balanceNum = parseFloat(cleanNum) || 0;

    let updatedBanks: BankAccount[];
    if (editingBankId) {
      updatedBanks = formData.bankAccounts.map((b) =>
        b.id === editingBankId
          ? {
              ...b,
              bankName: bankForm.bankName.trim(),
              accountNumber: bankForm.accountNumber.trim(),
              accountHolder: bankForm.accountHolder.trim() || formData.name,
              branch: bankForm.branch.trim(),
              currentBalance: balanceNum,
            }
          : b
      );
    } else {
      const newBank: BankAccount = {
        id: `bank-${Date.now()}`,
        bankName: bankForm.bankName.trim(),
        accountNumber: bankForm.accountNumber.trim(),
        accountHolder: bankForm.accountHolder.trim() || formData.name,
        branch: bankForm.branch.trim(),
        currentBalance: balanceNum,
      };
      updatedBanks = [...formData.bankAccounts, newBank];
    }

    const updatedProfile = { ...formData, bankAccounts: updatedBanks };
    setFormData(updatedProfile);
    onUpdateProfile(updatedProfile);
    setBankModalOpen(false);
  };

  const handleDeleteBank = (id: string, bankName: string) => {
    setBankToDelete({ id, bankName });
  };

  const handleConfirmDeleteBank = () => {
    if (!bankToDelete) return;
    const updatedBanks = formData.bankAccounts.filter((b) => b.id !== bankToDelete.id);
    const updatedProfile = { ...formData, bankAccounts: updatedBanks };
    setFormData(updatedProfile);
    onUpdateProfile(updatedProfile);
    setBankToDelete(null);
  };

  const roleLabelMap: Record<UserRole, { label: string; desc: string; badge: string }> = {
    super_admin: {
      label: 'Super Admin / Direktur',
      desc: 'Akses penuh seluruh modul, setting profil perusahaan, otorisasi transaksi dan audit.',
      badge: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    finance_manager: {
      label: 'Manajer Keuangan',
      desc: 'Otorisasi pengeluaran, monitoring arus kas, utang distributor, piutang BPJS, dan laporan.',
      badge: 'bg-sky-100 text-sky-800 border-sky-200',
    },
    cashier_staff: {
      label: 'Kasir & Staf Loket',
      desc: 'Entri dan import mutasi SIMRS, cetak kuitansi pasien, catat penerimaan kasir.',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    auditor: {
      label: 'Auditor Internal',
      desc: 'Hak akses baca (read-only) untuk seluruh data audit, bukti nota, dan rekonsiliasi.',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
    },
  };

  const handleExportBackupJson = () => {
    const backupData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('klinik_finance_') || key.startsWith('klinik_'))) {
        try {
          backupData[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          backupData[key] = localStorage.getItem(key);
        }
      }
    }

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_database_klinik_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed === 'object' && parsed !== null) {
          let count = 0;
          Object.entries(parsed).forEach(([k, v]) => {
            if (k.startsWith('klinik_')) {
              localStorage.setItem(k, JSON.stringify(v));
              count++;
            }
          });
          alert(`Sukses memulihkan ${count} tabel data dari cadangan JSON! Halaman akan dimuat ulang.`);
          window.location.reload();
        }
      } catch {
        alert('Gagal membaca file cadangan. Pastikan file berformat JSON valid.');
      }
    };
    reader.readAsText(file);
  };

  const storageStats = useMemo(() => {
    let totalBytes = 0;
    let tableCount = 0;
    const tables: Array<{ name: string; key: string; size: string; count: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('klinik_')) {
        const val = localStorage.getItem(key) || '';
        const bytes = key.length + val.length;
        totalBytes += bytes;
        tableCount++;

        let itemCount = 0;
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) itemCount = parsed.length;
          else if (typeof parsed === 'object' && parsed !== null) itemCount = Object.keys(parsed).length;
        } catch {}

        tables.push({
          name: key.replace('klinik_finance_', '').replace('klinik_', '').replace('_v3', '').replace('_v2', ''),
          key,
          size: (bytes / 1024).toFixed(1) + ' KB',
          count: itemCount,
        });
      }
    }

    return {
      totalKb: (totalBytes / 1024).toFixed(1),
      tableCount,
      tables,
    };
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengaturan Profil & Akun Staf
          </h2>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>Perubahan berhasil disimpan!</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-teal-600" />
          <span>Profil & Logo Klinik</span>
        </button>

        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'rbac'
              ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Akun Staf, Password & PIN</span>
        </button>

        <button
          onClick={() => setActiveTab('banks')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'banks'
              ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4 text-teal-600" />
          <span>Rekening Kas & Bank</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'database'
              ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4 text-teal-600" />
          <span>Penyimpanan & Database</span>
        </button>
      </div>

      {/* Tab 1: Form Profil Perusahaan */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          {/* Logo Klinik Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ImageIcon className="w-4 h-4 text-teal-600" />
              <span>Logo Resmi Klinik (Kop Surat & Cetak Dokumen)</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Logo Preview */}
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo Klinik"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400 text-xs flex flex-col items-center">
                    <Building2 className="w-8 h-8 mb-1 text-slate-300" />
                    <span>Belum ada</span>
                  </div>
                )}
              </div>

              {/* Upload & Controls */}
              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File Logo (PNG / JPG / SVG)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-colors"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <label className="block text-slate-600 font-medium">Atau Masukkan URL Logo:</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.logoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full sm:max-w-md p-2 border border-slate-200 rounded-xl font-mono text-xs focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Identitas & Legalitas Fasilitas Kesehatan (Faskes)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nama Resmi Klinik / Perusahaan
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Slogan / Tagline Layanan
                </label>
                <input
                  type="text"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Alamat Lengkap Faskes
                </label>
                <input
                  type="text"
                  required
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kota / Kabupaten</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Kode Pos</label>
                <input
                  type="text"
                  value={formData.postalCode || ''}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">No. Telepon / Hotline</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Resmi</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  No. Izin Operasional Klinik (Kemenkes / Dinkes)
                </label>
                <input
                  type="text"
                  value={formData.operationalLicense ?? formData.licenseNumber ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const next = {
                      ...formData,
                      operationalLicense: val,
                      licenseNumber: val,
                    };
                    setFormData(next);
                    onUpdateProfile(next);
                  }}
                  onBlur={() => onUpdateProfile(formData)}
                  placeholder="Contoh: 503/042/IP-KLINIK/DPMPTSP/2023"
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">NPWP Badan Usaha</label>
                <input
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Pejabat Penanggung Jawab & Tanda Tangan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <UserCheck className="w-4 h-4 text-teal-600" />
              <span>Pejabat Penandatangan Laporan Audit Keuangan</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nama Direktur / Penanggung Jawab Medis
                </label>
                <input
                  type="text"
                  required
                  value={formData.directorName || ''}
                  onChange={(e) => setFormData({ ...formData, directorName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nomor SIP Dokter Penanggung Jawab
                </label>
                <input
                  type="text"
                  value={formData.directorSip || ''}
                  onChange={(e) => setFormData({ ...formData, directorSip: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Nama Manajer Keuangan & Akuntansi (Pemeriksa Laporan)
                </label>
                <input
                  type="text"
                  required
                  value={formData.financeManagerName || ''}
                  onChange={(e) => setFormData({ ...formData, financeManagerName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: RBAC (Manajemen Hak Akses & Peran Pengguna) */}
      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Akun Pengguna & Petugas Loket
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPasswords ? 'Sembunyikan Password' : 'Lihat Password'}</span>
              </button>
            </div>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleOpenAddUser}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Akun Staf</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Nama Staf & Peran</th>
                    <th className="py-3 px-4 font-mono">Username</th>
                    <th className="py-3 px-4 font-mono">Password</th>
                    <th className="py-3 px-4 font-mono">PIN Otorisasi</th>
                    <th className="py-3 px-4">Status & Login</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userList.map((u) => {
                    const roleMeta = roleLabelMap[u.role] || {
                      label: u.role,
                      desc: '',
                      badge: 'bg-slate-100 text-slate-800 border-slate-200',
                    };
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{u.name}</span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${roleMeta.badge}`}
                          >
                            {roleMeta.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {u.username}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {showPasswords ? (
                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              {u.password || 'admin123'}
                            </span>
                          ) : (
                            <span className="text-slate-400">••••••••</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded border border-teal-200">
                            {u.pin || '123456'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Aktif
                          </span>
                          <span className="block text-slate-400 text-[10px] mt-0.5">{u.lastLogin}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(u)}
                              className="px-2.5 py-1 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg font-semibold flex items-center gap-1 text-xs cursor-pointer transition-colors shadow-2xs"
                              title="Edit data akun & hak akses"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              className="px-2.5 py-1 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg font-semibold flex items-center gap-1 text-xs cursor-pointer transition-colors shadow-2xs"
                              title="Hapus akun pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
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
        </div>
      )}

      {/* Tab 3: Daftar Rekening Kas & Bank */}
      {activeTab === 'banks' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Rekening Kas & Bank Operasional Klinik
              </h3>
            </div>
            <button
              type="button"
              onClick={handleOpenAddBank}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rekening Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.bankAccounts.length === 0 ? (
              <div className="col-span-2 p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Belum ada rekening kas atau bank yang terdaftar.</p>
                <p className="text-xs text-slate-500 mt-1">Klik tombol &ldquo;Tambah Rekening Baru&rdquo; untuk mendaftarkan akun rekening operasional klinik dan saldo riil.</p>
              </div>
            ) : (
              formData.bankAccounts.map((b) => (
                <div
                  key={b.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-teal-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{b.bankName}</span>
                      <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                        <CreditCard className="w-4 h-4" />
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-600 mt-1">No: {b.accountNumber}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">a/n {b.accountHolder}</p>
                    {b.branch && (
                      <p className="text-[10px] text-slate-400">Cabang: {b.branch}</p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium block">Saldo Riil:</span>
                      <span className="text-base font-bold font-mono text-teal-700">
                        {formatRupiah(b.currentBalance)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBank(b)}
                        className="px-2.5 py-1.5 rounded-lg text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        title="Edit data rekening & saldo riil"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(b.id, b.bankName)}
                        className="px-2.5 py-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                        title="Hapus rekening"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Penyimpanan & Database */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Quick Guide Banner for User Request 8 */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 rounded-2xl border-2 border-emerald-300 shadow-xs flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Panduan Menghubungkan Database Aplikasi ke Google Spreadsheet & Excel
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Pelajari cara otomatis agar data transaksi kasir, pengeluaran, dan buku kas masuk langsung ke Google Sheets.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSpreadsheetGuide(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Buka Panduan Spreadsheet</span>
            </button>
          </div>

          {/* Google Sheets & Drive Cloud Database */}
          <GoogleWorkspacePanel
            status={googleStatus}
            onConnectGoogle={onConnectGoogle}
            onDisconnectGoogle={onDisconnectGoogle}
            onSyncAll={onSyncGoogle}
            onRestoreData={onRestoreGoogle}
            isSyncing={isSyncingGoogle}
            syncProgress={syncProgress}
          />

          {/* Backup & Restore File Offline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Download className="w-4 h-4 text-teal-600" />
              <span>Cadangan Berkas Lokal (Backup / Restore JSON)</span>
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportBackupJson}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan (.json)</span>
              </button>

              <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Pulihkan dari File (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackupJson}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={onResetData}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-xl text-xs font-bold transition-all ml-auto cursor-pointer shadow-2xs"
                title="Kosongkan data demo untuk mulai pakai data riil klinik, atau muat ulang demo"
              >
                <Trash2 className="w-4 h-4 text-teal-700" />
                <span>Reset / Kosongkan Data Demo (Mulai Data Riil)</span>
              </button>
            </div>
          </div>

          {/* Table of Database Collections */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-teal-600" />
                <span>Daftar Tabel Database Lokal Aktif</span>
              </h3>
              <span className="text-xs font-mono text-slate-500">
                Total Memori: {storageStats.totalKb} KB ({storageStats.tableCount} Tabel)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Nama Koleksi / Tabel</th>
                    <th className="py-2.5 px-3">Storage Key</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Data</th>
                    <th className="py-2.5 px-3 text-right">Ukuran Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {storageStats.tables.map((t) => (
                    <tr key={t.key} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800 capitalize">
                        {t.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{t.key}</td>
                      <td className="py-2.5 px-3 text-center font-sans font-bold text-teal-700">
                        {t.count} record
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">{t.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit User Staf */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUserId ? 'Edit Akun Staf / Pengguna' : 'Tambah Akun Staf Baru'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setEditingUserId(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-3.5 text-xs overflow-y-auto">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Nama Lengkap Staf & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nurul Hidayah, S.Ak"
                  value={newUser.name || ''}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kasir2"
                    value={newUser.username || ''}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Password login"
                    value={newUser.password || ''}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    PIN Otorisasi (6 Digit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={newUser.pin || ''}
                    onChange={(e) => setNewUser({ ...newUser, pin: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Staf</label>
                  <input
                    type="email"
                    placeholder="staf@klinik.co.id"
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Peran & Hak Akses (Role)
                </label>
                <select
                  value={newUser.role || 'cashier_staff'}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-teal-500 font-medium"
                >
                  <option value="cashier_staff">Kasir & Staf Loket (Entri Mutasi, Cetak Nota)</option>
                  <option value="finance_manager">Manajer Keuangan (Monitoring Arus Kas & Otorisasi)</option>
                  <option value="auditor">Auditor Internal (Read-Only Seluruh Laporan)</option>
                  <option value="super_admin">Super Admin / Direktur (Akses Penuh Seluruh Sistem)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setEditingUserId(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  {editingUserId ? 'Simpan Perubahan' : 'Tambahkan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Rekening Bank & Kas Operasional */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingBankId ? 'Edit Rekening & Saldo Riil' : 'Tambah Rekening Kas / Bank Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kelola data rekening bank dan saldo riil operasional klinik
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankModal} className="space-y-4 text-xs">
              {bankModalError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{bankModalError}</span>
                </div>
              )}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nama Bank / Akun Kas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  placeholder="Contoh: Bank BCA, Bank Mandiri, Kas Kasir Tunai"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nomor Rekening / Akun <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="Contoh: 8820192831 atau Kas-Operasional-01"
                  className="w-full px-3.5 py-2 font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Atas Nama Rekening
                </label>
                <input
                  type="text"
                  value={bankForm.accountHolder}
                  onChange={(e) => setBankForm({ ...bankForm, accountHolder: e.target.value })}
                  placeholder="Contoh: Klinik Hemodialisa Utama"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Cabang Bank (Opsional)
                </label>
                <input
                  type="text"
                  value={bankForm.branch}
                  onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                  placeholder="Contoh: KCU Ahmad Yani"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Saldo Riil Saat Ini (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">Rp</span>
                  <input
                    type="number"
                    value={bankForm.currentBalance}
                    onChange={(e) => setBankForm({ ...bankForm, currentBalance: e.target.value })}
                    placeholder="0"
                    className="w-full pl-10 pr-3.5 py-2 font-mono font-bold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Saldo riil nyata yang ada di rekening bank / laci kas saat ini.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingBankId ? 'Simpan Perubahan' : 'Tambahkan Rekening'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spreadsheet Guide Modal */}
      <SpreadsheetGuideModal
        isOpen={showSpreadsheetGuide}
        onClose={() => setShowSpreadsheetGuide(false)}
        onConnectGoogle={onConnectGoogle}
        isGoogleConnected={googleStatus?.isConnected}
      />

      {/* In-App Confirmation Modal: Delete Bank Account */}
      {bankToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Rekening?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Apakah Anda yakin ingin menghapus rekening <strong>&quot;{bankToDelete.bankName}&quot;</strong>? Data saldo riil rekening ini akan dihapus dari sistem klinik.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBankToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBank}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Rekening</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal: Delete User Account */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {userToDelete.id === activeUser.id ? 'Tidak Dapat Menghapus Akun Aktif' : 'Hapus Akun Pengguna?'}
              </h3>
              {userToDelete.id === activeUser.id ? (
                <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 mt-2 leading-relaxed font-medium">
                  Akun <strong>&quot;{userToDelete.name}&quot;</strong> sedang aktif Anda gunakan untuk masuk ke aplikasi saat ini. Untuk menghapus akun ini, silakan login dengan akun lain terlebih dahulu.
                </p>
              ) : (
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Apakah Anda yakin ingin menghapus akun <strong>&quot;{userToDelete.name}&quot;</strong> (Username: <code className="font-bold text-slate-800">{userToDelete.username}</code>)? Staf ini tidak akan dapat login lagi ke sistem klinik.
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {userToDelete.id === activeUser.id ? 'Tutup' : 'Batal'}
              </button>
              {userToDelete.id !== activeUser.id && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus Akun</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
