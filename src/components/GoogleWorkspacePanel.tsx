import React, { useState } from 'react';
import {
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  LogOut,
  Layers,
  Sparkles,
  CloudDownload,
  Key,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GoogleDatabaseStatus } from '../types';
import {
  getEffectiveGoogleClientId,
  setCustomGoogleClientId,
  connectWithAccessToken,
  isExternalOrVercel,
  CUSTOM_CLIENT_ID_KEY,
} from '../services/googleWorkspace';

interface GoogleWorkspacePanelProps {
  status: GoogleDatabaseStatus;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onSyncAll: () => Promise<void>;
  onRestoreData?: () => Promise<void>;
  isSyncing: boolean;
  syncProgress?: { message: string; percent: number };
}

export const GoogleWorkspacePanel: React.FC<GoogleWorkspacePanelProps> = ({
  status,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncAll,
  onRestoreData,
  isSyncing,
  syncProgress,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Vercel / Custom Client ID & Token state
  const isVercel = isExternalOrVercel();
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentHost = typeof window !== 'undefined' ? window.location.host : '';

  const [showVercelConfig, setShowVercelConfig] = useState(isVercel);
  const [customClientIdInput, setCustomClientIdInput] = useState(() => {
    try {
      return localStorage.getItem(CUSTOM_CLIENT_ID_KEY) || '';
    } catch {
      return '';
    }
  });
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [isConnectingToken, setIsConnectingToken] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onConnectGoogle();
      setSuccessMsg('Berhasil terhubung ke Google Spreadsheet Database!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.friendlyMessage || err?.message || 'Gagal menghubungkan Google Account.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm('Putuskan koneksi Google Spreadsheet? Data lokal tetap tersimpan.')) {
      await onDisconnectGoogle();
      setSuccessMsg('Koneksi Google Spreadsheet diputuskan.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSaveClientId = () => {
    setCustomGoogleClientId(customClientIdInput);
    setSuccessMsg('Google Client ID berhasil disimpan!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleConnectWithToken = async () => {
    if (!manualTokenInput.trim()) {
      setErrorMsg('Masukkan Google Access Token terlebih dahulu.');
      return;
    }
    setIsConnectingToken(true);
    setErrorMsg(null);
    try {
      await connectWithAccessToken(manualTokenInput.trim());
      await onConnectGoogle();
      setSuccessMsg('Berhasil terhubung dengan Google Access Token!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghubungkan token.');
    } finally {
      setIsConnectingToken(false);
    }
  };

  const handleCopyOrigin = () => {
    if (navigator?.clipboard && currentOrigin) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const cellPercentage = Math.min(
    100,
    parseFloat(((status.totalCellsUsed / status.maxCellsCapacity) * 100).toFixed(2))
  );

  const rolloverPercent = Math.min(
    100,
    parseFloat(((status.totalCellsUsed / status.autoRolloverThreshold) * 100).toFixed(1))
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Database Google Sheets & Google Drive</span>
              {status.isConnected && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Terhubung & Auto-Sync Aktif
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Sinkronisasi otomatis aktif: Setiap kali Anda menginput data, transaksi otomatis tersimpan ke Google Sheets tanpa perlu klik sinkron.
            </p>
          </div>
        </div>

        {status.isConnected && (
          <div className="flex items-center gap-2 flex-wrap">
            {onRestoreData && (
              <button
                onClick={onRestoreData}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Tarik dan pulihkan data transaksi dari spreadsheet Google ke aplikasi ini"
              >
                <CloudDownload className="w-3.5 h-3.5 text-teal-600" />
                <span>Tarik / Pulihkan Data</span>
              </button>
            )}
            <button
              onClick={onSyncAll}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isSyncing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
            <button
              onClick={handleDisconnect}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="Putuskan Akun Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">{errorMsg}</span>
            {isVercel && (
              <span className="text-[11px] text-rose-700 block">
                Gunakan formulir konfigurasi Vercel di bawah untuk memasukkan Google Client ID Anda sendiri atau menghubungkan menggunakan Access Token.
              </span>
            )}
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* When NOT Connected */}
      {!status.isConnected ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <h4 className="text-sm font-bold text-slate-800">
              Hubungkan Akun Google untuk Sinkronisasi Otomatis
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Jika Anda membuka aplikasi ini di perangkat baru atau domain Vercel, cukup klik <strong>Sign in with Google</strong> di bawah. Sistem akan otomatis memulihkan seluruh data transaksi dan pengeluaran yang tersimpan di Google Sheets Anda!
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            {/* Official Google Sign In Button */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-60"
            >
              {connecting ? (
                <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                </svg>
              )}
              <span>{connecting ? 'Menghubungkan...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-3">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-800 block">Spreadsheet Otomatis</span>
              <span className="text-[11px] text-slate-500">
                Membuat tab SIMRS, Beban, Hutang, Piutang BPJS, dan Kas.
              </span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-800 block">Google Drive Berkas</span>
              <span className="text-[11px] text-slate-500">
                Folder penyimpanan bukti nota, struk, dan PDF.
              </span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-800 block">Kapasitas 10 Juta Sel</span>
              <span className="text-[11px] text-slate-500">
                Otomatis generate volume database baru saat mencapai 9 juta sel.
              </span>
            </div>
          </div>

          {/* Vercel & Custom Domain Configuration Box */}
          <div className="mt-4 pt-4 border-t border-slate-200 text-left">
            <button
              type="button"
              onClick={() => setShowVercelConfig(!showVercelConfig)}
              className="flex items-center justify-between w-full p-3 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4 text-teal-600" />
                <span>Pengaturan Khusus Deployment Vercel ({currentHost || 'Domain Anda'})</span>
              </span>
              {showVercelConfig ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showVercelConfig && (
              <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200 space-y-4 text-xs">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg space-y-1">
                  <span className="text-[11px] font-bold text-teal-900 block">
                    Domain Vercel Anda Saat Ini:
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] bg-white px-2 py-1 rounded border border-teal-200 font-mono text-teal-800 select-all">
                      {currentOrigin}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyOrigin}
                      className="px-2.5 py-1 bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 rounded font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedDomain ? 'Tersalin!' : 'Salin Domain'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-teal-700 mt-1">
                    Tambahkan domain ini ke <strong>Authorized JavaScript origins</strong> di Google Cloud Console pada OAuth 2.0 Client ID Anda.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700">
                    Opsi 1: Masukkan Google OAuth Client ID Anda (Rekomendasi untuk Vercel)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customClientIdInput}
                      onChange={(e) => setCustomClientIdInput(e.target.value)}
                      placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                      className="flex-1 p-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveClientId}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold cursor-pointer"
                    >
                      Simpan Client ID
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block font-semibold text-slate-700">
                    Opsi 2: Hubungkan Langsung Menggunakan Google Access Token
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      placeholder="Masukkan Bearer Access Token (ya29...)"
                      className="flex-1 p-2 border border-slate-200 rounded-lg font-mono text-xs focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleConnectWithToken}
                      disabled={isConnectingToken}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {isConnectingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Hubungkan Token</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* When CONNECTED */
        <div className="space-y-5">
          {/* Sync Progress Bar */}
          {isSyncing && syncProgress && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>{syncProgress.message}</span>
                </span>
                <span>{syncProgress.percent}%</span>
              </div>
              <div className="w-full bg-emerald-200/50 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${syncProgress.percent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* User Account Info */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              {status.userAvatar ? (
                <img
                  src={status.userAvatar}
                  alt={status.userName || 'Google User'}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200">
                  {status.userName ? status.userName.charAt(0) : 'G'}
                </div>
              )}
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {status.userName || 'Akun Google Terhubung'}
                </span>
                <span className="text-[11px] text-slate-500 block font-mono">
                  {status.userEmail || 'google-auth@workspace'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Status Auto-Sync</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Realtime Aktif
              </span>
            </div>
          </div>

          {/* Database Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Active Spreadsheet Card */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Active Database</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  Vol {status.volumeNumber || 1}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-900 block truncate">
                  {status.spreadsheetName || 'KLINIK FINANCE DB 001'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  ID: {status.spreadsheetId || '-'}
                </span>
              </div>

              {status.spreadsheetUrl && (
                <a
                  href={status.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Google Sheets</span>
                </a>
              )}
            </div>

            {/* Google Drive Folder Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-slate-800">Drive Bukti & Nota</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">PDF / Foto</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-900 block">
                  Bukti_Nota_Kwitansi_PDF
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Penyimpanan berkas transaksi & nota pengeluaran
                </span>
              </div>

              {status.driveFolderUrl && (
                <a
                  href={status.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Folder Google Drive</span>
                </a>
              )}
            </div>
          </div>

          {/* Cell Capacity & Auto-Rollover Monitor */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  Monitor Kapasitas Sel Database
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                {status.totalCellsUsed.toLocaleString('id-ID')} / {status.autoRolloverThreshold.toLocaleString('id-ID')} sel
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  rolloverPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(1, rolloverPercent)}%` }}
              ></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>Batas Aman Rotasi: 9.500.000 sel (Maksimal 10.000.000 sel)</span>
              <span>Terpakai: {cellPercentage}%</span>
            </div>

            <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Auto-Rotation Aktif:</strong> Saat database aktif mendekati batas 9.500.000 sel, sistem otomatis mengarsipkan database ini dan membuat <strong>KLINIK FINANCE DB 00{status.volumeNumber + 1}</strong> tanpa menghapus riwayat lama.
              </span>
            </div>
          </div>

          {/* Last Sync Timestamp */}
          {status.lastSyncedAt && (
            <div className="text-center text-[11px] text-slate-400">
              Sinkronisasi terakhir: {status.lastSyncedAt}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
