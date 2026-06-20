import { act, renderHook } from '@testing-library/react';
import { usePlayback } from '@/hooks/usePlayback';
import { DEFAULT_CONTRACT_HISTORY, type ContractStateSnapshot } from '@/components/ContractTimeTraveler';

const MOCK_SNAPSHOTS = DEFAULT_CONTRACT_HISTORY.slice(0, 3);

function makeSnapshot(overrides: Partial<ContractStateSnapshot> = {}): ContractStateSnapshot {
  return {
    ledger: 1,
    timestamp: '2026-01-01T00:00:00.000Z',
    txHash: '0x0',
    contractId: 'test',
    state: {},
    ...overrides,
  };
}

describe('usePlayback', () => {
  it('initializes with empty history', () => {
    const { result } = renderHook(() => usePlayback());
    expect(result.current.history).toEqual([]);
    expect(result.current.currentSnapshot).toBeNull();
    expect(result.current.totalSnapshots).toBe(0);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isAtStart).toBe(true);
    expect(result.current.isAtEnd).toBe(true);
    expect(result.current.diff).toBeNull();
  });

  it('initializes with provided history', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));
    expect(result.current.history).toHaveLength(3);
    expect(result.current.totalSnapshots).toBe(3);
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.currentSnapshot).toEqual(MOCK_SNAPSHOTS[2]);
  });

  it('positions at the last snapshot by default', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isAtEnd).toBe(true);
    expect(result.current.isAtStart).toBe(false);
  });

  it('goes to a specific index', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.goTo(0); });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.currentSnapshot).toEqual(MOCK_SNAPSHOTS[0]);
    expect(result.current.isAtStart).toBe(true);
    expect(result.current.isAtEnd).toBe(false);
  });

  it('clamps goTo to valid range', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.goTo(-5); });
    expect(result.current.currentIndex).toBe(0);

    act(() => { result.current.goTo(999); });
    expect(result.current.currentIndex).toBe(2);
  });

  it('goes to start', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.goToStart(); });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isAtStart).toBe(true);
  });

  it('goes to end', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.goTo(0); });
    act(() => { result.current.goToEnd(); });

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isAtEnd).toBe(true);
  });

  it('steps forward', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.goTo(0); });
    act(() => { result.current.stepForward(); });

    expect(result.current.currentIndex).toBe(1);
  });

  it('steps backward', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.stepBack(); });

    expect(result.current.currentIndex).toBe(1);
  });

  it('does not step forward beyond last index', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.stepForward(); });

    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isAtEnd).toBe(true);
  });

  it('does not step backward before first index', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.goTo(0); });
    act(() => { result.current.stepBack(); });

    expect(result.current.currentIndex).toBe(0);
  });

  it('computes diff between consecutive snapshots', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    expect(result.current.diff).not.toBeNull();
    expect(result.current.diff?.fromIndex).toBe(1);
    expect(result.current.diff?.toIndex).toBe(2);
  });

  it('returns null diff at first index', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.goTo(0); });

    expect(result.current.diff).toBeNull();
  });

  it('returns null diff for single snapshot history', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: [MOCK_SNAPSHOTS[0]] }));

    expect(result.current.diff).toBeNull();
    expect(result.current.totalSnapshots).toBe(1);
  });

  it('appends a snapshot to history', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));
    const newSnapshot = makeSnapshot({ ledger: 99, label: 'new' });

    act(() => { result.current.append(newSnapshot); });

    expect(result.current.history).toHaveLength(4);
    expect(result.current.history[3].ledger).toBe(99);
    expect(result.current.currentIndex).toBe(2);
  });

  it('clears history', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.clear(); });

    expect(result.current.history).toEqual([]);
    expect(result.current.currentSnapshot).toBeNull();
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it('replaces history', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));
    const newHistory = [makeSnapshot({ ledger: 10 }), makeSnapshot({ ledger: 20 })];

    act(() => { result.current.replaceHistory(newHistory); });

    expect(result.current.history).toHaveLength(2);
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentSnapshot?.ledger).toBe(20);
  });

  it('replaces history with empty array', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    act(() => { result.current.replaceHistory([]); });

    expect(result.current.history).toEqual([]);
    expect(result.current.currentIndex).toBe(0);
  });

  it('enforces max cache size on append', () => {
    const maxSize = 2;
    const { result } = renderHook(() =>
      usePlayback({ initialHistory: MOCK_SNAPSHOTS, maxCacheSize: maxSize }),
    );

    expect(result.current.history).toHaveLength(2);
  });

  it('enforces max cache size on initial history', () => {
    const maxSize = 2;
    const { result } = renderHook(() =>
      usePlayback({ initialHistory: DEFAULT_CONTRACT_HISTORY, maxCacheSize: maxSize }),
    );

    expect(result.current.history).toHaveLength(maxSize);
  });

  it('returns current snapshot', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: MOCK_SNAPSHOTS }));

    expect(result.current.currentSnapshot).toEqual(MOCK_SNAPSHOTS[2]);

    act(() => { result.current.goTo(1); });

    expect(result.current.currentSnapshot).toEqual(MOCK_SNAPSHOTS[1]);
  });

  it('handles empty history gracefully', () => {
    const { result } = renderHook(() => usePlayback({ initialHistory: [] }));

    expect(result.current.currentSnapshot).toBeNull();
    expect(result.current.diff).toBeNull();
    expect(result.current.isAtStart).toBe(true);
    expect(result.current.isAtEnd).toBe(true);
    expect(result.current.totalSnapshots).toBe(0);
  });

  it('plays through snapshots', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      usePlayback({ initialHistory: MOCK_SNAPSHOTS, initialSpeed: 100 }),
    );

    act(() => { result.current.goTo(0); });
    act(() => { result.current.play(); });

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.currentIndex).toBe(0);

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.currentIndex).toBe(1);

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.currentIndex).toBe(2);

    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.isPlaying).toBe(false);

    jest.useRealTimers();
  });

  it('pauses playback', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      usePlayback({ initialHistory: MOCK_SNAPSHOTS, initialSpeed: 100 }),
    );

    act(() => { result.current.goTo(0); });
    act(() => { result.current.play(); });
    act(() => { jest.advanceTimersByTime(100); });
    act(() => { result.current.pause(); });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentIndex).toBe(1);

    act(() => { jest.advanceTimersByTime(500); });
    expect(result.current.currentIndex).toBe(1);

    jest.useRealTimers();
  });

  it('toggles play state', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      usePlayback({ initialHistory: MOCK_SNAPSHOTS, initialSpeed: 100 }),
    );

    act(() => { result.current.goTo(0); });
    expect(result.current.isPlaying).toBe(false);

    act(() => { result.current.togglePlay(); });
    expect(result.current.isPlaying).toBe(true);

    act(() => { result.current.togglePlay(); });
    expect(result.current.isPlaying).toBe(false);

    jest.useRealTimers();
  });

  it('wraps to start when playing from end', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      usePlayback({ initialHistory: MOCK_SNAPSHOTS, initialSpeed: 100 }),
    );

    expect(result.current.isAtEnd).toBe(true);
    act(() => { result.current.play(); });
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isPlaying).toBe(true);

    jest.useRealTimers();
  });

  it('changes playback speed', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      usePlayback({ initialHistory: MOCK_SNAPSHOTS, initialSpeed: 500 }),
    );

    expect(result.current.playbackSpeed).toBe(500);

    act(() => { result.current.setSpeed(200); });
    expect(result.current.playbackSpeed).toBe(200);

    act(() => { result.current.setSpeed(0); });
    expect(result.current.playbackSpeed).toBe(100);

    act(() => { result.current.goTo(0); });
    act(() => { result.current.play(); });
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current.currentIndex).toBe(1);

    jest.useRealTimers();
  });

  it('uses initialSpeed option', () => {
    const { result } = renderHook(() =>
      usePlayback({ initialHistory: MOCK_SNAPSHOTS, initialSpeed: 3000 }),
    );

    expect(result.current.playbackSpeed).toBe(3000);
  });
});
