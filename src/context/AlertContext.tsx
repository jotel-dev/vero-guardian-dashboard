'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AlertType = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  source: string;
  timestamp: number;
  dismissable: boolean;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => string;
  dismissAlert: (id: string) => void;
  dismissSource: (source: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

let nextId = 0;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = useCallback(
    (input: Omit<Alert, 'id' | 'timestamp'>): string => {
      const id = `alert-${++nextId}`;
      const alert: Alert = { ...input, id, timestamp: Date.now() };
      setAlerts((prev) => {
        const existingIndex = prev.findIndex(
          (a) => a.source === input.source && a.type === input.type,
        );
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = alert;
          return updated;
        }
        return [...prev, alert];
      });
      return id;
    },
    [],
  );

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissSource = useCallback((source: string) => {
    setAlerts((prev) => prev.filter((a) => a.source !== source));
  }, []);

  const value = useMemo<AlertContextType>(
    () => ({ alerts, addAlert, dismissAlert, dismissSource }),
    [alerts, addAlert, dismissAlert, dismissSource],
  );

  return <AlertContext.Provider value={value}>{children}</AlertContext.Provider>;
}

export function useAlerts(): AlertContextType {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}
