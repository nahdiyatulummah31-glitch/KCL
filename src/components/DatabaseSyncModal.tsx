import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Database,
  Cloud,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ExternalLink,
  LogOut,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Key,
  Layers,
  Sparkles,
} from 'lucide-react';
import { GoogleDatabaseStatus, ClinicProfile } from '../types';
import {
  getEffectiveGoogleClientId,
  setCustomGoogleClientId,
  setCustomSpreadsheetId,
  setManualGoogleAccessToken,
  connectWithAccessToken,
  ACTIVE_DB_SPREADSHEET_ID_KEY,
  MAX_CELLS_CAPACITY,
  AUTO_ROLLOVER_THRESHOLD,
} from '../services/googleWorkspace';
import { FullClinicDatabase, exportDatabaseToFile, parseDatabaseFile } from '../services/cloudDatabase';

interface DatabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleStatus: GoogleDatabaseStatus;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onSyncGoogle: () => Promise<void>;
  onRestoreGoogle?: () => Promise<void>;
  isSyncingGoogle: boolean;
  syncProgress?: { message: string; percent: number };
  autoSyncStatus: 'idle' | 'syncing' | 'saved' | 'error';
  lastAutoSyncTime: string | null;
  currentData: FullClinicDatabase;
  onRestoreData: (restored: FullClinicDatabase) => void;
  clinicProfile: ClinicProfile;
}

