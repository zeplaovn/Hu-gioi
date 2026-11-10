/* Per-isolate lock/serialization contention counter.
 * Coalesce expected conflicts, then flush once after 60 seconds even if
 * there is no subsequent request. Schedule only while a batch is pending.
 * Timers are best effort: a terminated/suspended Edge isolate cannot
 * guarantee delivery of the final log batch. */
export function createContentionCounter(
  report: (count: number) => void,
  schedule: (flush: () => void, delayMs: number) => void =
    (flush, delayMs) => { setTimeout(flush, delayMs); },
  periodMs = 60000
): (err: unknown) => void {
  let count = 0;
  let scheduled = false;
  return (err: unknown) => {
    if (!(err as { expectedPgContention?: boolean } | null)?.expectedPgContention) return;
    count++;
    if (scheduled) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      const total = count;
      count = 0;
      if (total) report(total);
    }, periodMs);
  };
}
