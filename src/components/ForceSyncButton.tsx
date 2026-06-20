'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChainState } from '@/hooks/useChainState';

const DASHBOARD_SYNC_KEYS = ['dashboard', 'prs', 'transactions'];

export default function ForceSyncButton(): ReactElement {
  const { t } = useTranslation();
  const { forceSync, status, isSyncing } = useChainState({
    cacheKeys: DASHBOARD_SYNC_KEYS,
  });
  const [isPending, setIsPending] = useState(false);
  const pendingResetRef = useRef<number | null>(null);
  const isBusy = isPending || isSyncing;

  useEffect(() => {
    return () => {
      if (pendingResetRef.current !== null) {
        window.clearTimeout(pendingResetRef.current);
      }
    };
  }, []);

  async function handleForceSync(): Promise<void> {
    setIsPending(true);
    try {
      await forceSync();
    } finally {
      if (pendingResetRef.current !== null) {
        window.clearTimeout(pendingResetRef.current);
      }

      pendingResetRef.current = window.setTimeout(() => {
        pendingResetRef.current = null;
        setIsPending(false);
      }, 250);
    }
  }

  return (
    <button
      type="button"
      onClick={handleForceSync}
      disabled={isBusy}
      aria-label={t('sync.forceAria', { status })}
      title={t('sync.forceAria', { status })}
      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-wait disabled:opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <RefreshCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span className="hidden sm:inline">{isBusy ? t('sync.syncing') : t('sync.force')}</span>
    </button>
  );
}
