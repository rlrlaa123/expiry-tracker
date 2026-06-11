/**
 * 햅틱 — expo-haptics는 최신 dev build부터 포함되는 네이티브 모듈이라
 * 구 APK에서도 죽지 않도록 lazy require (ADR 008 패턴). 실패는 전부 무시.
 */
function load() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require
    return require('expo-haptics') as typeof import('expo-haptics');
  } catch {
    return null;
  }
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
