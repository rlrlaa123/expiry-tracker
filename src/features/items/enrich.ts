import type { IsoDate } from '@/domain/date';
import { badge, computeExpiry, dday, type BadgeInfo, type ComputedExpiry } from '@/domain/expiry';
import type { Category, Item } from '@/db/schema';

export interface EnrichedItem {
  item: Item;
  category: Category | null;
  expiry: ComputedExpiry | null;
  dday: number | null;
  badge: BadgeInfo;
}

/** 표시용 파생값 계산 + 임박순 정렬 (기한 미설정은 맨 뒤) */
export function enrichItems(
  rows: { item: Item; category: Category | null }[],
  today: IsoDate,
): EnrichedItem[] {
  const enriched = rows.map(({ item, category }) => {
    const expiry = computeExpiry(
      {
        exp: item.exp,
        mfg: item.mfg,
        openedAt: item.openedAt,
        paoMonthsOverride: item.paoMonths,
      },
      {
        paoMonths: category?.paoMonths ?? null,
        shelfLifeMonths: category?.shelfLifeMonths ?? null,
      },
    );
    const d = dday(expiry?.date ?? null, today);
    return { item, category, expiry, dday: d, badge: badge(d) };
  });
  return enriched.sort(
    (a, b) => (a.dday ?? Number.MAX_SAFE_INTEGER) - (b.dday ?? Number.MAX_SAFE_INTEGER),
  );
}

/** 'YYYY-MM-DD' → '2026.06.05' (목업 fmt) */
export function formatDot(date: IsoDate): string {
  return date.replaceAll('-', '.');
}

/** 홈 행 meta용 짧은 계산 근거: '유통기한 기준 (개봉 기한보다 빠름)' → '유통기한' */
export function shortBasis(basis: string): string {
  return basis.replace(' 기준', '').replace(' (개봉 기한보다 빠름)', '');
}

/** 카테고리 이모지 — 썸네일(M3 사진) 전 placeholder 겸 기본 아이콘 */
const CATEGORY_EMOJI: Record<string, string> = {
  'builtin-sunscreen': '🧴',
  'builtin-lip': '💄',
  'builtin-mascara': '👁️',
  'builtin-ointment': '🩹',
  'builtin-eyedrops': '💧',
  'builtin-seasoning': '🧂',
};

export function categoryEmoji(categoryId: string | null | undefined): string {
  return (categoryId && CATEGORY_EMOJI[categoryId]) || '📦';
}
