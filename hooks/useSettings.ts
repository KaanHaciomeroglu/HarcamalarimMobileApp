import { useState, useEffect, useCallback } from 'react';
import { getSettings, saveSettings, Settings } from '../store/storage';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  const load = useCallback(async () => {
    const data = await getSettings();
    setSettings(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = useCallback(
    async (partial: Partial<Settings>) => {
      await saveSettings(partial);
      await load();
    },
    [load]
  );

  return { settings, reload: load, update };
}
