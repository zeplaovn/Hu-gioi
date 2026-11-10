/* Per-isolate lock/serialization contention counter.
 * Không log từng lỗi; chỉ tổng số sau mỗi cửa sổ >= 60 giây có sự kiện. */
export function createContentionCounter(
  report: (count: number) => void,
  clock: () => number = Date.now,
  periodMs = 60000
): (err: unknown) => void {
  let count = 0;
  let started = clock();
  return (err: unknown) => {
    if (!(err as { expectedPgContention?: boolean } | null)?.expectedPgContention) return;
    count++;
    const now = clock();
    if (now - started < periodMs) return;
    const total = count;
    count = 0;
    started = now;
    report(total);
  };
}
