'use client';
import { useWallet } from '@/context/WalletContext';

export default function ConnectButton() {
  const { publicKey, connected, connect, disconnect } = useWallet();

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600 font-mono">
          {publicKey.slice(0, 6)}…{publicKey.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="text-sm text-red-500 hover:underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect().catch(console.error)}
      className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"
    >
      Connect Freighter
    </button>
  );
}
