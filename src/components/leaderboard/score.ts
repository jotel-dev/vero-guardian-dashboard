export type AuditContributorInput = {
  contributorId: string;
  displayName: string;
  walletAddress?: string;
  auditsCompleted: number;
  validationsSubmitted: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  acceptedFindings: number;
  disputedFindings?: number;
  lastAuditAt?: string;
};

export type RankedAuditContributor = {
  rank: number;
  contributorId: string;
  displayName: string;
  walletAddress?: string;
  auditsCompleted: number;
  validationsSubmitted: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  acceptedFindings: number;
  disputedFindings: number;
  score: number;
  lastAuditAt?: string;
};

const SCORE_WEIGHTS = {
  auditsCompleted: 24,
  validationsSubmitted: 10,
  criticalFindings: 20,
  highFindings: 12,
  mediumFindings: 6,
  acceptedFindings: 8,
  disputedFindings: -10,
} as const;

const MAX_ACTIVITY_VALUE = 1_000_000;
const FALLBACK_NAME = 'Unknown contributor';

function sanitizeText(value: string, fallback: string): string {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

function sanitizeCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(Math.floor(value), 0), MAX_ACTIVITY_VALUE);
}

function sanitizeDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function sanitizeWalletAddress(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return cleaned.length > 0 ? cleaned.slice(0, 56) : undefined;
}

export function sanitizeAuditContributor(
  contributor: AuditContributorInput,
): Omit<RankedAuditContributor, 'rank' | 'score'> {
  return {
    contributorId: sanitizeText(contributor.contributorId, cryptoFallbackId(contributor.displayName)),
    displayName: sanitizeText(contributor.displayName, FALLBACK_NAME),
    walletAddress: sanitizeWalletAddress(contributor.walletAddress),
    auditsCompleted: sanitizeCount(contributor.auditsCompleted),
    validationsSubmitted: sanitizeCount(contributor.validationsSubmitted),
    criticalFindings: sanitizeCount(contributor.criticalFindings),
    highFindings: sanitizeCount(contributor.highFindings),
    mediumFindings: sanitizeCount(contributor.mediumFindings),
    acceptedFindings: sanitizeCount(contributor.acceptedFindings),
    disputedFindings: sanitizeCount(contributor.disputedFindings ?? 0),
    lastAuditAt: sanitizeDate(contributor.lastAuditAt),
  };
}

export function calculateAuditScore(
  contributor: Pick<
    RankedAuditContributor,
    | 'auditsCompleted'
    | 'validationsSubmitted'
    | 'criticalFindings'
    | 'highFindings'
    | 'mediumFindings'
    | 'acceptedFindings'
    | 'disputedFindings'
  >,
): number {
  return Math.max(
    0,
    contributor.auditsCompleted * SCORE_WEIGHTS.auditsCompleted +
      contributor.validationsSubmitted * SCORE_WEIGHTS.validationsSubmitted +
      contributor.criticalFindings * SCORE_WEIGHTS.criticalFindings +
      contributor.highFindings * SCORE_WEIGHTS.highFindings +
      contributor.mediumFindings * SCORE_WEIGHTS.mediumFindings +
      contributor.acceptedFindings * SCORE_WEIGHTS.acceptedFindings +
      contributor.disputedFindings * SCORE_WEIGHTS.disputedFindings,
  );
}

export function rankAuditContributors(
  contributors: AuditContributorInput[],
): RankedAuditContributor[] {
  const ranked = contributors
    .map((contributor) => {
      const sanitized = sanitizeAuditContributor(contributor);
      return {
        ...sanitized,
        score: calculateAuditScore(sanitized),
        rank: 0,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.auditsCompleted !== a.auditsCompleted) {
        return b.auditsCompleted - a.auditsCompleted;
      }

      return a.displayName.localeCompare(b.displayName);
    });

  return ranked.map((contributor, index) => ({
    ...contributor,
    rank: index + 1,
  }));
}

function cryptoFallbackId(seed: string): string {
  const source = seed.trim() || FALLBACK_NAME;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `contributor-${hash.toString(16)}`;
}
