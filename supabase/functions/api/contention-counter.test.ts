import { createContentionCounter } from './contention-counter.ts';
Deno.test('B2: contention counter reports only an aggregate, never each exception', () => {
  let now = 1000;
  const calls: number[] = [];
  const add = createContentionCounter(n => calls.push(n), () => now);
  for (let i = 0; i < 100; i++) add({ expectedPgContention: true });
  add({ code: 'INTERNAL' });
  if (calls.length) throw Error('Do not log contention per event');
  now += 60000;
  add({ expectedPgContention: true });
  if (calls.length !== 1 || calls[0] !== 101) throw Error('Expected one aggregate for 101 events');
  add({ expectedPgContention: true });
  if (calls.length !== 1) throw Error('Must not log another event within the same minute');
});
