import { NextResponse } from 'next/server';
import type { PR } from '@/components/VoteCard';

// Stub — replace with real Vero Relayer endpoint
const RELAYER_URL = process.env.RELAYER_URL ?? '';

export async function GET() {
  if (RELAYER_URL) {
    const res = await fetch(RELAYER_URL);
    const data: PR[] = await res.json();
    return NextResponse.json(data);
  }

  // Fallback mock data for local development
  const mock: PR[] = [
    { id: 42, title: 'Add Freighter error handling', author: 'alice', url: 'https://github.com/example/repo/pull/42' },
    { id: 43, title: 'Fix reputation fetch on testnet', author: 'bob', url: 'https://github.com/example/repo/pull/43' },
  ];
  return NextResponse.json(mock);
}
