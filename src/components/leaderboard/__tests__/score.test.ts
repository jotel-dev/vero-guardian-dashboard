import {
  type AuditContributorInput,
  calculateAuditScore,
  rankAuditContributors,
  sanitizeAuditContributor,
} from '@/components/leaderboard/score';

const BASE_CONTRIBUTOR: AuditContributorInput = {
  contributorId: 'guardian-base',
  displayName: 'Base Guardian',
  walletAddress: 'GBASE1234567890',
  auditsCompleted: 0,
  validationsSubmitted: 0,
  criticalFindings: 0,
  highFindings: 0,
  mediumFindings: 0,
  acceptedFindings: 0,
  disputedFindings: 0,
  lastAuditAt: '2026-06-01T00:00:00.000Z',
};

function makeContributor(
  overrides: Partial<AuditContributorInput>,
): AuditContributorInput {
  return {
    ...BASE_CONTRIBUTOR,
    ...overrides,
  };
}

describe('leaderboard score calculation', () => {
  it('calculates audit activity score with weighted data points', () => {
    expect(
      calculateAuditScore({
        auditsCompleted: 2,
        validationsSubmitted: 3,
        criticalFindings: 1,
        highFindings: 2,
        mediumFindings: 4,
        acceptedFindings: 5,
        disputedFindings: 1,
      }),
    ).toBe(176);
  });

  it('ranks contributors by score and uses audits as a tie breaker', () => {
    const ranked = rankAuditContributors([
      makeContributor({
        contributorId: 'lower',
        displayName: 'Lower Score',
        auditsCompleted: 1,
      }),
      makeContributor({
        contributorId: 'same-score',
        displayName: 'Same Score',
        auditsCompleted: 2,
        validationsSubmitted: 2,
        criticalFindings: 1,
        highFindings: 2,
      }),
      makeContributor({
        contributorId: 'tie-audits',
        displayName: 'Tie With More Audits',
        auditsCompleted: 3,
        validationsSubmitted: 4,
      }),
    ]);

    expect(ranked.map((contributor) => contributor.contributorId)).toEqual([
      'tie-audits',
      'same-score',
      'lower',
    ]);
    expect(ranked.map((contributor) => contributor.rank)).toEqual([1, 2, 3]);
  });

  it('sanitizes unsafe strings and clamps invalid activity numbers', () => {
    const sanitized = sanitizeAuditContributor(
      makeContributor({
        contributorId: ' guardian<script> ',
        displayName: ' <Ada>\n  Lovelace ',
        walletAddress: 'GABC-123<script>',
        auditsCompleted: -8,
        validationsSubmitted: Number.NaN,
        criticalFindings: 1.9,
        highFindings: Number.POSITIVE_INFINITY,
        mediumFindings: 1_000_001,
        acceptedFindings: 4,
        disputedFindings: -1,
        lastAuditAt: 'not a date',
      }),
    );

    expect(sanitized).toMatchObject({
      contributorId: 'guardianscript',
      displayName: 'Ada Lovelace',
      walletAddress: 'GABC123SCRIPT',
      auditsCompleted: 0,
      validationsSubmitted: 0,
      criticalFindings: 1,
      highFindings: 0,
      mediumFindings: 1_000_000,
      acceptedFindings: 4,
      disputedFindings: 0,
      lastAuditAt: undefined,
    });
  });
});
