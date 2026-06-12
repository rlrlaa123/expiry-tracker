import { eq } from 'drizzle-orm';
import { File } from 'expo-file-system';

import { db } from '@/db/client';
import { categories, items, type Category, type Item, type NewItem } from '@/db/schema';
import { todayIso, type IsoDate } from '@/domain/date';
import { computeExpiry, extendExpiry, type ComputedExpiry } from '@/domain/expiry';
import { rescheduleDigest } from '@/services/notifications';

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
  // 카테고리가 바뀌는 패치면 새 카테고리 기본값으로 재계산해야 한다
  const category =
    patch.categoryId && patch.categoryId !== row.item.categoryId
      ? ((await db.select().from(categories).where(eq(categories.id, patch.categoryId)))[0] ??
        null)
      : row.category;
  const expiry = compute({ ...row.item, ...patch }, category);
  await db
    .update(items)
    .set({
      ...patch,
      computedExpiry: expiry?.date ?? null,
      expiryBasis: expiry?.basis ?? null,
      updatedAt: todayIso(),
    })
    .where(eq(items.id, id));
  // 데이터 변경 시마다 다음 묶음 알림 재예약 (DEV-GUIDE §4-4)
  void rescheduleDigest();
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

/** 원탭 개봉 실행취소 — 미개봉 상태로 복원 (UX-SCENARIOS S5) */
export function undoOpen(id: string) {
  return patchAndRecompute(id, { openedAt: null, status: 'unopened' });
}

/** 개봉일 수정 — null이면 미개봉으로 복귀 */
export function setOpenedDate(id: string, openedAt: IsoDate | null) {
  return patchAndRecompute(
    id,
    openedAt ? { openedAt, status: 'in_use' } : { openedAt: null, status: 'unopened' },
  );
}

export interface EditableFields {
  name: string;
  brand: string | null;
  categoryId: string;
  location: string | null;
  memo: string | null;
}

/** 상세 '정보 수정' — 이름·브랜드·카테고리·위치·메모 (SPEC §9 편집, UX-SCENARIOS S4) */
export function updateItemFields(id: string, fields: EditableFields) {
  return patchAndRecompute(id, fields);
}

/**
 * 완전 삭제 — 행 제거 + 다른 품목이 공유하지 않는 썸네일 파일 정리 (UX-SCENARIOS S4).
 * 보존이 기본 원칙이므로 호출부는 반드시 확인 시트를 거칠 것.
 */
export async function deleteItem(id: string): Promise<void> {
  const row = await loadRow(id);
  if (!row) return;
  const uri = row.item.thumbnailUri;
  await db.delete(items).where(eq(items.id, id));
  if (uri) {
    // "다시 샀어요" 복사본이 같은 파일을 참조할 수 있다 — 마지막 참조일 때만 파일 삭제
    const stillUsed = await db
      .select({ id: items.id })
      .from(items)
      .where(eq(items.thumbnailUri, uri));
    if (stillUsed.length === 0) {
      try {
        new File(uri).delete();
      } catch {
        // 파일이 이미 없어도 무방
      }
    }
  }
  void rescheduleDigest();
}

export interface CreateItemInput {
  name: string;
  brand: string | null;
  categoryId: string;
  thumbnailUri: string | null;
  exp: IsoDate | null;
  mfg: IsoDate | null;
  openedAt: IsoDate | null;
  /** 품목별 PAO 덮어쓰기 (라벨 12M 심볼 적용 등). null = 카테고리 기본값 */
  paoMonths: number | null;
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
    {
      exp: input.exp,
      mfg: input.mfg,
      openedAt: input.openedAt,
      paoMonthsOverride: input.paoMonths,
    },
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
  void rescheduleDigest();
  return { id, expiry };
}

/**
 * 아카이브 "다시 샀어요" — 기존 정보를 복사한 새 품목을 홈에 등록 (SPEC §6).
 * 기한만 새로 받는다(나중에 입력 = null). 원본 이력은 아카이브에 보존.
 */
export async function rebuyItem(
  sourceId: string,
  exp: IsoDate | null,
): Promise<{ id: string; expiry: ComputedExpiry | null } | null> {
  const row = await loadRow(sourceId);
  if (!row) return null;
  const src = row.item;
  return createItem({
    name: src.name,
    brand: src.brand,
    categoryId: src.categoryId,
    thumbnailUri: src.thumbnailUri,
    exp,
    mfg: null,
    openedAt: null,
    paoMonths: src.paoMonths,
    location: src.location,
    memo: null,
  });
}
