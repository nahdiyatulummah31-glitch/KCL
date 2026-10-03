import {
  ClinicProfile,
  UserAccount,
  SimrsTransaction,
  CashFlowEntry,
  ExpenseEntry,
  DebtEntry,
  ReceivableEntry,
  AuditLog,
  DueNotification,
  Vendor,
  ClinicAsset,
  DailyCashReconciliation,
  EmployeeSalaryRecord,
} from '../types';
import {
  INITIAL_CLINIC_PROFILE,
  INITIAL_USERS,
  INITIAL_SIMRS_TRANSACTIONS,
  INITIAL_CASH_FLOW,
  INITIAL_EXPENSES,
  INITIAL_DEBTS,
  INITIAL_RECEIVABLES,
  INITIAL_AUDIT_LOGS,
  INITIAL_VENDORS,
  INITIAL_ASSETS,
  INITIAL_RECONCILIATIONS,
  INITIAL_SALARY_RECORDS,
} from '../data/initialData';
import { getDaysRemaining } from './formatters';

export const STORAGE_KEYS = {
  PROFILE: 'klinik_finance_profile',
  USERS: 'klinik_finance_users_v3',
  ACTIVE_USER_ID: 'klinik_finance_active_user_id_v3',
  SIMRS: 'klinik_finance_simrs_v3',
  CASHFLOW: 'klinik_finance_cashflow_v3',
  EXPENSES: 'klinik_finance_expenses_v3',
  DEBTS: 'klinik_finance_debts_v3',
  RECEIVABLES: 'klinik_finance_receivables_v3',
  LOGS: 'klinik_finance_audit_logs',
  VENDORS: 'klinik_finance_vendors_v3',
  ASSETS: 'klinik_finance_assets_v3',
  RECONCILIATION: 'klinik_finance_reconciliation_v3',
  SALARIES: 'klinik_finance_salaries_v3',
  GOOGLE_STATUS: 'klinik_finance_google_status_v3',
  IS_LOGGED_IN: 'klinik_finance_is_logged_in_v3',
};

export const getStoredItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return defaultValue;
  }
};

export const setStoredItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

