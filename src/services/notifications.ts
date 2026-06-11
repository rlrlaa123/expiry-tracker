import { notInArray } from 'drizzle-orm';
import { requireOptionalNativeModule } from 'expo';

import { db } from '@/db/client';
import { items } from '@/db/schema';
import { parseIso, todayIso } from '@/domain/date';
import { planNextDigest } from '@/domain/notification-planner';
import { useSettings } from '@/features/settings/store';

/**
 * expo-notifications는 구 dev build APK에 없을 수 있다 (ADR 008).
 * require가 throw하면 Metro LogBox 소음 + 모듈 캐시 오염이 생기므로,
 * throw 없는 requireOptionalNativeModule로 먼저 존재를 확인한다.
 */
function loadNotifications() {
  if (!requireOptionalNativeModule('ExpoNotificationScheduler')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require
  // Metro는 한 번 throw한 모듈을 다음 require에서 undefined로 줄 수 있어 형태까지 확인
  const notifications = require('expo-notifications') as
    | typeof import('expo-notifications')
    | undefined;
  return typeof notifications?.scheduleNotificationAsync === 'function' ? notifications : null;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DDTHH:MM'(로컬) → Date — 문자열 파싱의 타임존 함정 회피 */
function toLocalDate(fireAt: string): Date {
  const [datePart, timePart] = fireAt.split('T');
  const { y, m, d } = parseIso(datePart);
  const [hh, mm] = timePart.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** 알림 권한 요청 — 설정 화면에서 호출. granted 여부 반환 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const notifications = loadNotifications();
  if (!notifications) return false;
  const current = await notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await notifications.requestPermissionsAsync();
  return next.granted;
}

export async function getNotificationPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unavailable'
> {
  const notifications = loadNotifications();
  if (!notifications) return 'unavailable';
  const current = await notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * 다음 1회 묶음 알림 재예약 — 유일한 예약 진입점 (DEV-GUIDE §4-4).
 * 데이터 변경·앱 포그라운드 진입·설정 변경 시마다 호출되어 기존 예약을 전부 대체한다.
 */
export async function rescheduleDigest(): Promise<void> {
  const notifications = loadNotifications();
  if (!notifications) return;
  try {
    const perm = await notifications.getPermissionsAsync();
    if (!perm.granted) return;

    await notifications.cancelAllScheduledNotificationsAsync();

    const rows = await db
      .select({ id: items.id, name: items.name, expiry: items.computedExpiry })
      .from(items)
      .where(notInArray(items.status, ['consumed', 'discarded']));
    const { hour, minute, stages } = useSettings.getState();
    const now = new Date();
    const plan = planNextDigest(rows, { hour, minute, stages }, {
      date: todayIso(),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    });
    if (!plan) return;

    await notifications.setNotificationChannelAsync('digest', {
      name: '만료 묶음 알림',
      importance: notifications.AndroidImportance.DEFAULT,
    });
    await notifications.scheduleNotificationAsync({
      content: {
        title: '유통기한 알림',
        body: plan.lines[0],
        // 알림 탭 → 임박 필터 홈 (SPEC §4)
        data: { url: '/?filter=soon' },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: toLocalDate(plan.fireAt),
        channelId: 'digest',
      },
    });
  } catch {
    // 알림 실패가 앱 동작을 막으면 안 된다 — 다음 트리거에서 재시도
  }
}

/** 포그라운드 수신 시 표시 정책 + 알림 탭 딥링크 리스너 — 루트 레이아웃에서 1회 설치 */
export function installNotificationHandlers(onOpenUrl: (url: string) => void): () => void {
  const notifications = loadNotifications();
  if (!notifications) return () => {};

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const sub = notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') onOpenUrl(url);
  });
  return () => sub.remove();
}
