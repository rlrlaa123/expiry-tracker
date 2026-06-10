/** 'YYYY-MM-DD' 형식의 날짜 문자열. 도메인 전 층에서 시간대 문제를 피하기 위해 사용. */
export type IsoDate = string;

export function toIso(y: number, m: number, d: number): IsoDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseIso(date: IsoDate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

/** m은 1~12 */
export function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 월말 클램핑 가산: 1/31 + 1개월 = 2/28(윤년 2/29) */
export function addMonthsClamped(date: IsoDate, months: number): IsoDate {
  const { y, m, d } = parseIso(date);
  const total = y * 12 + (m - 1) + months;
  const y2 = Math.floor(total / 12);
  const m2 = (total % 12) + 1;
  return toIso(y2, m2, Math.min(d, lastDayOfMonth(y2, m2)));
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const { y, m, d } = parseIso(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return toIso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** a - b (일 단위) */
export function diffDays(a: IsoDate, b: IsoDate): number {
  const pa = parseIso(a);
  const pb = parseIso(b);
  return Math.round(
    (Date.UTC(pa.y, pa.m - 1, pa.d) - Date.UTC(pb.y, pb.m - 1, pb.d)) / 86_400_000,
  );
}
