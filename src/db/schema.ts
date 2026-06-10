import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** 카테고리 — PAO 계산 키이자 AI 프롬프트 동적 주입 대상 (SPEC §3, §7-1) */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  /** 개봉 후 사용기한 기본값 (개월). null = 미설정 → PAO 계산 미적용 */
  paoMonths: integer('pao_months'),
  /** 제조일 기준 보존기간 기본값 (개월) */
  shelfLifeMonths: integer('shelf_life_months'),
  /** true면 삭제 불가, 값 편집만 가능 */
  builtin: integer('builtin', { mode: 'boolean' }).notNull().default(false),
});

/** 품목 상태 (SPEC §3). expired는 표시 시점에 computedExpiry로도 파생되지만 처리 이력 보존용 */
export const ITEM_STATUSES = ['unopened', 'in_use', 'expired', 'consumed', 'discarded'] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  thumbnailUri: text('thumbnail_uri'),
  /** 날짜는 전부 'YYYY-MM-DD' 텍스트 — 도메인 IsoDate와 동일 표현 */
  exp: text('exp'),
  mfg: text('mfg'),
  openedAt: text('opened_at'),
  /** 품목별 PAO 덮어쓰기 (개월). null = 카테고리 기본값 사용, 0 = 설정 안 함 */
  paoMonths: integer('pao_months'),
  /** computeExpiry 캐시 — 정렬·필터 쿼리용. 입력 변경 시마다 재계산해 저장 */
  computedExpiry: text('computed_expiry'),
  expiryBasis: text('expiry_basis'),
  status: text('status', { enum: ITEM_STATUSES }).notNull().default('unopened'),
  location: text('location'),
  memo: text('memo'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type Category = typeof categories.$inferSelect;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
