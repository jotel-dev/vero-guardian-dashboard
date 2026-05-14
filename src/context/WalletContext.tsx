'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getPublicKey, isConnected } from '@stellar/freighter-api';

interface WalletState {
  publicKey: string | null;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!(await isConnected())) throw new Error('Freighter extension not found');
    const key = await getPublicKey();
    setPublicKey(key);
  }, []);

  const disconnect = useCallback(() => setPublicKey(null), []);

  return (
    <WalletContext.Provider value={{ publicKey, connected: !!publicKey, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
