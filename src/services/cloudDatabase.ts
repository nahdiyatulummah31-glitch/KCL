import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
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

// Initialize Firebase App & Firestore safely
let firestoreDb: Firestore | null = null;
let isFirestoreAvailable = false;

try {
  const firebaseConfigMerged = {
    projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
    apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
    authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
    storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
    messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  };

  const app = getApps().length === 0 ? initializeApp(firebaseConfigMerged) : getApp();
  firestoreDb = getFirestore(app);
  isFirestoreAvailable = true;
} catch (e) {
  console.warn('Firebase Firestore initialization notice:', e);
  isFirestoreAvailable = false;
}

const CLINIC_DOC_PATH = 'clinics';
const CLINIC_DOC_ID = 'clinic_master_data';

/**
 * Fetch full database from Cloud Firestore
 */
export async function fetchFromCloudDatabase(): Promise<FullClinicDatabase | null> {
  if (!firestoreDb || !isFirestoreAvailable) return null;

  try {
    const docRef = doc(firestoreDb, CLINIC_DOC_PATH, CLINIC_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as FullClinicDatabase;
      if (data && data.profile && Array.isArray(data.simrs)) {
        return data;
      }
    }
  } catch (error: any) {
    // If database does not exist or offline, return null safely
    console.warn('Could not read from Cloud Firestore:', error?.message || error);
  }
  return null;
}

/**
 * Save full database to Cloud Firestore automatically
 */
export async function saveToCloudDatabase(dbData: FullClinicDatabase): Promise<boolean> {
  if (!firestoreDb || !isFirestoreAvailable) return false;

  try {
    const docRef = doc(firestoreDb, CLINIC_DOC_PATH, CLINIC_DOC_ID);
    const payload: FullClinicDatabase = {
      ...dbData,
      lastUpdated: new Date().toISOString(),
      version: 3,
    };

    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error: any) {
    console.warn('Cloud Firestore auto-save notice:', error?.message || error);
    return false;
  }
}

/**
 * Listen for real-time cloud updates across devices/tabs
 */
export function subscribeToCloudDatabase(
  onData: (data: FullClinicDatabase) => void,
  onError?: (err: any) => void
): () => void {
  if (!firestoreDb || !isFirestoreAvailable) {
    return () => {};
  }

  try {
    const docRef = doc(firestoreDb, CLINIC_DOC_PATH, CLINIC_DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FullClinicDatabase;
          if (data && data.profile && Array.isArray(data.simrs)) {
            onData(data);
          }
        }
      },
      (error) => {
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Failed to attach Firestore snapshot listener:', e);
    return () => {};
  }
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