export const DatabaseSyncModal: React.FC<DatabaseSyncModalProps> = ({
  isOpen,
  onClose,
  googleStatus,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncGoogle,
  onRestoreGoogle,
  isSyncingGoogle,
  syncProgress,
  autoSyncStatus,
  lastAutoSyncTime,
  currentData,
  onRestoreData,
  clinicProfile,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  // Advanced config state
  const [customClientIdInput, setCustomClientIdInput] = useState(() => {
    try {
      return localStorage.getItem('klinik_custom_google_client_id_v3') || '';
    } catch {
      return '';
    }
  });
  const [customSpreadsheetIdInput, setCustomSpreadsheetIdInput] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_DB_SPREADSHEET_ID_KEY) || '';
    } catch {
      return '';
    }
  });
  const [manualTokenInput, setManualTokenInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMessage(null);
    try {
      await onConnectGoogle();
      setSuccessMessage('Berhasil terhubung ke Google Spreadsheet Database!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      const msg = err?.friendlyMessage || err?.message || 'Gagal login Google. Periksa koneksi internet Anda.';
      setErrorMessage(msg);
    } finally {
      setConnecting(false);
    }
  };

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const handleDisconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setConfirmDisconnect(false);
    await onDisconnectGoogle();
    setSuccessMessage('Koneksi Google Spreadsheet diputuskan.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveAdvanced = () => {
    setCustomGoogleClientId(customClientIdInput);
    setCustomSpreadsheetId(customSpreadsheetIdInput);
    if (manualTokenInput.trim()) {
      setManualGoogleAccessToken(manualTokenInput.trim());
    }
    setSuccessMessage('Pengaturan khusus berhasil disimpan!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleConnectWithToken = async () => {
    if (!manualTokenInput.trim()) {
      setErrorMessage('Masukkan Google Access Token terlebih dahulu.');
      return;
    }
    setConnecting(true);
    setErrorMessage(null);
    try {
      await connectWithAccessToken(manualTokenInput.trim());
      await onConnectGoogle();
      setSuccessMessage('Berhasil terhubung dengan Google Access Token!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menghubungkan token.');
    } finally {
      setConnecting(false);
    }
  };

  const handleExport = () => {
    try {
      exportDatabaseToFile(currentData, clinicProfile.name);
      setSuccessMessage('File cadangan database (.json) berhasil diunduh!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setErrorMessage('Gagal mengunduh file cadangan database.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setErrorMessage(null);
      const restored = await parseDatabaseFile(file);
      onRestoreData(restored);
      setSuccessMessage(
        `Database berhasil dipulihkan! ${restored.simrs.length} transaksi SIMRS & ${restored.expenses.length} pengeluaran dimuat.`
      );
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Format file database tidak sesuai.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalCells = googleStatus.totalCellsUsed || 0;
  const rolloverThreshold = googleStatus.autoRolloverThreshold || AUTO_ROLLOVER_THRESHOLD;
  const maxCapacity = googleStatus.maxCellsCapacity || MAX_CELLS_CAPACITY;
  const usagePercent = Math.min(100, parseFloat(((totalCells / rolloverThreshold) * 100).toFixed(2)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Database Utama: Google Spreadsheet
                </h3>
                {googleStatus.isConnected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    ONLINE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    BELUM TERHUBUNG
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-Perangkat (HP, Laptop, PC, Vercel) &bull; Auto-Sync Realtime &bull; Tab APP_DATA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs overflow-y-auto">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-900">{errorMessage}</p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Jika Anda menggunakan Vercel atau domain custom, Anda dapat mengisi Google Client ID Anda sendiri di bagian opsi konfigurasi di bawah.
                </p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* Sync Progress Banner if Active */}
          {syncProgress && (
            <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-teal-900 font-semibold">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-teal-700 animate-spin" />
                  <span>{syncProgress.message}</span>
                </span>
                <span>{syncProgress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-teal-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all duration-300"
                  style={{ width: `${syncProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* CASE 1: Google Spreadsheet CONNECTED */}
          {googleStatus.isConnected ? (
            <div className="space-y-4">
              {/* Connected Active Card */}
              <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                      Active Database Terhubung
                    </span>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mt-0.5">
                      <span>{googleStatus.spreadsheetName || 'KLINIK FINANCE DB 001'}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold">
                        Vol {googleStatus.volumeNumber || 1}
                      </span>
                    </h4>
                    {googleStatus.userEmail && (
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Akun Google: <strong className="font-semibold text-slate-800">{googleStatus.userEmail}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {googleStatus.spreadsheetUrl && (
                      <a
                        href={googleStatus.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Spreadsheet</span>
                      </a>
                    )}

                    <button
                      onClick={handleDisconnect}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1 ${
                        confirmDisconnect
                          ? 'bg-rose-600 text-white font-bold text-xs px-2.5 py-1'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title={confirmDisconnect ? 'Klik lagi untuk konfirmasi putuskan koneksi' : 'Putuskan Akun Google'}
                    >
                      <LogOut className="w-4 h-4" />
                      {confirmDisconnect && <span>Yakin Putuskan?</span>}
                    </button>
                  </div>
                </div>

                {/* Real-time Auto-Sync Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Cloud className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Sinkronisasi Realtime: <strong>Otomatis (Debounce 1.5 detik)</strong> saat data bertambah/diubah.
                    </span>
                  </div>
                  {lastAutoSyncTime && (
                    <span className="text-emerald-800 font-mono text-[10px] shrink-0">
                      Tersimpan: {lastAutoSyncTime}
                    </span>
                  )}
                </div>

                {/* Capacity & Auto Rotation Monitor */}
                <div className="pt-2 border-t border-emerald-100/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>Kapasitas Sel Database (Batas Aman 9.500.000 Sel)</span>
                    </span>
                    <span className="font-mono text-emerald-800">
                      {totalCells.toLocaleString('id-ID')} / {rolloverThreshold.toLocaleString('id-ID')} sel ({usagePercent}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-emerald-200">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        usagePercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(1, usagePercent)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Maksimal: {maxCapacity.toLocaleString('id-ID')} sel</span>
                    <span className="text-emerald-700 font-medium">
                      Auto-Rotation Aktif &bull; DB 001 &rarr; DB 002 jika &ge; 9.5M sel
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={onSyncGoogle}
                    disabled={isSyncingGoogle}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGoogle ? 'animate-spin' : ''}`} />
                    <span>{isSyncingGoogle ? 'Sedang Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>

                  {onRestoreGoogle && (
                    <button
                      onClick={onRestoreGoogle}
                      disabled={isSyncingGoogle}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-60"
                      title="Muat ulang seluruh data dari Google Spreadsheet ke aplikasi"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-600" />
                      <span>Muat Ulang dari Spreadsheet</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* CASE 2: Google Spreadsheet NOT Connected */
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-4">
                <div className="max-w-md mx-auto space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Hubungkan Akun Google untuk Database Otomatis
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Sistem akan <strong>otomatis membuat spreadsheet database KLINIK FINANCE DB 001</strong> lengkap
                    dengan tab <strong>APP_DATA</strong> di Google Drive Anda. Seluruh HP, Laptop, PC, dan Vercel
                    akan otomatis tersinkronisasi ke database yang sama!
                  </p>
                </div>

                {/* Official Google Sign-In Button */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="inline-flex items-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
                  >
                    {connecting ? (
                      <RefreshCw className="w-4 h-4 text-teal-600 animate-spin" />
                    ) : (
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
                    )}
                    <span>{connecting ? 'Menghubungkan Akun Google...' : 'Sign in with Google (Hubungkan Database)'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Auto Buat DB 001</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Tab APP_DATA Otomatis</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Auto-Rotation 9.5jt Sel</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Database Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Transaksi SIMRS</span>
              <span className="text-base font-black text-slate-900 font-mono">{currentData.simrs.length}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Nota Beban</span>
              <span className="text-base font-black text-slate-900 font-mono">{currentData.expenses.length}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Hutang / Piutang</span>
              <span className="text-base font-black text-slate-900 font-mono">
                {currentData.debts.length + currentData.receivables.length}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Aset &amp; Mutasi Kas</span>
              <span className="text-base font-black text-slate-900 font-mono">
                {currentData.assets.length + currentData.cashflow.length}
              </span>
            </div>
          </div>

          {/* Advanced Configuration Accordion */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
            >
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-teal-600" />
                <span>Konfigurasi Khusus Vercel &amp; Google Cloud OAuth</span>
              </span>
              {showAdvancedConfig ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showAdvancedConfig && (
              <div className="p-4 space-y-3 bg-white border-t border-slate-200">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Jika Anda mendeploy aplikasi ke domain khusus Vercel (misal: <code>https://klinik.vercel.app</code>),
                  Anda dapat memasukkan Google OAuth Client ID milik project GCP Anda sendiri di sini agar Authorized
                  JavaScript Origins sesuai.
                </p>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Google OAuth Client ID Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customClientIdInput}
                    onChange={(e) => setCustomClientIdInput(e.target.value)}
                    placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Spreadsheet ID Langsung (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customSpreadsheetIdInput}
                    onChange={(e) => setCustomSpreadsheetIdInput(e.target.value)}
                    placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Google Access Token Manual (Opsional)
                  </label>
                  <input
                    type="password"
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    placeholder="Masukkan OAuth Bearer Access Token (ya29...)"
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSaveAdvanced}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    Simpan Konfigurasi
                  </button>
                  {manualTokenInput.trim() && (
                    <button
                      type="button"
                      onClick={handleConnectWithToken}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Hubungkan dengan Token
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Offline Backup Section (JSON Export/Import) */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <h4 className="font-bold text-slate-800 text-xs">
              Cadangan Offline Mandiri (JSON File)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Cadangan (.json)</span>
              </button>

              <label className="flex items-center justify-center gap-2 p-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold transition-all cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5 text-teal-700" />
                <span>{isImporting ? 'Memulihkan...' : 'Pulihkan Cadangan (.json)'}</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isImporting}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            Arsitektur: Vercel &bull; Google Identity Services &bull; Sheets API &bull; Spreadsheet DB
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
