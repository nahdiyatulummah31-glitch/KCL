import React, { useState } from 'react';
import { formatRupiah } from '../utils/formatters';

interface AreaDataPoint {
  label: string; // e.g. "05 Sep", "06 Sep"
  revenue: number;
  expense: number;
}

interface AreaTrendChartProps {
  data: AreaDataPoint[];
  height?: number;
}

export const ModernAreaTrendChart: React.FC<AreaTrendChartProps> = ({ data, height = 240 }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        Belum ada data tren yang tersedia
      </div>
    );
  }

  const paddingX = 40;
  const paddingY = 30;
  const width = 600; // viewBox width

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.revenue, d.expense)),
    1000000
  );

  const getX = (index: number) => {
    if (data.length <= 1) return width / 2;
    return paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) => {
    const chartHeight = height - paddingY * 2;
    return height - paddingY - (val / maxVal) * chartHeight;
  };

  // Build SVG path strings with smooth curves (bezier)
  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      path += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const revenuePoints = data.map((d, i) => ({ x: getX(i), y: getY(d.revenue) }));
  const expensePoints = data.map((d, i) => ({ x: getX(i), y: getY(d.expense) }));

  const revenueLine = buildSmoothPath(revenuePoints);
  const expenseLine = buildSmoothPath(expensePoints);

  const firstX = getX(0);
  const lastX = getX(data.length - 1);
  const baselineY = height - paddingY;

  const revenueArea = `${revenueLine} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  const expenseArea = `${expenseLine} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingY + (height - paddingY * 2) * (1 - ratio);
          return (
            <g key={i}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingX - 6}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {Math.round((maxVal * ratio) / 1000000)}jt
              </text>
            </g>
          );
        })}

        {/* Areas */}
        <path d={revenueArea} fill="url(#revenueGrad)" />
        <path d={expenseArea} fill="url(#expenseGrad)" />

        {/* Lines */}
        <path
          d={revenueLine}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={expenseLine}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="2"
          strokeDasharray="5 3"
          strokeLinecap="round"
        />

        {/* Points & Interactive Markers */}
        {data.map((d, i) => {
          const rx = getX(i);
          const ry = getY(d.revenue);
          const ey = getY(d.expense);
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Invisible touch/hover target */}
              <rect
                x={rx - 15}
                y={paddingY}
                width="30"
                height={height - paddingY * 2}
                fill="transparent"
              />

              {isHovered && (
                <line
                  x1={rx}
                  y1={paddingY}
                  x2={rx}
                  y2={baselineY}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Revenue Dot */}
              <circle
                cx={rx}
                cy={ry}
                r={isHovered ? 6 : 3.5}
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth={isHovered ? 3 : 2}
                className="transition-all duration-150"
              />

              {/* Expense Dot */}
              <circle
                cx={rx}
                cy={ey}
                r={isHovered ? 5 : 3}
                fill="#ffffff"
                stroke="#f43f5e"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="transition-all duration-150"
              />

              {/* X Axis Label */}
              <text
                x={rx}
                y={height - 10}
                textAnchor="middle"
                className={`text-[10px] font-medium transition-colors ${
                  isHovered ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                }`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute z-20 top-2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg shadow-xl pointer-events-none text-xs flex flex-col gap-0.5 border border-slate-700"
          style={{
            left: `${(getX(hoveredIdx) / width) * 100}%`,
          }}
        >
          <div className="font-semibold text-slate-300 border-b border-slate-700 pb-0.5 mb-0.5">
            {data[hoveredIdx].label}
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400">
            <span>Pendapatan:</span>
            <span className="font-mono font-bold">
              {formatRupiah(data[hoveredIdx].revenue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-rose-400">
            <span>Pengeluaran:</span>
            <span className="font-mono font-bold">
              {formatRupiah(data[hoveredIdx].expense)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-amber-300 text-[11px] pt-0.5 border-t border-slate-800">
            <span>Netto:</span>
            <span className="font-mono font-semibold">
              {formatRupiah(data[hoveredIdx].revenue - data[hoveredIdx].expense)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  totalLabel?: string;
  size?: number;
}

export const ModernDonutChart: React.FC<DonutChartProps> = ({
  data,
  totalLabel = 'Total SIMRS',
  size = 180,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-xs text-slate-400">
        Belum ada rincian data unit
      </div>
    );
  }

  const radius = size * 0.38;
  const center = size / 2;
  const strokeWidth = size * 0.16;

  let accumulatedAngle = -90; // Start from top

  const slices = data.map((item, idx) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;
    const pathData =
      angle >= 359.99
        ? `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.01} ${center - radius}`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return {
      ...item,
      percentage: Math.round(percentage * 100),
      pathData,
      isHovered: hoveredIdx === idx,
    };
  });

  const activeItem = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* SVG Donut */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.pathData}
              fill="none"
              stroke={slice.color}
              strokeWidth={slice.isHovered ? strokeWidth + 4 : strokeWidth}
              strokeLinecap="round"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {activeItem ? (
            <>
              <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[100px]">
                {activeItem.label}
              </span>
              <span className="text-xs font-bold text-slate-800 font-mono">
                {formatRupiah(activeItem.value)}
              </span>
              <span className="text-[10px] font-semibold text-emerald-600">
                {Math.round((activeItem.value / total) * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-slate-500 font-medium">{totalLabel}</span>
              <span className="text-xs font-bold text-slate-800 font-mono">
                {formatRupiah(total)}
              </span>
              <span className="text-[10px] text-slate-400">100%</span>
            </>
          )}
        </div>
      </div>

      {/* Legend list - Full width, clean row items that never truncate numbers or percentages */}
      <div className="w-full space-y-1 text-xs">
        {data.map((item, idx) => {
          const pct = Math.round((item.value / total) * 100);
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                isHovered ? 'bg-slate-100 font-medium' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-1">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-700 truncate text-xs">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 font-mono shrink-0 whitespace-nowrap">
                <span className="text-slate-900 font-semibold">{formatRupiah(item.value)}</span>
                <span className="text-[11px] text-slate-400 font-sans">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
