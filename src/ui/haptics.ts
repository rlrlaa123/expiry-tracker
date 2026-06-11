import { requireOptionalNativeModule } from 'expo';

/**
 * 햅틱 — expo-haptics는 구 dev build APK에 없을 수 있다 (ADR 008).
 * throw 없는 requireOptionalNativeModule로 먼저 존재를 확인해 LogBox 소음을 막는다.
 */
function load() {
  if (!requireOptionalNativeModule('ExpoHaptics')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require
  return require('expo-haptics') as typeof import('expo-haptics');
}

/** 가벼운 톡 — 원탭 개봉, 칩 선택 같은 보조 액션 */
export function hapticLight(): void {
  const haptics = load();
  void haptics?.impactAsync(haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** 성공 진동 — 저장, 재등록 같은 완료 액션 */
export function hapticSuccess(): void {
  const haptics = load();
  void haptics?.notificationAsync(haptics.NotificationFeedbackType.Success).catch(() => {});
}
