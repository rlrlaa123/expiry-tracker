import type { drizzle } from 'drizzle-orm/expo-sqlite';

import { addDays, todayIso, type IsoDate } from '@/domain/date';
import { computeExpiry } from '@/domain/expiry';

import { BUILTIN_CATEGORIES } from './seed';
import { items, type NewItem } from './schema';

type Db = ReturnType<typeof drizzle>;

const CAT = Object.fromEntries(BUILTIN_CATEGORIES.map((c) => [c.id, c]));

interface DevItemSpec {
  id: string;
  name: string;
  brand?: string;
  categoryId: string;
  location: string | null;
  /** 오늘 기준 상대 일수 — 시드 시점과 무관하게 목업의 D-day 분포 재현 */
  expIn?: number;
  mfgIn?: number;
  openedIn?: number;
  createdIn?: number;
  memo?: string;
}

/**
 * 목업 home-list 샘플 8종 (M3 등록 플로우 전 폰 확인용).
 * 만료 D+6 / 임박 D-9·D-14 / D-34 / 안전 / 기한 미설정이 모두 보이도록 구성.
 */
const DEV_ITEMS: DevItemSpec[] = [
  // 마데카솔: 개봉+6개월(10월)보다 EXP(D+6 전)가 빠름 → 만료 상태
  { id: 'dev-madecassol', name: '마데카솔 연고', categoryId: 'builtin-ointment', location: '약장', expIn: -6, openedIn: -71 },
  // 인공눈물: EXP 없음, 개봉 22일 전 + PAO 1개월 → D-8 임박
  { id: 'dev-eyedrops', name: '프렌즈 인공눈물', brand: 'JW중외제약', categoryId: 'builtin-eyedrops', location: '약장', mfgIn: -265, openedIn: -22, memo: '개봉 후 1개월 — 한 달 지나면 미련 없이 폐기' },
  // 참기름: EXP(D-14)가 개봉+6개월보다 빠름
  { id: 'dev-sesame-oil', name: '오뚜기 참기름', brand: '오뚜기', categoryId: 'builtin-seasoning', location: '주방', expIn: 14, openedIn: -121 },
  // 마스카라: 개봉 147일 전 + PAO 6개월 → D-30대
  { id: 'dev-mascara', name: '키스미 마스카라', categoryId: 'builtin-mascara', location: '욕실', openedIn: -147 },
  { id: 'dev-tylenol', name: '타이레놀 500mg', categoryId: 'builtin-etc', location: '약장', expIn: 111 },
  { id: 'dev-sunscreen', name: '라네즈 워터뱅크 선크림', brand: '라네즈', categoryId: 'builtin-sunscreen', location: '욕실', expIn: 643, createdIn: -10, memo: '올리브영 세일 때 2개 구매' },
  { id: 'dev-lipbalm', name: '니베아 립밤', brand: '니베아', categoryId: 'builtin-lip', location: '욕실', expIn: 537, createdIn: -25 },
  // 기한 미설정 케이스
  { id: 'dev-handcream', name: '록시땅 핸드크림', brand: '록시땅', categoryId: 'builtin-etc', location: '욕실', createdIn: -30 },
];

function toNewItem(spec: DevItemSpec, today: IsoDate): NewItem {
  const rel = (days: number | undefined) => (days === undefined ? null : addDays(today, days));
  const exp = rel(spec.expIn);
  const mfg = rel(spec.mfgIn);
  const openedAt = rel(spec.openedIn);
  const cat = CAT[spec.categoryId];
  const expiry = computeExpiry(
    { exp, mfg, openedAt, paoMonthsOverride: null },
    { paoMonths: cat?.paoMonths ?? null, shelfLifeMonths: cat?.shelfLifeMonths ?? null },
  );
  const createdAt = rel(spec.createdIn) ?? openedAt ?? today;
  return {
    id: spec.id,
    name: spec.name,
    brand: spec.brand ?? null,
    categoryId: spec.categoryId,
    exp,
    mfg,
    openedAt,
    computedExpiry: expiry?.date ?? null,
    expiryBasis: expiry?.basis ?? null,
    status: openedAt ? 'in_use' : 'unopened',
    location: spec.location,
    memo: spec.memo ?? null,
    createdAt,
    updatedAt: createdAt,
  };
}

/** 개발 빌드에서 품목 테이블이 비어 있을 때만 1회 시드 — 실데이터가 생기면 손대지 않음 */
export async function seedDevItems(db: Db): Promise<void> {
  if (!__DEV__) return;
  const existing = await db.select({ id: items.id }).from(items).limit(1);
  if (existing.length > 0) return;
  const today = todayIso();
  await db.insert(items).values(DEV_ITEMS.map((s) => toNewItem(s, today)));
}
