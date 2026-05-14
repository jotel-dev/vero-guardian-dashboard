# Vero Guardian Dashboard — Sprint Plan

## Wave Program Overview

The Wave Program runs in two-week sprints. Maintainers open scoped issues tagged `wave:open` at the start of each cycle. Contributors claim an issue by commenting, then open a PR before the sprint closes. Merged PRs earn reputation points tracked on-chain.

---

## Work Types

| Label | Type | Scope | Est. Hours |
|---|---|---|---|
| `bug` | Bug fix | Single file/function | ≤ 4 h |
| `feature` | New feature | Spec in issue body, tests required | 4–12 h |
| `docs` | Documentation | README, JSDoc, diagrams | 1–4 h |
| `test` | Testing | Uncovered paths, hook tests | 2–6 h |
| `ui` | UI/UX polish | Tailwind, a11y, responsive | 2–8 h |

---

## Sprint 1 — Foundation (Week 1–2)

**Goal:** Runnable app with wallet connection and basic vote submission.

- [x] Scaffold Next.js 14 project with TypeScript and Tailwind
- [x] `WalletContext` — Freighter connect/disconnect, public key state
- [x] `stellar-interact.ts` — `castVote()` builds and submits tx
- [x] `page.tsx` — PR ID input + vote button
- [x] `ConnectButton` component
- [ ] `.env.example` and deployment notes

**Issues to open:** `bug` — handle Freighter not installed gracefully; `ui` — loading spinner on vote submission.

---

## Sprint 2 — PR Feed (Week 3–4)

**Goal:** Live feed of pending PRs pulled from the Vero Relayer.

- [ ] `PRFeed` component — fetches `/api/prs` and renders `VoteCard` list
- [ ] `VoteCard` component — PR title, author, status badge, vote button
- [ ] `/api/prs` route — proxies Relayer endpoint, returns typed `PR[]`
- [ ] Optimistic UI — mark card as voted immediately, revert on error

**Issues to open:** `feature` — PR feed with pagination; `test` — mock Relayer responses in Jest.

---

## Sprint 3 — Reputation & History (Week 5–6)

**Goal:** Guardian can see their vote history and consensus score.

- [ ] `ReputationBadge` component — score fetched from contract state
- [ ] `VoteHistory` component — paginated list of past votes
- [ ] `stellar-interact.ts` — `getReputation(publicKey)` reads contract data entry
- [ ] Cache layer — SWR hook wrapping Horizon calls

**Issues to open:** `feature` — reputation display; `docs` — document contract data schema.

---

## Sprint 4 — Polish & Hardening (Week 7–8)

**Goal:** Production-ready UX, full test coverage, accessibility pass.

- [ ] Error boundary around vote submission flow
- [ ] Toast notifications (success / failure)
- [ ] Keyboard navigation and ARIA labels on all interactive elements
- [ ] Jest + React Testing Library — unit tests for all components
- [ ] Playwright e2e — connect wallet → cast vote → confirm tx hash

**Issues to open:** `ui` — full a11y audit; `test` — e2e suite setup.

---

## Contribution Rules

1. One issue per contributor per sprint.
2. PRs must include tests for any new logic in `src/lib/` or `src/context/`.
3. All UI changes must pass `npm run lint` and `npm run build` before review.
4. Tag your PR with the same label as the issue (`bug`, `feature`, etc.).
