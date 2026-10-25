import { expect, it } from 'vitest';
import { MapRequestCache, isAborted } from '../infrastructure/maps/requestCache';
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
it('drops obsolete queued locations and loads the latest after the active request', async () => {
  const cache = new MapRequestCache<string>(2, () => 1), first = deferred<string>(), called: string[] = [];
  const a = cache.get('a', () => { called.push('a'); return first.promise; });
  const obsolete = new AbortController();
  const b = cache.get('old', async () => { called.push('old'); return 'old'; }, obsolete.signal).catch(isAborted);
  obsolete.abort();
  const c = cache.get('latest', async () => { called.push('latest'); return 'latest'; });
  first.resolve('a');
  expect(await a).toBe('a'); expect(await b).toBe(true); expect(await c).toBe('latest');
  expect(called).toEqual(['a', 'latest']);
});
it('shares active requests and keeps them alive when one preview stops waiting', async () => {
  const cache = new MapRequestCache<string>(1, () => 2), data = deferred<string>(); let calls = 0;
  const first = new AbortController();
  const a = cache.get('same', () => { calls++; return data.promise; }, first.signal).catch(isAborted);
  const b = cache.get('same', async () => { calls++; return 'duplicate'; });
  first.abort(); data.resolve('cached');
  expect(await a).toBe(true); expect(await b).toBe('cached'); expect(calls).toBe(1);
  expect(await cache.get('same', async () => 'unexpected')).toBe('cached');
});
