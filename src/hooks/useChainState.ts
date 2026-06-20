'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

export type ChainStateSyncStatus = 'idle' | 'connecting' | 'live' | 'polling' | 'syncing' | 'error';

export interface ChainStateSnapshot {
  version: number;
  keyVersions: Record<string, number>;
  status: ChainStateSyncStatus;
  lastEventAt: number | null;
  lastSyncAt: number | null;
  error: string | null;
  source: 'manual' | 'websocket' | 'polling' | null;
}

export interface ChainStateEvent {
  type?: string;
  cacheKey?: string;
  cacheKeys?: string[];
  account?: string;
  publicKey?: string;
  prId?: string | number;
  txHash?: string;
}

interface UseChainStateOptions {
  cacheKey?: string;
  cacheKeys?: readonly string[];
  includeGlobal?: boolean;
  wsUrl?: string;
  pollIntervalMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1_000;
const SYNCING_STATUS_MS = 300;
const RECONNECT_DELAY_MS = 1_000;
const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_CHAIN_EVENTS_WS_URL?.trim() ?? '';
const configuredPollMs = Number(process.env.NEXT_PUBLIC_CHAIN_SYNC_POLL_MS);
const DEFAULT_CONFIGURED_POLL_INTERVAL_MS =
  Number.isFinite(configuredPollMs) && configuredPollMs > 0
    ? configuredPollMs
    : DEFAULT_POLL_INTERVAL_MS;

const INITIAL_SNAPSHOT: ChainStateSnapshot = {
  version: 0,
  keyVersions: {},
  status: 'idle',
  lastEventAt: null,
  lastSyncAt: null,
  error: null,
  source: null,
};

const subscribers = new Set<() => void>();

let snapshot = INITIAL_SNAPSHOT;
let activeConsumers = 0;
let socket: WebSocket | null = null;
let activeSocketUrl = '';
let pollTimer: number | null = null;
let reconnectTimer: number | null = null;
let syncingTimer: number | null = null;

function subscribe(listener: () => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function getSnapshot(): ChainStateSnapshot {
  return snapshot;
}

function emit(nextSnapshot: ChainStateSnapshot): void {
  snapshot = nextSnapshot;
  subscribers.forEach((listener) => listener());
}

function setStatus(status: ChainStateSyncStatus, error: string | null = null): void {
  if (snapshot.status === status && snapshot.error === error) {
    return;
  }

  emit({
    ...snapshot,
    status,
    error,
  });
}

function normalizeCacheKeys(cacheKeys?: readonly string[]): string[] {
  if (!cacheKeys) {
    return [];
  }

  return Array.from(
    new Set(
      cacheKeys
        .map((cacheKey) => cacheKey.trim())
        .filter((cacheKey) => cacheKey.length > 0),
    ),
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return 'Unable to synchronize chain state';
}

function scheduleSyncingStatusReset(): void {
  if (syncingTimer) {
    clearTimeout(syncingTimer);
  }

  syncingTimer = window.setTimeout(() => {
    syncingTimer = null;
    if (snapshot.status !== 'syncing') {
      return;
    }

    setStatus(socket ? 'live' : 'polling');
  }, SYNCING_STATUS_MS);
}

function normalizeEventPayload(value: unknown): ChainStateEvent | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as ChainStateEvent;
}

export function getChainStateEventKeys(event: ChainStateEvent | null): string[] {
  const keys = new Set<string>(['dashboard']);

  if (!event) {
    return Array.from(keys);
  }

  normalizeCacheKeys(event.cacheKeys).forEach((cacheKey) => keys.add(cacheKey));
  if (event.cacheKey) {
    normalizeCacheKeys([event.cacheKey]).forEach((cacheKey) => keys.add(cacheKey));
  }

  const account = event.account ?? event.publicKey;
  if (account) {
    keys.add(`account:${account}`);
    keys.add(`role:${account}`);
    keys.add(`reputation:${account}`);
  }

  if (event.prId !== undefined && event.prId !== null) {
    keys.add('prs');
    keys.add(`pr:${event.prId}`);
  }

  if (event.txHash) {
    keys.add('transactions');
  }

  if (event.type) {
    keys.add(`event:${event.type}`);
  }

  return Array.from(keys);
}

export function invalidateChainState(
  cacheKeys?: readonly string[],
  source: ChainStateSnapshot['source'] = 'manual',
): ChainStateSnapshot {
  const now = Date.now();
  const version = snapshot.version + 1;
  const keyVersions = { ...snapshot.keyVersions };

  normalizeCacheKeys(cacheKeys).forEach((cacheKey) => {
    keyVersions[cacheKey] = version;
  });

  const nextSnapshot: ChainStateSnapshot = {
    version,
    keyVersions,
    status: source === 'manual' ? 'syncing' : snapshot.status,
    lastEventAt: source === 'websocket' ? now : snapshot.lastEventAt,
    lastSyncAt: now,
    error: null,
    source,
  };

  emit(nextSnapshot);

  if (source === 'manual') {
    scheduleSyncingStatusReset();
  }

  return nextSnapshot;
}

function handleChainEventMessage(message: MessageEvent): void {
  try {
    const parsed = normalizeEventPayload(JSON.parse(String(message.data)));
    const cacheKeys = getChainStateEventKeys(parsed);

    // WebSocket payloads are only invalidation hints. Components still refetch
    // state from Horizon or trusted API routes before rendering updated data.
    invalidateChainState(cacheKeys, 'websocket');
  } catch (error) {
    setStatus('error', getErrorMessage(error));
  }
}

function stopPolling(): void {
  if (!pollTimer) {
    return;
  }

  clearInterval(pollTimer);
  pollTimer = null;
}

function startPolling(pollIntervalMs: number): void {
  if (pollTimer || typeof window === 'undefined') {
    return;
  }

  setStatus('polling');
  pollTimer = window.setInterval(() => {
    invalidateChainState(['dashboard'], 'polling');
  }, pollIntervalMs);
}

function stopSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (socket) {
    const closingSocket = socket;
    socket = null;
    closingSocket.close();
  }

  activeSocketUrl = '';
}

function startSocket(wsUrl: string, pollIntervalMs: number): void {
  if (typeof window === 'undefined' || !wsUrl) {
    startPolling(pollIntervalMs);
    return;
  }

  if (socket && activeSocketUrl === wsUrl) {
    return;
  }

  stopSocket();
  stopPolling();
  activeSocketUrl = wsUrl;
  setStatus('connecting');

  try {
    socket = new WebSocket(wsUrl);
  } catch (error) {
    setStatus('error', getErrorMessage(error));
    startPolling(pollIntervalMs);
    return;
  }

  const currentSocket = socket;

  currentSocket.addEventListener('open', () => {
    if (socket !== currentSocket) {
      return;
    }

    setStatus('live');
  });
  currentSocket.addEventListener('message', (message) => {
    if (socket !== currentSocket) {
      return;
    }

    handleChainEventMessage(message);
  });
  currentSocket.addEventListener('error', () => {
    if (socket !== currentSocket) {
      return;
    }

    setStatus('error', 'Chain event WebSocket failed');
  });
  currentSocket.addEventListener('close', () => {
    if (socket !== currentSocket) {
      return;
    }

    socket = null;
    if (activeConsumers <= 0) {
      return;
    }

    startPolling(pollIntervalMs);
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      startSocket(wsUrl, pollIntervalMs);
    }, RECONNECT_DELAY_MS);
  });
}

