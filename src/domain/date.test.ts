import { describe, expect, it } from 'vitest';

import { addDays, addMonthsClamped, diffDays, lastDayOfMonth } from './date';

describe('addMonthsClamped', () => {
  it('일반 가산', () => {
    expect(addMonthsClamped('2025-03-15', 6)).toBe('2025-09-15');
  });

  it('1/31 + 1개월 = 2/28 (평년 월말 클램핑)', () => {
    expect(addMonthsClamped('2025-01-31', 1)).toBe('2025-02-28');
  });

  it('윤년이면 2/29', () => {
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('8/31 + 1개월 = 9/30', () => {
    expect(addMonthsClamped('2025-08-31', 1)).toBe('2025-09-30');
  });

  it('연도 넘김: 2025-11-30 + 3개월 = 2026-02-28', () => {
    expect(addMonthsClamped('2025-11-30', 3)).toBe('2026-02-28');
  });

  it('12개월 가산은 같은 날짜 유지', () => {
    expect(addMonthsClamped('2025-06-10', 12)).toBe('2026-06-10');
  });
});

describe('diffDays / addDays / lastDayOfMonth', () => {
  it('diffDays는 a - b', () => {
    expect(diffDays('2026-06-12', '2026-06-11')).toBe(1);
    expect(diffDays('2026-06-10', '2026-06-11')).toBe(-1);
    expect(diffDays('2026-06-11', '2026-06-11')).toBe(0);
  });

  it('addDays 월 경계 넘김', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('lastDayOfMonth', () => {
    expect(lastDayOfMonth(2026, 2)).toBe(28);
    expect(lastDayOfMonth(2024, 2)).toBe(29);
    expect(lastDayOfMonth(2026, 12)).toBe(31);
  });
});
