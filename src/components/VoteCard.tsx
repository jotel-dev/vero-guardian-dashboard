'use client';

import { useWallet } from '@/context/WalletContext';
import VoteButton from '@/components/VoteButton';

export interface PR {
  id: number;
  title: string;
  author: string;
  url: string;
}

export default function VoteCard({ pr }: { pr: PR }) {
  const { publicKey } = useWallet();

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-slate-900 dark:text-white">{pr.title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          PR #{pr.id} · {pr.author}
        </p>
      </div>
      <VoteButton prId={pr.id} publicKey={publicKey} />
    </div>
  );
}
