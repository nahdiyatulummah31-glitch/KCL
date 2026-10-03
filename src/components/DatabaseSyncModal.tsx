import React, { useState, useRef } from 'react';
import {
  Database,
  Cloud,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileJson,
  ShieldCheck,
  RefreshCw,
  Info,
  Server,
  HardDrive,
} from 'lucide-react';
import { FullClinicDatabase, exportDatabaseToFile, parseDatabaseFile } from '../services/cloudDatabase';
import { ClinicProfile } from '../types';

interface DatabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: FullClinicDatabase;
  onRestoreData: (restored: FullClinicDatabase) => void;
  syncStatus: 'idle' | 'syncing' | 'saved' | 'error';
  lastSyncTime: string | null;
  onManualTriggerSync?: () => void;
  clinicProfile: ClinicProfile;
}

export const DatabaseSyncModal: React.FC<DatabaseSyncModalProps> = ({
  isOpen,
  onClose,
  currentData,
  onRestoreData,
  syncStatus,
  lastSyncTime,
  onManualTriggerSync,
  clinicProfile,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      exportDatabaseToFile(currentData, clinicProfile.name);
      setNotice({
        type: 'success',
        message: 'File cadangan database berhasil diunduh ke komputer Anda!',
      });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({
        type: 'error',
        message: 'Gagal mengunduh file cadangan database.',
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setNotice(null);
      const restored = await parseDatabaseFile(file);
      onRestoreData(restored);
      setNotice({
        type: 'success',
        message: `Database berhasil dipulihkan! ${restored.simrs.length} transaksi SIMRS, ${restored.expenses.length} pengeluaran berhasil dimuat.`,
      });
      setTimeout(() => {
        setNotice(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.message || 'Format file database tidak sesuai.',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-100/80 text-teal-800 flex items-center justify-center border border-teal-200">
              <Database className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Pusat Database & Sinkronisasi Cloud
              </h3>
              <p className="text-xs text-slate-500">
                Penyimpanan otomatis realtime dan cadangan data klinik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Notification Alert */}
          {notice && (
            <div
              className={`p-3 rounded-2xl flex items-center gap-2.5 ${
                notice.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span className="font-medium">{notice.message}</span>
            </div>
          )}

          {/* Cloud Auto-Sync Status Box */}
          <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-900 font-bold">
                <Cloud className="w-4 h-4 text-teal-700" />
                <span>Sinkronisasi Otomatis Realtime</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {syncStatus === 'syncing'
                  ? 'Sedang Menyimpan...'
                  : syncStatus === 'saved'
                  ? 'Tersimpan ke Cloud'
                  : 'Aktif'}
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Setiap Anda menambah transaksi kasir, nota pengeluaran, pembayaran utang/piutang, sistem
              <strong> otomatis menyinkronkan data detik itu juga</strong> ke Cloud Database tanpa perlu klik tombol simpan manual.
            </p>
            {lastSyncTime && (
              <p className="text-[10px] text-teal-800/80 font-mono">
                Sinkronisasi otomatis terakhir: {lastSyncTime}
              </p>
            )}
          </div>

          {/* Explanation on GitHub & Vercel */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Mengapa data tetap aman saat push ke GitHub / deploy Vercel?</span>
            </div>
            <p className="leading-relaxed">
              GitHub hanya menyimpan file kode program (aplikasi). Seluruh isian data transaksi, pasien, dan keuangan klinik tersimpan di Cloud Database &amp; memori data. Saat Anda push ke GitHub atau membuka link baru di Vercel, data tidak akan terhapus karena terhubung langsung dengan sistem database.
            </p>
          </div>

          {/* Database Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Transaksi SIMRS</span>
              <span className="text-lg font-black text-slate-900 font-mono">{currentData.simrs.length}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Nota Pengeluaran</span>
              <span className="text-lg font-black text-slate-900 font-mono">{currentData.expenses.length}</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Faktur Utang/Piutang</span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {currentData.debts.length + currentData.receivables.length}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Aset &amp; Vendor</span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {currentData.assets.length + currentData.vendors.length}
              </span>
            </div>
          </div>

          {/* Backup & Restore Action Buttons */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">
              Cadangan Mandiri (Offline Backup &amp; Migrasi)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Export Button */}
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Cadangan (.json)</span>
              </button>

              {/* Import Button */}
              <label className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold transition-all cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-teal-700" />
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
            <p className="text-[10px] text-slate-400 text-center">
              Gunakan file cadangan jika ingin menduplikasi atau mentransfer data instan ke komputer/perangkat lain.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
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
