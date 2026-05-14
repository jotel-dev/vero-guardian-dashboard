# Vero Guardian Dashboard

The on-chain verification interface for the Vero protocol. Guardians connect their Freighter wallets, review pending GitHub PRs, and cast cryptographically-signed votes directly on the Stellar testnet — turning decentralized quality control into a one-click workflow.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Browser (Guardian)                  │
│                                                     │
│  ┌──────────────┐      ┌──────────────────────────┐ │
│  │  Next.js UI  │─────▶│   WalletContext (React)  │ │
│  │  (page.tsx)  │      │   Freighter SDK          │ │
│  └──────┬───────┘      └──────────────────────────┘ │
│         │                                           │
│         ▼                                           │
│  ┌──────────────────────────────────────────────┐   │
│  │         stellar-interact.ts (lib)            │   │
│  │  buildVoteTx → signWithFreighter → submit    │   │
│  └──────────────────────┬───────────────────────┘   │
└─────────────────────────┼───────────────────────────┘
                          │ HTTPS / Horizon API
                          ▼
              ┌───────────────────────┐
              │  Stellar Testnet      │
              │  Vero Smart Contract  │
              └───────────────────────┘
```

**Key layers:**

| Layer | File | Responsibility |
|---|---|---|
| UI | `src/app/page.tsx` | Guardian voting form |
| State | `src/context/WalletContext.tsx` | Freighter connection & public key |
| Blockchain | `src/lib/stellar-interact.ts` | Build, sign, submit transactions |
| Components | `src/components/` | VoteCard, ConnectButton, PRFeed |

---

## Features

- **Freighter Integration** — Securely sign voting transactions without exposing private keys.
- **Task Feed** — Live list of GitHub PRs registered by the Vero Relayer awaiting verification.
- **Reputation Status** — Guardian consensus score and vote history.
- **One-click Voting** — `castVote(prId)` builds and submits the Stellar transaction in one call.

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your Freighter wallet on **Testnet**, and start verifying.

---

## Code Snippets

### Connect Freighter wallet

```ts
// src/context/WalletContext.tsx
import { getPublicKey, isConnected } from '@stellar/freighter-api';

export async function connectWallet(): Promise<string> {
  if (!(await isConnected())) throw new Error('Freighter not installed');
  return getPublicKey();
}
```

### Cast a verification vote

```ts
// src/lib/stellar-interact.ts
import * as StellarSdk from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

export async function castVote(prId: number): Promise<string> {
  const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
  const sourceKeypair = StellarSdk.Keypair.random(); // replaced by Freighter public key at runtime
  const account = await server.loadAccount(sourceKeypair.publicKey());

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.manageData({ name: `vote_${prId}`, value: 'approve' })
    )
    .setTimeout(30)
    .build();

  const signed = await signTransaction(tx.toXDR(), { network: 'TESTNET' });
  const result = await server.submitTransaction(
    StellarSdk.TransactionBuilder.fromXDR(signed, StellarSdk.Networks.TESTNET)
  );
  return result.hash;
}
```

### Dashboard page

```tsx
// src/app/page.tsx
'use client';
import { useState } from 'react';
import { castVote } from '@/lib/stellar-interact';
import ConnectButton from '@/components/ConnectButton';

export default function Dashboard() {
  const [prId, setPrId] = useState('');
  return (
    <main className="p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Guardian Voting Portal</h1>
      <ConnectButton />
      <div className="bg-white p-6 rounded-xl shadow-md max-w-md mt-6">
        <input
          placeholder="GitHub PR ID (e.g. 42)"
          className="border p-2 w-full mb-4 rounded"
          onChange={(e) => setPrId(e.target.value)}
        />
        <button
          onClick={() => castVote(parseInt(prId))}
          className="bg-indigo-600 text-white w-full py-2 rounded-lg font-medium hover:bg-indigo-700"
        >
          Cast Verification Vote
        </button>
      </div>
    </main>
  );
}
```

---

## Environment Variables

```env
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=YOUR_VERO_CONTRACT_ID
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## Wave Program

The Wave Program structures contribution into sprint cycles. Maintainers open scoped issues tagged `wave:open`; contributors claim them and deliver within the sprint window.

**Work types posted each wave:**

- **Bug fixes** — Labelled `bug`, scoped to a single file or function, estimated ≤ 4 hours.
- **New features** — Labelled `feature`, spec included in the issue body, requires a PR with tests.
- **Documentation** — Labelled `docs`, covers README updates, inline JSDoc, and architecture diagrams.
- **Testing** — Labelled `test`, targets uncovered paths in `stellar-interact.ts` and context hooks.
- **UI/UX polish** — Labelled `ui`, Tailwind refinements, accessibility fixes, responsive layout.

See [`plan.md`](./plan.md) for the full sprint breakdown.

---

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- [Stellar SDK](https://github.com/stellar/js-stellar-sdk)
- [Freighter API](https://github.com/stellar/freighter)
- [Tailwind CSS](https://tailwindcss.com/)
