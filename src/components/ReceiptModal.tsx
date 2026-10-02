import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, FileText, ExternalLink } from 'lucide-react';
import { formatRupiah, formatDateId } from '../utils/formatters';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl?: string;
  title: string;
  vendorName?: string;
  invoiceNumber?: string;
  amount: number;
  date: string;
  receiptFileName?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptUrl,
  title,
  vendorName,
  invoiceNumber,
  amount,
  date,
  receiptFileName,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!receiptUrl) return;
    const link = document.createElement('a');
    link.href = receiptUrl;
    link.download = receiptFileName || 'bukti_nota_klinik.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 leading-tight">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {vendorName ? `${vendorName} • ` : ''}
                {invoiceNumber ? `No: ${invoiceNumber} • ` : ''}
                {formatDateId(date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60 font-mono">
              {formatRupiah(amount)}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-2 border-b border-slate-100 bg-white flex items-center justify-between text-xs text-slate-600">
          <span className="font-mono text-[11px] text-slate-400 truncate max-w-[280px]">
            Berkas: {receiptFileName || 'Dokumen Nota / Kuitansi'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Perkecil"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono w-12 text-center text-slate-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Perbesar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <button
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors"
              title="Putar 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            {receiptUrl?.includes('drive.google.com') && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded font-medium transition-colors ml-1 border border-sky-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Drive</span>
              </a>
            )}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium transition-colors ml-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh</span>
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100/70 flex items-center justify-center min-h-[350px]">
          {receiptUrl ? (
            <div
              className="transition-transform duration-150 origin-center bg-white shadow-md rounded-lg overflow-hidden border border-slate-200 p-2"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={receiptUrl}
                alt="Bukti Nota / Invoice"
                className="max-h-[520px] max-w-full object-contain select-none"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <FileText className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Belum ada file nota yang diunggah</p>
              <p className="text-xs text-slate-400 mt-1">
                Silakan edit pengeluaran ini untuk melampirkan foto struk, nota, atau invoice.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-100 bg-white text-xs text-slate-500 flex items-center justify-between">
          <span>Verifikasi: Terlampir sah untuk keperluan pembukuan & audit pajak</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
