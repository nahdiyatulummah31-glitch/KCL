import React, { useState, useMemo, useRef } from 'react';
import {
  Boxes,
  Search,
  Filter,
  Plus,
  Wrench,
  Calendar,
  MapPin,
  User,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Download,
  Trash2,
  Edit2,
  Info,
  FileSpreadsheet,
  Upload,
  ArrowUpDown,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ClinicAsset, ClinicProfile, UserAccount, Vendor, AssetCondition, AssetCategory, normalizeToOfficialUnit } from '../types';
import { formatRupiah, downloadCsv } from '../utils/formatters';
import { DateRangeFilterBar, DateFilterState, matchDateFilter } from './DateRangeFilterBar';

interface InventoryViewProps {
  assets: ClinicAsset[];
  profile: ClinicProfile;
  activeUser: UserAccount;
  vendors?: Vendor[];
  onAddAsset: (asset: ClinicAsset) => void;
  onUpdateAsset: (asset: ClinicAsset) => void;
  onDeleteAsset: (id: string) => void;
}

export const CLINIC_UNITS = [
  'Semua Unit',
  'Pendaftaran',
  'IGD',
  'Farmasi',
  'Poli Spesialis',
  'Hemodialisa',
  'Poli Umum',
  'Poli CPMI',
  'Poli Vaksin',
  'Laboratorium',
  'Radiologi',
  'Kebersihan',
  'Laundry',
] as const;

export const ASSET_CATEGORIES: AssetCategory[] = [
  'Alat Medis Hemodialisa',
  'Alat Medis Poli / Lab',
  'Instalasi & Sarana (RO/Genset)',
  'Tabung Gas Medis (O2)',
  'Elektronik & Komputer Kasir',
  'Mebel & Fasilitas Pasien',
];

