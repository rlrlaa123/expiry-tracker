import { eq, notInArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { categories, items } from '@/db/schema';
import { todayIso } from '@/domain/date';

import { enrichItems, type EnrichedItem } from './enrich';

/** 아카이브로 빠지는 상태 — 홈 리스트에서 제외 (SPEC §6) */
export const ARCHIVED_STATUSES = ['consumed', 'discarded'] as const;

/** 활성 품목 + 카테고리를 구독하고 표시용 파생값(만료일·D-day·뱃지)을 붙여 임박순으로 반환 */
export function useActiveItems(): EnrichedItem[] {
  const { data } = useLiveQuery(
    db
      .select({ item: items, category: categories })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(notInArray(items.status, [...ARCHIVED_STATUSES])),
  );
  return enrichItems(data ?? [], todayIso());
}

/** 단일 품목 구독 (상세 화면) — 없으면 null (삭제·아카이브 직후) */
export function useItem(id: string): EnrichedItem | null {
  const { data } = useLiveQuery(
    db
      .select({ item: items, category: categories })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(eq(items.id, id)),
    [id],
  );
  const enriched = enrichItems(data ?? [], todayIso());
  return enriched[0] ?? null;
}
