import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { categories, items, type Category, type Item, type NewItem } from '@/db/schema';
import { todayIso, type IsoDate } from '@/domain/date';
import { computeExpiry, extendExpiry, type ComputedExpiry } from '@/domain/expiry';

async function loadRow(id: string): Promise<{ item: Item; category: Category | null } | null> {
  const rows = await db
    .select({ item: items, category: categories })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(eq(items.id, id));
  return rows[0] ?? null;
}

function compute(item: Item, category: Category | null): ComputedExpiry | null {
  return computeExpiry(
    { exp: item.exp, mfg: item.mfg, openedAt: item.openedAt, paoMonthsOverride: item.paoMonths },
    {
      paoMonths: category?.paoMonths ?? null,
      shelfLifeMonths: category?.shelfLifeMonths ?? null,
    },
  );
}

/** 모든 변경의 단일 경로 — 패치 적용 후 computedExpiry 캐시를 항상 재계산해 저장 */
async function patchAndRecompute(
  id: string,
  patch: Partial<NewItem>,
): Promise<ComputedExpiry | null> {
  const row = await loadRow(id);
  if (!row) return null;
  const expiry = compute({ ...row.item, ...patch }, row.category);
  await db
    .update(items)
    .set({
      ...patch,
      computedExpiry: expiry?.date ?? null,
      expiryBasis: expiry?.basis ?? null,
      updatedAt: todayIso(),
    })
    .where(eq(items.id, id));
  return expiry;
}

/** 원탭 개봉 — 개봉일 자동 기록 + 만료일 재계산 (SPEC §2) */
export function openItem(id: string): Promise<ComputedExpiry | null> {
  return patchAndRecompute(id, { openedAt: todayIso(), status: 'in_use' });
}

/** 소진/폐기 → 아카이브 이동 (홈 리스트에서 제외) */
export function archiveItem(id: string, status: 'consumed' | 'discarded') {
  return patchAndRecompute(id, { status });
}

/** 만료 처리 시트의 '기한 연장' — 현재 만료일 +30일, PAO 무력화 */
export async function extendItemExpiry(id: string): Promise<ComputedExpiry | null> {
  const row = await loadRow(id);
  if (!row) return null;
  const patch = extendExpiry(compute(row.item, row.category)?.date ?? null, todayIso());
  return patchAndRecompute(id, { exp: patch.exp, paoMonths: patch.paoMonthsOverride });
}

/** 상세 화면 유통기한 인라인 수정 */
export function updateItemExp(id: string, exp: IsoDate | null) {
  return patchAndRecompute(id, { exp });
}

export interface CreateItemInput {
  name: string;
  brand: string | null;
  categoryId: string;
  thumbnailUri: string | null;
  exp: IsoDate | null;
  mfg: IsoDate | null;
  openedAt: IsoDate | null;
  location: string | null;
  memo: string | null;
}

/** 확인/편집 폼 저장 — id 발급 + 만료 캐시 계산 + insert */
export async function createItem(
  input: CreateItemInput,
): Promise<{ id: string; expiry: ComputedExpiry | null }> {
  const id = `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const today = todayIso();
  const category =
    (await db.select().from(categories).where(eq(categories.id, input.categoryId)))[0] ?? null;
  const expiry = computeExpiry(
    { exp: input.exp, mfg: input.mfg, openedAt: input.openedAt, paoMonthsOverride: null },
    {
      paoMonths: category?.paoMonths ?? null,
      shelfLifeMonths: category?.shelfLifeMonths ?? null,
    },
  );
  await db.insert(items).values({
    id,
    ...input,
    computedExpiry: expiry?.date ?? null,
    expiryBasis: expiry?.basis ?? null,
    status: input.openedAt ? 'in_use' : 'unopened',
    createdAt: today,
    updatedAt: today,
  });
  return { id, expiry };
}
