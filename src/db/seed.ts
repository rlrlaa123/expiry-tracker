import type { drizzle } from 'drizzle-orm/expo-sqlite';

import { categories } from './schema';

type Db = ReturnType<typeof drizzle>;

/**
 * 기본 제공 카테고리 (SPEC §2 PAO 테이블 + DEV-GUIDE M1).
 * 보존기간(MFG 기준) 기본값은 ADR 003 참고 — 출시 전 카테고리 전체 검토 필요(SPEC §2 주석).
 * '기타'는 AI 매칭 실패·커스텀 카테고리 삭제 시 폴백이므로 builtin으로 항상 존재해야 한다.
 */
export const BUILTIN_CATEGORIES = [
  { id: 'builtin-sunscreen', name: '선크림', paoMonths: 12, shelfLifeMonths: 36, builtin: true },
  { id: 'builtin-lip', name: '립 제품', paoMonths: 12, shelfLifeMonths: 36, builtin: true },
  { id: 'builtin-mascara', name: '마스카라', paoMonths: 6, shelfLifeMonths: 36, builtin: true },
  { id: 'builtin-ointment', name: '연고', paoMonths: 6, shelfLifeMonths: 36, builtin: true },
  { id: 'builtin-eyedrops', name: '안약', paoMonths: 1, shelfLifeMonths: 24, builtin: true },
  { id: 'builtin-seasoning', name: '조미료', paoMonths: 6, shelfLifeMonths: 24, builtin: true },
  { id: 'builtin-etc', name: '기타', paoMonths: null, shelfLifeMonths: null, builtin: true },
] as const;

export const FALLBACK_CATEGORY_ID = 'builtin-etc';

/** 멱등 시드 — 이미 있으면 건드리지 않는다 (사용자가 PAO 값을 편집했을 수 있음) */
export async function seedCategories(db: Db): Promise<void> {
  await db
    .insert(categories)
    .values([...BUILTIN_CATEGORIES])
    .onConflictDoNothing();
}
