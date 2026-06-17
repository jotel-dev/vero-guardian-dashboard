'use client';

import { useState, useEffect } from 'react';
import VoteCard from '@/components/VoteCard';
import { GitPullRequest, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/context/WalletContext';

interface PR {
  id: number;
  titleKey: string;
  author: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  votes: number;
}

export default function PRFeed() {
  const { t } = useTranslation();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const { publicKey } = useWallet();

  useEffect(() => {
    // Mock data - replace with real API fetch
    const mockPRs: PR[] = [
      {
        id: 42,
        titleKey: 'prs.titleMultiSig',
        author: '@dev_alice',
        url: 'https://github.com/vero/pr/42',
        status: 'pending',
        votes: 5,
      },
      {
        id: 43,
        titleKey: 'prs.titleGas',
        author: '@dev_bob',
        url: 'https://github.com/vero/pr/43',
        status: 'pending',
        votes: 3,
      },
      {
        id: 44,
        titleKey: 'prs.titleRateLimit',
        author: '@dev_charlie',
        url: 'https://github.com/vero/pr/44',
        status: 'pending',
        votes: 8,
      },
    ];

    setTimeout(() => {
      setPrs(mockPRs);
      setLoading(false);
    }, 800);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-slate-400">{t('prs.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <GitPullRequest className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('prs.heading')}</h2>
        <span className="ml-auto px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-full border border-slate-200 dark:border-slate-700">
          {t('prs.count', { count: prs.length })}
        </span>
      </div>
      
      <div className="space-y-3">
        {prs.map((pr) => {
          const title = t(pr.titleKey);
          const voteCardPr = {
            id: pr.id,
            title,
            author: pr.author,
            url: pr.url,
          };

          return (
            <div key={pr.id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-sm">
              <div className="flex-1">
                <a 
                  href={pr.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1"
                  aria-label={t('prs.ariaLabel', { id: pr.id, title })}
                >
                  #{pr.id} {title}
                </a>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">{pr.author}</span>
                  <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span>{t('prs.votes', { count: pr.votes })}</span>
                  </span>
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <VoteCard pr={voteCardPr} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
