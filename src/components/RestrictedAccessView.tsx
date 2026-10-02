import React from 'react';
import { ShieldAlert, ArrowLeft, ArrowRight, Lock, UserCheck, Calendar } from 'lucide-react';
import { UserAccount } from '../types';

interface RestrictedAccessViewProps {
  activeUser: UserAccount;
  featureTitle: string;
  onGoToAllowed: () => void;
  onOpenLogin?: () => void;
}

export const RestrictedAccessView: React.FC<RestrictedAccessViewProps> = ({
  activeUser,
  featureTitle,
  onGoToAllowed,
  onOpenLogin,
}) => {
  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl border-2 border-amber-200 shadow-xl text-center space-y-6 animate-fade-in">
      {/* Icon Badge */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-amber-700 shadow-inner">
        <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          <ShieldAlert className="w-3.5 h-3.5" />
          Akses Terbatas: Khusus Owner & Manajer
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Halaman &ldquo;{featureTitle}&rdquo; Dibatasi
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          Sesuai aturan otorisasi klinik:{' '}
          <strong className="text-slate-800">
            Seluruh data manajerial, pengeluaran, utang & piutang, inventaris aset, penggajian, dan laporan keuangan hanya dapat dilihat oleh Owner dan Manajer.
          </strong>
        </p>
      </div>

      {/* User Information Box */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Akun Anda Saat Ini
          </span>
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
            Karyawan Biasa / Kasir
          </span>
        </div>
        <p className="text-sm font-bold text-slate-800">
          {activeUser.name} <span className="font-normal text-slate-500">(@{activeUser.username})</span>
        </p>
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-xs text-emerald-700 font-medium">
          <Calendar className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            Hak Akses Anda: Melihat data pemasukan klinik untuk <strong>hari ini dan 2 hari sebelumnya</strong>.
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onGoToAllowed}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Lihat Pemasukan Hari Ini & 2 Hari Lalu</span>
        </button>

        {onOpenLogin && (
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 transition-all"
          >
            <UserCheck className="w-4 h-4 text-slate-500" />
            <span>Ganti Sesi ke Owner / Manajer</span>
          </button>
        )}
      </div>
    </div>
  );
};
