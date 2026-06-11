import { describe, expect, it } from 'vitest';

import {
  badge,
  computeExpiry,
  dday,
  extendExpiry,
  lifeProgress,
  type CategoryDefaults,
} from './expiry';

const sunscreen: CategoryDefaults = { paoMonths: 12, shelfLifeMonths: 36 };
const noDefaults: CategoryDefaults = { paoMonths: null, shelfLifeMonths: null };

const item = (over: Partial<Parameters<typeof computeExpiry>[0]>) => ({
  exp: null,
  mfg: null,
  openedAt: null,
  paoMonthsOverride: null,
  ...over,
});

describe('computeExpiry', () => {
  it('EXP만 있으면 그대로, 유통기한 기준', () => {
    expect(computeExpiry(item({ exp: '2027-03-31' }), sunscreen)).toEqual({
      date: '2027-03-31',
      basis: '유통기한 기준',
    });
  });

  it('MFG만 있으면 보존기간 가산', () => {
    expect(computeExpiry(item({ mfg: '2024-01-15' }), sunscreen)).toEqual({
      date: '2027-01-15',
      basis: '제조일 + 36개월 기준',
    });
  });

  it('MFG만 있는데 카테고리 보존기간이 없으면 null', () => {
    expect(computeExpiry(item({ mfg: '2024-01-15' }), noDefaults)).toBeNull();
  });

  it('개봉일+PAO가 EXP보다 이르면 PAO가 이긴다', () => {
    expect(
      computeExpiry(item({ exp: '2028-01-01', openedAt: '2026-06-01' }), sunscreen),
    ).toEqual({ date: '2027-06-01', basis: '개봉일 + 12개월 기준' });
  });

  it('EXP가 개봉 기한보다 이르면 EXP 유지 + 부기', () => {
    expect(
      computeExpiry(item({ exp: '2026-09-01', openedAt: '2026-06-01' }), sunscreen),
    ).toEqual({ date: '2026-09-01', basis: '유통기한 기준 (개봉 기한보다 빠름)' });
  });

  it('PAO=0(설정 안 함)이면 개봉 단계 스킵', () => {
    expect(
      computeExpiry(
        item({ exp: '2028-01-01', openedAt: '2026-06-01', paoMonthsOverride: 0 }),
        sunscreen,
      ),
    ).toEqual({ date: '2028-01-01', basis: '유통기한 기준' });
  });

  it('품목별 PAO 덮어쓰기가 카테고리 기본값보다 우선', () => {
    expect(
      computeExpiry(
        item({ exp: '2028-01-01', openedAt: '2026-06-01', paoMonthsOverride: 1 }),
        sunscreen,
      ),
    ).toEqual({ date: '2026-07-01', basis: '개봉일 + 1개월 기준' });
  });

  it('EXP/MFG 없이 개봉일+PAO만으로도 만료일 산출', () => {
    expect(computeExpiry(item({ openedAt: '2026-06-01' }), sunscreen)).toEqual({
      date: '2027-06-01',
      basis: '개봉일 + 12개월 기준',
    });
  });

  it('아무 날짜도 없으면 null (기한 미설정)', () => {
    expect(computeExpiry(item({}), sunscreen)).toBeNull();
  });

  it('개봉일이 있어도 카테고리 PAO가 null이면 스킵', () => {
    expect(computeExpiry(item({ exp: '2028-01-01', openedAt: '2026-06-01' }), noDefaults)).toEqual(
      { date: '2028-01-01', basis: '유통기한 기준' },
    );
  });

  it('월말 가산: 1/31 제조 + 1개월 보존 = 2/28', () => {
    expect(
      computeExpiry(item({ mfg: '2025-01-31' }), { paoMonths: null, shelfLifeMonths: 1 }),
    ).toEqual({ date: '2025-02-28', basis: '제조일 + 1개월 기준' });
  });
});

