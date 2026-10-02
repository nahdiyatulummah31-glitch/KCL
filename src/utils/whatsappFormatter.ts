import {
  ClinicProfile,
  DailyCashReconciliation,
  DenominationBreakdown,
  ExpenseEntry,
  SimrsTransaction,
  UserAccount,
} from '../types';
import { formatRupiah, formatDateId } from './formatters';

interface DailyCashWhatsAppParams {
  profile: ClinicProfile;
  date: string;
  shift: string;
  cashierName: string;
  startingCash: number;
  startingTransfer: number;
  cashIn: number;
  transferIn: number;
  totalIn: number;
  cashOut: number;
  transferOut: number;
  totalOut: number;
  finalCashBalance: number;
  finalTransferBalance: number;
  totalFinalBalance: number;
  physicalCashBalance: number;
  difference: number;
  reconciliationStatus: 'balanced' | 'surplus' | 'shortage';
  denominations?: DenominationBreakdown;
  notes: string;
  routineExpensesSummary?: {
    snackDpjp: number;
    airHd: number;
    oksigen: number;
    airGalon: number;
    danaKebersihan: number; // Alat & Bahan Kebersihan
    makanPasienHd: number;
    lainLain?: number;
  };
}

export function generateDailyCashWhatsAppText(params: DailyCashWhatsAppParams): string {
  const {
    date,
    shift,
    cashierName,
    startingCash,
    startingTransfer,
    cashIn,
    transferIn,
    totalIn,
    cashOut,
    transferOut,
    totalOut,
    finalCashBalance,
    finalTransferBalance,
    totalFinalBalance,
    physicalCashBalance,
    difference,
    reconciliationStatus,
    denominations,
    notes,
    routineExpensesSummary,
  } = params;

  let statusEmoji = '✅';
  let statusText = 'SESUAI (Balance)';
  if (reconciliationStatus === 'shortage') {
    statusEmoji = '⚠️';
    statusText = `MINUS ${formatRupiah(Math.abs(difference))}`;
  } else if (reconciliationStatus === 'surplus') {
    statusEmoji = '🟢';
    statusText = `SURPLUS +${formatRupiah(difference)}`;
  }

  const divider = '───────────────';
  const clinicTitle = params.profile?.name ? params.profile.name.toUpperCase() : 'KLINIK';

  const lines: string[] = [
    `*REKAPITULASI KAS HARIAN ${clinicTitle}*`,
    `📅 *Tanggal:* ${formatDateId(date)}`,
    `⏰ *Shift:* ${shift}`,
    `👤 *Pelapor / Kasir:* ${cashierName}`,
    ``,
    divider,
    `*1. MODAL AWAL*`,
    `• Kas Laci: ${formatRupiah(startingCash)}`,
    `• Rekening: ${formatRupiah(startingTransfer)}`,
    `👉 *Total Modal:* ${formatRupiah(startingCash + startingTransfer)}`,
    ``,
    divider,
    `*2. UANG MASUK (PENERIMAAN)*`,
    `• Tunai: ${formatRupiah(cashIn)}`,
    `• Non-Tunai / QRIS: ${formatRupiah(transferIn)}`,
    `👉 *Total Masuk:* ${formatRupiah(totalIn)}`,
    ``,
    divider,
    `*3. UANG KELUAR (PENGELUARAN)*`,
    `• Kas Tunai: ${formatRupiah(cashOut)}`,
    `• Bank / Transfer: ${formatRupiah(transferOut)}`,
    `👉 *Total Keluar:* ${formatRupiah(totalOut)}`,
  ];

  if (routineExpensesSummary) {
    lines.push(
      ``,
      `*📌 Beban Rutin Hari Ini:*`,
      `• Snack DPJP: ${formatRupiah(routineExpensesSummary.snackDpjp || 0)}`,
      `• Air HD / Garam RO: ${formatRupiah(routineExpensesSummary.airHd || 0)}`,
      `• Oksigen Medis: ${formatRupiah(routineExpensesSummary.oksigen || 0)}`,
      `• Air Galon Minum: ${formatRupiah(routineExpensesSummary.airGalon || 0)}`,
      `• Alat & Bahan Kebersihan: ${formatRupiah(routineExpensesSummary.danaKebersihan || 0)}`,
      `• Makan Pasien HD: ${formatRupiah(routineExpensesSummary.makanPasienHd || 0)}`,
      `• Lain-lain: ${formatRupiah(routineExpensesSummary.lainLain || 0)}`
    );
  }

  lines.push(
    ``,
    divider,
    `*4. SALDO AKHIR SISTEM*`,
    `• Kas Tunai: ${formatRupiah(finalCashBalance)}`,
    `• Rekening / Bank: ${formatRupiah(finalTransferBalance)}`,
    `👉 *Total Saldo:* ${formatRupiah(totalFinalBalance)}`,
    ``,
    divider,
    `*5. HASIL CEK FISIK UANG*`,
    `• Uang Fisik di Laci: *${formatRupiah(physicalCashBalance)}*`,
    `• Saldo Seharusnya: ${formatRupiah(finalCashBalance)}`,
    `👉 *Status:* ${statusEmoji} *${statusText}*`,
    ...(denominations ? [
      ``,
      `*Rincian Pecahan:*`,
      `• 100k: ${denominations.c100k || 0} lbr`,
      `• 50k: ${denominations.c50k || 0} lbr`,
      `• 20k: ${denominations.c20k || 0} lbr`,
      `• 10k: ${denominations.c10k || 0} lbr`,
      `• 5k: ${denominations.c5k || 0} lbr`,
      `• 2k/1k/Koin: ${formatRupiah((denominations.c2k || 0) * 2000 + (denominations.c1k || 0) * 1000 + (denominations.coins || 0))}`,
    ] : []),
    ``,
    `📝 *Catatan Kasir:*`,
    `_${notes || 'Kas ditutup dan serah terima dalam keadaan rapi dan tertib.'}_`
  );

  return lines.join('\n');
}

