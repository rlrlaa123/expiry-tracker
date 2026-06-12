import { describe, expect, it } from 'vitest';

import { checkRateLimit } from './rateLimit';

/** 인메모리 KV 스텁 — get/put만 구현 (TTL은 기록만) */
function fakeKv() {
  const store = new Map<string, string>();
  const ttls = new Map<string, number | undefined>();
  return {
    store,
    ttls,
    kv: {
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: string, opts?: { expirationTtl?: number }) => {
        store.set(key, value);
        ttls.set(key, opts?.expirationTtl);
      },
    } as unknown as KVNamespace,
  };
}

const NOW = new Date('2026-06-12T09:00:00Z');

describe('checkRateLimit — device_id당 분5/일50 (SPEC §11)', () => {
  it('한도 안에서는 허용하며 분/일 카운터를 증가', async () => {
    const { kv, store } = fakeKv();
    expect(await checkRateLimit(kv, 'dev-a', NOW)).toEqual({ allowed: true });
    const minuteKey = `rl:dev-a:m:${Math.floor(NOW.getTime() / 60_000)}`;
    expect(store.get(minuteKey)).toBe('1');
    expect(store.get('rl:dev-a:d:2026-06-12')).toBe('1');
  });

  it('분당 5회 초과는 거부', async () => {
    const { kv } = fakeKv();
    for (let i = 0; i < 5; i++) expect((await checkRateLimit(kv, 'dev-a', NOW)).allowed).toBe(true);
    expect(await checkRateLimit(kv, 'dev-a', NOW)).toEqual({ allowed: false, reason: 'minute' });
  });

  it('일 50회 초과는 거부 (분 카운터는 분이 바뀌면 리셋)', async () => {
    const { kv, store } = fakeKv();
    store.set('rl:dev-a:d:2026-06-12', '50');
    expect(await checkRateLimit(kv, 'dev-a', NOW)).toEqual({ allowed: false, reason: 'day' });
  });

  it('기기별로 독립 카운트', async () => {
    const { kv, store } = fakeKv();
    store.set('rl:dev-a:d:2026-06-12', '50');
    expect((await checkRateLimit(kv, 'dev-b', NOW)).allowed).toBe(true);
  });

  it('거부 시에는 카운터를 증가시키지 않음', async () => {
    const { kv, store } = fakeKv();
    const minuteKey = `rl:dev-a:m:${Math.floor(NOW.getTime() / 60_000)}`;
    store.set(minuteKey, '5');
    await checkRateLimit(kv, 'dev-a', NOW);
    expect(store.get(minuteKey)).toBe('5');
  });

  it('TTL: 분 키 ≈ 2분, 일 키 ≈ 25시간', async () => {
    const { kv, ttls } = fakeKv();
    await checkRateLimit(kv, 'dev-a', NOW);
    const minuteKey = `rl:dev-a:m:${Math.floor(NOW.getTime() / 60_000)}`;
    expect(ttls.get(minuteKey)).toBe(120);
    expect(ttls.get('rl:dev-a:d:2026-06-12')).toBe(60 * 60 * 25);
  });
});