describe('dday', () => {
  it('내일 만료 = 1, 오늘 = 0, 어제 = -1', () => {
    expect(dday('2026-06-12', '2026-06-11')).toBe(1);
    expect(dday('2026-06-11', '2026-06-11')).toBe(0);
    expect(dday('2026-06-10', '2026-06-11')).toBe(-1);
  });

  it('만료일 없으면 null', () => {
    expect(dday(null, '2026-06-11')).toBeNull();
  });
});

describe('badge', () => {
  it('만료(dday<0) → danger, D+N 표기', () => {
    expect(badge(-5)).toEqual({ level: 'expired', label: 'D+5' });
  });

  it('0 ≤ dday ≤ 7 → orange', () => {
    expect(badge(0)).toEqual({ level: 'd7', label: 'D-0' });
    expect(badge(7)).toEqual({ level: 'd7', label: 'D-7' });
  });

  it('8 ≤ dday ≤ 30 → yellow', () => {
    expect(badge(8)).toEqual({ level: 'd30', label: 'D-8' });
    expect(badge(30)).toEqual({ level: 'd30', label: 'D-30' });
  });

  it('dday > 30 → green', () => {
    expect(badge(31)).toEqual({ level: 'safe', label: 'D-31' });
  });

  it('null → 기한 미설정', () => {
    expect(badge(null)).toEqual({ level: 'none', label: '기한 미설정' });
  });
});

describe('lifeProgress', () => {
  it('구간 정중앙이면 50%', () => {
    expect(lifeProgress('2026-01-01', '2026-01-11', '2026-01-06')).toBe(50);
  });

  it('시작일 당일은 0%, 만료일 당일은 100%', () => {
    expect(lifeProgress('2026-01-01', '2026-01-11', '2026-01-01')).toBe(0);
    expect(lifeProgress('2026-01-01', '2026-01-11', '2026-01-11')).toBe(100);
  });

  it('시작 전이면 0%로, 만료 후면 100%로 클램프', () => {
    expect(lifeProgress('2026-01-01', '2026-01-11', '2025-12-25')).toBe(0);
    expect(lifeProgress('2026-01-01', '2026-01-11', '2026-02-01')).toBe(100);
  });

  it('정수로 반올림', () => {
    // 3일 중 1일 경과 = 33.33…%
    expect(lifeProgress('2026-01-01', '2026-01-04', '2026-01-02')).toBe(33);
  });

  it('만료일이 시작일과 같거나 이르면(이미 만료된 채 등록) 경과 시 100%, 이전엔 0%', () => {
    expect(lifeProgress('2026-01-01', '2026-01-01', '2026-01-01')).toBe(100);
    expect(lifeProgress('2026-01-05', '2026-01-01', '2026-01-06')).toBe(100);
    expect(lifeProgress('2026-01-05', '2026-01-01', '2025-12-01')).toBe(0);
  });
});

describe('extendExpiry', () => {
  it('계산된 만료일 +30일을 새 유통기한으로, PAO는 무력화(0)', () => {
    expect(extendExpiry('2026-06-05', '2026-06-11')).toEqual({
      exp: '2026-07-05',
      paoMonthsOverride: 0,
    });
  });

  it('만료일이 없으면 오늘 기준 +30일', () => {
    expect(extendExpiry(null, '2026-06-11')).toEqual({
      exp: '2026-07-11',
      paoMonthsOverride: 0,
    });
  });

  it('연장 결과는 computeExpiry에서 그대로 채택된다 (개봉일이 있어도)', () => {
    const patch = extendExpiry('2026-06-05', '2026-06-11');
    expect(
      computeExpiry(
        item({ exp: patch.exp, openedAt: '2026-04-01', paoMonthsOverride: patch.paoMonthsOverride }),
        { paoMonths: 1, shelfLifeMonths: null },
      ),
    ).toEqual({ date: '2026-07-05', basis: '유통기한 기준' });
  });
});
