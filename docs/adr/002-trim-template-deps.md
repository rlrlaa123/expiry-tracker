# 002. SDK 56 템플릿 데모 의존성 제거 + 모바일 전용

- **맥락**: create-expo-app 기본 템플릿에 데모 화면용 패키지(@expo/ui, expo-device, expo-glass-effect, expo-symbols, expo-web-browser, expo-font)와 웹 지원(react-dom, react-native-web)이 포함됨.
- **결정**: 전부 제거. 웹 타겟 미지원(app.json web 섹션 삭제). expo-image는 썸네일(M2~3)용으로 유지. react-dom은 expo-router(@expo/ui, metro-runtime)의 peer라 react와 동일 버전으로 유지.
- **근거**: v1은 Android/iOS 전용(SPEC 10장, PWA 제외 결정). 미사용 의존성은 빌드 시간·취약점 표면만 늘림. 필요 시 재추가 비용 낮음.
