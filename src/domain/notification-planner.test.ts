import { describe, expect, it } from 'vitest';

import { planNextDigest, type DigestSettings } from './notification-planner';

const allOn: DigestSettings = {
  hour: 9,
  minute: 0,
  stages: { d30: true, d7: true, d1: true, d0: true },
};

const it_ = (id: string, name: string, expiry: string | null) => ({ id, name, expiry });

describe('planNextDigest', () => {
  it('알림 시각 전이면 오늘 발화: 오늘 만료 품목', () => {
    const plan = planNextDigest(
      [it_('1', '인공눈물', '2026-06-11')],
      allOn,
      { date: '2026-06-11', time: '08:30' },
    );
    expect(plan).toEqual({
      fireAt: '2026-06-11T09:00',
      lines: ['오늘 만료 1건 — 인공눈물', '인공눈물 · 오늘 만료'],
    });
  });

  it('알림 시각이 지났으면 다음 날부터 탐색', () => {
    const plan = planNextDigest(
      [it_('1', '인공눈물', '2026-06-12')],
      allOn,
      { date: '2026-06-11', time: '09:30' },
    );
    // 6/12에 dday=0 → 오늘 만료로 발화
    expect(plan?.fireAt).toBe('2026-06-12T09:00');
    expect(plan?.lines[0]).toBe('오늘 만료 1건 — 인공눈물');
  });

  it('지시서 예시: 내일 만료 1건 · 일주일 내 2건 — 인공눈물 외', () => {
    const plan = planNextDigest(
      [
        it_('1', '인공눈물', '2026-06-12'), // 발화일 dday=1
        it_('2', '선크림', '2026-06-18'), // dday=7
        it_('3', '연고', '2026-06-18'), // dday=7
      ],
      allOn,
      { date: '2026-06-11', time: '08:00' },
    );
    expect(plan?.fireAt).toBe('2026-06-11T09:00');
    expect(plan?.lines[0]).toBe('내일 만료 1건 · 일주일 내 2건 — 인공눈물 외');
  });

  it('꺼진 단계는 매칭하지 않는다 (D-1 off → D-0에 발화)', () => {
    const plan = planNextDigest(
      [it_('1', '인공눈물', '2026-06-12')],
      { ...allOn, stages: { d30: false, d7: false, d1: false, d0: true } },
      { date: '2026-06-11', time: '08:00' },
    );
    expect(plan?.fireAt).toBe('2026-06-12T09:00');
  });

  it('모든 단계가 꺼져 있으면 null', () => {
    expect(
      planNextDigest(
        [it_('1', '인공눈물', '2026-06-12')],
        { ...allOn, stages: { d30: false, d7: false, d1: false, d0: false } },
        { date: '2026-06-11', time: '08:00' },
      ),
    ).toBeNull();
  });

  it('기한 미설정 품목만 있으면 null', () => {
    expect(
      planNextDigest([it_('1', '메모만 있는 품목', null)], allOn, {
        date: '2026-06-11',
        time: '08:00',
      }),
    ).toBeNull();
  });

  it('이미 만료된 품목(음수 dday)은 단계에 해당하지 않으므로 알림 없음', () => {
    expect(
      planNextDigest([it_('1', '지난 선크림', '2026-01-01')], allOn, {
        date: '2026-06-11',
        time: '08:00',
      }),
    ).toBeNull();
  });

  it('먼 미래 품목은 D-30 시점에 발화', () => {
    const plan = planNextDigest(
      [it_('1', '새 선크림', '2026-09-01')],
      allOn,
      { date: '2026-06-11', time: '08:00' },
    );
    expect(plan?.fireAt).toBe('2026-08-02T09:00'); // 9/1의 30일 전
    expect(plan?.lines[0]).toBe('한 달 내 1건 — 새 선크림');
  });

  it('알림 시각 커스텀(21:30) 반영', () => {
    const plan = planNextDigest(
      [it_('1', '인공눈물', '2026-06-11')],
      { ...allOn, hour: 21, minute: 30 },
      { date: '2026-06-11', time: '20:00' },
    );
    expect(plan?.fireAt).toBe('2026-06-11T21:30');
  });

  it('상세 라인은 임박순 정렬', () => {
    const plan = planNextDigest(
      [it_('1', '선크림', '2026-06-18'), it_('2', '인공눈물', '2026-06-12')],
      allOn,
      { date: '2026-06-11', time: '08:00' },
    );
    expect(plan?.lines.slice(1)).toEqual(['인공눈물 · 내일 만료', '선크림 · D-7']);
  });
});
