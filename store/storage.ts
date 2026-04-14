import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES, Category } from '../constants/categories';

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  note: string;
  createdAt: string;
  aiComment?: string;
}

export interface Settings {
  currency: string;
  monthlyBudget: number;
  categories: Category[];
}

const KEYS = {
  EXPENSES: 'expenses',
  SETTINGS: 'settings',
};

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Expenses ──────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const raw = await AsyncStorage.getItem(KEYS.EXPENSES);
  return raw ? JSON.parse(raw) : [];
}

export async function addExpense(
  data: Omit<Expense, 'id' | 'createdAt'>
): Promise<Expense> {
  const expenses = await getExpenses();
  const expense: Expense = {
    ...data,
    id: uuid(),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    KEYS.EXPENSES,
    JSON.stringify([expense, ...expenses])
  );
  return expense;
}

export async function updateExpense(
  id: string,
  data: Partial<Omit<Expense, 'id' | 'createdAt'>>
): Promise<void> {
  const expenses = await getExpenses();
  const updated = expenses.map((e) => (e.id === id ? { ...e, ...data } : e));
  await AsyncStorage.setItem(KEYS.EXPENSES, JSON.stringify(updated));
}

export async function deleteExpense(id: string): Promise<void> {
  const expenses = await getExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  await AsyncStorage.setItem(KEYS.EXPENSES, JSON.stringify(filtered));
}

// ── Settings ──────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  currency: '₺',
  monthlyBudget: 0,
  categories: DEFAULT_CATEGORIES,
};

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (!raw) return DEFAULT_SETTINGS;
  const saved = JSON.parse(raw) as Settings;
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await AsyncStorage.setItem(
    KEYS.SETTINGS,
    JSON.stringify({ ...current, ...settings })
  );
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.EXPENSES);
  await AsyncStorage.removeItem(KEYS.SETTINGS);
}
