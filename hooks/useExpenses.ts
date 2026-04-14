import { useState, useEffect, useCallback } from 'react';
import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  Expense,
} from '../store/storage';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getExpenses();
    setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = useCallback(
    async (data: Omit<Expense, 'id' | 'createdAt'>) => {
      await addExpense(data);
      await load();
    },
    [load]
  );

  const update = useCallback(
    async (id: string, data: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
      await updateExpense(id, data);
      await load();
    },
    [load]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteExpense(id);
      await load();
    },
    [load]
  );

  return { expenses, loading, reload: load, add, update, remove };
}
