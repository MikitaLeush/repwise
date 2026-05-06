import { useCallback } from 'react';
import { useAsyncStorage } from './useAsyncStorage';
import type { BodyweightLog } from '../types';

export function useBodyweightLog() {
  const [logs, setLogs] = useAsyncStorage<BodyweightLog[]>('repwise_bodyweight_logs', []);

  const addLog = useCallback(
    (weightKg: number, date: string) => {
      const entry: BodyweightLog = { id: crypto.randomUUID(), date, weightKg };
      setLogs((prev) => [entry, ...prev]);
    },
    [setLogs]
  );

  const deleteLog = useCallback(
    (id: string) => {
      setLogs((prev) => prev.filter((l) => l.id !== id));
    },
    [setLogs]
  );

  return { logs, addLog, deleteLog };
}
