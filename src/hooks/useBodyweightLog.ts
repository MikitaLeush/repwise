import { useCallback } from 'react';
import { useFirestoreOrLocal } from './useFirestoreOrLocal';
import { generateId } from '../utils/sessionUtils';
import type { BodyweightLog } from '../types';

export function useBodyweightLog() {
  const [logs, setLogs] = useFirestoreOrLocal<BodyweightLog[]>('repwise_bodyweight_logs', 'bodyweightLogs', []);

  const addLog = useCallback(
    (weightKg: number, date: string) => {
      const entry: BodyweightLog = { id: generateId(), date, weightKg };
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
