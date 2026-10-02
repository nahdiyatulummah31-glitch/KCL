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
} from 'lucide-react';
import { GoogleDatabaseStatus } from '../types';

interface GoogleWorkspacePanelProps {
  status: GoogleDatabaseStatus;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onSyncAll: () => Promise<void>;
  isSyncing: boolean;
  syncProgress?: { message: string; percent: number };
}

export const GoogleWorkspacePanel: React.FC<GoogleWorkspacePanelProps> = ({
  status,
  onConnectGoogle,
  onDisconnectGoogle,
  onSyncAll,
  isSyncing,
  syncProgress,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setErrorMsg(null);
    try {
      await onConnectGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghubungkan Google Account.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await onDisconnectGoogle();
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
                  Terhubung
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Penyimpanan data otomatis di Google Sheets dan berkas nota/PDF di Google Drive.
            </p>
          </div>
        </div>

        {status.isConnected && (
          <div className="flex items-center gap-2">
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
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* When NOT Connected */}
      {!status.isConnected ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4">
          <div className="max-w-md mx-auto space-y-2">
            <h4 className="text-sm font-bold text-slate-800">
              Hubungkan Akun Google untuk Database Otomatis
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Sistem akan otomatis membuat file Google Spreadsheet dan folder Google Drive. Seluruh transaksi kasir, beban, hutang, serta foto kuitansi/PDF akan tersimpan dan tersinkronisasi.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            {/* Official Google Sign In Button */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
            >
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
                Folder khusus untuk mengunggah bukti nota, struk, dan PDF.
              </span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-800 block">Kapasitas 10 Juta Sel</span>
              <span className="text-[11px] text-slate-500">
                Otomatis generate volume database baru saat mencapai 9 juta sel.
              </span>
            </div>
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
                  className="w-8 h-8 rounded-full border border-slate-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  {(status.userName || status.userEmail || 'G')[0].toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {status.userName || 'Akun Google Terhubung'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">{status.userEmail}</span>
              </div>
            </div>

            {status.lastSyncedAt && (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Terakhir Disinkronkan:</span>
                <span className="text-xs font-medium text-slate-700">{status.lastSyncedAt}</span>
              </div>
            )}
          </div>

          {/* Database Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Sheets Card */}
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {status.spreadsheetName || `Klinik_Finance_DB_Vol${status.volumeNumber}`}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Google Spreadsheet Aktif (Vol {status.volumeNumber})
                    </span>
                  </div>
                </div>
              </div>

              {status.spreadsheetUrl && (
                <a
                  href={status.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <span>Buka Google Spreadsheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Google Drive Card */}
            <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-200 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-600 text-white rounded-lg">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      [Klinik Finance] Database & Arsip Medis
                    </span>
                    <span className="text-[11px] text-sky-700 font-medium">
                      Folder Google Drive Utama
                    </span>
                  </div>
                </div>
              </div>

              {status.driveFolderUrl ? (
                <a
                  href={status.driveFolderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-sky-50 text-sky-800 border border-sky-300 rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <span>Buka Folder Google Drive</span>
                  <FolderOpen className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-xs text-slate-400">Siap saat sinkronisasi pertama</span>
              )}
            </div>
          </div>

          {/* Cell Capacity Meter (10M Limit & 9M Auto-Rollover) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  Kapasitas Sel Spreadsheet (Volume {status.volumeNumber})
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900">
                {status.totalCellsUsed.toLocaleString()} / {status.maxCellsCapacity.toLocaleString()} Sel ({cellPercentage}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  rolloverPercent > 80
                    ? 'bg-amber-500'
                    : rolloverPercent > 95
                    ? 'bg-rose-500'
                    : 'bg-teal-600'
                }`}
                style={{ width: `${Math.max(2, cellPercentage)}%` }}
              ></div>
            </div>

            {/* Explanatory Note */}
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>
                  Batas Google Sheets: <strong>10 Juta Sel</strong>. Sistem otomatis men-generate volume baru saat mencapai <strong>9 Juta Sel</strong>.
                </span>
              </span>
              <span className="text-slate-400">Ambang batas: 90%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
