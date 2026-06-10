# 004. dev build를 M1 직후로 앞당기고 ML Kit 동시 포함

- **맥락**: 폰의 Expo Go가 SDK 56 미지원(56.0.1 필요, 플레이스토어 롤아웃 지연)이라 M1 폰 확인이 불가. dev build는 어차피 M3에서 필수.
- **결정**: M3의 dev build를 지금 수행. `expo-dev-client` + `@react-native-ml-kit/text-recognition@2.0.0`을 함께 포함해 네이티브 빌드를 1회로 끝냄 (이후 JS는 전부 핫리로드).
- **근거**: Expo Go 버전 종속 제거가 가장 확실한 해결. 무료 EAS 빌드 횟수 절약(1회), 환경셋팅 지시서 7장의 "네이티브 모듈 추가 시에만 재빌드" 원칙 준수.
