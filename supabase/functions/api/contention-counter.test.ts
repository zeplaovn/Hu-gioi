import { createContentionCounter } from './contention-counter.ts';

Deno.test('B2: aggregate contention flushes without a follow-up event', () => {
  const calls: number[] = [];
  const pending: Array<() => void> = [];
  const add = createContentionCounter(
    count => calls.push(count),
    (flush, delayMs) => {
      if (delayMs !== 60000) throw Error('Unexpected flush interval');
      pending.push(flush);
    }
  );
  for (let i = 0; i < 100; i++) add({ expectedPgContention: true });
  add({ code: 'INTERNAL' });
  if (calls.length || pending.length !== 1)
    throw Error('Expected one timer and no individual contention logs');

  // End of the minute, without any new request.
  pending.shift()?.();
  if (calls.length !== 1 || calls[0] !== 100)
    throw Error('The last batch was not emitted at the timer boundary');

  add({ expectedPgContention: true });
  add({ code: 'INTERNAL' });
  if (calls.length !== 1 || pending.length !== 1)
    throw Error('Subsequent events must start a new reporting window');
  pending.shift()?.();
  if (calls.join(',') !== '100,1')
    throw Error('Expected one aggregate in the second reporting window');
});
