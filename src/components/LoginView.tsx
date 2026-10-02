import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
} from 'lucide-react';
import { ClinicProfile, UserAccount, UserRole } from '../types';

interface LoginViewProps {
  profile: ClinicProfile;
  users: UserAccount[];
  activeUser: UserAccount;
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  profile,
  users,
  activeUser,
  onLoginSuccess,
  onClose,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Direktur / Super Admin', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'finance_manager':
        return { label: 'Manajer Keuangan', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'cashier_staff':
        return { label: 'Kasir SIMRS', badge: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'auditor':
        return { label: 'Auditor Eksternal', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: role, badge: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const targetUser = users.find(
      (u) =>
        u.username.toLowerCase() === usernameInput.trim().toLowerCase() ||
        u.email.toLowerCase() === usernameInput.trim().toLowerCase()
    );

    if (!targetUser) {
      setErrorMessage('Username atau email tidak terdaftar dalam sistem klinik.');
      return;
    }

    // Check password if configured
    if (targetUser.password && targetUser.password !== passwordInput) {
      setErrorMessage('Password yang Anda masukkan salah. Periksa daftar akun di bawah.');
      return;
    }

    setSuccessNotice(`Berhasil masuk sebagai ${targetUser.name}`);
    setTimeout(() => {
      onLoginSuccess(targetUser);
    }, 400);
  };

  const handleQuickLogin = (user: UserAccount) => {
    setUsernameInput(user.username);
    setPasswordInput(user.password || '123456');
    setSuccessNotice(`Masuk sebagai ${user.name}`);
    setTimeout(() => {
      onLoginSuccess(user);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-900/60 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profile.logoUrl ? (
              <img
                src={profile.logoUrl}
                alt="Logo Klinik"
                className="w-14 h-14 object-contain rounded-2xl bg-white p-1 shadow-md shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                {profile.name.charAt(0) || 'K'}
              </div>
            )}
            <div>
              <span className="text-[11px] uppercase tracking-wider text-teal-400 font-bold block">
                Sistem Keuangan & Rekap Kasir Klinik
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">{profile.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {profile.legalEntity || 'Fasilitas Pelayanan Kesehatan'} • Izin: {profile.operationalLicense || profile.licenseNumber}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Tutup & Kembali
            </button>
          )}
        </div>

        {/* Content Body: Login Form + Credentials Table */}
        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Login (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Tampilan Login Staf
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Masukkan username dan password Anda untuk membuka sesi kerja.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Username atau Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={usernameInput || ''}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Contoh: admin, keuangan, kasir"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput || ''}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Sistem Keuangan</span>
              </button>

              <div className="pt-2">
                <p className="text-[11px] text-slate-400 text-center">
                  Sesi saat ini:{' '}
                  <span className="font-semibold text-slate-700">{activeUser.name}</span> (
                  {activeUser.role})
                </p>
              </div>
            </form>
          </div>

          {/* Right Column: Daftar User & Password (7 cols) */}
          <div className="lg:col-span-7 bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-teal-700" />
                  <span>Daftar Akun Pengguna, Password & PIN</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik tombol <b>"Gunakan"</b> untuk langsung menguji hak akses masing-masing peran.
                </p>
              </div>
            </div>

            {/* Table of accounts */}
            <div className="space-y-2.5">
              {users.map((u) => {
                const badge = getRoleBadge(u.role);
                const isCurrent = u.id === activeUser.id;

                return (
                  <div
                    key={u.id}
                    className={`bg-white p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{u.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                                Sesi Aktif
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.2 rounded border mt-0.5 ${badge.badge}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickLogin(u)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                      >
                        Gunakan Akun
                      </button>
                    </div>

                    {/* Credentials Info Grid */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs font-mono">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">Username</span>
                        <span className="font-bold text-slate-800">{u.username}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">Password</span>
                        <span className="font-bold text-slate-800">{u.password || 'admin123'}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">PIN Otorisasi</span>
                        <span className="font-bold text-teal-700">{u.pin || '123456'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
