import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  User,
  CreditCard,
  MapPin,
  FileSpreadsheet,
  Edit2,
  Trash2,
  X,
  FileText,
} from 'lucide-react';
import { Vendor, VendorCategory } from '../types';
import { downloadCsv } from '../utils/formatters';

interface VendorsViewProps {
  vendors: Vendor[];
  onAddVendor: (vendor: Vendor) => void;
  onUpdateVendor: (vendor: Vendor) => void;
  onDeleteVendor: (id: string) => void;
  canEdit: boolean;
}

const VENDOR_CATEGORIES: VendorCategory[] = [
  'PBF Obat',
  'Distributor Alkes',
  'Vendor Lab',
  'Nutrisi & Gizi Medis',
  'Limbah B3',
  'Logistik & ATK',
  'Teknisi & Maintenance',
  'Utilitas & Lainnya',
];

export const VendorsView: React.FC<VendorsViewProps> = ({
  vendors,
  onAddVendor,
  onUpdateVendor,
  onDeleteVendor,
  canEdit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<VendorCategory>('PBF Obat');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [bankName, setBankName] = useState('Bank BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [npwp, setNpwp] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Filter vendors
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.notes && v.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setName('');
    setCategory('PBF Obat');
    setContactPerson('');
    setPhone('');
    setBankName('Bank BCA');
    setBankAccountNumber('');
    setBankAccountHolder('');
    setNpwp('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setName(vendor.name || '');
    setCategory(vendor.category || 'PBF / Obat-Obatan');
    setContactPerson(vendor.contactPerson || '');
    setPhone(vendor.phone || '');
    setBankName(vendor.bankName || '');
    setBankAccountNumber(vendor.bankAccountNumber || '');
    setBankAccountHolder(vendor.bankAccountHolder || '');
    setNpwp(vendor.npwp || '');
    setAddress(vendor.address || '');
    setNotes(vendor.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingVendor) {
      onUpdateVendor({
        ...editingVendor,
        name,
        category,
        contactPerson,
        phone,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        npwp,
        address,
        notes,
      });
    } else {
      const newVendor: Vendor = {
        id: `vnd-${Date.now()}`,
        name,
        category,
        contactPerson,
        phone,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        npwp,
        address,
        notes,
      };
      onAddVendor(newVendor);
    }
    setIsModalOpen(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'Nama Vendor / Perusahaan',
      'Kategori',
      'PIC (Kontak Person)',
      'No. Telepon / WhatsApp',
      'Bank',
      'No. Rekening',
      'Atas Nama Rekening',
      'NPWP',
      'Alamat',
      'Keterangan / Produk Suplai',
    ];
    const rows = filteredVendors.map((v) => [
      v.name,
      v.category,
      v.contactPerson,
      v.phone,
      v.bankName,
      v.bankAccountNumber,
      v.bankAccountHolder,
      v.npwp || '-',
      v.address || '-',
      v.notes || '-',
    ]);
    downloadCsv(`Daftar_Vendor_Klinik_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="w-6 h-6 text-teal-600" />
            Identitas Vendor & Suplier Klinik
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Tarik Excel / CSV
          </button>
          {canEdit && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Vendor
            </button>
          )}
        </div>
      </div>

      {/* KPI Stat Cards with Colors (Request 2, 4, 5) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-teal-50/90 p-4 rounded-2xl border-2 border-teal-300 shadow-xs">
          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Total Mitra Vendor</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-teal-950 font-mono">{vendors.length}</span>
            <span className="text-xs text-teal-800 font-bold">Perusahaan</span>
          </div>
          <span className="text-[10px] text-teal-700 mt-0.5 block font-medium">Rekanan terverifikasi</span>
        </div>

        <div className="bg-emerald-50/90 p-4 rounded-2xl border-2 border-emerald-300 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">PBF Farmasi (Obat)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-950 font-mono">
              {vendors.filter(v => v.category === 'PBF Obat').length}
            </span>
            <span className="text-xs text-emerald-800 font-bold">PBF</span>
          </div>
          <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">Suplai obat paten & generik</span>
        </div>

        <div className="bg-cyan-50/90 p-4 rounded-2xl border-2 border-cyan-300 shadow-xs">
          <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Distributor Alkes & HD</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-cyan-950 font-mono">
              {vendors.filter(v => v.category === 'Distributor Alkes').length}
            </span>
            <span className="text-xs text-cyan-800 font-bold">Distributor</span>
          </div>
          <span className="text-[10px] text-cyan-700 mt-0.5 block font-medium">Mesin & consumable dialisis</span>
        </div>

        <div className="bg-amber-50/90 p-4 rounded-2xl border-2 border-amber-300 shadow-xs">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Vendor Lab & Utilitas</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-amber-950 font-mono">
              {vendors.filter(v => v.category !== 'PBF Obat' && v.category !== 'Distributor Alkes').length}
            </span>
            <span className="text-xs text-amber-800 font-bold">Vendor</span>
          </div>
          <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">Lab rujukan, gas O2 & logistik</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama vendor, PIC, telepon, atau jenis suplai..."
            value={searchTerm || ''}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({vendors.length})
          </button>
          {VENDOR_CATEGORIES.map((cat) => {
            const count = vendors.filter((v) => v.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                  {vendor.category}
                </span>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(vendor)}
                      title="Ubah Vendor"
                      className="p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteVendor(vendor.id)}
                      title="Hapus Vendor"
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="font-bold text-sm text-slate-900 leading-snug mb-1">{vendor.name}</h3>

              {vendor.notes && (
                <p className="text-xs text-slate-500 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {vendor.notes}
                </p>
              )}

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">PIC: {vendor.contactPerson || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{vendor.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px]">
                    {vendor.bankName} - {vendor.bankAccountNumber || '-'}
                  </span>
                </div>
                {vendor.bankAccountHolder && (
                  <div className="text-[11px] text-slate-500 pl-5.5">
                    a/n {vendor.bankAccountHolder}
                  </div>
                )}
                {vendor.npwp && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>NPWP: {vendor.npwp}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-start gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{vendor.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-700">Tidak ada data vendor</h4>
          <p className="text-xs text-slate-400 mt-1">
            Belum ada vendor terdaftar untuk filter ini atau kata kunci pencarian.
          </p>
        </div>
      )}

      {/* Input / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-600" />
                {editingVendor ? 'Ubah Identitas Vendor' : 'Input Identitas Vendor Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Vendor / Perusahaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Enseval Putera Megatrading Tbk"
                  value={name || ''}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Vendor
                  </label>
                  <select
                    value={category || 'PBF / Obat-Obatan'}
                    onChange={(e) => setCategory(e.target.value as VendorCategory)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                  >
                    {VENDOR_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kontak Person (PIC)
                  </label>
                  <input
                    type="text"
                    placeholder="Nama Sales / Petugas"
                    value={contactPerson || ''}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx / (021) 460-xxxx"
                    value={phone || ''}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NPWP (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="01.xxx.xxx.x-xxx.xxx"
                    value={npwp || ''}
                    onChange={(e) => setNpwp(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                  Informasi Rekening Pembayaran
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Bank</label>
                    <input
                      type="text"
                      placeholder="BCA / Mandiri / BNI"
                      value={bankName || ''}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      No. Rekening
                    </label>
                    <input
                      type="text"
                      placeholder="Nomor rekening transfer"
                      value={bankAccountNumber || ''}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Atas Nama Rekening
                  </label>
                  <input
                    type="text"
                    placeholder="Nama pemilik rekening bank"
                    value={bankAccountHolder || ''}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Kantor / Gudang
                </label>
                <textarea
                  rows={2}
                  placeholder="Alamat fisik vendor..."
                  value={address || ''}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Produk Suplai
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Suplai cairan dialisat HD, jarum suntik, infus RL"
                  value={notes || ''}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
                >
                  {editingVendor ? 'Simpan Perubahan' : 'Simpan Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
