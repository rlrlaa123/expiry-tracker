# 001. Expo 프로젝트를 repo 루트에 배치

- **맥락**: 환경셋팅 지시서 6장은 `<repo>/app`에 Expo 프로젝트가 있다고 가정하나, DEV-GUIDE §2 폴더 구조는 `app/`을 expo-router 화면 디렉토리로 정의해 충돌.
- **결정**: DEV-GUIDE 기준 채택 — Expo 프로젝트 = repo 루트, `app/` = 라우트, `src/` = 로직, `proxy/` = Workers. expo 실행은 repo 루트에서.
- **근거**: 충돌 시 우선순위 규칙(DEV-GUIDE > 기타 문서). expo-router 표준 레이아웃과도 일치.
