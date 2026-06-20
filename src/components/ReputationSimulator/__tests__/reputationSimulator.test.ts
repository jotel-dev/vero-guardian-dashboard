import {
  ACTION_DELTAS,
  MAX_REPUTATION,
  MIN_REPUTATION,
  clampScore,
  simulateMultipleActions,
  simulateScoreImpact,
} from '@/components/ReputationSimulator/reputationSimulator';

describe('clampScore', () => {
  it('clamps below minimum to 0', () => {
    expect(clampScore(-100)).toBe(0);
  });

  it('clamps above maximum to MAX_REPUTATION', () => {
    expect(clampScore(MAX_REPUTATION + 1)).toBe(MAX_REPUTATION);
  });

  it('truncates fractional values', () => {
    expect(clampScore(42.9)).toBe(42);
  });

  it('passes valid mid-range values through', () => {
    expect(clampScore(500)).toBe(500);
  });
});

describe('simulateScoreImpact', () => {
  it('adds correct delta for approve_vote', () => {
    const { projectedScore, delta } = simulateScoreImpact(100, 'approve_vote');
    expect(delta).toBe(ACTION_DELTAS.approve_vote);
    expect(projectedScore).toBe(100 + ACTION_DELTAS.approve_vote);
  });

  it('subtracts correct delta for dispute_vote', () => {
    const { projectedScore, delta } = simulateScoreImpact(50, 'dispute_vote');
    expect(delta).toBe(ACTION_DELTAS.dispute_vote);
    expect(projectedScore).toBe(50 + ACTION_DELTAS.dispute_vote);
  });

  it('scales linearly with count', () => {
    const { delta } = simulateScoreImpact(100, 'complete_audit', 3);
    expect(delta).toBe(ACTION_DELTAS.complete_audit * 3);
  });

  it('clamps projected score to MIN_REPUTATION when result would go negative', () => {
    const { projectedScore, delta } = simulateScoreImpact(5, 'dispute_vote', 1);
    expect(projectedScore).toBe(MIN_REPUTATION);
    // delta reflects actual change after clamping
    expect(delta).toBe(-5);
  });

  it('clamps projected score to MAX_REPUTATION on overflow', () => {
    const { projectedScore } = simulateScoreImpact(MAX_REPUTATION - 1, 'critical_finding', 100);
    expect(projectedScore).toBe(MAX_REPUTATION);
  });

  it('treats fractional count as truncated integer', () => {
    const { delta } = simulateScoreImpact(0, 'high_finding', 2.9);
    expect(delta).toBe(ACTION_DELTAS.high_finding * 2);
  });

  it('returns zero delta for count of 0', () => {
    const { delta, projectedScore } = simulateScoreImpact(200, 'medium_finding', 0);
    expect(delta).toBe(0);
    expect(projectedScore).toBe(200);
  });
});

describe('simulateMultipleActions', () => {
  it('combines deltas from multiple actions', () => {
    const { delta } = simulateMultipleActions(0, {
      approve_vote: 2,
      complete_audit: 1,
    });
    expect(delta).toBe(ACTION_DELTAS.approve_vote * 2 + ACTION_DELTAS.complete_audit * 1);
  });

  it('handles mixed positive and negative actions', () => {
    const { projectedScore } = simulateMultipleActions(100, {
      critical_finding: 1,
      dispute_vote: 2,
    });
    const expected = clampScore(
      100 + ACTION_DELTAS.critical_finding + ACTION_DELTAS.dispute_vote * 2,
    );
    expect(projectedScore).toBe(expected);
  });

  it('clamps to 0 when negative actions exceed current score', () => {
    const { projectedScore, delta } = simulateMultipleActions(5, { dispute_vote: 5 });
    expect(projectedScore).toBe(MIN_REPUTATION);
    expect(delta).toBe(-5);
  });

  it('returns current score unchanged for empty actions map', () => {
    const { projectedScore, delta } = simulateMultipleActions(300, {});
    expect(projectedScore).toBe(300);
    expect(delta).toBe(0);
  });

  it('sanitizes fractional counts in action map', () => {
    const { delta } = simulateMultipleActions(0, { submit_validation: 1.7 });
    expect(delta).toBe(ACTION_DELTAS.submit_validation * 1);
  });
});

describe('ACTION_DELTAS constants', () => {
  it('all values are non-zero integers', () => {
    for (const [action, value] of Object.entries(ACTION_DELTAS)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).not.toBe(0);
    }
  });

  it('dispute_vote is negative (penalty)', () => {
    expect(ACTION_DELTAS.dispute_vote).toBeLessThan(0);
  });

  it('complete_audit has the highest positive delta', () => {
    const positiveDeltas = Object.values(ACTION_DELTAS).filter((v) => v > 0);
    expect(ACTION_DELTAS.complete_audit).toBe(Math.max(...positiveDeltas));
  });
});
