import { addMonthsClamped, diffDays, type IsoDate } from './date';

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

export function badge(dday: number | null): BadgeInfo {
  if (dday === null) return { level: 'none', label: '기한 미설정' };
  if (dday < 0) return { level: 'expired', label: `D+${-dday}` };
  if (dday <= 7) return { level: 'd7', label: `D-${dday}` };
  if (dday <= 30) return { level: 'd30', label: `D-${dday}` };
  return { level: 'safe', label: `D-${dday}` };
}
