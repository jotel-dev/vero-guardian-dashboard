'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  appendSnapshot,
  diffSnapshots,
  type ContractStateSnapshot,
  type SnapshotDiff,
} from '@/components/ContractTimeTraveler';

export interface UsePlaybackOptions {
  initialHistory?: ContractStateSnapshot[];
  maxCacheSize?: number;
  initialSpeed?: number;
}

export interface UsePlaybackResult {
  currentIndex: number;
  currentSnapshot: ContractStateSnapshot | null;
  history: readonly ContractStateSnapshot[];
  isPlaying: boolean;
  isAtStart: boolean;
  isAtEnd: boolean;
  totalSnapshots: number;
  playbackSpeed: number;

  goTo: (index: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  stepForward: () => void;
  stepBack: () => void;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;

  append: (snapshot: ContractStateSnapshot) => void;
  clear: () => void;
  replaceHistory: (history: ContractStateSnapshot[]) => void;

  diff: SnapshotDiff | null;
}

export function usePlayback(options: UsePlaybackOptions = {}): UsePlaybackResult {
  const {
    initialHistory = [],
    maxCacheSize,
    initialSpeed = 1500,
  } = options;

  const [history, setHistory] = useState<ContractStateSnapshot[]>(() => {
    if (initialHistory.length === 0) return [];
    const clamped = appendSnapshot(
      initialHistory.slice(0, -1),
      initialHistory[initialHistory.length - 1],
      maxCacheSize,
    );
    return clamped;
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => Math.max(0, history.length - 1));
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSpeed);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSnapshots = history.length;
  const currentSnapshot = history[currentIndex] ?? null;
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex >= totalSnapshots - 1;

  const diff = useMemo<SnapshotDiff | null>(() => {
    if (currentIndex === 0 || totalSnapshots < 2) return null;
    return diffSnapshots(history, currentIndex - 1, currentIndex);
  }, [history, currentIndex, totalSnapshots]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex((prev) => {
      const clamped = Math.max(0, Math.min(index, history.length - 1));
      return clamped;
    });
  }, [history.length]);

  const goToStart = useCallback(() => {
    goTo(0);
  }, [goTo]);

  const goToEnd = useCallback(() => {
    goTo(history.length - 1);
  }, [goTo, history.length]);

  const stepForward = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, history.length - 1));
  }, [history.length]);

  const stepBack = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const play = useCallback(() => {
    if (isAtEnd) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  }, [isAtEnd]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && isAtEnd) {
        setCurrentIndex(0);
      }
      return !prev;
    });
  }, [isAtEnd]);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(Math.max(100, speed));
  }, []);

  const append = useCallback((snapshot: ContractStateSnapshot) => {
    setHistory((prev) => appendSnapshot(prev, snapshot, maxCacheSize));
  }, [maxCacheSize]);

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const replaceHistory = useCallback((newHistory: ContractStateSnapshot[]) => {
    if (newHistory.length === 0) {
      setHistory([]);
      setCurrentIndex(0);
      return;
    }
    const clamped = appendSnapshot(
      newHistory.slice(0, -1),
      newHistory[newHistory.length - 1],
      maxCacheSize,
    );
    setHistory(clamped);
    setCurrentIndex(clamped.length - 1);
  }, [maxCacheSize]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= history.length) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, playbackSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, history.length]);

  return {
    currentIndex,
    currentSnapshot,
    history,
    isPlaying,
    isAtStart,
    isAtEnd,
    totalSnapshots,
    playbackSpeed,

    goTo,
    goToStart,
    goToEnd,
    stepForward,
    stepBack,

    play,
    pause,
    togglePlay,
    setSpeed,

    append,
    clear,
    replaceHistory,

    diff,
  };
}
