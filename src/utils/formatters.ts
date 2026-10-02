// Helper utilities for Indonesian clinic financial application

export const formatRupiah = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('id-ID').format(value);
};

export const formatDateId = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const formatShortDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const formatDateTimeId = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const getDaysRemaining = (targetDateStr: string): number => {
  const target = new Date(targetDateStr);
  const now = new Date();
  // Strip hours for pure date comparison
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Exports data to CSV file with UTF-8 BOM so Microsoft Excel can open Indonesian characters and numbers cleanly
 */
export const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]): void => {
  const sanitize = (val: string | number) => {
    const str = String(val ?? '');
    // If it contains comma, quote, or newline, escape it
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = '\uFEFF' + [
    headers.map(sanitize).join(';'),
    ...rows.map(row => row.map(sanitize).join(';'))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