interface AuditPrintWhatsAppParams {
  profile: ClinicProfile;
  periodLabel: string;
  activeUser: UserAccount;
  totalRevenue: number;
  totalDiscount?: number;
  totalReceived: number;
  totalCash: number;
  totalTransfer: number;
  totalQris: number;
  totalBpjs: number;
  totalExpenses: number;
  netIncome: number;
  patientCount: number;
  poliSummary: Array<{
    dept: string;
    patientCount: number;
    total: number;
  }>;
  expensesSummary: Array<{
    category: string;
    amount: number;
  }>;
}

export function generateAuditPrintWhatsAppText(params: AuditPrintWhatsAppParams): string {
  const {
    profile,
    periodLabel,
    activeUser,
    totalRevenue,
    totalDiscount = 0,
    totalReceived,
    totalCash,
    totalTransfer,
    totalQris,
    totalBpjs,
    totalExpenses,
    netIncome,
    patientCount,
    poliSummary,
    expensesSummary,
  } = params;

  const roleLabel =
    activeUser.role === 'super_admin'
      ? 'Direktur / Pimpinan'
      : activeUser.role === 'finance_manager'
      ? 'Manajer Keuangan'
      : 'Kasir';

  const rawClinicName = profile?.name?.trim() || 'Klinik Sehat Mandiri';
  const clinicTitle = rawClinicName.toUpperCase().startsWith('KLINIK')
    ? rawClinicName.toUpperCase()
    : `KLINIK ${rawClinicName.toUpperCase()}`;
  const divider = '───────────────';

  const lines: string[] = [
    `*REKAPITULASI KASIR & KEUANGAN ${clinicTitle}*`,
    `📅 *Periode:* ${periodLabel}`,
    `👤 *Pelapor / Pengirim:* ${activeUser.name} (${roleLabel})`,
    ``,
    divider,
    `*1. PENERIMAAN KASIR*`,
    `👥 Total Pasien: *${patientCount} Pasien*`,
    `💵 Total Tagihan: ${formatRupiah(totalRevenue)}`,
  ];

  if (totalDiscount > 0) {
    lines.push(`🎟️ Total Diskon / Potongan: -${formatRupiah(totalDiscount)}`);
  }

  lines.push(
    ``,
    `*Cara Pembayaran:*`,
    `• Tunai: ${formatRupiah(totalCash)}`,
    `• Transfer Bank: ${formatRupiah(totalTransfer)}`,
    `• QRIS / EDC: ${formatRupiah(totalQris)}`,
    `• Klaim BPJS / Piutang: ${formatRupiah(totalBpjs)}`,
    `👉 *Total Kas & Bank Masuk:* *${formatRupiah(totalReceived)}*`,
    ``,
    divider,
    `*2. PENERIMAAN PER POLIKLINIK*`
  );

  poliSummary
    .filter((p) => p.total > 0 || p.patientCount > 0)
    .forEach((p) => {
      lines.push(`• ${p.dept}: ${p.patientCount} psn (${formatRupiah(p.total)})`);
    });

  lines.push(
    ``,
    divider,
    `*3. PENGELUARAN OPERASIONAL*`,
    `💸 *Total Beban:* *${formatRupiah(totalExpenses)}*`,
    `*Rincian Beban:*`
  );

  expensesSummary.forEach((e) => {
    lines.push(`• ${e.category}: ${formatRupiah(e.amount)}`);
  });

  lines.push(
    ``,
    divider,
    `*4. SISA KAS BERSIH (NET)*`,
    `👉 *${formatRupiah(netIncome)}*`,
    netIncome >= 0 ? `(Surplus Operasional)` : `(Defisit Operasional)`
  );

  return lines.join('\n');
}
