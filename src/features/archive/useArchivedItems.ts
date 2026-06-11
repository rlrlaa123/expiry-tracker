import { desc, eq, inArray } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { categories, items, type Category, type Item } from '@/db/schema';
import { diffDays } from '@/domain/date';

export interface ArchivedEntry {
  item: Item;
  category: Category | null;
  /** '2026년 6월' — 처리일 기준 월 그룹 키 */
  monthKey: string;
  /** '1개월 사용' / '12일 사용' — 개봉 이력이 있을 때만 */
  usage: string | null;
}

function monthKeyOf(isoDate: string): string {
  const [y, m] = isoDate.split('-').map(Number);
  return `${y}년 ${m}월`;
}

function usageOf(item: Item): string | null {
  if (!item.openedAt) return null;
  const days = diffDays(item.updatedAt, item.openedAt);
  if (days < 0) return null;
  return days >= 30 ? `${Math.round(days / 30)}개월 사용` : `${days}일 사용`;
}

/** 소진/폐기 품목 — 처리일(updatedAt) 내림차순 */
export function useArchivedItems(): ArchivedEntry[] {
  const { data } = useLiveQuery(
    db
      .select({ item: items, category: categories })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(inArray(items.status, ['consumed', 'discarded']))
      .orderBy(desc(items.updatedAt)),
  );
  return (data ?? []).map(({ item, category }) => ({
    item,
    category,
    monthKey: monthKeyOf(item.updatedAt),
    usage: usageOf(item),
  }));
}
