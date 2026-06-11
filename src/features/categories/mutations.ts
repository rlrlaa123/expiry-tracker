import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { categories, items } from '@/db/schema';
import { FALLBACK_CATEGORY_ID } from '@/db/seed';
import { todayIso } from '@/domain/date';
import { computeExpiry } from '@/domain/expiry';
import { rescheduleDigest } from '@/services/notifications';

/** 카테고리 PAO 변경·이동은 소속 품목의 만료 캐시를 무효화 — 전부 재계산 */
async function recomputeItemsForCategory(categoryId: string): Promise<void> {
  const cat =
    (await db.select().from(categories).where(eq(categories.id, categoryId)))[0] ?? null;
  const rows = await db.select().from(items).where(eq(items.categoryId, categoryId));
  for (const item of rows) {
    const expiry = computeExpiry(
      { exp: item.exp, mfg: item.mfg, openedAt: item.openedAt, paoMonthsOverride: item.paoMonths },
      {
        paoMonths: cat?.paoMonths ?? null,
        shelfLifeMonths: cat?.shelfLifeMonths ?? null,
      },
    );
    await db
      .update(items)
      .set({
        computedExpiry: expiry?.date ?? null,
        expiryBasis: expiry?.basis ?? null,
        updatedAt: todayIso(),
      })
      .where(eq(items.id, item.id));
  }
}

/** PAO 기본값 편집 (builtin 포함 — 편집은 항상 허용). 0은 '설정 안 함' → null 저장 */
export async function setCategoryPao(id: string, paoMonths: number): Promise<void> {
  await db
    .update(categories)
    .set({ paoMonths: paoMonths === 0 ? null : paoMonths })
    .where(eq(categories.id, id));
  await recomputeItemsForCategory(id);
  void rescheduleDigest();
}

export type AddCategoryResult = { ok: true; id: string } | { ok: false; reason: 'empty' | 'duplicate' };

/** 커스텀 카테고리 추가 — 이름 필수, PAO 선택(0/null = 미설정) (SPEC §7-1) */
export async function addCategory(
  name: string,
  paoMonths: number | null,
): Promise<AddCategoryResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  const dup = await db.select().from(categories).where(eq(categories.name, trimmed));
  if (dup.length > 0) return { ok: false, reason: 'duplicate' };
  const id = `cat-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await db.insert(categories).values({
    id,
    name: trimmed,
    paoMonths: paoMonths || null,
    shelfLifeMonths: null,
    builtin: false,
  });
  return { ok: true, id };
}

/** 커스텀 카테고리 삭제 — 소속 품목은 '기타'로 이동, 품목 데이터 보존 (SPEC §7-1) */
export async function deleteCategory(id: string): Promise<void> {
  const cat = (await db.select().from(categories).where(eq(categories.id, id)))[0];
  if (!cat || cat.builtin) return;
  // 이동+삭제는 원자적으로 — 중간 실패 시 품목만 이동된 반쪽 상태 방지 (동기 드라이버라 .run())
  db.transaction((tx) => {
    tx.update(items)
      .set({ categoryId: FALLBACK_CATEGORY_ID, updatedAt: todayIso() })
      .where(eq(items.categoryId, id))
      .run();
    tx.delete(categories).where(eq(categories.id, id)).run();
  });
  await recomputeItemsForCategory(FALLBACK_CATEGORY_ID);
  void rescheduleDigest();
}
