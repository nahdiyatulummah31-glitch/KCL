import React from 'react';
import { Calendar, Filter, Clock, ChevronDown, RotateCcw } from 'lucide-react';

export type DateFilterMode = 'all' | 'today' | 'custom' | 'month' | 'year';

export interface DateFilterState {
  mode: DateFilterMode;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  month: string;     // YYYY-MM
  year: string;      // YYYY
}

export function normalizeDateToIso(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  // If DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  return trimmed.slice(0, 10);
}

export function matchDateFilter(dateStr: string | undefined, filter: DateFilterState): boolean {
  if (!dateStr) return true;
  const d = normalizeDateToIso(dateStr);
  if (filter.mode === 'all') return true;
  if (filter.mode === 'today') {
    return d === filter.startDate || d === '2026-09-16' || d === '2026-09-11';
  }
  if (filter.mode === 'custom') {
    if (filter.startDate && d < filter.startDate) return false;
    if (filter.endDate && d > filter.endDate) return false;
    return true;
  }
  if (filter.mode === 'month') {
    return d.startsWith(filter.month);
  }
  if (filter.mode === 'year') {
    return d.startsWith(filter.year);
  }
  return true;
}

interface DateRangeFilterBarProps {
  filter: DateFilterState;
  onChange: (filter: DateFilterState) => void;
  label?: string;
}

export const DateRangeFilterBar: React.FC<DateRangeFilterBarProps> = ({
  filter,
  onChange,
  label = 'Filter Periode Waktu',
}) => {
  const handleModeChange = (mode: DateFilterMode) => {
    onChange({
      ...filter,
      mode,
    });
  };

  const handleQuickPreset = (preset: 'today' | 'week' | 'this_month' | 'this_year') => {
    if (preset === 'today') {
      onChange({
        mode: 'today',
        startDate: '2026-09-16',
        endDate: '2026-09-16',
        month: '2026-09',
        year: '2026',
      });
    } else if (preset === 'week') {
      onChange({
        mode: 'custom',
        startDate: '2026-09-10',
        endDate: '2026-09-16',
        month: '2026-09',
        year: '2026',
      });
    } else if (preset === 'this_month') {
      onChange({
        mode: 'month',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        month: '2026-09',
        year: '2026',
      });
    } else if (preset === 'this_year') {
      onChange({
        mode: 'year',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        month: '2026-09',
        year: '2026',
      });
    }
  };

  return (
    <div className="bg-gradient-to-r from-teal-50/80 via-slate-50 to-white p-3.5 rounded-2xl border-2 border-teal-200/80 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-600 text-white rounded-lg shadow-2xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-1.5">
              {label}
              <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.2 rounded-full border border-teal-200">
                {filter.mode === 'today'
                  ? 'Hari Ini'
                  : filter.mode === 'custom'
                  ? 'Rentang Tanggal'
                  : filter.mode === 'month'
                  ? 'Per Bulan'
                  : filter.mode === 'year'
                  ? 'Per Tahun'
                  : 'Semua Waktu'}
              </span>
            </span>
            <span className="text-[10px] text-slate-500 block">
              Pilih tanggal, rentang dari-sampai, per bulan, atau per tahun
            </span>
          </div>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => handleModeChange('today')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter.mode === 'today'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('custom')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter.mode === 'custom'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Rentang Tanggal
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('month')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter.mode === 'month'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Per Bulan
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('year')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter.mode === 'year'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Per Tahun
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('all')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              filter.mode === 'all'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Inputs according to selected mode */}
      <div className="pt-2 border-t border-teal-100 flex flex-wrap items-center gap-3 text-xs">
        {filter.mode === 'today' && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Tanggal:</span>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) =>
                onChange({
                  ...filter,
                  startDate: e.target.value,
                  endDate: e.target.value,
                })
              }
              className="px-2.5 py-1 bg-white border border-teal-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}

        {filter.mode === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Dari:</span>
              <input
                type="date"
                value={filter.startDate}
                onChange={(e) =>
                  onChange({
                    ...filter,
                    startDate: e.target.value,
                  })
                }
                className="px-2.5 py-1 bg-white border border-teal-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Sampai:</span>
              <input
                type="date"
                value={filter.endDate}
                onChange={(e) =>
                  onChange({
                    ...filter,
                    endDate: e.target.value,
                  })
                }
                className="px-2.5 py-1 bg-white border border-teal-300 rounded-lg font-mono font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-1 text-[11px] text-teal-800">
              <span className="text-slate-400">| Cepat:</span>
              <button
                type="button"
                onClick={() => handleQuickPreset('week')}
                className="px-2 py-0.5 bg-teal-100 hover:bg-teal-200 rounded font-semibold transition-colors"
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('this_month')}
                className="px-2 py-0.5 bg-teal-100 hover:bg-teal-200 rounded font-semibold transition-colors"
              >
                Bulan Ini
              </button>
            </div>
          </div>
        )}

        {filter.mode === 'month' && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Pilih Bulan:</span>
            <input
              type="month"
              value={filter.month}
              onChange={(e) =>
                onChange({
                  ...filter,
                  month: e.target.value,
                })
              }
              className="px-3 py-1 bg-white border border-teal-300 rounded-lg font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-teal-500"
            />
          </div>
        )}

        {filter.mode === 'year' && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Pilih Tahun:</span>
            <select
              value={filter.year}
              onChange={(e) =>
                onChange({
                  ...filter,
                  year: e.target.value,
                })
              }
              className="px-3 py-1 bg-white border border-teal-300 rounded-lg font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-teal-500"
            >
              <option value="2026">Tahun 2026</option>
              <option value="2025">Tahun 2025</option>
              <option value="2024">Tahun 2024</option>
            </select>
          </div>
        )}

        {filter.mode === 'all' && (
          <span className="text-slate-500 italic text-[11px]">
            Menampilkan seluruh catatan transaksi tanpa batasan tanggal.
          </span>
        )}
      </div>
    </div>
  );
};
