import { useEffect, useState } from "react";

// Przesunięcie zegara klienta względem serwera — żeby timer tury był zgodny u wszystkich.
let offset = 0;

export function syncClock(serverTime: number): void {
  offset = serverTime - Date.now();
}

export function serverNow(): number {
  return Date.now() + offset;
}

/** Sekundy do `deadline` (czas serwera), odświeżane kilka razy na sekundę. */
export function useSecondsLeft(deadline: number | null): number | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [deadline]);
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - serverNow()) / 1000));
}
