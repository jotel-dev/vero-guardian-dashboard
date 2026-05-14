'use client';
import { useState } from 'react';
import { castVote } from '@/lib/stellar-interact';
import { useWallet } from '@/context/WalletContext';

export interface PR {
  id: number;
  title: string;
  author: string;
  url: string;
}

export default function VoteCard({ pr }: { pr: PR }) {
  const { publicKey } = useWallet();
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleVote() {
    if (!publicKey) return alert('Connect your wallet first');
    setLoading(true);
    try {
      await castVote(pr.id, publicKey);
      setVoted(true);
    } catch {
      alert('Vote failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 flex items-center justify-between">
      <div>
        <a href={pr.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
          #{pr.id} {pr.title}
        </a>
        <p className="text-sm text-slate-500">by {pr.author}</p>
      </div>
      <button
        onClick={handleVote}
        disabled={voted || loading}
        className="ml-4 bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {voted ? '✓ Voted' : loading ? '…' : 'Vote'}
      </button>
    </div>
  );
}
