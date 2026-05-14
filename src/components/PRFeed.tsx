'use client';
import { useEffect, useState } from 'react';
import VoteCard, { type PR } from './VoteCard';

export default function PRFeed() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/prs')
      .then((r) => r.json())
      .then((data: PR[]) => setPrs(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-10 max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Pending Verifications</h2>
      {loading && <p className="text-slate-400">Loading…</p>}
      <div className="flex flex-col gap-3">
        {prs.map((pr) => (
          <VoteCard key={pr.id} pr={pr} />
        ))}
      </div>
    </section>
  );
}
