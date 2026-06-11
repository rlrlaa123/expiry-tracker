# 008. 등록 플로우 네이티브 의존성 3종 추가 (dev build #2 필요)

- **맥락**: M3 등록 플로우는 촬영(expo-camera)·갤러리(expo-image-picker)·압축(expo-image-manipulator)이 필요한데, 셋 다 네이티브 모듈이라 dev build #1(ML Kit만 포함)에 없다.
- **결정**: 3종을 `npx expo install`로 추가하고 dev build #2를 1회 빌드. 카메라 화면에서만 lazy require해 새 JS 번들 + 구 APK 조합에서도 홈·상세는 동작하게 함.
- **근거**: 전부 Expo 1st-party(DEV-GUIDE §2 확정 스택). 한 번에 묶어 재빌드 1회로 끝냄 — ADR 006·007에서 미룬 expo-linear-gradient·datetimepicker는 시각 개선일 뿐이라 이번에도 제외(빌드 슬림 유지).