export const loadAllData = () => {
  const profile = getStoredItem<ClinicProfile>(STORAGE_KEYS.PROFILE, INITIAL_CLINIC_PROFILE);
  const users = getStoredItem<UserAccount[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  // Default active user is Nadia (finance_manager - 'aku')
  const defaultUser = users.find(u => u.username === 'nadia') || users[1] || users[0];
  const activeUserId = getStoredItem<string>(STORAGE_KEYS.ACTIVE_USER_ID, defaultUser?.id || 'usr-2');
  const simrs = getStoredItem<SimrsTransaction[]>(STORAGE_KEYS.SIMRS, INITIAL_SIMRS_TRANSACTIONS);
  const cashflow = getStoredItem<CashFlowEntry[]>(STORAGE_KEYS.CASHFLOW, INITIAL_CASH_FLOW);
  const expenses = getStoredItem<ExpenseEntry[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  const debts = getStoredItem<DebtEntry[]>(STORAGE_KEYS.DEBTS, INITIAL_DEBTS);
  const receivables = getStoredItem<ReceivableEntry[]>(STORAGE_KEYS.RECEIVABLES, INITIAL_RECEIVABLES);
  const logs = getStoredItem<AuditLog[]>(STORAGE_KEYS.LOGS, INITIAL_AUDIT_LOGS);
  const vendors = getStoredItem<Vendor[]>(STORAGE_KEYS.VENDORS, INITIAL_VENDORS);
  const assets = getStoredItem<ClinicAsset[]>(STORAGE_KEYS.ASSETS, INITIAL_ASSETS);
  const reconciliations = getStoredItem<DailyCashReconciliation[]>(STORAGE_KEYS.RECONCILIATION, INITIAL_RECONCILIATIONS);
  const salaries = getStoredItem<EmployeeSalaryRecord[]>(STORAGE_KEYS.SALARIES, INITIAL_SALARY_RECORDS);
  const isLoggedIn = getStoredItem<boolean>(STORAGE_KEYS.IS_LOGGED_IN, false);

  return {
    profile,
    users,
    activeUserId,
    isLoggedIn,
    simrs,
    cashflow,
    expenses,
    debts,
    receivables,
    logs,
    vendors,
    assets,
    reconciliations,
    salaries,
  };
};

export const resetAllDataToDefault = () => {
  setStoredItem(STORAGE_KEYS.PROFILE, INITIAL_CLINIC_PROFILE);
  setStoredItem(STORAGE_KEYS.USERS, INITIAL_USERS);
  const defaultUser = INITIAL_USERS.find(u => u.username === 'keuangan') || INITIAL_USERS.find(u => u.username === 'nadia') || INITIAL_USERS[1] || INITIAL_USERS[0];
  setStoredItem(STORAGE_KEYS.ACTIVE_USER_ID, defaultUser.id);
  setStoredItem(STORAGE_KEYS.SIMRS, INITIAL_SIMRS_TRANSACTIONS);
  setStoredItem(STORAGE_KEYS.CASHFLOW, INITIAL_CASH_FLOW);
  setStoredItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  setStoredItem(STORAGE_KEYS.DEBTS, INITIAL_DEBTS);
  setStoredItem(STORAGE_KEYS.RECEIVABLES, INITIAL_RECEIVABLES);
  setStoredItem(STORAGE_KEYS.LOGS, INITIAL_AUDIT_LOGS);
  setStoredItem(STORAGE_KEYS.VENDORS, INITIAL_VENDORS);
  setStoredItem(STORAGE_KEYS.ASSETS, INITIAL_ASSETS);
  setStoredItem(STORAGE_KEYS.RECONCILIATION, INITIAL_RECONCILIATIONS);
  setStoredItem(STORAGE_KEYS.SALARIES, INITIAL_SALARY_RECORDS);
};

export const clearAllDataToBlank = () => {
  setStoredItem(STORAGE_KEYS.SIMRS, []);
  setStoredItem(STORAGE_KEYS.CASHFLOW, []);
  setStoredItem(STORAGE_KEYS.EXPENSES, []);
  setStoredItem(STORAGE_KEYS.DEBTS, []);
  setStoredItem(STORAGE_KEYS.RECEIVABLES, []);
  setStoredItem(STORAGE_KEYS.LOGS, []);
  setStoredItem(STORAGE_KEYS.VENDORS, []);
  setStoredItem(STORAGE_KEYS.ASSETS, []);
  setStoredItem(STORAGE_KEYS.RECONCILIATION, []);
  setStoredItem(STORAGE_KEYS.SALARIES, []);
};

export const calculateDueNotifications = (
  debts: DebtEntry[],
  receivables: ReceivableEntry[]
): DueNotification[] => {
  const notifications: DueNotification[] = [];

  // Check debts
  debts.forEach((debt) => {
    if (debt.status === 'paid') return;
    const remainingDays = getDaysRemaining(debt.dueDate);
    const unpaidAmount = debt.totalAmount - debt.paidAmount;

    let urgency: DueNotification['urgency'] = 'info';
    if (remainingDays < 0) urgency = 'overdue';
    else if (remainingDays <= 3) urgency = 'critical';
    else if (remainingDays <= 7) urgency = 'warning';
    else return; // Only notify if <= 7 days or overdue

    notifications.push({
      id: `notif-debt-${debt.id}`,
      type: 'debt',
      itemId: debt.id,
      title: remainingDays < 0 ? `Utang Lewat Tempo (${Math.abs(remainingDays)} hari)` : `Tagihan Utang Jatuh Tempo (${remainingDays === 0 ? 'Hari Ini' : `${remainingDays} hari lagi`})`,
      counterparty: `${debt.creditorName} (${debt.invoiceNumber})`,
      amount: unpaidAmount,
      dueDate: debt.dueDate,
      daysRemaining: remainingDays,
      urgency,
    });
  });

  // Check receivables
  receivables.forEach((rec) => {
    if (rec.status === 'paid') return;
    const remainingDays = getDaysRemaining(rec.expectedDueDate);
    const uncollectedAmount = rec.claimAmount - rec.receivedAmount;

    let urgency: DueNotification['urgency'] = 'info';
    if (remainingDays < 0) urgency = 'overdue';
    else if (remainingDays <= 3) urgency = 'critical';
    else if (remainingDays <= 7) urgency = 'warning';
    else return;

    notifications.push({
      id: `notif-rec-${rec.id}`,
      type: 'receivable',
      itemId: rec.id,
      title: remainingDays < 0 ? `Klaim Piutang Melewati Estimasi (${Math.abs(remainingDays)} hari)` : `Jatuh Tempo Pencairan Klaim (${remainingDays === 0 ? 'Hari Ini' : `${remainingDays} hari lagi`})`,
      counterparty: `${rec.debtorName} (${rec.claimBatchNumber})`,
      amount: uncollectedAmount,
      dueDate: rec.expectedDueDate,
      daysRemaining: remainingDays,
      urgency,
    });
  });

  // Sort: overdue first, then critical, then warning
  const urgencyWeight = { overdue: 4, critical: 3, warning: 2, info: 1 };
  return notifications.sort((a, b) => urgencyWeight[b.urgency] - urgencyWeight[a.urgency]);
};