function retainChainStateEvents(options: UseChainStateOptions): () => void {
  activeConsumers += 1;
  const wsUrl = options.wsUrl?.trim() ?? DEFAULT_WS_URL;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_CONFIGURED_POLL_INTERVAL_MS;

  startSocket(wsUrl, pollIntervalMs);

  return () => {
    activeConsumers = Math.max(0, activeConsumers - 1);
    if (activeConsumers > 0) {
      return;
    }

    stopSocket();
    stopPolling();
    setStatus('idle');
  };
}

function getSelectedVersion(
  currentSnapshot: ChainStateSnapshot,
  cacheKeys: readonly string[],
  includeGlobal: boolean,
): number {
  const keyVersion = cacheKeys.reduce(
    (highestVersion, cacheKey) =>
      Math.max(highestVersion, currentSnapshot.keyVersions[cacheKey] ?? 0),
    0,
  );

  return includeGlobal ? Math.max(currentSnapshot.version, keyVersion) : keyVersion;
}

export function useChainState({
  cacheKey,
  cacheKeys,
  includeGlobal = true,
  wsUrl,
  pollIntervalMs,
}: UseChainStateOptions = {}) {
  const currentSnapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const selectedCacheKeys = useMemo(
    () => normalizeCacheKeys([...(cacheKeys ?? []), ...(cacheKey ? [cacheKey] : [])]),
    [cacheKey, cacheKeys],
  );
  const cacheKeySignature = selectedCacheKeys.join('\n');
  const syncVersion = getSelectedVersion(currentSnapshot, selectedCacheKeys, includeGlobal);

  useEffect(
    () => retainChainStateEvents({ wsUrl, pollIntervalMs }),
    [pollIntervalMs, wsUrl],
  );

  const forceSync = useCallback(
    async (nextCacheKeys?: readonly string[]) => {
      const keys = nextCacheKeys ?? selectedCacheKeys;
      invalidateChainState(keys.length > 0 ? keys : undefined, 'manual');
    },
    // selectedCacheKeys is memoized, but the signature keeps the dependency scalar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKeySignature],
  );

  return {
    ...currentSnapshot,
    cacheKeys: selectedCacheKeys,
    forceSync,
    isSyncing: currentSnapshot.status === 'syncing',
    syncVersion,
  };
}

export function resetChainStateForTests(): void {
  stopSocket();
  stopPolling();
  if (syncingTimer) {
    clearTimeout(syncingTimer);
    syncingTimer = null;
  }
  activeConsumers = 0;
  emit(INITIAL_SNAPSHOT);
}

export function getChainStateSnapshotForTests(): ChainStateSnapshot {
  return snapshot;
}
