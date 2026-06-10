import { addDays, diffDays, type IsoDate } from './date';

export interface PlannerItem {
  id: string;
  name: string;
  /** 계산된 만료일. null이면 알림 대상 아님 */
  expiry: IsoDate | null;
}

export interface DigestSettings {
  /** 알림 시각 (기본 09:00) */
  hour: number;
  minute: number;
  /** 단계별 on/off — 만료 D-30/D-7/D-1/당일 */
  stages: { d30: boolean; d7: boolean; d1: boolean; d0: boolean };
}

export interface DigestPlan {
  /** 로컬 시각 'YYYY-MM-DDTHH:MM' — M5에서 Date로 변환해 예약 */
  fireAt: string;
  /** [0] = 알림 본문 요약, 이후 품목별 상세 */
  lines: string[];
}

/** 탐색 상한: 1년 내 알림 거리가 없으면 예약하지 않음 */
const MAX_HORIZON_DAYS = 366;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 다음 1회 묶음 알림의 시각과 본문을 계산한다 (DEV-GUIDE §4-4).
 * 데이터 변경·앱 포그라운드 진입 시마다 재호출되어 기존 예약을 대체한다.
 */
export function planNextDigest(
  items: PlannerItem[],
  settings: DigestSettings,
  now: { date: IsoDate; time: string /* 'HH:MM' */ },
): DigestPlan | null {
  const stageDays: number[] = [];
  if (settings.stages.d30) stageDays.push(30);
  if (settings.stages.d7) stageDays.push(7);
  if (settings.stages.d1) stageDays.push(1);
  if (settings.stages.d0) stageDays.push(0);

  const tracked = items.filter((it) => it.expiry !== null);
  if (stageDays.length === 0 || tracked.length === 0) return null;

  const notifyTime = `${pad(settings.hour)}:${pad(settings.minute)}`;
  // 오늘 알림 시각이 아직 안 지났으면 오늘부터, 지났으면 내일부터 탐색
  const firstDate = now.time < notifyTime ? now.date : addDays(now.date, 1);

  for (let offset = 0; offset < MAX_HORIZON_DAYS; offset++) {
    const fireDate = addDays(firstDate, offset);
    const matched = tracked
      .map((it) => ({ item: it, dday: diffDays(it.expiry as IsoDate, fireDate) }))
      .filter((m) => stageDays.includes(m.dday))
      .sort((a, b) => a.dday - b.dday);
    if (matched.length > 0) {
      return {
        fireAt: `${fireDate}T${notifyTime}`,
        lines: buildLines(matched),
      };
    }
  }
  return null;
}

function buildLines(matched: { item: PlannerItem; dday: number }[]): string[] {
  const count = (d: number) => matched.filter((m) => m.dday === d).length;
  const parts: string[] = [];
  const d0 = count(0);
  const d1 = count(1);
  const d7 = count(7);
  const d30 = count(30);
  if (d0) parts.push(`오늘 만료 ${d0}건`);
  if (d1) parts.push(`내일 만료 ${d1}건`);
  if (d7) parts.push(`일주일 내 ${d7}건`);
  if (d30) parts.push(`한 달 내 ${d30}건`);

  const summary =
    parts.join(' · ') + ` — ${matched[0].item.name}` + (matched.length > 1 ? ' 외' : '');

  const detailLabel = (d: number) =>
    d === 0 ? '오늘 만료' : d === 1 ? '내일 만료' : `D-${d}`;
  return [summary, ...matched.map((m) => `${m.item.name} · ${detailLabel(m.dday)}`)];
}
