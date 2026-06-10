# 유통기한 트래커 — Claude Code 작업 규칙

비식품 생활용품(화장품·의약품·조미료)의 사용기한을 사진 한 장으로 등록하고 만료 전에 알려주는 로컬 우선 개인용 트래커.
Source of truth: `docs/DEV-GUIDE.md` > `docs/SPEC.md` > `docs/mockups/`. 충돌 발견 시 조용히 해석하지 말고 보고.

## 3대 원칙 (구현 판단이 갈릴 때 이걸로 결정)

1. **등록 10초** — 촬영부터 저장까지. 마찰을 늘리는 모든 결정은 기각
2. **알림 하루 1회 묶음** — 푸시 남발 금지
3. **로컬 우선** — 서버는 AI 프록시 하나뿐, 데이터 저장 없음

## 완료의 정의

아래 전부 통과 전에는 "완료" 보고 금지:

```bash
npx tsc --noEmit && npm run lint && npm test
```

도메인 로직(만료일 계산, 날짜 파싱, 알림 스케줄링)은 **테스트를 먼저 작성**한다.

## 보고 형식 (사용자는 폰으로 읽는다)

```
✅ [M2-3] 작업 제목
변경: 한 줄 요약
폰에서 확인: 사용자가 코드 안 보고 검증할 수 있는 구체적 시나리오 (필수)
다음: 다음 작업
```

## 자율 결정 범위

- **자율**: 컴포넌트 분리, 스타일 미세조정, 변수명, 내부 리팩토링, 라이브러리 패치버전
- **제안 후 진행 + ADR**(`docs/adr/NNN-제목.md`, 맥락/결정/근거 3줄): 폴더 구조 변경, 의존성 추가, 목업과 다른 UI 해석
- **반드시 승인**: 데이터 모델 변경, SPEC 확정 결정 번복, 유료 서비스, Out of Scope 착수

## 막혔을 때

- 같은 문제 30분 이상 금지 → 시도한 것 + 대안 2개 정리해 질문
- 라이브러리 API는 추측 금지, 공식 문서 확인 (Expo v56 문서: https://docs.expo.dev/versions/v56.0.0/)
- 질문은 묶어서 한 번에, 대기 중엔 의존성 없는 다음 작업 진행

## Git

- Conventional Commits, 작업 단위 작게, 마일스톤 브랜치(`m2-home-list`) → 완료 시 main 머지
- **시크릿 커밋 절대 금지** — `.githooks/pre-commit`이 차단 (clone 후 `git config core.hooksPath .githooks` 필요)

## 절대 금지

- localStorage류 웹 API (RN이다) / API 키를 클라이언트 코드·리포에 포함
- 테스트 미통과 상태로 완료 보고 / Out of Scope(SPEC 8장) 임의 착수
- 등록 플로우에 품목명 외 필수 입력 추가

## 구조

```
app/            # expo-router 화면 (홈/카메라/폼/상세/아카이브/설정)
src/domain/     # 순수 로직 (expiry, dateParser, notification-planner) — RN import 금지
src/db/         # drizzle 스키마·마이그레이션·시드
src/features/   # 화면별 훅/컴포넌트
src/ui/         # 공용 컴포넌트 + tokens.ts (목업 추출 토큰 — 임의 변경 금지)
src/services/   # 카메라, OCR, 인식 API 클라이언트
proxy/          # Cloudflare Workers (POST /recognize)
```
