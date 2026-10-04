/**
 * Offline & Local Database Backup Utilities
 * (No Firebase dependency)
 */

import {
  ClinicProfile,
  UserAccount,
  SimrsTransaction,
  CashFlowEntry,
  ExpenseEntry,
  DebtEntry,
  ReceivableEntry,
  Vendor,
  ClinicAsset,
  DailyCashReconciliation,
  EmployeeSalaryRecord,
  AuditLog,
} from '../types';

export interface FullClinicDatabase {
  profile: ClinicProfile;
  users: UserAccount[];
  simrs: SimrsTransaction[];
  cashflow: CashFlowEntry[];
  expenses: ExpenseEntry[];
  debts: DebtEntry[];
  receivables: ReceivableEntry[];
  vendors: Vendor[];
  assets: ClinicAsset[];
  reconciliations: DailyCashReconciliation[];
  salaries: EmployeeSalaryRecord[];
  logs?: AuditLog[];
  lastUpdated?: string;
  version?: number;
}

/**
 * Export complete clinic database to JSON file download
 */
export function exportDatabaseToFile(data: FullClinicDatabase, clinicName: string = 'Klinik'): void {
  try {
    const cleanName = clinicName.replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Database_${cleanName}_${dateStr}.json`;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export database file:', err);
  }
}

/**
 * Parse an imported JSON file and validate clinic database structure
 */
export async function parseDatabaseFile(file: File): Promise<FullClinicDatabase> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Format file tidak valid (bukan JSON object).');
        }

        // Validate essential fields
        if (!Array.isArray(parsed.simrs) && !Array.isArray(parsed.cashflow)) {
          throw new Error('File tidak memuat data transaksi SIMRS atau arus kas klinik.');
        }

        resolve({
          profile: parsed.profile,
          users: parsed.users || [],
          simrs: parsed.simrs || [],
          cashflow: parsed.cashflow || [],
          expenses: parsed.expenses || [],
          debts: parsed.debts || [],
          receivables: parsed.receivables || [],
          vendors: parsed.vendors || [],
          assets: parsed.assets || [],
          reconciliations: parsed.reconciliations || [],
          salaries: parsed.salaries || [],
          logs: parsed.logs || [],
          lastUpdated: new Date().toISOString(),
          version: parsed.version || 3,
        });
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file);
  });
}
