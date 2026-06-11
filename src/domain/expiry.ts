import { addDays, addMonthsClamped, diffDays, type IsoDate } from './date';

/** 만료일 계산에 필요한 품목 측 입력 (DEV-GUIDE §4-1) */
export interface ExpirySource {
  /** 유통기한 (라벨 표기) */
  exp: IsoDate | null;
  /** 제조일 */
  mfg: IsoDate | null;
  /** 개봉일 */
  openedAt: IsoDate | null;
  /** 품목별 PAO 덮어쓰기 (개월). null이면 카테고리 기본값 사용, 0은 '설정 안 함' */
  paoMonthsOverride: number | null;
}

export interface CategoryDefaults {
  /** 개봉 후 사용기한 기본값 (개월). null/0 = 설정 안 함 */
  paoMonths: number | null;
  /** 제조일 기준 보존기간 기본값 (개월) */
  shelfLifeMonths: number | null;
}

export interface ComputedExpiry {
  date: IsoDate;
  /** 상세 화면 '계산 근거' 문구 */
  basis: string;
}

export function computeExpiry(
  item: ExpirySource,
  category: CategoryDefaults,
): ComputedExpiry | null {
  let base: ComputedExpiry | null = null;
  if (item.exp) {
    base = { date: item.exp, basis: '유통기한 기준' };
  } else if (item.mfg && category.shelfLifeMonths) {
    base = {
      date: addMonthsClamped(item.mfg, category.shelfLifeMonths),
      basis: `제조일 + ${category.shelfLifeMonths}개월 기준`,
    };
  }

  const pao = item.paoMonthsOverride ?? category.paoMonths;
  // PAO가 0 또는 null이면 '설정 안 함' → 개봉일 단계 스킵
  if (item.openedAt && pao) {
    const paoDate = addMonthsClamped(item.openedAt, pao);
    if (!base || paoDate < base.date) {
      return { date: paoDate, basis: `개봉일 + ${pao}개월 기준` };
    }
    if (base.date < paoDate) {
      return { date: base.date, basis: `${base.basis} (개봉 기한보다 빠름)` };
    }
  }
  return base;
}

/** 만료일까지 남은 일수 (음수 = 경과). expiry가 없으면 null */
export function dday(expiry: IsoDate | null, today: IsoDate): number | null {
  return expiry === null ? null : diffDays(expiry, today);
}

export type BadgeLevel = 'expired' | 'd7' | 'd30' | 'safe' | 'none';

export interface BadgeInfo {
  level: BadgeLevel;
  /** 목업 표기: 만료 D+N / 임박 D-N / 미설정 '기한 미설정' */
  label: string;
}

/**
 * 수명 진행바 % (0~100 정수) — 상세 화면의 (개봉일 또는 등록일) → 만료일 구간에서 오늘의 위치.
 * 구간이 퇴화(end ≤ start)했으면 경과 여부만 본다 — 이미 만료된 채 등록된 품목.
 */
export function lifeProgress(start: IsoDate, end: IsoDate, today: IsoDate): number {
  const span = diffDays(end, start);
  if (span <= 0) return diffDays(today, end) >= 0 ? 100 : 0;
  const elapsed = diffDays(today, start);
  return Math.round(Math.min(100, Math.max(0, (elapsed / span) * 100)));
}

/**
 * 만료 처리 시트의 '기한 연장' — 사용자가 직접 상태를 확인했으므로
 * 현재 만료일(없으면 오늘)에서 +days를 새 유통기한으로 삼고, PAO를 무력화(0)해
 * 개봉일 경로가 연장을 다시 앞당기지 않게 한다. 개봉일 기록 자체는 보존.
 */
export function extendExpiry(
  currentExpiry: IsoDate | null,
  today: IsoDate,
  days = 30,
): { exp: IsoDate; paoMonthsOverride: 0 } {
  return { exp: addDays(currentExpiry ?? today, days), paoMonthsOverride: 0 };
}

export function badge(dday: number | null): BadgeInfo {
  if (dday === null) return { level: 'none', label: '기한 미설정' };
  if (dday < 0) return { level: 'expired', label: `D+${-dday}` };
  if (dday <= 7) return { level: 'd7', label: `D-${dday}` };
  if (dday <= 30) return { level: 'd30', label: `D-${dday}` };
  return { level: 'safe', label: `D-${dday}` };
}
