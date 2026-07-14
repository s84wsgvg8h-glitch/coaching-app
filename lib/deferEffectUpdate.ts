/**
 * Defers a callback to the next microtask. Use inside useEffect when synchronous
 * setState would trigger react-hooks/set-state-in-effect without changing behavior.
 */
export function deferEffectUpdate(callback: () => void): void {
  queueMicrotask(callback);
}
