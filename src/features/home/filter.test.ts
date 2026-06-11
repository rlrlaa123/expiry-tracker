import { describe, expect, it } from 'vitest';

import { badge } from '@/domain/expiry';

import type { EnrichedItem } from '../items/enrich';
import { distinctLocations, filterEntries } from './filter';

/** 필터에 필요한 필드만 채운 스텁 */
function entry(over: { name?: string; location?: string | null; dday: number | null }): EnrichedItem {
  return {
    item: { name: over.name ?? '품목', location: over.location ?? null } as EnrichedItem['item'],
    category: null,
    expiry: null,
    dday: over.dday,
    badge: badge(over.dday),
  };
}

const expired = entry({ name: '마데카솔 연고', location: '약장', dday: -6 });
const soon = entry({ name: '오뚜기 참기름', location: '주방', dday: 14 });
const edge30 = entry({ name: '키스미 마스카라', location: '욕실', dday: 30 });
const safe = entry({ name: '라네즈 선크림', location: '욕실', dday: 643 });
const unset = entry({ name: '록시땅 핸드크림', location: '욕실', dday: null });
const all = [expired, soon, edge30, safe, unset];

describe('filterEntries', () => {
  it('전체는 그대로', () => {
    expect(filterEntries(all, { kind: 'all' }, '')).toHaveLength(5);
  });

  it('임박(D-30)은 0 ≤ dday ≤ 30 — 만료·미설정 제외', () => {
    expect(filterEntries(all, { kind: 'soon' }, '')).toEqual([soon, edge30]);
  });

  it('만료는 dday < 0만', () => {
    expect(filterEntries(all, { kind: 'expired' }, '')).toEqual([expired]);
  });

  it('기한 미설정은 dday null만', () => {
    expect(filterEntries(all, { kind: 'unset' }, '')).toEqual([unset]);
  });

  it('위치 필터', () => {
    expect(filterEntries(all, { kind: 'location', location: '욕실' }, '')).toEqual([
      edge30,
      safe,
      unset,
    ]);
  });

  it('검색어는 품목명 부분 일치, 필터와 AND', () => {
    expect(filterEntries(all, { kind: 'all' }, '참기름')).toEqual([soon]);
    expect(filterEntries(all, { kind: 'expired' }, '참기름')).toEqual([]);
    expect(filterEntries(all, { kind: 'all' }, '  마스카라 ')).toEqual([edge30]);
  });
});

describe('distinctLocations', () => {
  it('중복 제거 + 가나다순, null 위치 제외', () => {
    expect(distinctLocations(all)).toEqual(['약장', '욕실', '주방']);
  });
});
