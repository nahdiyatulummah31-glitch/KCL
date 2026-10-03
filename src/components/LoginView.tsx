import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { ClinicProfile, UserAccount } from '../types';

interface LoginViewProps {
  profile: ClinicProfile;
  users: UserAccount[];
  activeUser?: UserAccount;
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  profile,
  users,
  onLoginSuccess,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const query = usernameInput.trim().toLowerCase();
    const targetUser = users.find(
      (u) =>
        u.username.toLowerCase() === query ||
        u.email.toLowerCase() === query
    );

    if (!targetUser) {
      setErrorMessage('Username atau email tidak terdaftar.');
      setIsSubmitting(false);
      return;
    }

    if (targetUser.password && targetUser.password !== passwordInput) {
      setErrorMessage('Password yang Anda masukkan salah.');
      setIsSubmitting(false);
      return;
    }

    setSuccessNotice(`Berhasil masuk sebagai ${targetUser.name}`);
    setTimeout(() => {
      onLoginSuccess(targetUser);
    }, 350);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Clinic Identity Bar */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between text-white/90">
        <div className="flex items-center gap-3">
          {profile.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt="Logo Klinik"
              className="w-10 h-10 object-contain rounded-xl bg-white p-1 shadow-md shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              {profile.name.charAt(0) || 'K'}
            </div>
          )}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-teal-400 font-bold block">
              Sistem Keuangan & Rekap SIMRS
            </span>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">
              {profile.name}
            </span>
          </div>
        </div>

        <div className="hidden sm:block text-right text-[11px] text-slate-400">
          <span>{profile.operationalLicense ? `Izin: ${profile.operationalLicense}` : 'Fasilitas Pelayanan Kesehatan'}</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-100 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mb-3 border border-teal-200">
              <ShieldCheck className="w-6 h-6 text-teal-700" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Masuk ke Sistem Keuangan
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Silakan masukkan username dan password akun Anda untuk membuka sesi kerja.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Standard Username & Password Form */}
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
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Masukkan username atau email"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
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
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-60 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk ke Sistem Keuangan'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Clean Footer */}
      <div className="w-full max-w-4xl mx-auto text-center text-[11px] text-slate-400 py-2">
        <p>
          &copy; {new Date().getFullYear()} {profile.name}. Sistem Keuangan & Rekap Billing Kasir Terintegrasi SIMRS.
        </p>
      </div>
    </div>
  );
};
