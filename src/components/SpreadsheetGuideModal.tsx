import React from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  Cloud,
  Download,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Layers,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface SpreadsheetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectGoogle?: () => void;
  isGoogleConnected?: boolean;
}

export const SpreadsheetGuideModal: React.FC<SpreadsheetGuideModalProps> = ({
  isOpen,
  onClose,
  onConnectGoogle,
  isGoogleConnected = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Panduan Menghubungkan Database ke Spreadsheet (Google Sheets & Excel)
              </h3>
              <p className="text-xs text-slate-500">
                3 cara praktis dan otomatis agar seluruh data transaksi klinik masuk ke Google Spreadsheet.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 text-base cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 3 Methods */}
        <div className="space-y-4 text-xs text-slate-700">
          {/* Cara 1: Otomatis via Tombol Google Workspace */}
          <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h4 className="font-bold text-sm text-emerald-950">
                  Cara Otomatis: Sinkronisasi Google Sheets (Realtime Cloud)
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Direkomendasikan ⭐
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Aplikasi ini sudah dilengkapi modul <strong>Google Workspace Integration</strong> dengan kapasitas hingga <strong>10.000.000 sel</strong> dan sistem <em>Auto-Rollover</em> otomatis per volume.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
              <li>Lihat di pojok kanan atas layar (atau menu <strong>Pengaturan Klinik</strong>).</li>
              <li>Klik tombol <strong>"Hubungkan Google Workspace"</strong> atau ikon Google Drive.</li>
              <li>Login dengan akun Google (Gmail) yang Anda kehendaki.</li>
              <li>Sistem akan otomatis membuat file Spreadsheet resmi di Google Drive Anda (Volume 1, Volume 2, dst) dan memperbarui setiap data transaksi kas, pasien SIMRS, dan pengeluaran secara realtime!</li>
            </ol>
            {onConnectGoogle && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onConnectGoogle();
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Cloud className="w-4 h-4" />
                  <span>{isGoogleConnected ? 'Database Sudah Terhubung (Cek Status)' : 'Klik Untuk Hubungkan Akun Google Sekarang'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Cara 2: Export Excel (.xlsx) / CSV Langsung dari Menu */}
          <div className="p-4 rounded-xl border-2 border-teal-300 bg-teal-50/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h4 className="font-bold text-sm text-teal-950">
                Cara Cepat: Tarik File Excel (.xlsx) / CSV di Setiap Menu
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Jika Anda ingin membuka data di laptop, membuat rumus manual, atau mengunggah manual ke Google Spreadsheet:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
              <li>Di setiap menu (<strong>Rekap SIMRS</strong>, <strong>Arus Kas</strong>, <strong>Pengeluaran & Nota</strong>, <strong>Inventaris Aset</strong>, <strong>Gaji Karyawan</strong>, dan <strong>Laporan Keuangan</strong>), terdapat tombol hijau <strong>"Export Excel / CSV"</strong>.</li>
              <li>Klik tombol tersebut untuk mengunduh rekapitulasi data dalam hitungan detik.</li>
              <li>Buka <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-teal-700 underline font-semibold">sheets.google.com</a>, pilih <em>File &rarr; Impor &rarr; Upload</em>, dan pilih file yang baru saja diunduh.</li>
            </ul>
          </div>

          {/* Cara 3: Import File dari SIMRS */}
          <div className="p-4 rounded-xl border-2 border-blue-300 bg-blue-50/50 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h4 className="font-bold text-sm text-blue-950">
                Alur Sebaliknya: Masukkan Data Excel dari SIMRS ke Aplikasi Ini
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bila Anda menarik laporan kasir dari SIM RS dalam format Excel (.xlsx / .csv):
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
              <li>Masuk ke menu <strong>Rekap Kasir SIMRS</strong>.</li>
              <li>Klik area <strong>"Unggah File Excel Kasir SIMRS"</strong>.</li>
              <li>Aplikasi akan membaca seluruh baris billing pasien, dokter, obat, lab, tindakan, dan memisahkannya ke Kas Tunai, Bank Transfer, QRIS, dan Klaim BPJS secara otomatis!</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
