import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink, X, MessageSquare } from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  recipientNote?: string;
  content: string;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  title,
  recipientNote = 'Pimpinan / Manajemen Keuangan',
  content,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(content);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-800/80 rounded-xl text-white">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-emerald-100">
                Format teks rapi siap dibagikan ke WhatsApp {recipientNote}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body / Text Preview */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              Preview Teks WhatsApp:
            </span>
            <span className="text-[11px] text-slate-400">
              {content.length} karakter
            </span>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[360px] border border-slate-800 selection:bg-emerald-900">
              {content}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Salin teks untuk ditempelkan ke chat WA, atau klik buka WhatsApp langsung.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka di WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
