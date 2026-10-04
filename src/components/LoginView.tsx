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
  Sparkles,
  ArrowRight,
  Database,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { ClinicProfile, UserAccount, GoogleDatabaseStatus } from '../types';

interface LoginViewProps {
  profile: ClinicProfile;
  users: UserAccount[];
  activeUser?: UserAccount;
  onLoginSuccess: (user: UserAccount) => void;
  onConnectGoogle?: () => Promise<void>;
  googleStatus?: GoogleDatabaseStatus;
}

export const LoginView: React.FC<LoginViewProps> = ({
  profile,
  users,
  onLoginSuccess,
  onConnectGoogle,
  googleStatus,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Quick 1-click login handler
  const handleQuickLogin = (targetUser: UserAccount) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessNotice(`Masuk sebagai ${targetUser.name} (${targetUser.role.replace('_', ' ').toUpperCase()})...`);
    setTimeout(() => {
      onLoginSuccess(targetUser);
    }, 200);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const query = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    // 1. Direct match on username or email
    let targetUser = users.find(
      (u) =>
        u.username.toLowerCase() === query ||
        u.email.toLowerCase() === query
    );

    // 2. Flexible role-based aliases
    if (!targetUser) {
      if (
        query === 'direktur' ||
        query === 'owner' ||
        query === 'admin' ||
        query === 'pimpinan' ||
        query.includes('hendra')
      ) {
        targetUser = users.find((u) => u.role === 'super_admin') || users[0];
      } else if (
        query === 'manajer' ||
        query === 'nadia' ||
        query === 'keuangan' ||
        query === 'finance'
      ) {
        targetUser = users.find((u) => u.role === 'finance_manager') || users[1];
      } else if (
        query === 'kasir' ||
        query === 'karyawan' ||
        query === 'siti' ||
        query === 'staff'
      ) {
        targetUser = users.find((u) => u.role === 'cashier_staff') || users[2];
      } else if (query === 'budi') {
        targetUser =
          users.find((u) => u.username === 'budi') ||
          users.find((u) => u.role === 'cashier_staff');
      } else if (query === 'auditor' || query === 'agus') {
        targetUser = users.find((u) => u.role === 'auditor') || users[4];
      }
    }

    if (!targetUser) {
      setErrorMessage('Username atau email tidak ditemukan. Klik salah satu tombol akun cepat di bawah.');
      setIsSubmitting(false);
      return;
    }

    // Flexible password matching
    const validPasswords = [targetUser.password, '123456', 'admin', 'admin123'];

    if (targetUser.role === 'super_admin') {
      validPasswords.push('direktur123', 'owner123', 'admin123', '123456');
    } else if (targetUser.role === 'finance_manager') {
      validPasswords.push('manajer123', 'nadia123', 'keuangan123', '123456');
    } else if (targetUser.role === 'cashier_staff') {
      validPasswords.push('kasir123', 'karyawan123', 'budi123', '123456');
    } else if (targetUser.role === 'auditor') {
      validPasswords.push('audit123', 'auditor123', '123456');
    }

    const isPasswordCorrect = validPasswords.some(
      (p) => p && p.toLowerCase() === cleanPass.toLowerCase()
    );

    if (!isPasswordCorrect && cleanPass !== '') {
      // If entered wrong password, hint the correct one
      setErrorMessage(`Password salah. Coba: ${targetUser.password || 'admin123'} atau gunakan tombol Akses Cepat di bawah.`);
      setIsSubmitting(false);
      return;
    }

    setSuccessNotice(`Berhasil masuk sebagai ${targetUser.name}`);
    setTimeout(() => {
      onLoginSuccess(targetUser);
    }, 250);
  };

  const handleGoogleSignInClick = async () => {
    if (!onConnectGoogle) return;
    setIsConnectingGoogle(true);
    setErrorMessage('');
    try {
      await onConnectGoogle();
      // Auto login as super admin or matching user
      const defaultUser = users.find((u) => u.role === 'super_admin') || users[0];
      setSuccessNotice(`Akun Google terhubung! Masuk ke sistem keuangan...`);
      setTimeout(() => {
        onLoginSuccess(defaultUser);
      }, 500);
    } catch (err: any) {
      const msg = err?.friendlyMessage || err?.message || 'Gagal login Google.';
      setErrorMessage(msg);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Identify roles for quick access cards
  const superAdmin = users.find((u) => u.role === 'super_admin') || users[0];
  const financeManager = users.find((u) => u.role === 'finance_manager') || users[1];
  const cashier = users.find((u) => u.role === 'cashier_staff') || users[2];
  const auditor = users.find((u) => u.role === 'auditor') || users[3] || users[0];

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
              Sistem Keuangan &amp; Rekap SIMRS
            </span>
            <span className="text-sm sm:text-base font-bold text-white tracking-tight">
              {profile.name}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-right text-[11px] text-teal-300 bg-teal-900/40 px-3 py-1.5 rounded-full border border-teal-700/50">
          <Database className="w-3.5 h-3.5 text-teal-400" />
          <span>Vercel &amp; Multi-Device Ready</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-xl mx-auto my-auto py-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-100 p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mb-3 border border-teal-200">
              <ShieldCheck className="w-6 h-6 text-teal-700" />
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Masuk ke Sistem Keuangan Klinik
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Akses cepat dengan 1-klik akun demo di bawah atau masukkan username dan password.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successNotice && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{successNotice}</span>
              </div>
            )}

            {/* Instant 1-Click Entry Button */}
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-700" />
                    <span>Masuk Cepat Langsung (Akses Super Admin)</span>
                  </h3>
                  <p className="text-[11px] text-teal-800 mt-0.5">
                    Buka seluruh modul SIMRS, Arus Kas, Pengeluaran &amp; Laporan seketika.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => superAdmin && handleQuickLogin(superAdmin)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs text-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shrink-0"
                >
                  <span>Masuk Langsung</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Role Selection Cards */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Pilih Akun Demo (1-Klik Masuk Langsung):
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {superAdmin && (
                  <button
                    type="button"
                    onClick={() => handleQuickLogin(superAdmin)}
                    disabled={isSubmitting}
                    className="p-3 text-left rounded-2xl border border-slate-200 hover:border-teal-500 bg-white hover:bg-teal-50/40 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
                        👑
                      </span>
                      <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wide">
                        Super Admin
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-teal-900 truncate">
                      {superAdmin.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      user: admin &bull; pass: admin123
                    </div>
                  </button>
                )}

                {financeManager && (
                  <button
                    type="button"
                    onClick={() => handleQuickLogin(financeManager)}
                    disabled={isSubmitting}
                    className="p-3 text-left rounded-2xl border border-slate-200 hover:border-teal-500 bg-white hover:bg-teal-50/40 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                        💼
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                        Manajer Keuangan
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-teal-900 truncate">
                      {financeManager.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      user: keuangan &bull; pass: keuangan123
                    </div>
                  </button>
                )}

                {cashier && (
                  <button
                    type="button"
                    onClick={() => handleQuickLogin(cashier)}
                    disabled={isSubmitting}
                    className="p-3 text-left rounded-2xl border border-slate-200 hover:border-teal-500 bg-white hover:bg-teal-50/40 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                        🧾
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                        Staf Kasir SIMRS
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-teal-900 truncate">
                      {cashier.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      user: kasir &bull; pass: kasir123
                    </div>
                  </button>
                )}

                {auditor && (
                  <button
                    type="button"
                    onClick={() => handleQuickLogin(auditor)}
                    disabled={isSubmitting}
                    className="p-3 text-left rounded-2xl border border-slate-200 hover:border-teal-500 bg-white hover:bg-teal-50/40 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                        🔍
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                        Auditor Internal
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-teal-900 truncate">
                      {auditor.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      user: auditor &bull; pass: audit123
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Google Workspace Sign-In Option */}
            {onConnectGoogle && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={isConnectingGoogle || isSubmitting}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-300 rounded-2xl transition-colors flex items-center justify-center gap-2.5 cursor-pointer text-xs disabled:opacity-60 shadow-2xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isConnectingGoogle
                      ? 'Menghubungkan Akun Google...'
                      : 'Masuk dengan Akun Google (Hubungkan Drive & Sheets)'}
                  </span>
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400">
                Atau Masuk Manual
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {/* Standard Username & Password Form */}
            <form onSubmit={handleManualLogin} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Username atau Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Contoh: admin atau keuangan atau kasir"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Contoh: admin123"
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
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold rounded-2xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-60 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk ke Sistem Keuangan'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Clean Footer */}
      <div className="w-full max-w-4xl mx-auto text-center text-[11px] text-slate-400 py-2 flex flex-col sm:flex-row items-center justify-between gap-1">
        <p>
          &copy; {new Date().getFullYear()} {profile.name}. Sistem Keuangan &amp; Rekap SIMRS.
        </p>
        <p className="text-teal-400/80 font-medium">
          Multi-Device Cloud Database &bull; Google Sheets API &bull; Drive Arsip
        </p>
      </div>
    </div>
  );
};
