'use client';
import { useState } from 'react';
import { castVote } from '@/lib/stellar-interact';
import ConnectButton from '@/components/ConnectButton';
import PRFeed from '@/components/PRFeed';

export default function Dashboard() {
  const [githubId, setGithubId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [txHash, setTxHash] = useState('');

  async function handleVote() {
    if (!githubId) return;
    setStatus('loading');
    try {
      const hash = await castVote(parseInt(githubId));
      setTxHash(hash);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Guardian Voting Portal</h1>
      <p className="text-slate-500 mb-8">Vero Protocol — Stellar Testnet</p>

      <ConnectButton />

      <div className="bg-white p-6 rounded-xl shadow-md max-w-md mt-6">
        <h2 className="text-xl font-semibold mb-4">Verify Contribution</h2>
        <input
          placeholder="GitHub PR ID (e.g. 42)"
          className="border p-2 w-full mb-4 rounded"
          onChange={(e) => setGithubId(e.target.value)}
          aria-label="GitHub PR ID"
        />
        <button
          onClick={handleVote}
          disabled={status === 'loading'}
          className="bg-indigo-600 text-white w-full py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {status === 'loading' ? 'Submitting…' : 'Cast Verification Vote'}
        </button>
        {status === 'done' && (
          <p className="mt-3 text-green-600 text-sm break-all">✓ Tx: {txHash}</p>
        )}
        {status === 'error' && (
          <p className="mt-3 text-red-500 text-sm">Vote failed. Check wallet and try again.</p>
        )}
      </div>

      <PRFeed />
    </main>
  );
}
