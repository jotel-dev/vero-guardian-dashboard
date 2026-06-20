import {
  getChainStateEventKeys,
  getChainStateSnapshotForTests,
  invalidateChainState,
  resetChainStateForTests,
} from '@/hooks/useChainState';

describe('chain state invalidation', () => {
  afterEach(() => {
    resetChainStateForTests();
  });

  it('maps WebSocket event metadata to scoped cache keys', () => {
    expect(
      getChainStateEventKeys({
        type: 'vote_confirmed',
        account: 'GABC',
        prId: 42,
        txHash: 'abc123',
      }),
    ).toEqual(
      expect.arrayContaining([
        'dashboard',
        'account:GABC',
        'role:GABC',
        'reputation:GABC',
        'prs',
        'pr:42',
        'transactions',
        'event:vote_confirmed',
      ]),
    );
  });

  it('uses events only as invalidation hints, not rendered chain state', () => {
    const snapshot = invalidateChainState(
      getChainStateEventKeys({
        cacheKeys: ['dashboard'],
        account: 'GABC',
      }),
      'websocket',
    );

    expect(snapshot.version).toBe(1);
    expect(snapshot.keyVersions.dashboard).toBe(1);
    expect(snapshot.keyVersions['account:GABC']).toBe(1);
    expect(getChainStateSnapshotForTests()).not.toHaveProperty('account');
    expect(getChainStateSnapshotForTests()).not.toHaveProperty('publicKey');
  });

  it('increments the global version for manual force syncs', () => {
    const first = invalidateChainState(['dashboard'], 'manual');
    const second = invalidateChainState(['dashboard'], 'manual');

    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(second.status).toBe('syncing');
  });
});
