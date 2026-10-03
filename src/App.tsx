import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClinicProfile,
  UserAccount,
  SimrsTransaction,
  CashFlowEntry,
  ExpenseEntry,
  DebtEntry,
  ReceivableEntry,
  DueNotification,
  Vendor,
  ClinicAsset,
  DailyCashReconciliation,
  InkasoStatus,
  GoogleDatabaseStatus,
  EmployeeSalaryRecord,
  isOwnerOrManager,
} from './types';
import {
  loadAllData,
  getStoredItem,
  setStoredItem,
  resetAllDataToDefault,
  clearAllDataToBlank,
  calculateDueNotifications,
  STORAGE_KEYS,
} from './utils/storage';
import {
  initWorkspaceAuth,
  googleSignIn,
  logoutGoogle,
  syncAllToGoogleDatabase,
  getAccessToken,
  hasSavedGoogleToken,
} from './services/googleWorkspace';
import {
  RotateCcw,
  Receipt,
  TrendingDown,
  Banknote,
  ArrowLeftRight,
  CheckCircle2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { normalizeDateToIso } from './components/DateRangeFilterBar';
import { DashboardView } from './components/DashboardView';
import { SimrsImportView } from './components/SimrsImportView';
import { CashFlowView } from './components/CashFlowView';
import { ExpensesView } from './components/ExpensesView';
import { VendorsView } from './components/VendorsView';
import { DebtsReceivablesView } from './components/DebtsReceivablesView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { AuditPrintView } from './components/AuditPrintView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { DailyCashReportView } from './components/DailyCashReportView';
import { InkasoView } from './components/InkasoView';
import { InventoryView } from './components/InventoryView';
import { SalaryPayrollView } from './components/SalaryPayrollView';
import { RestrictedAccessView } from './components/RestrictedAccessView';

export default function App() {
  const initial = loadAllData();

  const [profile, setProfile] = useState<ClinicProfile>(initial.profile);
  const [users, setUsers] = useState<UserAccount[]>(initial.users);
  const [activeUserId, setActiveUserId] = useState<string>(initial.activeUserId);
  const [simrsTransactions, setSimrsTransactions] = useState<SimrsTransaction[]>(initial.simrs);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>(initial.cashflow);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(initial.expenses);
  const [vendors, setVendors] = useState<Vendor[]>(initial.vendors || []);
  const [debts, setDebts] = useState<DebtEntry[]>(initial.debts);
  const [receivables, setReceivables] = useState<ReceivableEntry[]>(initial.receivables);
  const [assets, setAssets] = useState<ClinicAsset[]>(initial.assets || []);
  const [reconciliations, setReconciliations] = useState<DailyCashReconciliation[]>(initial.reconciliations || []);
  const [salaries, setSalaries] = useState<EmployeeSalaryRecord[]>(initial.salaries || []);

  const DEFAULT_GOOGLE_STATUS: GoogleDatabaseStatus = {
    isConnected: false,
    totalCellsUsed: 0,
    maxCellsCapacity: 10000000,
    autoRolloverThreshold: 9000000,
    volumeNumber: 1,
  };

  const [googleStatus, setGoogleStatus] = useState<GoogleDatabaseStatus>(() => {
    const stored = getStoredItem<GoogleDatabaseStatus>(STORAGE_KEYS.GOOGLE_STATUS, DEFAULT_GOOGLE_STATUS);
    if (stored.isConnected && !hasSavedGoogleToken()) {
      return { ...stored, isConnected: false };
    }
    return stored;
  });
  const [isSyncingGoogle, setIsSyncingGoogle] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ message: string; percent: number } | undefined>(undefined);
  const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const autoSyncTimerRef = useRef<any>(null);

  // Background real-time auto-sync logic
  const performAutoSync = useCallback(async () => {
    if (!googleStatus.isConnected) return;
    const token = await getAccessToken();
    if (!token) return;

    try {
      setAutoSyncStatus('syncing');
      const res = await syncAllToGoogleDatabase({
        transactions: simrsTransactions,
        expenses,
        debts,
        receivables,
        inventory: assets,
        cashFlow: cashFlowEntries,
        currentStatus: googleStatus,
      });
      setGoogleStatus(res);
      setAutoSyncStatus('saved');
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastAutoSyncTime(nowStr);
      setTimeout(() => {
        setAutoSyncStatus('idle');
      }, 3500);
    } catch (err: any) {
      console.warn('Auto-sync background check:', err?.message || err);
      setAutoSyncStatus('error');
      setTimeout(() => setAutoSyncStatus('idle'), 4000);
    }
  }, [
    googleStatus,
    simrsTransactions,
    expenses,
    debts,
    receivables,
    assets,
    cashFlowEntries,
  ]);

  // Trigger auto-sync whenever operational data changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!googleStatus.isConnected) return;

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }

    // Auto-save changes within 1.5 seconds of user input
    autoSyncTimerRef.current = setTimeout(() => {
      performAutoSync();
    }, 1500);

    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [
    simrsTransactions,
    expenses,
    debts,
    receivables,
    assets,
    cashFlowEntries,
    googleStatus.isConnected,
    performAutoSync,
  ]);

  // Active view tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [cashFlowSubTab, setCashFlowSubTab] = useState<'ledger' | 'simrs' | 'expenses' | 'daily_cash'>('ledger');
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [highlightItemId, setHighlightItemId] = useState<string | undefined>(undefined);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return getStoredItem<boolean>(STORAGE_KEYS.IS_LOGGED_IN, false);
  });
  const [printFilter, setPrintFilter] = useState<
    { mode: 'shift' | 'harian' | 'bulanan'; date: string; shift: string; month: string } | undefined
  >(undefined);

  // Derive active user object
  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || {
    id: 'usr-default',
    name: 'Staf Keuangan',
    email: 'finance@klinik.co.id',
    role: 'super_admin',
    lastLogin: 'Hari ini',
    isActive: true,
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setActiveUserId(user.id);
    setIsLoggedIn(true);
    setStoredItem(STORAGE_KEYS.IS_LOGGED_IN, true);
    setStoredItem(STORAGE_KEYS.ACTIVE_USER_ID, user.id);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStoredItem(STORAGE_KEYS.IS_LOGGED_IN, false);
  };

  // Guard restricted tabs for non-manager accounts
  useEffect(() => {
    if (
      !isOwnerOrManager(activeUser) &&
      (activeTab === 'payroll' || activeTab === 'clinic_settings' || activeTab === 'staff_management')
    ) {
      setActiveTab('dashboard');
    }
  }, [activeUser, activeTab]);

  // Recompute due notifications whenever debts or receivables change
  const notifications: DueNotification[] = calculateDueNotifications(debts, receivables);
  const urgentDueCount = notifications.filter(
    (n) => n.urgency === 'overdue' || n.urgency === 'critical'
  ).length;

  // Sync state changes to storage
  useEffect(() => {
    setStoredItem(STORAGE_KEYS.PROFILE, profile);
  }, [profile]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.USERS, users);
  }, [users]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.ACTIVE_USER_ID, activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.SIMRS, simrsTransactions);
  }, [simrsTransactions]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.CASHFLOW, cashFlowEntries);
  }, [cashFlowEntries]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.EXPENSES, expenses);
  }, [expenses]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.VENDORS, vendors);
  }, [vendors]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.DEBTS, debts);
  }, [debts]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.RECEIVABLES, receivables);
  }, [receivables]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.ASSETS, assets);
  }, [assets]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.RECONCILIATION, reconciliations);
  }, [reconciliations]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.SALARIES, salaries);
  }, [salaries]);

  useEffect(() => {
    setStoredItem(STORAGE_KEYS.GOOGLE_STATUS, googleStatus);
  }, [googleStatus]);

  useEffect(() => {
    initWorkspaceAuth(
      (user) => {
        if (user) {
          setGoogleStatus((prev) => ({
            ...prev,
            isConnected: true,
            userEmail: user.email || prev.userEmail,
            userName: user.displayName || prev.userName,
            userAvatar: user.photoURL || prev.userAvatar,
          }));
        }
      },
      () => {
        setGoogleStatus((prev) => {
          if (!prev.isConnected) return prev;
          return {
            ...prev,
            isConnected: false,
          };
        });
      }
    );
  }, []);

  // Google Workspace Handlers
  const handleConnectGoogle = async () => {
    try {
      const cred = await googleSignIn();
      const user = cred.user;
      const updatedStatus: GoogleDatabaseStatus = {
        ...googleStatus,
        isConnected: true,
        userEmail: user.email || undefined,
        userName: user.displayName || undefined,
        userAvatar: user.photoURL || undefined,
      };
      setGoogleStatus(updatedStatus);

      // Perform initial database sync immediately
      await handleSyncGoogleDatabase(updatedStatus);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.warn('Google Sign-in status:', err?.message || err);
        setToastMessage(`Login Google gagal: ${err?.message || 'Terjadi kesalahan'}`);
        setTimeout(() => setToastMessage(null), 5000);
      }
      throw err;
    }
  };

  const handleDisconnectGoogle = async () => {
    await logoutGoogle();
    setGoogleStatus((prev) => ({
      ...prev,
      isConnected: false,
    }));
    setToastMessage('Koneksi Google telah diputuskan.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSyncGoogleDatabase = async (statusOverride?: GoogleDatabaseStatus) => {
    const currentStatus = statusOverride || googleStatus;

    // Check if token exists
    const token = await getAccessToken();
    if (!token) {
      setGoogleStatus((prev) => ({ ...prev, isConnected: false }));
      try {
        setToastMessage('Menghubungkan Akun Google untuk sinkronisasi spreadsheet...');
        await handleConnectGoogle();
        return;
      } catch (authErr: any) {
        setToastMessage('Sinkronisasi tertunda: Silakan login akun Google Anda di menu Pengaturan.');
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }
    }

    setIsSyncingGoogle(true);
    try {
      const res = await syncAllToGoogleDatabase(
        {
          transactions: simrsTransactions,
          expenses,
          debts,
          receivables,
          inventory: assets,
          cashFlow: cashFlowEntries,
          currentStatus,
        },
        (progress) => {
          setSyncProgress(progress);
        }
      );

      setGoogleStatus(res);
      setSyncProgress({ message: 'Database Google Sheets Berhasil Diperbarui!', percent: 100 });
      setToastMessage('Database Google Sheets & Drive Berhasil Disinkronkan!');
      setTimeout(() => {
        setSyncProgress(undefined);
        setToastMessage(null);
      }, 3500);
    } catch (err: any) {
      console.warn('Kendala sinkronisasi ke Google Database:', err?.message || err);
      const msg = err?.message || 'Terjadi kesalahan sinkronisasi';
      setToastMessage(`Sinkronisasi Gagal: ${msg}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  // Handler: Switch user role
  const handleSwitchUser = (userId: string) => {
    setActiveUserId(userId);
  };

  // Helper to resolve deposit account dynamically from profile.bankAccounts
  const getDynamicTargetAccount = (paymentMethod: string): string => {
    if (paymentMethod === 'Tunai') return 'Kas Kasir (Tunai)';
    if (paymentMethod === 'QRIS' || paymentMethod === 'Debit EDC' || paymentMethod === 'Debit / EDC') {
      return 'Dompet Digital QRIS';
    }
    if (profile.bankAccounts && profile.bankAccounts.length > 0) {
      return `${profile.bankAccounts[0].bankName} - ${profile.bankAccounts[0].accountNumber}`;
    }
    return 'Rekening Bank Klinik';
  };

  // Handler: Import SIMRS transactions
  const handleImportSimrs = (newTrxs: SimrsTransaction[]) => {
    const markedTrxs = newTrxs.map((t) => ({ ...t, isSyncedToCashflow: true }));
    const updated = [...markedTrxs, ...simrsTransactions];
    setSimrsTransactions(updated);

    // Otomatis sinkronkan seluruh transaksi kasir yang diimpor ke Buku Kas (Arus Kas) & Dasbor
    const newCashFlows: CashFlowEntry[] = markedTrxs.map((trx) => {
      const targetAccount = getDynamicTargetAccount(trx.paymentMethod);
      const cleanDate = normalizeDateToIso(trx.billingTime) || '2026-09-16';
      return {
        id: `cf-imp-${trx.id}`,
        date: cleanDate,
        type: 'in' as const,
        category: `Pendapatan Kasir SIMRS (${trx.department || 'Poli Umum'})`,
        description: trx.notes
          ? `${trx.notes} - ${trx.patientName} (${trx.invoiceNo})`
          : `Billing Pasien ${trx.patientName} (${trx.invoiceNo}) - Shift ${trx.shift || 'Pagi'}`,
        amount: trx.cashierReceived > 0 ? trx.cashierReceived : trx.totalAmount,
        account: targetAccount,
        source: 'simrs' as const,
        refNumber: trx.invoiceNo,
        createdBy: trx.cashierName || activeUser.name,
        status: 'confirmed' as const,
      };
    });

    setCashFlowEntries((prev) => [...newCashFlows, ...prev]);
    setToastMessage(`Berhasil mengimpor ${newTrxs.length} transaksi dari SIMRS! Data otomatis terintegrasi ke Buku Kas & Dasbor.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Handler: Add single SIMRS transaction
  const handleAddSimrsTransaction = (trx: SimrsTransaction) => {
    setSimrsTransactions([trx, ...simrsTransactions]);

    // Automatically record cash flow entry if it's cash or instant electronic transfer
    if (trx.paymentMethod === 'Tunai' || trx.paymentMethod === 'QRIS' || trx.paymentMethod === 'Transfer Bank' || trx.paymentMethod === 'Debit / EDC') {
      const targetAccount = getDynamicTargetAccount(trx.paymentMethod);
      const cleanDate = normalizeDateToIso(trx.billingTime) || '2026-09-16';

      const newCf: CashFlowEntry = {
        id: `cf-simrs-${trx.id}`,
        date: cleanDate,
        type: 'in',
        category: `Pendapatan Kasir SIMRS (${trx.department})`,
        description: trx.notes
          ? `${trx.notes} - Pasien: ${trx.patientName} (${trx.invoiceNo})`
          : `Billing Pasien ${trx.patientName} (${trx.invoiceNo}) - Shift ${trx.shift}`,
        amount: trx.cashierReceived,
        account: targetAccount,
        source: 'simrs',
        refNumber: trx.invoiceNo,
        createdBy: trx.cashierName,
        status: 'confirmed',
      };
      setCashFlowEntries([newCf, ...cashFlowEntries]);
    }
  };

  // Handler: Delete SIMRS transaction
  const handleDeleteSimrsTransaction = (id: string) => {
    setSimrsTransactions(simrsTransactions.filter((t) => t.id !== id));
  };

  // Handler: Update SIMRS transaction with audit trail
  const handleUpdateSimrsTransaction = (updatedTrx: SimrsTransaction) => {
    setSimrsTransactions((prev) =>
      prev.map((t) => (t.id === updatedTrx.id ? updatedTrx : t))
    );
  };

  // Handler: Synchronize selected transactions to cashflow
  const handleSyncToCashflow = (ids: string[]) => {
    const newCashFlows: CashFlowEntry[] = [];
    const updatedTrxs = simrsTransactions.map((trx) => {
      if (ids.includes(trx.id) && !trx.isSyncedToCashflow) {
        const targetAccount = getDynamicTargetAccount(trx.paymentMethod);

        newCashFlows.push({
          id: `cf-sync-${trx.id}`,
          date: trx.billingTime.slice(0, 10),
          type: 'in',
          category: `Pendapatan Kasir SIMRS (${trx.department})`,
          description: trx.notes
            ? `${trx.notes} - Pasien: ${trx.patientName} (${trx.invoiceNo})`
            : `Rekap Billing ${trx.patientName} (${trx.invoiceNo})`,
          amount: trx.cashierReceived,
          account: targetAccount,
          source: 'simrs',
          refNumber: trx.invoiceNo,
          createdBy: trx.cashierName,
          status: 'confirmed',
        });
        return { ...trx, isSyncedToCashflow: true };
      }
      return trx;
    });

    setSimrsTransactions(updatedTrxs);
    if (newCashFlows.length > 0) {
      setCashFlowEntries([...newCashFlows, ...cashFlowEntries]);
    }
  };

  // Handler: Add Expense
  const handleAddExpense = (exp: ExpenseEntry) => {
    setExpenses([exp, ...expenses]);

    // If already approved, log cashflow outflow
    if (exp.status === 'approved') {
      const newCf: CashFlowEntry = {
        id: `cf-exp-${exp.id}`,
        date: exp.date,
        type: 'out',
        category: exp.category,
        description: `${exp.title} - Vendor: ${exp.vendorName || '-'} (Nota: ${exp.invoiceNumber || '-'})`,
        amount: exp.amount,
        account: exp.payFromAccount as any,
        source: 'manual_expense',
        refNumber: exp.invoiceNumber,
        createdBy: exp.createdBy,
        status: 'confirmed',
      };
      setCashFlowEntries([newCf, ...cashFlowEntries]);
    }
  };

  // Handler: Approve Expense
  const handleApproveExpense = (expenseId: string) => {
    const updated = expenses.map((e) => {
      if (e.id === expenseId) {
        const approvedExp = {
          ...e,
          status: 'approved' as const,
          approvedBy: activeUser.name,
        };
        // Add to cash flow
        const newCf: CashFlowEntry = {
          id: `cf-exp-${e.id}`,
          date: e.date,
          type: 'out',
          category: e.category,
          description: `${e.title} - Vendor: ${e.vendorName || '-'} (Nota: ${e.invoiceNumber || '-'})`,
          amount: e.amount,
          account: e.payFromAccount as any,
          source: 'manual_expense',
          refNumber: e.invoiceNumber,
          createdBy: e.createdBy,
          status: 'confirmed',
        };
        setCashFlowEntries((prev) => [newCf, ...prev]);
        return approvedExp;
      }
      return e;
    });
    setExpenses(updated);
  };

  // Handler: Delete Expense
  const handleDeleteExpense = (expenseId: string) => {
    setExpenses(expenses.filter((e) => e.id !== expenseId));
  };

  // Handler: Add Debt
  const handleAddDebt = (debt: DebtEntry) => {
    setDebts([debt, ...debts]);
  };

  // Handler: Pay Debt installment / full
  const handlePayDebt = (debtId: string, amount: number, account: string) => {
    const updatedDebts = debts.map((d) => {
      if (d.id === debtId) {
        const newPaid = d.paidAmount + amount;
        const newStatus =
          newPaid >= d.totalAmount ? ('paid' as const) : ('partial' as const);
        return {
          ...d,
          paidAmount: newPaid,
          status: newStatus,
          lastPaymentDate: new Date().toISOString().slice(0, 10),
        };
      }
      return d;
    });
    setDebts(updatedDebts);

    // Record cashflow outflow
    const targetDebt = debts.find((d) => d.id === debtId);
    if (targetDebt) {
      const newCf: CashFlowEntry = {
        id: `cf-debt-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: 'out',
        category: 'Pembayaran Utang Distributor Farmasi (PBF)',
        description: `Pelunasan/Cicilan Faktur ${targetDebt.invoiceNumber} - ${targetDebt.creditorName}`,
        amount: amount,
        account: account as any,
        source: 'debt_payment',
        refNumber: targetDebt.invoiceNumber,
        createdBy: activeUser.name,
        status: 'confirmed',
      };
      setCashFlowEntries([newCf, ...cashFlowEntries]);
    }
  };

  // Handler: Add Receivable
  const handleAddReceivable = (rec: ReceivableEntry) => {
    setReceivables([rec, ...receivables]);
  };

  // Handler: Collect Receivable
  const handleCollectReceivable = (recId: string, amount: number, account: string) => {
    const updatedRecs = receivables.map((r) => {
      if (r.id === recId) {
        const newReceived = r.receivedAmount + amount;
        const newStatus =
          newReceived >= r.claimAmount ? ('paid' as const) : ('verified' as const);
        return {
          ...r,
          receivedAmount: newReceived,
          status: newStatus,
          lastReceivedDate: new Date().toISOString().slice(0, 10),
        };
      }
      return r;
    });
    setReceivables(updatedRecs);

    // Record cashflow inflow
    const targetRec = receivables.find((r) => r.id === recId);
    if (targetRec) {
      const newCf: CashFlowEntry = {
        id: `cf-rec-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: 'in',
        category: 'Penerimaan Klaim Faskes (BPJS / Asuransi)',
        description: `Pencairan Klaim ${targetRec.debtorName} (${targetRec.claimBatchNumber})`,
        amount: amount,
        account: account as any,
        source: 'receivable_collection',
        refNumber: targetRec.claimBatchNumber,
        createdBy: activeUser.name,
        status: 'confirmed',
      };
      setCashFlowEntries([newCf, ...cashFlowEntries]);
    }
  };

  // Handler: Vendor CRUD
  const handleAddVendor = (newVendor: Vendor) => {
    setVendors([newVendor, ...vendors]);
  };

  const handleUpdateVendor = (updated: Vendor) => {
    setVendors(vendors.map((v) => (v.id === updated.id ? updated : v)));
  };

  const handleDeleteVendor = (id: string) => {
    setVendors(vendors.filter((v) => v.id !== id));
  };

  // Handler: Add direct Cashflow
  const handleAddCashFlowEntry = (entry: CashFlowEntry) => {
    setCashFlowEntries([entry, ...cashFlowEntries]);
  };

  const handleUpdateCashFlowEntry = (updated: CashFlowEntry) => {
    setCashFlowEntries((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCashFlowEntry = (id: string) => {
    setCashFlowEntries((prev) => prev.filter((c) => c.id !== id));
  };

  // Handler: Update Expense
  const handleUpdateExpense = (updated: ExpenseEntry) => {
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  // Handler: Update & Delete Debt
  const handleUpdateDebt = (updated: DebtEntry) => {
    setDebts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  // Handler: Update & Delete Receivable
  const handleUpdateReceivable = (updated: ReceivableEntry) => {
    setReceivables((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteReceivable = (id: string) => {
    setReceivables((prev) => prev.filter((r) => r.id !== id));
  };

  // Handler: Inkaso status update
  const handleUpdateInkasoStatus = (
    id: string,
    inkasoStatus: InkasoStatus,
    collector: string,
    notes: string
  ) => {
    setReceivables((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              inkasoStatus,
              inkasoCollector: collector,
              inkasoNotes: notes,
              inkasoSubmissionDate: r.inkasoSubmissionDate || new Date().toISOString().slice(0, 10),
            }
          : r
      )
    );
  };

  // Handler: Reconciliation save & delete
  const handleSaveReconciliation = (recon: DailyCashReconciliation) => {
    setReconciliations((prev) => {
      const idx = prev.findIndex((r) => r.id === recon.id || r.date === recon.date);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = recon;
        return copy;
      }
      return [recon, ...prev];
    });
  };

  const handleDeleteReconciliation = (id: string) => {
    setReconciliations((prev) => prev.filter((r) => r.id !== id));
  };

  // Handler: Asset inventory CRUD
  const handleAddAsset = (asset: ClinicAsset) => {
    setAssets([asset, ...assets]);
  };

  const handleUpdateAsset = (updated: ClinicAsset) => {
    setAssets(assets.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter((a) => a.id !== id));
  };

  // Handler: Salary & Payroll CRUD
  const handleAddSalary = (record: EmployeeSalaryRecord) => {
    setSalaries([record, ...salaries]);
  };

  const handleUpdateSalary = (updated: EmployeeSalaryRecord) => {
    setSalaries(salaries.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSalary = (id: string) => {
    setSalaries(salaries.filter((s) => s.id !== id));
  };

  // Handler: Open in-app confirmation modal for Reset Demo (Request 3: window.confirm was blocked in iframe)
  const handleResetData = () => {
    setShowResetModal(true);
  };

  const confirmResetData = () => {
    resetAllDataToDefault();
    const fresh = loadAllData();
    setProfile(fresh.profile);
    setUsers(fresh.users);
    setActiveUserId(fresh.activeUserId);
    setSimrsTransactions(fresh.simrs);
    setCashFlowEntries(fresh.cashflow);
    setExpenses(fresh.expenses);
    setVendors(fresh.vendors || []);
    setDebts(fresh.debts);
    setReceivables(fresh.receivables);
    setAssets(fresh.assets || []);
    setReconciliations(fresh.reconciliations || []);
    setSalaries(fresh.salaries || []);
    setShowResetModal(false);
    setToastMessage('Seluruh data demo klinik berhasil dikembalikan ke kondisi awal!');
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handler: Kosongkan seluruh data demo agar siap digunakan untuk data riil klinik (User Request 1)
  const confirmClearRealData = () => {
    clearAllDataToBlank();
    setSimrsTransactions([]);
    setCashFlowEntries([]);
    setExpenses([]);
    setVendors([]);
    setDebts([]);
    setReceivables([]);
    setAssets([]);
    setReconciliations([]);
    setSalaries([]);
    setShowResetModal(false);
    setToastMessage('Data demo berhasil dikosongkan! Sistem siap untuk pencatatan data riil klinik Anda.');
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Central navigation handler mapping consolidated menus (Request 7)
  const handleSelectTab = (tab: string, subTab?: 'ledger' | 'simrs' | 'expenses' | 'daily_cash') => {
    if (tab === 'simrs_rekap') {
      setActiveTab('cash_flow');
      setCashFlowSubTab('simrs');
    } else if (tab === 'expenses') {
      setActiveTab('cash_flow');
      setCashFlowSubTab('expenses');
    } else if (tab === 'daily_cash_report') {
      setActiveTab('cash_flow');
      setCashFlowSubTab('daily_cash');
    } else if (tab === 'cash_flow') {
      setActiveTab('cash_flow');
      if (subTab) setCashFlowSubTab(subTab);
    } else {
      setActiveTab(tab);
    }
    setHighlightItemId(undefined);
  };

  // Handler: Click notification alert
  const handleSelectNotification = (item: DueNotification) => {
    setHighlightItemId(item.itemId);
    setActiveTab('debts_receivables');
  };

  if (!isLoggedIn) {
    return (
      <LoginView
        profile={profile}
        users={users}
        activeUser={activeUser}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar */}
      <Navbar
        profile={profile}
        activeUser={activeUser}
        allUsers={users}
        notifications={notifications}
        googleStatus={googleStatus}
        autoSyncStatus={autoSyncStatus}
        lastAutoSyncTime={lastAutoSyncTime}
        onSwitchUser={handleSwitchUser}
        onNavigateTab={handleSelectTab}
        onSelectNotificationItem={handleSelectNotification}
        onLogout={handleLogout}
      />

      {/* Main App Body */}
      <div className="flex-1 flex flex-col lg:flex-row w-full min-h-[calc(100vh-4rem)]">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          urgentDueCount={urgentDueCount}
          activeUser={activeUser}
        />

        {/* Content View Area */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              profile={profile}
              simrsTransactions={simrsTransactions}
              cashFlowEntries={cashFlowEntries}
              expenses={expenses}
              debts={debts}
              receivables={receivables}
              notifications={notifications}
              activeUser={activeUser}
              onNavigateTab={handleSelectTab}
            />
          )}

          {/* Unified Arus Kas Harian & Kasir (Request 7: 1 unified hub containing Buku Kas, Rekap SIMRS, Pengeluaran & Kas Fisik) */}
          {(activeTab === 'cash_flow' || activeTab === 'simrs_rekap' || activeTab === 'expenses' || activeTab === 'daily_cash_report') && (
            <div className="space-y-4">
              {/* 4-in-1 Sub-tab Switcher Header with Color Accents */}
              <div className="bg-white p-2.5 rounded-2xl border-2 border-teal-200 shadow-xs flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setCashFlowSubTab('ledger')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      cashFlowSubTab === 'ledger'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>Buku Arus Kas</span>
                  </button>

                  <button
                    onClick={() => setCashFlowSubTab('simrs')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      cashFlowSubTab === 'simrs'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Rekap Kasir SIMRS (Pemasukan)</span>
                  </button>

                  <button
                    onClick={() => setCashFlowSubTab('expenses')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      cashFlowSubTab === 'expenses'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>Pengeluaran & Nota</span>
                  </button>

                  <button
                    onClick={() => setCashFlowSubTab('daily_cash')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      cashFlowSubTab === 'daily_cash'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-orange-600" />
                    <span>Kas Harian & Rekonsiliasi</span>
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 hidden md:flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Arus Kas & Operasional Kasir</span>
                </div>
              </div>

              {/* View Components for each subtab */}
              {cashFlowSubTab === 'ledger' && (
                <CashFlowView
                  entries={cashFlowEntries}
                  profile={profile}
                  activeUser={activeUser}
                  onAddEntry={handleAddCashFlowEntry}
                  onUpdateEntry={handleUpdateCashFlowEntry}
                  onDeleteEntry={handleDeleteCashFlowEntry}
                />
              )}

              {cashFlowSubTab === 'simrs' && (
                <SimrsImportView
                  transactions={simrsTransactions}
                  activeUser={activeUser}
                  allUsers={users}
                  googleStatus={googleStatus}
                  onSyncGoogle={() => handleSyncGoogleDatabase()}
                  onAddTransaction={handleAddSimrsTransaction}
                  onImportTransactions={handleImportSimrs}
                  onUpdateTransaction={handleUpdateSimrsTransaction}
                  onDeleteTransaction={handleDeleteSimrsTransaction}
                  onSyncToCashflow={handleSyncToCashflow}
                />
              )}

              {cashFlowSubTab === 'expenses' && (
                <ExpensesView
                  expenses={expenses}
                  profile={profile}
                  activeUser={activeUser}
                  vendors={vendors}
                  googleStatus={googleStatus}
                  onAddExpense={handleAddExpense}
                  onApproveExpense={handleApproveExpense}
                  onDeleteExpense={handleDeleteExpense}
                  onUpdateExpense={handleUpdateExpense}
                />
              )}

              {cashFlowSubTab === 'daily_cash' && (
                <DailyCashReportView
                  profile={profile}
                  activeUser={activeUser}
                  simrsTransactions={simrsTransactions}
                  cashFlowEntries={cashFlowEntries}
                  expenses={expenses}
                  reconciliations={reconciliations}
                  onSaveReconciliation={handleSaveReconciliation}
                  onDeleteReconciliation={handleDeleteReconciliation}
                />
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              assets={assets}
              profile={profile}
              activeUser={activeUser}
              vendors={vendors}
              onAddAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          )}

          {activeTab === 'vendors' && (
            <VendorsView
              vendors={vendors}
              profile={profile}
              activeUser={activeUser}
              onAddVendor={handleAddVendor}
              onUpdateVendor={handleUpdateVendor}
              onDeleteVendor={handleDeleteVendor}
            />
          )}

          {activeTab === 'debts_receivables' && (
            <DebtsReceivablesView
              debts={debts}
              receivables={receivables}
              profile={profile}
              activeUser={activeUser}
              onAddDebt={handleAddDebt}
              onPayDebt={handlePayDebt}
              onAddReceivable={handleAddReceivable}
              onCollectReceivable={handleCollectReceivable}
              onUpdateDebt={handleUpdateDebt}
              onDeleteDebt={handleDeleteDebt}
              onUpdateReceivable={handleUpdateReceivable}
              onDeleteReceivable={handleDeleteReceivable}
              highlightItemId={highlightItemId}
            />
          )}

          {activeTab === 'monthly_report' && (
            <MonthlyReportView
              profile={profile}
              simrsTransactions={simrsTransactions}
              cashFlowEntries={cashFlowEntries}
              expenses={expenses}
              debts={debts}
              receivables={receivables}
              salaries={salaries}
              activeUser={activeUser}
              onNavigatePrint={(filterState) => {
                setPrintFilter(filterState);
                setActiveTab('audit_print');
              }}
              onAddSalary={handleAddSalary}
              onUpdateSalary={handleUpdateSalary}
              onDeleteSalary={handleDeleteSalary}
            />
          )}

          {activeTab === 'payroll' && (
            isOwnerOrManager(activeUser) ? (
              <SalaryPayrollView
                salaries={salaries}
                activeUser={activeUser}
                profile={profile}
                onAddSalary={handleAddSalary}
                onUpdateSalary={handleUpdateSalary}
                onDeleteSalary={handleDeleteSalary}
              />
            ) : (
              <RestrictedAccessView
                activeUser={activeUser}
                featureTitle="Gaji Karyawan & Honor Medis"
                onGoToAllowed={() => handleSelectTab('dashboard')}
                onOpenLogin={handleLogout}
              />
            )
          )}

          {activeTab === 'audit_print' && (
            <AuditPrintView
              profile={profile}
              simrsTransactions={simrsTransactions}
              cashFlowEntries={cashFlowEntries}
              expenses={expenses}
              debts={debts}
              receivables={receivables}
              activeUser={activeUser}
              initialFilter={printFilter}
              onGoBack={() => setActiveTab('monthly_report')}
              onGoSettings={() => setActiveTab('clinic_settings')}
            />
          )}

          {(activeTab === 'staff_management' || activeTab === 'clinic_settings') && (
            isOwnerOrManager(activeUser) ? (
              <SettingsView
                profile={profile}
                users={users}
                activeUser={activeUser}
                onUpdateProfile={(newProfile) => setProfile(newProfile)}
                onUpdateUsers={(newUsers) => setUsers(newUsers)}
                onResetData={handleResetData}
                googleStatus={googleStatus}
                onConnectGoogle={handleConnectGoogle}
                onDisconnectGoogle={handleDisconnectGoogle}
                onSyncGoogle={() => handleSyncGoogleDatabase()}
                isSyncingGoogle={isSyncingGoogle}
                syncProgress={syncProgress}
              />
            ) : (
              <RestrictedAccessView
                activeUser={activeUser}
                featureTitle="Pengaturan Klinik & Hak Akses"
                onGoToAllowed={() => handleSelectTab('dashboard')}
                onOpenLogin={handleLogout}
              />
            )
          )}
        </main>
      </div>

      {/* Custom In-App Modal for Reset Demo (Bypasses iframe sandbox window.confirm block) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pengelolaan Data Demo & Data Riil Klinik</h3>
                <p className="text-xs text-slate-500">Mulai gunakan sistem pencatatan keuangan dengan data asli klinik Anda</p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              {/* Opsi Utama: Kosongkan Data Demo agar siap input data riil */}
              <div className="p-4 rounded-2xl border-2 border-teal-600 bg-teal-50/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-teal-700" />
                      <span>Kosongkan Semua Data Demo (Mulai Pakai Data Riil)</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Menghapus seluruh catatan demo (transaksi SIMRS, mutasi kas, bukti nota, utang & piutang tempo, aset, dan slip gaji). Akun login dan data profil klinik tetap tersimpan sehingga Anda bisa langsung menginput data operasional klinik yang sesungguhnya.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={confirmClearRealData}
                    className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ya, Kosongkan & Mulai Data Riil</span>
                  </button>
                </div>
              </div>

              {/* Opsi Alternatif: Muat Ulang Demo Awal */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-slate-500" />
                      <span>Muat Ulang Contoh Data Demo Awal</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Kembalikan contoh set data simulasi awal (transaksi percontohan September 2026).
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={confirmResetData}
                    className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Muat Ulang Demo</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
