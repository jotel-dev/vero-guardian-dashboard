'use client';

import { useState } from 'react';
import { castVote, UnauthorizedGuardianError } from '@/services/contractClient';
import { useToast } from '@/components/Toast';

interface VoteButtonProps {
  prId: number;
  publicKey: string | null;
}

export default function VoteButton({ prId, publicKey }: VoteButtonProps) {
  const { showToast } = useToast();
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleVote() {
    if (!publicKey) {
      showToast('Connect your wallet first', 'warning');
      return;
    }

    setLoading(true);
    try {
      const hash = await castVote(prId, publicKey);
      setVoted(true);
      showToast(`Vote recorded — tx ${hash.slice(0, 8)}…`, 'success');
    } catch (err) {
      if (err instanceof UnauthorizedGuardianError) {
        showToast('Not an authorized Guardian', 'error');
      } else {
        showToast(err instanceof Error ? err.message : 'Vote failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleVote}
      disabled={voted || loading || !publicKey}
      aria-label={
        voted
          ? `Voted for PR #${prId}`
          : loading
          ? `Casting vote for PR #${prId}`
          : `Vote for PR #${prId}`
      }
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
        voted
          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default'
          : loading
          ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 cursor-wait'
          : !publicKey
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20'
      }`}
    >
      {voted ? '✓ Voted' : loading ? 'Signing…' : 'Vote'}
    </button>
  );
}