export const InventoryView: React.FC<InventoryViewProps> = ({
  assets,
  profile,
  activeUser,
  vendors = [],
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
}) => {
  const isManagerOrDirector =
    activeUser.role === 'super_admin' || activeUser.role === 'finance_manager';

  const [selectedUnit, setSelectedUnit] = useState<string>('Semua Unit');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'unit' | 'price' | 'date'>('code');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Date Filter State & Grouping View Mode (Requests 3 & 5)
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    mode: 'all',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    month: '2026-09',
    year: '2026',
  });
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editAsset, setEditAsset] = useState<ClinicAsset | null>(null);
  const [importStatusMsg, setImportStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    assetCode: `AST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    category: 'Alat Medis Hemodialisa' as AssetCategory,
    unit: 'Unit Hemodialisa (HD)',
    quantity: '1',
    unitPrice: '',
    purchasePrice: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    vendorName: vendors[0]?.name || 'PT Sinar Roda Utama',
    location: 'Ruang Hemodialisa',
    condition: 'Baik' as AssetCondition,
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    personInCharge: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');

  // Handle Qty or Unit Price changes to auto-compute total purchasePrice
  const handleQtyChange = (qtyStr: string) => {
    const q = parseInt(qtyStr) || 1;
    const p = parseFloat(formData.unitPrice) || 0;
    setFormData((prev) => ({
      ...prev,
      quantity: qtyStr,
      purchasePrice: p > 0 ? (q * p).toString() : prev.purchasePrice,
    }));
  };

  const handleUnitPriceChange = (unitPriceStr: string) => {
    const q = parseInt(formData.quantity) || 1;
    const p = parseFloat(unitPriceStr) || 0;
    setFormData((prev) => ({
      ...prev,
      unitPrice: unitPriceStr,
      purchasePrice: (q * p).toString(),
    }));
  };

  // Filtered & Sorted Assets
  const filtered = useMemo(() => {
    const list = assets.filter((a) => {
      const assetUnit = normalizeToOfficialUnit(a.unit);
      const matchUnit = selectedUnit === 'Semua Unit' || assetUnit === selectedUnit || a.unit === selectedUnit;
      const matchSearch =
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.personInCharge && a.personInCharge.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = categoryFilter === 'all' || a.category === categoryFilter;
      const matchCond = conditionFilter === 'all' || a.condition === conditionFilter;
      const matchDate = matchDateFilter(a.purchaseDate, dateFilter);
      return matchUnit && matchSearch && matchCat && matchCond && matchDate;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'code') cmp = a.assetCode.localeCompare(b.assetCode);
      else if (sortBy === 'unit') cmp = (a.unit || '').localeCompare(b.unit || '');
      else if (sortBy === 'price') cmp = a.purchasePrice - b.purchasePrice;
      else if (sortBy === 'date') cmp = a.purchaseDate.localeCompare(b.purchaseDate);
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [assets, selectedUnit, searchTerm, categoryFilter, conditionFilter, dateFilter, sortBy, sortAsc]);

  // Grouped by Unit Array for per-unit display (Request 5)
  const groupedByUnit = useMemo(() => {
    const unitsToDisplay = selectedUnit === 'Semua Unit'
      ? CLINIC_UNITS.filter((u) => u !== 'Semua Unit')
      : [selectedUnit];

    return unitsToDisplay
      .map((unitName) => {
        const items = filtered.filter((a) => normalizeToOfficialUnit(a.unit) === unitName);
        const totalVal = items.reduce((sum, a) => sum + a.purchasePrice, 0);
        const totalQty = items.reduce((sum, a) => sum + (a.quantity || 1), 0);
        const goodCount = items.filter((a) => a.condition === 'Baik').length;
        const alertCount = items.filter((a) => a.condition !== 'Baik').length;
        return {
          unitName,
          items,
          totalVal,
          totalQty,
          goodCount,
          alertCount,
        };
      })
      .filter((g) => g.items.length > 0 || selectedUnit !== 'Semua Unit');
  }, [filtered, selectedUnit]);

  // Aggregate Metrics for Active Filter
  const totalItemsCount = useMemo(() => filtered.length, [filtered]);
  const totalQtyCount = useMemo(() => filtered.reduce((sum, a) => sum + (a.quantity || 1), 0), [filtered]);
  const totalAssetValue = useMemo(() => filtered.reduce((sum, a) => sum + a.purchasePrice, 0), [filtered]);
  const primeConditionCount = useMemo(() => filtered.filter((a) => a.condition === 'Baik').length, [filtered]);
  const maintenanceCount = useMemo(() => filtered.filter((a) => a.condition === 'Perlu Servis').length, [filtered]);
  const brokenCount = useMemo(() => filtered.filter((a) => a.condition === 'Rusak').length, [filtered]);

  // Unit breakdown stats for quick cards
  const unitStats = useMemo(() => {
    return CLINIC_UNITS.filter((u) => u !== 'Semua Unit').map((unitName) => {
      const unitAssets = assets.filter((a) => normalizeToOfficialUnit(a.unit) === unitName);
      const val = unitAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
      const qty = unitAssets.reduce((sum, a) => sum + (a.quantity || 1), 0);
      const needServis = unitAssets.filter((a) => a.condition === 'Perlu Servis').length;
      return {
        unitName,
        count: unitAssets.length,
        qty,
        val,
        needServis,
      };
    });
  }, [assets]);

  // Handle Export to Native Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = filtered.map((a, idx) => ({
      'No': idx + 1,
      'Kode Aset': a.assetCode,
      'Nama Inventaris / Alat Medis': a.name,
      'Unit Kerja': a.unit || 'Unit Hemodialisa (HD)',
      'Kategori': a.category,
      'Qty': a.quantity || 1,
      'Nilai Satuan (Rp)': a.unitPrice || Math.round(a.purchasePrice / (a.quantity || 1)),
      'Total Nilai Perolehan (Rp)': a.purchasePrice,
      'Kondisi': a.condition,
      'Ruang / Lokasi': a.location,
      'No. Seri (SN)': a.serialNumber || '-',
      'Tgl Pengadaan': a.purchaseDate,
      'Vendor Suplier': a.vendorName || '-',
      'Penanggung Jawab': a.personInCharge,
      'Servis Terakhir': a.lastMaintenanceDate || '-',
      'Jadwal Servis Berikutnya': a.nextMaintenanceDate || '-',
      'Catatan Teknis': a.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    // Set auto column width
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 15 }, // Kode
      { wch: 35 }, // Nama
      { wch: 25 }, // Unit
      { wch: 22 }, // Kategori
      { wch: 8 },  // Qty
      { wch: 16 }, // Harga Satuan
      { wch: 18 }, // Total
      { wch: 14 }, // Kondisi
      { wch: 22 }, // Lokasi
      { wch: 18 }, // SN
      { wch: 12 }, // Tgl
      { wch: 25 }, // Vendor
      { wch: 22 }, // PJ
      { wch: 14 }, // Servis
      { wch: 14 }, // Servis Berikutnya
      { wch: 30 }, // Catatan
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaris Per Unit');

    const unitSuffix = selectedUnit === 'Semua Unit' ? 'Semua_Unit' : selectedUnit.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Inventaris_Klinik_${unitSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Handle Download Sample Excel Template
  const handleDownloadSampleExcel = () => {
    const sampleRows = [
      {
        'Kode Aset': 'AST-HD-010',
        'Nama Inventaris / Alat': 'Tensimeter Aneroid Mobile Stand Unit HD',
        'Unit Kerja': 'Unit Hemodialisa (HD)',
        'Kategori': 'Alat Medis Hemodialisa',
        'Qty': 2,
        'Harga Satuan (Rp)': 1250000,
        'Total Nilai (Rp)': 2500000,
        'Kondisi (Baik/Perlu Servis/Rusak)': 'Baik',
        'Lokasi Ruangan': 'Ruang Hemodialisa Bed 03-04',
        'No Seri (SN)': 'TNS-HD-99',
        'Tanggal Beli (YYYY-MM-DD)': '2025-04-10',
        'Vendor': 'PT Sakha Anugrah Bersama',
        'Penanggung Jawab': 'Ns. Ratna, S.Kep',
        'Catatan': 'Kalibrasi tahunan presisi tensi',
      },
      {
        'Kode Aset': 'AST-FAR-005',
        'Nama Inventaris / Alat': 'Timbangan Digital Presisi Farmasi 0.01g',
        'Unit Kerja': 'Unit Instalasi Farmasi',
        'Kategori': 'Alat Medis Poli / Lab',
        'Qty': 1,
        'Harga Satuan (Rp)': 3400000,
        'Total Nilai (Rp)': 3400000,
        'Kondisi (Baik/Perlu Servis/Rusak)': 'Baik',
        'Lokasi Ruangan': 'Depo Racik Farmasi',
        'No Seri (SN)': 'DIG-WGH-441',
        'Tanggal Beli (YYYY-MM-DD)': '2025-02-15',
        'Vendor': 'PT Bersama Kita Melangkah',
        'Penanggung Jawab': 'Apt. Dewi Lestari, S.Farm',
        'Catatan': 'Peneraan tera metrologi resmi',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 35 },
      { wch: 25 },
      { wch: 22 },
      { wch: 8 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 14 },
      { wch: 25 },
      { wch: 22 },
      { wch: 28 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format Import Inventaris');
    XLSX.writeFile(workbook, 'Template_Import_Inventaris_Klinik.xlsx');
  };

  // Handle Excel File Upload / Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          setImportStatusMsg({ type: 'error', text: 'File Excel kosong atau format tidak sesuai.' });
          return;
        }

        // Header detection
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const rowStr = (rows[i] || []).join(' ').toLowerCase();
          if (rowStr.includes('nama') || rowStr.includes('kode') || rowStr.includes('inventaris') || rowStr.includes('aset')) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) headerRowIndex = 0;
        const headers = rows[headerRowIndex].map((h: any) => String(h || '').trim().toLowerCase());

        let importedCount = 0;
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === '')) continue;

          let name = '';
          let code = '';
          let unit = 'Unit Hemodialisa (HD)';
          let category: AssetCategory = 'Alat Medis Hemodialisa';
          let qty = 1;
          let price = 0;
          let condition: AssetCondition = 'Baik';
          let location = 'Klinik';
          let personInCharge = activeUser.name;
          let notes = '';

          headers.forEach((h: string, colIdx: number) => {
            const val = row[colIdx];
            if (val === undefined || val === null) return;
            const strVal = String(val).trim();

            if (h.includes('kode')) code = strVal;
            else if (h.includes('nama') || h.includes('barang') || h.includes('inventaris')) name = strVal;
            else if (h.includes('unit')) unit = strVal;
            else if (h.includes('kategori')) {
              if (strVal.includes('Lab') || strVal.includes('Poli')) category = 'Alat Medis Poli / Lab';
              else if (strVal.includes('RO') || strVal.includes('Genset') || strVal.includes('Sarana')) category = 'Instalasi & Sarana (RO/Genset)';
              else if (strVal.includes('Oksigen') || strVal.includes('O2')) category = 'Tabung Gas Medis (O2)';
              else if (strVal.includes('Kasir') || strVal.includes('Komputer')) category = 'Elektronik & Komputer Kasir';
              else if (strVal.includes('Mebel') || strVal.includes('Bed')) category = 'Mebel & Fasilitas Pasien';
            } else if (h.includes('qty') || h.includes('jumlah')) {
              qty = parseInt(strVal) || 1;
            } else if (h.includes('total') || h.includes('harga') || h.includes('nilai')) {
              price = parseFloat(strVal.replace(/[^0-9.]/g, '')) || 0;
            } else if (h.includes('kondisi')) {
              if (strVal.toLowerCase().includes('rusak')) condition = 'Rusak';
              else if (strVal.toLowerCase().includes('servis')) condition = 'Perlu Servis';
              else condition = 'Baik';
            } else if (h.includes('lokasi') || h.includes('ruang')) {
              location = strVal;
            } else if (h.includes('penanggung') || h.includes('pj')) {
              personInCharge = strVal;
            } else if (h.includes('catatan') || h.includes('ket')) {
              notes = strVal;
            }
          });

          if (name) {
            const newAsset: ClinicAsset = {
              id: `ast-imp-${Date.now()}-${i}`,
              assetCode: code || `AST-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
              name,
              category,
              unit,
              quantity: qty,
              unitPrice: price > 0 ? Math.round(price / qty) : 0,
              purchasePrice: price,
              purchaseDate: new Date().toISOString().slice(0, 10),
              location,
              condition,
              personInCharge,
              notes,
              createdBy: activeUser.name,
              createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            };
            onAddAsset(newAsset);
            importedCount++;
          }
        }

        setImportStatusMsg({
          type: 'success',
          text: `Berhasil mengimpor ${importedCount} data inventaris aset dari file Excel!`,
        });
      } catch (err: any) {
        setImportStatusMsg({ type: 'error', text: `Gagal membaca Excel: ${err?.message || 'File tidak valid'}` });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // Quick Inline Condition Toggle
  const handleQuickConditionChange = (asset: ClinicAsset, newCond: AssetCondition) => {
    onUpdateAsset({
      ...asset,
      condition: newCond,
    });
  };

  // Submit Handler for Add / Edit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Nama barang / alat inventaris wajib diisi!');
      return;
    }
    if (!formData.assetCode.trim()) {
      setFormError('Kode aset inventaris wajib diisi!');
      return;
    }
    const qtyVal = parseInt(formData.quantity) || 1;
    const priceVal = parseFloat(formData.purchasePrice) || 0;
    const unitPriceVal = parseFloat(formData.unitPrice) || (priceVal > 0 ? Math.round(priceVal / qtyVal) : 0);

    const newAsset: ClinicAsset = {
      id: editAsset ? editAsset.id : `ast-${Date.now()}`,
      assetCode: formData.assetCode.trim(),
      name: formData.name.trim(),
      category: formData.category,
      unit: formData.unit,
      quantity: qtyVal,
      unitPrice: unitPriceVal,
      serialNumber: formData.serialNumber.trim(),
      purchaseDate: formData.purchaseDate,
      purchasePrice: priceVal > 0 ? priceVal : qtyVal * unitPriceVal,
      vendorName: formData.vendorName.trim(),
      location: formData.location.trim(),
      condition: formData.condition,
      lastMaintenanceDate: formData.lastMaintenanceDate,
      nextMaintenanceDate: formData.nextMaintenanceDate,
      personInCharge: formData.personInCharge.trim(),
      notes: formData.notes.trim(),
      createdBy: activeUser.name,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    if (editAsset) {
      onUpdateAsset(newAsset);
    } else {
      onAddAsset(newAsset);
    }

    setShowAddModal(false);
    setEditAsset(null);
    setFormData({
      assetCode: `AST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: 'Alat Medis Hemodialisa',
      unit: selectedUnit !== 'Semua Unit' ? selectedUnit : 'Unit Hemodialisa (HD)',
      quantity: '1',
      unitPrice: '',
      purchasePrice: '',
      serialNumber: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      vendorName: vendors[0]?.name || 'PT Sinar Roda Utama',
      location: 'Ruang Hemodialisa',
      condition: 'Baik',
      lastMaintenanceDate: '',
      nextMaintenanceDate: '',
      personInCharge: '',
      notes: '',
    });
  };

  const handleOpenEdit = (asset: ClinicAsset) => {
    setEditAsset(asset);
    const q = asset.quantity || 1;
    const up = asset.unitPrice || Math.round(asset.purchasePrice / q);
    setFormData({
      assetCode: asset.assetCode,
      name: asset.name,
      category: asset.category,
      unit: asset.unit || 'Unit Hemodialisa (HD)',
      quantity: q.toString(),
      unitPrice: up.toString(),
      purchasePrice: asset.purchasePrice.toString(),
      serialNumber: asset.serialNumber || '',
      purchaseDate: asset.purchaseDate,
      vendorName: asset.vendorName || vendors[0]?.name || '',
      location: asset.location,
      condition: asset.condition,
      lastMaintenanceDate: asset.lastMaintenanceDate || '',
      nextMaintenanceDate: asset.nextMaintenanceDate || '',
      personInCharge: asset.personInCharge,
      notes: asset.notes || '',
    });
    setShowAddModal(true);
  };

  const handleToggleSort = (column: 'name' | 'code' | 'unit' | 'price' | 'date') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Inventaris & Monitoring Aset Per Unit
              </h2>
            </div>
          </div>
        </div>

        {/* Action Buttons: Import, Export, Add */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <button
            onClick={handleDownloadSampleExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            title="Download Template Format Excel untuk Mengisi Data Inventaris"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Template Excel</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            title="Import data inventaris dari spreadsheet Excel (.xlsx)"
          >
            <Upload className="w-4 h-4 text-teal-600" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            title="Download data tabel inventaris dalam format Excel asli (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export .xlsx</span>
          </button>

          <button
            onClick={() => {
              setEditAsset(null);
              setFormData({
                assetCode: `AST-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                name: '',
                category: 'Alat Medis Hemodialisa',
                unit: selectedUnit !== 'Semua Unit' ? selectedUnit : 'Unit Hemodialisa (HD)',
                quantity: '1',
                unitPrice: '',
                purchasePrice: '',
                serialNumber: '',
                purchaseDate: new Date().toISOString().slice(0, 10),
                vendorName: vendors[0]?.name || 'PT Sinar Roda Utama',
                location: 'Ruang Hemodialisa',
                condition: 'Baik',
                lastMaintenanceDate: '',
                nextMaintenanceDate: '',
                personInCharge: '',
                notes: '',
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Inventaris</span>
          </button>
        </div>
      </div>

      {/* Notification banner for Excel import */}
      {importStatusMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            importStatusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{importStatusMsg.text}</span>
          </div>
          <button
            onClick={() => setImportStatusMsg(null)}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* UNIT FILTER TABS (Monitoring Per Unit) */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
          <span>Pilih Unit Kerja untuk Monitoring Fokus:</span>
          <span className="text-teal-700 font-mono lowercase">unit aktif: {selectedUnit}</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CLINIC_UNITS.map((unit) => {
            const isActive = selectedUnit === unit;
            const unitItemCount =
              unit === 'Semua Unit'
                ? assets.length
                : assets.filter((a) => (a.unit || 'Unit Hemodialisa (HD)') === unit).length;

            return (
              <button
                key={unit}
                onClick={() => setSelectedUnit(unit)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2 ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-sm shadow-teal-900/10'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{unit}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-teal-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {unitItemCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Universal Date Filter Component (Request 3) */}
      <DateRangeFilterBar
        filter={dateFilter}
        onChange={setDateFilter}
        label="Filter Tanggal Pengadaan Aset"
      />

      {/* KPI Cards for the Selected Unit Filter - WITH COLOR FRAMES AS REQUESTED (Request 2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Total Jenis & Qty: BIRU CERAH PASTEL */}
        <div className="bg-sky-50/80 p-4 rounded-2xl border-2 border-sky-300 shadow-xs hover:border-sky-400 transition-colors">
          <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">
            Total Jenis & Qty
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-950 font-mono">{totalItemsCount}</span>
            <span className="text-xs font-bold text-sky-800">Item ({totalQtyCount} Fisik)</span>
          </div>
          <span className="text-[10px] text-sky-700/80 mt-1 block font-medium">Aset terdaftar di {selectedUnit}</span>
        </div>

        {/* Nilai Perolehan: HIJAU CERAH EMERALD */}
        <div className="bg-emerald-50/80 p-4 rounded-2xl border-2 border-emerald-400 shadow-xs hover:border-emerald-500 transition-colors">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Nilai Perolehan Aset
          </span>
          <p className="text-xl font-black text-emerald-950 font-mono mt-1">
            {formatRupiah(totalAssetValue)}
          </p>
          <span className="text-[10px] text-emerald-700/80 mt-1 block font-medium">Total investasi barang di unit</span>
        </div>

        {/* Kondisi Prima: TEAL PASTEL */}
        <div className="bg-teal-50/80 p-4 rounded-2xl border-2 border-teal-300 shadow-xs hover:border-teal-400 transition-colors">
          <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
            Kondisi Prima (Baik)
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-950 font-mono">{primeConditionCount}</span>
            <span className="text-xs font-bold text-teal-800">Unit Siap Operasi</span>
          </div>
          <span className="text-[10px] text-teal-700/80 mt-1 block font-medium">
            {totalItemsCount > 0 ? Math.round((primeConditionCount / totalItemsCount) * 100) : 0}% layak pakai penuh
          </span>
        </div>

        {/* Perlu Servis & Kalibrasi: AMBER/ORANGE PASTEL */}
        <div className="bg-amber-50/80 p-4 rounded-2xl border-2 border-amber-300 shadow-xs hover:border-amber-400 transition-colors">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Perlu Servis & Kalibrasi
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950 font-mono">{maintenanceCount}</span>
            <span className="text-xs font-bold text-amber-800">Alat Butuh Perhatian</span>
          </div>
          <span className="text-[10px] text-amber-700/80 mt-1 block font-medium">
            {brokenCount > 0 ? `${brokenCount} alat rusak/afkir` : 'Tidak ada alat rusak total'}
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR + GROUP VIEW SWITCHER (Request 5) */}
      <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode aset, nama alat, lokasi, penanggung jawab..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Tampilan Per Unit Switcher (Request 5) */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kelompokkan inventaris berdasarkan Unit Kerja"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dikelompokkan Per Unit</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Lihat semua data dalam satu tabel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Tabel Tunggal</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">Semua Kategori</option>
              {ASSET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Kondisi:</span>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">Semua Kondisi</option>
              <option value="Baik">Baik (Operasional)</option>
              <option value="Perlu Servis">Perlu Servis</option>
              <option value="Rusak">Rusak</option>
            </select>
          </div>
        </div>
      </div>

      {/* DISPLAY: GROUPED PER UNIT (Request 5) OR SINGLE TABLE */}
      {viewMode === 'grouped' ? (
        <div className="space-y-6">
          {groupedByUnit.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border-2 border-slate-200 text-center text-slate-400">
              Tidak ada data inventaris yang sesuai dengan filter pencarian dan tanggal ini.
            </div>
          ) : (
            groupedByUnit.map((group) => (
              <div
                key={group.unitName}
                className="bg-white rounded-2xl border-2 border-teal-200 shadow-xs overflow-hidden"
              >
                {/* Header Unit Kerja dengan Warna Pastel */}
                <div className="px-4 py-3 bg-gradient-to-r from-teal-50/90 via-teal-50/40 to-white border-b-2 border-teal-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-teal-700 text-white rounded-xl shadow-xs">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">
                          {group.unitName}
                        </h3>
                        <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300">
                          {group.items.length} Item ({group.totalQty} Unit Fisik)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Kondisi Operasional: <strong className="text-emerald-700 font-bold">{group.goodCount} Baik</strong>{' '}
                        {group.alertCount > 0 ? (
                          <span className="text-amber-700 font-bold ml-1.5">• {group.alertCount} Perlu Servis/Rusak</span>
                        ) : (
                          <span className="text-slate-400 font-medium ml-1.5">• Semua unit optimal</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Subtotal Nilai Aset Unit
                    </span>
                    <span className="text-base font-black text-teal-900 font-mono">
                      {formatRupiah(group.totalVal)}
                    </span>
                  </div>
                </div>

                {/* Table for this Unit */}
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-300 select-none">
                      <tr>
                        <th className="py-2 px-3 text-center border-r border-slate-200 w-10 bg-slate-100">#</th>
                        <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Kode Aset</th>
                        <th className="py-2 px-3 border-r border-slate-200 min-w-[200px]">Nama Peralatan / Inventaris</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-center w-12">Qty</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-right whitespace-nowrap">Total Nilai (Rp)</th>
                        <th className="py-2 px-3 border-r border-slate-200 text-center min-w-[110px]">Kondisi</th>
                        <th className="py-2 px-3 border-r border-slate-200 min-w-[120px]">Ruang / Lokasi</th>
                        <th className="py-2 px-3 border-r border-slate-200 min-w-[130px]">Penanggung Jawab</th>
                        <th className="py-2 px-3 border-r border-slate-200 min-w-[100px]">Servis Berikutnya</th>
                        <th className="py-2 px-3 text-center w-16">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {group.items.map((item, index) => {
                        const qty = item.quantity || 1;
                        const unitPrice = item.unitPrice || Math.round(item.purchasePrice / qty);

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-teal-50/40 transition-colors group border-b border-slate-100"
                          >
                            <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400 font-mono text-[11px] bg-slate-50/50">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {item.assetCode}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200">
                              <div className="font-semibold text-slate-900 leading-snug">{item.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-slate-500">{item.category}</span>
                                {item.serialNumber && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    • SN: {item.serialNumber}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center font-bold font-mono text-slate-800">
                              {qty}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              <div>{formatRupiah(item.purchasePrice)}</div>
                              {qty > 1 && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  @{formatRupiah(unitPrice)}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center">
                              <select
                                value={item.condition}
                                onChange={(e) =>
                                  handleQuickConditionChange(item, e.target.value as AssetCondition)
                                }
                                className={`text-[10px] font-bold py-1 px-2 rounded-lg border focus:ring-1 focus:ring-teal-500 cursor-pointer ${
                                  item.condition === 'Baik'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : item.condition === 'Perlu Servis'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                <option value="Baik">Baik</option>
                                <option value="Perlu Servis">Perlu Servis</option>
                                <option value="Rusak">Rusak</option>
                              </select>
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                              <div className="font-medium truncate max-w-[140px]">{item.location}</div>
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                              <div className="font-medium truncate max-w-[130px]">{item.personInCharge}</div>
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {item.nextMaintenanceDate || '-'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title="Edit Data Inventaris"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {isManagerOrDirector && (
                                  <button
                                    onClick={() => onDeleteAsset(item.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Hapus Aset"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200 text-xs">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right uppercase tracking-wider text-[11px] text-slate-600">
                          Subtotal {group.unitName}:
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-black text-teal-800">
                          {group.totalQty}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-teal-900">
                          {formatRupiah(group.totalVal)}
                        </td>
                        <td colSpan={5} className="py-2 px-3 text-slate-400 text-[11px] font-normal italic">
                          {group.goodCount} Unit Siap Operasi | {group.alertCount} Unit Perlu Atensi
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* SINGLE UNIFIED TABLE VIEW */
        <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Boxes className="w-4 h-4 text-teal-600" />
              <span>Tabel Monitoring Inventaris Aset: <strong className="text-slate-900">{selectedUnit}</strong></span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {filtered.length} baris data ditemukan | Klik header kolom untuk mengurutkan
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-300 select-none">
                <tr>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200 w-12 bg-slate-100">#</th>
                  <th
                    onClick={() => handleToggleSort('code')}
                    className="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Kode Aset</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort('name')}
                    className="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors min-w-[200px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Peralatan / Inventaris</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleToggleSort('unit')}
                    className="py-2.5 px-3 border-r border-slate-200 cursor-pointer hover:bg-slate-200/80 transition-colors min-w-[150px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Unit Kerja</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-200 text-center w-14">Qty</th>
                  <th
                    onClick={() => handleToggleSort('price')}
                    className="py-2.5 px-3 border-r border-slate-200 text-right cursor-pointer hover:bg-slate-200/80 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Nilai (Rp)</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-200 text-center min-w-[110px]">Kondisi Fisik</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">Ruang / Lokasi</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[140px]">Penanggung Jawab (PJ)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[110px]">Jadwal Servis</th>
                  <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Tidak ada data inventaris pada unit ini yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, index) => {
                    const qty = item.quantity || 1;
                    const unitPrice = item.unitPrice || Math.round(item.purchasePrice / qty);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-teal-50/40 transition-colors group border-b border-slate-100"
                      >
                        <td className="py-2 px-3 text-center border-r border-slate-200 text-slate-400 font-mono text-[11px] bg-slate-50/50">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {item.assetCode}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="font-semibold text-slate-900 leading-snug">{item.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500">{item.category}</span>
                            {item.serialNumber && (
                              <span className="text-[10px] font-mono text-slate-400">
                                • SN: {item.serialNumber}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {item.unit || 'Unit Hemodialisa (HD)'}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center font-bold font-mono text-slate-800">
                          {qty}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          <div>{formatRupiah(item.purchasePrice)}</div>
                          {qty > 1 && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              @{formatRupiah(unitPrice)}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-center">
                          <select
                            value={item.condition}
                            onChange={(e) =>
                              handleQuickConditionChange(item, e.target.value as AssetCondition)
                            }
                            className={`text-[10px] font-bold py-1 px-2 rounded-lg border focus:ring-1 focus:ring-teal-500 cursor-pointer ${
                              item.condition === 'Baik'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : item.condition === 'Perlu Servis'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="Baik">Baik</option>
                            <option value="Perlu Servis">Perlu Servis</option>
                            <option value="Rusak">Rusak</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                          <div className="font-medium truncate max-w-[150px]">{item.location}</div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-700">
                          <div className="font-medium truncate max-w-[140px]">{item.personInCharge}</div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {item.nextMaintenanceDate || '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Edit Data Inventaris"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isManagerOrDirector && (
                              <button
                                onClick={() => onDeleteAsset(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Hapus Aset"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-10 text-xs">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 uppercase tracking-wider text-slate-700">
                    TOTAL REKAP MONITORING ({selectedUnit.toUpperCase()})
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-teal-800">
                    {totalQtyCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-teal-900 text-sm whitespace-nowrap">
                    {formatRupiah(totalAssetValue)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700">
                    {primeConditionCount} Baik | {maintenanceCount} Servis
                  </td>
                  <td colSpan={4} className="py-2.5 px-3 text-slate-500 text-[11px] font-normal italic">
                    *Nilai perolehan berdasarkan bukti pengadaan sah klinik
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT INVENTARIS */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editAsset ? 'Edit Data Inventaris Aset' : 'Tambah Inventaris Unit Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lengkapi rincian peralatan untuk monitoring terintegrasi klinik.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditAsset(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Aset Inventaris *
                  </label>
                  <input
                    type="text"
                    value={formData.assetCode}
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500"
                    placeholder="Contoh: AST-HD-001"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit Kerja Penempatan *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    {CLINIC_UNITS.filter((u) => u !== 'Semua Unit').map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Peralatan / Alat Medis / Inventaris *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  placeholder="Contoh: Mesin Hemodialisis Nipro Surdial 55 Plus"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori Aset
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as AssetCategory })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    {ASSET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor Seri (Serial Number / SN)
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500"
                    placeholder="Contoh: NP-SD55-882190"
                  />
                </div>
              </div>

              {/* Price & Quantity Breakdown */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jumlah / Qty *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleQtyChange(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-teal-500 bg-white"
                    placeholder="Rp Satuan"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-teal-800 mb-1">
                    Total Nilai (Rp) *
                  </label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full p-2 border border-teal-300 rounded-lg font-mono font-bold text-teal-900 bg-teal-50/50 focus:ring-1 focus:ring-teal-500"
                    placeholder="Total Pengadaan"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ruang / Penempatan Spesifik *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                    placeholder="Contoh: Ruang Hemodialisa Bed 01"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Penanggung Jawab (PJ) Ruangan *
                  </label>
                  <input
                    type="text"
                    value={formData.personInCharge}
                    onChange={(e) => setFormData({ ...formData, personInCharge: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                    placeholder="Contoh: Ns. Ratna, S.Kep (Karu HD)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kondisi Fisik</label>
                  <select
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({ ...formData, condition: e.target.value as AssetCondition })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="Baik">Baik (Normal)</option>
                    <option value="Perlu Servis">Perlu Servis</option>
                    <option value="Rusak">Rusak</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Pengadaan</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jadwal Servis / Kalibrasi
                  </label>
                  <input
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={(e) =>
                      setFormData({ ...formData, nextMaintenanceDate: e.target.value })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Teknis / Pemeliharaan
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-teal-500"
                  placeholder="Informasi garansi, nomor sertifikat kalibrasi BPFK, atau spesifikasi khusus..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditAsset(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  {editAsset ? 'Simpan Perubahan' : 'Tambahkan ke Inventaris'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
