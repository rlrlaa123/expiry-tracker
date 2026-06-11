import type { EnrichedItem } from '../items/enrich';

/** 홈 필터 칩 (목업 home-list .filters) */
export type HomeFilter =
  | { kind: 'all' }
  | { kind: 'soon' }
  | { kind: 'expired' }
  | { kind: 'unset' }
  | { kind: 'location'; location: string };

export function filterEntries(
  entries: EnrichedItem[],
  filter: HomeFilter,
  query: string,
): EnrichedItem[] {
  const q = query.trim();
  return entries.filter((e) => {
    if (q && !e.item.name.includes(q)) return false;
    switch (filter.kind) {
      case 'soon':
        return e.dday !== null && e.dday >= 0 && e.dday <= 30;
      case 'expired':
        return e.dday !== null && e.dday < 0;
      case 'unset':
        return e.dday === null;
      case 'location':
        return e.item.location === filter.location;
      default:
        return true;
    }
  });
}

/** 위치 칩 목록 — 활성 품목의 distinct 보관 위치 (가나다순) */
export function distinctLocations(entries: EnrichedItem[]): string[] {
  const locs = new Set<string>();
  for (const e of entries) if (e.item.location) locs.add(e.item.location);
  return [...locs].sort((a, b) => a.localeCompare(b, 'ko'));
}
