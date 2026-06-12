# 유통기한 트래커

비식품 생활용품(화장품·의약품·조미료)의 사용기한을 **사진 한 장으로 등록**하고 만료 전에 알려주는 로컬 우선 개인용 트래커.

> **3대 원칙** — ① 등록 10초 (촬영→저장) ② 알림 하루 1회 묶음 ③ 로컬 우선 (서버는 AI 프록시 하나, 데이터 저장 없음)

## 아키텍처

```
사진 촬영
  ├─ [1차·온디바이스] ML Kit 한국어 OCR → 날짜 정규식 파싱 → 기한 자동 추출 (오프라인 동작)
  └─ [2차·온라인] Cloudflare Workers 프록시 → Gemini Flash-Lite → 품목명·카테고리 분류
                  (실패·오프라인 시 OCR-only 폴백, 에러 팝업 없음)
```

- **앱**: Expo SDK 56 (React Native + TypeScript strict), expo-router, expo-sqlite + Drizzle ORM, expo-notifications(하루 1회 묶음 알림), Zustand
- **프록시**: Cloudflare Workers — API 키 비노출(wrangler secret), device_id 기반 rate limit(분5/일50), 서버 측 데이터 미저장
- 모든 데이터는 기기에만 저장 (비로그인, 계정 없음)

## 구조

```
app/            # expo-router 화면 (홈/카메라/폼/상세/아카이브/설정)
src/domain/     # 순수 로직 (만료 계산, 날짜 파싱, 알림 플래너) — RN import 금지, 테스트 필수
src/db/         # drizzle 스키마·마이그레이션·시드
src/features/   # 화면별 훅/컴포넌트
src/ui/         # 공용 컴포넌트 + tokens.ts (목업 추출 디자인 토큰)
src/services/   # 카메라, OCR, 인식 API 클라이언트, 알림
proxy/          # Cloudflare Workers (POST /recognize)
docs/           # SPEC · DEV-GUIDE · QA · 목업 5종 · ADR
```

## 개발

```bash
npm install
git config core.hooksPath .githooks   # 시크릿 커밋 차단 훅 (clone 후 1회)
npm run tunnel                        # WSL2 → 폰 접속은 반드시 tunnel
```

네이티브 모듈(카메라·ML Kit·알림 등)이 포함된 dev build APK가 기기에 필요하다:
`eas build --platform android --profile development`

## 검증 (완료의 정의)

```bash
npx tsc --noEmit && npm run lint && npm test     # 앱 — 커밋 전 필수
cd proxy && npm run typecheck && npm test         # 프록시
```

CI(GitHub Actions)가 push/PR마다 동일 검증을 수행한다.

## 프록시 배포

```bash
cd proxy
npx wrangler kv namespace create RATE_LIMIT       # 최초 1회, id를 wrangler.toml에 반영
npx wrangler secret put GEMINI_API_KEY            # 키는 리포 밖에서만
npx wrangler deploy
```

배포 URL은 `app.json`의 `expo.extra.recognizeUrl`로 앱에 연결된다 (미설정 시 자동 OCR-only).

## 문서

- [docs/SPEC.md](docs/SPEC.md) — 기능 스펙 (확정 결정 로그 포함)
- [docs/DEV-GUIDE.md](docs/DEV-GUIDE.md) — 개발 마스터 지시서 (마일스톤 M0~M6)
- [docs/QA.md](docs/QA.md) — 수동 QA 체크리스트 + 구현 상태 표
- [docs/adr/](docs/adr/) — 아키텍처 결정 기록
- 작업 규칙: [CLAUDE.md](CLAUDE.md)
