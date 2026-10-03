import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  ArrowLeftRight,
  TrendingDown,
  Scale,
  CalendarDays,
  Printer,
  ShieldAlert,
  Settings,
  AlertCircle,
  Truck,
  Banknote,
  FileCheck2,
  Boxes,
  Users,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { UserAccount, isOwnerOrManager } from '../types';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  urgentDueCount: number;
  activeUser?: UserAccount | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  urgentDueCount,
  activeUser,
}) => {
  const isSuperOrManager = isOwnerOrManager(activeUser);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dasbor Analisis',
      icon: LayoutDashboard,
      restricted: false,
    },
    {
      id: 'cash_flow',
      label: 'Arus Kas Harian',
      icon: ArrowLeftRight,
      restricted: false,
      badgeText: 'Kasir & Nota',
      badgeColor: 'bg-teal-100 text-teal-800 border border-teal-200',
    },
    {
      id: 'debts_receivables',
      label: 'Utang & Piutang',
      icon: Scale,
      restricted: false,
      badge: urgentDueCount > 0 ? urgentDueCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'inventory',
      label: 'Inventaris & Aset Klinik',
      icon: Boxes,
      restricted: false,
    },
    {
      id: 'payroll',
      label: 'Gaji Karyawan',
      icon: Users,
      restricted: true,
    },
    {
      id: 'vendors',
      label: 'Identitas Vendor',
      icon: Truck,
      restricted: false,
    },
    {
      id: 'monthly_report',
      label: 'Laporan Keuangan',
      icon: CalendarDays,
      restricted: false,
    },
    {
      id: 'audit_print',
      label: 'Cetak Laporan / PDF',
      icon: Printer,
      restricted: false,
    },
    {
      id: 'clinic_settings',
      label: 'Pengaturan Klinik',
      icon: Settings,
      restricted: true,
    },
  ];

  const visibleMenuItems = menuItems.filter((item) => isSuperOrManager || !item.restricted);

  return (
    <aside className="w-full lg:w-60 shrink-0 bg-white lg:border-r border-slate-200 lg:min-h-[calc(100vh-4rem)] p-3 sm:p-3.5 flex flex-col justify-between">
      <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1 pb-2 lg:pb-0 scrollbar-none">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 shrink-0 lg:w-full cursor-pointer ${
                isActive
                  ? 'bg-teal-700 text-white shadow-sm shadow-teal-900/10 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-teal-800 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm font-medium leading-none">
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-1">
                {item.badge !== undefined && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      isActive ? 'bg-amber-400 text-amber-950' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {item.badgeText && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold hidden sm:inline-block ${
                      isActive ? 'bg-teal-800 text-white' : item.badgeColor
                    }`}
                  >
                    {item.badgeText}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
