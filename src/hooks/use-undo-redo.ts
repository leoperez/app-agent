import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 50;

export function useUndoRedo<T>(initial: T) {
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);

  const push = useCallback(
    (next: T) => {
      past.current = [...past.current, present].slice(-MAX_HISTORY);
      future.current = [];
      setPresent(next);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [present]
  );

  const undo = useCallback(() => {
    if (past.current.length === 0) return;
    const prev = past.current[past.current.length - 1];
    past.current = past.current.slice(0, -1);
    future.current = [present, ...future.current].slice(0, MAX_HISTORY);
    setPresent(prev);
  }, [present]);

  const redo = useCallback(() => {
    if (future.current.length === 0) return;
    const next = future.current[0];
    future.current = future.current.slice(1);
    past.current = [...past.current, present].slice(-MAX_HISTORY);
    setPresent(next);
  }, [present]);

  const reset = useCallback((value: T) => {
    past.current = [];
    future.current = [];
    setPresent(value);
  }, []);

  return {
    present,
    setPresent: push,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    reset,
  };
}
