import React, { useState } from 'react';
import {
  Bell,
  Building2,
  ShieldCheck,
  ChevronDown,
  Printer,
  Calendar,
  AlertTriangle,
  Clock,
  ExternalLink,
  Users,
  LogIn,
  LogOut,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { ClinicProfile, UserAccount, DueNotification, UserRole, GoogleDatabaseStatus } from '../types';
import { formatRupiah } from '../utils/formatters';

interface NavbarProps {
  profile: ClinicProfile;
  activeUser: UserAccount;
  allUsers: UserAccount[];
  notifications: DueNotification[];
  googleStatus?: GoogleDatabaseStatus;
  autoSyncStatus?: 'idle' | 'syncing' | 'saved' | 'error';
  lastAutoSyncTime?: string | null;
  onSwitchUser: (userId: string) => void;
  onNavigateTab: (tabId: string) => void;
  onSelectNotificationItem: (item: DueNotification) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeUser,
  allUsers,
  notifications,
  googleStatus,
  autoSyncStatus = 'idle',
  lastAutoSyncTime,
  onSwitchUser,
  onNavigateTab,
  onSelectNotificationItem,
  onLogout,
}) => {
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const overdueCount = notifications.filter((n) => n.urgency === 'overdue').length;
  const criticalCount = notifications.filter((n) => n.urgency === 'critical').length;
  const totalUrgent = notifications.length;

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Owner / Direktur', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'finance_manager':
        return { label: 'Manajer Keuangan', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'cashier_staff':
        return { label: 'Staf Kasir', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'auditor':
        return { label: 'Auditor Eksternal', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: role, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const userBadge = getRoleBadge(activeUser.role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Clinic Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 max-w-[50%] sm:max-w-none">
          {profile.logoUrl ? (
            <img
              src={profile.logoUrl}
              alt="Logo Klinik"
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shadow-teal-700/20 shrink-0">
              {profile.name.charAt(0) || 'K'}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
              {profile.name}
            </h1>
            <p
              className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-mono truncate"
              title={`Izin: ${profile.operationalLicense || profile.licenseNumber || '-'}`}
            >
              Izin: {profile.operationalLicense || profile.licenseNumber || '-'}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Google Sheets Auto-Sync Indicator */}
          {googleStatus?.isConnected && (
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all ${
                autoSyncStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : autoSyncStatus === 'saved'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-teal-50/80 text-teal-800 border border-teal-200/60'
              }`}
              title="Setiap transaksi SIMRS, pengeluaran, utang & kas otomatis tersinkron langsung ke Google Sheets secara real-time"
            >
              {autoSyncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Menyimpan ke Sheets...</span>
                </>
              ) : autoSyncStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersimpan di Google Sheets</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-Sync Sheets Aktif</span>
                </>
              )}
            </div>
          )}

          {/* Button to Logout / Switch Account */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
            title="Keluar dari sesi akun"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

          {/* Quick Print A4 Shortcut */}
          <button
            onClick={() => onNavigateTab('audit_print')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
            title="Buka Lembar Cetak Laporan A4"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Cetak A4</span>
          </button>

          {/* Automatic Due Date Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifPopover(!showNotifPopover);
                setShowUserDropdown(false);
              }}
              className={`relative p-2 rounded-xl transition-colors ${
                totalUrgent > 0
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title="Notifikasi Tagihan Jatuh Tempo"
            >
              <Bell className="w-4 h-4" />
              {totalUrgent > 0 && (
                <span
                  className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full flex items-center justify-center font-mono ${
                    overdueCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-amber-600'
                  }`}
                >
                  {totalUrgent}
                </span>
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {showNotifPopover && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-0 z-50 overflow-hidden">
                <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Notifikasi Tagihan & Klaim Jatuh Tempo
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {totalUrgent} Perlu Perhatian
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Tidak ada tagihan utang atau klaim piutang yang mendekati jatuh tempo saat ini.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          onSelectNotificationItem(notif);
                          setShowNotifPopover(false);
                        }}
                        className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer text-xs group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            {notif.urgency === 'overdue' ? (
                              <span className="p-1 rounded-md bg-rose-100 text-rose-700 mt-0.5 shrink-0">
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </span>
                            ) : notif.urgency === 'critical' ? (
                              <span className="p-1 rounded-md bg-amber-100 text-amber-700 mt-0.5 shrink-0">
                                <Clock className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="p-1 rounded-md bg-sky-100 text-sky-700 mt-0.5 shrink-0">
                                <Calendar className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800 leading-snug group-hover:text-teal-700">
                                {notif.title}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[200px]">
                                {notif.counterparty}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-slate-900 block text-xs">
                              {formatRupiah(notif.amount)}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                notif.urgency === 'overdue'
                                  ? 'bg-rose-50 text-rose-700 font-bold'
                                  : notif.urgency === 'critical'
                                  ? 'bg-amber-50 text-amber-700 font-semibold'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Tempo: {notif.dueDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      onNavigateTab('debts_receivables');
                      setShowNotifPopover(false);
                    }}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center justify-center gap-1 w-full py-1"
                  >
                    <span>Buka Rincian Utang & Piutang</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Account / RBAC Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserDropdown(!showUserDropdown);
                setShowNotifPopover(false);
              }}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {activeUser.name.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                    {activeUser.name}
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                </div>
                <span
                  className={`inline-block text-[10px] font-medium px-1.5 py-0.2 rounded border ${userBadge.color}`}
                >
                  {userBadge.label}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Switch user role popover */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50">
                <div className="p-2 border-b border-slate-100 mb-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Ganti Sesi Staf Keuangan
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Pilih akun staf untuk berpindah sesi kerja sistem.
                  </p>
                </div>

                <div className="space-y-1">
                  {allUsers.map((user) => {
                    const badge = getRoleBadge(user.role);
                    const isSelected = user.id === activeUser.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSwitchUser(user.id);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors text-xs ${
                          isSelected
                            ? 'bg-teal-50 border border-teal-200 text-teal-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {user.name}
                            </p>
                            <span
                              className={`inline-block text-[9px] font-medium px-1.5 py-0.2 rounded border mt-0.5 ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-teal-600 mr-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                  <button
                    onClick={() => {
                      onNavigateTab('staff_management');
                      setShowUserDropdown(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 p-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Kelola Akun, Password & PIN Staf</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 p-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
