# 개발 지시서 (DEV-GUIDE) — 유통기한 트래커 v1

> 이 문서는 Claude Code를 위한 마스터 지시서다. `docs/SPEC.md`(기능 스펙)와 `docs/mockups/`(화면 목업 5종)가 함께 source of truth를 구성한다.
> 충돌 시 우선순위: **사용자의 실시간 지시 > 이 문서 > SPEC.md > 목업**. 충돌을 발견하면 조용히 해석하지 말고 보고하라.

---

## 0. 제품 한 줄 정의와 3대 원칙

비식품 생활용품(화장품·의약품·조미료)의 사용기한을 **사진 한 장으로 등록**하고 만료 전에 알려주는 로컬 우선 개인용 트래커.

1. **등록 10초** — 촬영부터 저장까지. 마찰을 늘리는 모든 결정은 기각
2. **알림 하루 1회 묶음** — 푸시 남발 금지
3. **로컬 우선** — 서버는 AI 프록시 하나뿐, 데이터 저장 없음

모든 구현 판단이 갈릴 때 이 3원칙으로 결정한다.

## 1. 작업 방식 규칙 (가장 중요)

### 1-1. 완료의 정의 (모든 작업 공통)

아래 전부 통과 전에는 "완료" 보고 금지:

```bash
npx tsc --noEmit && npm run lint && npm test
```

도메인 로직(만료일 계산, 날짜 파싱, 알림 스케줄링)은 **테스트를 먼저 작성**한다.

### 1-2. 보고 형식 (모바일 Remote Control 전제)

사용자는 폰으로 보고를 읽는다. 매 작업 완료 시:

```
✅ [M2-3] 홈 리스트 원탭 개봉 구현
변경: ItemRow에 개봉 버튼, useOpenItem 훅, 만료일 재계산 연동
폰에서 확인: 홈 → '라네즈 선크림' 행의 [개봉] 탭 → 뱃지가 D-643→D-365로 바뀌고 토스트 표시
다음: [M2-4] 만료 품목 처리 바텀시트
```

"폰에서 확인" 줄은 필수다. 사용자가 코드를 안 보고도 검증할 수 있어야 한다.

### 1-3. 자율 결정 범위

- **자율 (보고만)**: 컴포넌트 분리, 스타일 미세조정, 변수명, 내부 리팩토링, 라이브러리 패치버전
- **제안 후 진행 (승인 불요, ADR 기록)**: 폴더 구조 변경, 의존성 추가, 목업과 다른 UI 해석
- **반드시 승인**: 데이터 모델 변경, SPEC.md의 확정 결정 번복, 유료 서비스 도입, Out of Scope 항목 착수

ADR은 `docs/adr/NNN-제목.md`에 3줄 요약(맥락/결정/근거)으로 남긴다.

### 1-4. 막혔을 때

- 같은 문제에 30분 이상 소모 금지. 시도한 것 + 대안 2개를 정리해 질문하라
- 라이브러리 버전·API가 학습 지식과 다를 수 있다. **추측 금지, 공식 문서 확인** (Expo/Drizzle/ML Kit 문서 우선)
- 질문은 묶어서 한 번에. 사용자 응답 대기 중에는 의존성 없는 다음 작업을 진행

### 1-5. Git

- Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`)
- 작업 단위 작게, 마일스톤별 브랜치 (`m2-home-list`), 완료 시 main 머지
- 시크릿(API 키) 커밋 절대 금지 — pre-commit 훅으로 차단할 것

## 2. 기술 스택 (확정 — 변경은 승인 필요)

- Expo SDK 최신 안정판 + TypeScript strict
- expo-router (화면 6개: 홈/카메라/폼/상세/아카이브/설정)
- expo-sqlite + Drizzle ORM / Zustand / expo-notifications / expo-camera / expo-image-manipulator
- ML Kit 텍스트 인식: `@react-native-ml-kit/text-recognition` (한국어 지원 옵션 확인) — dev build 필요
- 테스트: vitest(도메인 순수 함수) + 가능 범위의 RN 컴포넌트 테스트
- 프록시: Cloudflare Workers (TypeScript, wrangler)

폴더 구조:

```
app/            # expo-router 화면
src/
  domain/       # 순수 로직 (expiry.ts, dateParser.ts, notification-planner.ts) — RN 의존 금지
  db/           # drizzle 스키마, 마이그레이션, 시드
  features/     # 화면별 훅/컴포넌트
  ui/           # 공용 컴포넌트 + tokens.ts
  services/     # 카메라, OCR, 인식 API 클라이언트
proxy/          # Cloudflare Workers
docs/           # SPEC, DEV-GUIDE, mockups, adr
```

## 3. 디자인 토큰 (목업에서 추출 — src/ui/tokens.ts로 코드화)

```
bg #ECEAE4 / canvas #FAFAF7 / surface #FFFFFF / line #E4E3DC
ink #1C1E1A / muted #878D85
primary #2E7D6B / primary-soft #E4F0EC
danger #D24B3F (만료) / orange #D97E2B (D-7) / yellow #C9A227 (D-30) / green=primary (안전)
radius 14 / 시스템 폰트 스택
```

목업 HTML(`docs/mockups/`)이 레이아웃·인터랙션·카피의 기준이다. RN 제약으로 그대로 못 옮기면 의도(정보 위계, 원탭 액션)를 보존하고 ADR로 차이를 기록.

## 4. 도메인 코어 명세 (테스트 필수)

### 4-1. 만료일 계산 `computeExpiry(item, category): {date, basis} | null`

1. EXP 있으면 EXP, basis='유통기한 기준'
2. EXP 없고 MFG만 → MFG + 카테고리 보존기간, basis='제조일 + N개월 기준'
3. 개봉일 있고 카테고리 PAO 있으면 → `min(위 결과, 개봉일+PAO)`. PAO가 이기면 basis='개봉일 + N개월 기준', 지면 basis에 '(개봉 기한보다 빠름)' 부기
4. 아무 날짜 없으면 null (기한 미설정)
5. PAO=0(설정 안 함)은 3단계 스킵

필수 테스트 케이스: EXP만 / MFG만 / 개봉+PAO가 EXP보다 이른 경우·늦은 경우 / PAO=0 / 전부 null / 윤년·월말 가산(1/31 +1개월)

### 4-2. D-day 뱃지 `badge(dday)`

dday<0 → 만료(danger) / ≤7 → orange / ≤30 → yellow / 그 외 green / null → '기한 미설정'(gray)

### 4-3. OCR 날짜 파서 `parseDates(ocrText): ParsedDate[]`

- 패턴: `YYYY.MM.DD`, `YYYY-MM-DD`, `YYYY.MM`, `YYYYMMDD`, `YY.MM.DD`(2000년대 가정)
- 문맥 분류: 같은 줄/직전 토큰에 "까지|유통|사용기한|EXP|BBE" → EXP, "제조|MFG" → MFG, 없으면 UNKNOWN
- `YYYY-MM`은 **해당 월 말일**로 정규화
- 테스트: 실제 라벨 문자열 샘플 10개 이상으로 검증

### 4-4. 알림 플래너 `planNextDigest(items, settings): {fireAt, lines[]} | null`

- 활성 단계(D-30/D-7/D-1/만료일)에 해당하는 품목을 모아 **다음 1회 알림**의 시각·본문 생성
- 데이터 변경·앱 포그라운드 진입 시마다 기존 예약 취소 후 재예약 (`rescheduleDigest()` 단일 진입점)
- 본문 예: "내일 만료 1건 · 일주일 내 2건 — 인공눈물 외"

## 5. 마일스톤 (순서 고정, 각각 폰 확인 후 다음 진행)

### M0. 부트스트랩

- create-expo-app(TS) → strict, ESLint+Prettier, vitest, 폴더 구조, tokens.ts, eas.json(development 프로필)
- **CLAUDE.md 생성**: 이 문서의 1장(작업 방식)과 3원칙을 요약해 넣는다
- DoD: `expo start --tunnel`로 폰에서 빈 홈 화면 + 토큰 적용 확인

### M1. 도메인 코어 + DB

- Drizzle 스키마: Item(SPEC 3장), Category(builtin 6종 시드: 선크림12/립12/마스카라6/연고6/안약1/조미료6 + 보존기간)
- 4장 도메인 함수 전부 + 테스트
- DoD: 테스트 전건 통과. 폰 확인: 시드 데이터가 홈 리스트(임시)에 표시

### M2. 홈 + 상세

- 홈: 임박순 정렬, Top5 가로 카드, 4단계 뱃지, 필터 칩(전체/임박/만료/미설정/위치), 검색, **행 내 원탭 개봉**, FAB
- 상세: 만료 카드(상태별 색), **수명 진행바**(개봉일 또는 등록일→만료일, 오늘 % 표시), 계산 근거 문구, 개봉/소진/폐기/기한 인라인 수정, 처리 확인 바텀시트
- DoD: 목업 home-list/item-detail의 모든 인터랙션 재현. 폰 확인 시나리오를 보고에 명시

### M3. 등록 플로우 (dev build 전환 시점)

- ML Kit 도입 → 사용자에게 dev build 1회 빌드/설치 안내 후 대기
- 카메라/갤러리 → 이미지 압축(장변 1024, JPEG) → OCR → parseDates
- 확인/편집 폼: 목업 confirm-form의 3상태(성공/부분/실패), 신뢰도 low 노란 테두리, PAO 제안 배너→[적용], 만료 예정 실시간 카드, 저장 토스트+[하나 더 찍기]
- 이 시점에는 OCR-only (product_name은 수동) — AI 연동은 M4
- DoD: 실물 라벨 3종 촬영 → 기한 자동 인식 → 저장 → 홈 반영

### M4. AI 프록시 + 인식 연동

- proxy/: `POST /recognize` — SPEC 11장의 프롬프트 조립(사용자 카테고리 동적 주입), Gemini Flash-Lite 호출, JSON 모드, device_id rate limit(분5/일50), 데이터 미저장. secret은 `wrangler secret put GEMINI_API_KEY`
- 클라이언트: OCR 텍스트+이미지 전송 → SPEC 11장 후처리 5규칙 전부 구현 (파싱 재시도, EXP 우선 채택, 목록 밖 category→기타, 과거 EXP 안내)
- 오프라인: 네트워크 실패 시 OCR-only 결과로 폼 오픈 (에러 팝업 금지)
- DoD: 실물 라벨에서 품목명·카테고리 자동 채움 확인. 프록시 응답 2초↑ 시 타임아웃 5초+폴백

### M5. 알림 + 설정

- expo-notifications 권한 플로우, rescheduleDigest 연결(알림 탭→임박 필터 홈 딥링크)
- 설정 화면: 알림 시각/단계 토글+미리보기 문구, 카테고리 관리(추가 시트: 이름+PAO 스테퍼 0~36, builtin 삭제 불가, 커스텀 삭제 시 품목 '기타' 이동), 데이터 섹션("이 기기에만 저장")
- 폼의 카테고리 칩 '+'도 동일 시트 재사용
- DoD: 알림 시각을 2분 뒤로 설정 → 실제 푸시 수신 → 탭 시 임박 목록 진입

### M6. 아카이브 + 마감

- 아카이브: 월별 그룹, 소진/폐기 뱃지, 사용기간 메타, **"다시 샀어요" 시트(기한만 입력/나중에)** → 홈 재등록
- 마감 폴리시: 빈 상태 화면 전부(홈/아카이브/검색 0건), 에러 카피 톤 통일(사과 금지·행동 안내), 햅틱, 접근성 라벨, 다크모드는 v1.1 백로그
- 수동 QA 체크리스트를 docs/QA.md로 작성하고 직접 1회 수행
- DoD: SPEC 결정 로그 10개 항목 전부 구현 상태 표로 보고

## 6. 절대 금지

- localStorage류 웹 API 사용 (RN이다)
- API 키를 클라이언트 코드/리포에 포함
- 테스트 미통과 상태로 완료 보고
- Out of Scope(SPEC 8장) 기능의 임의 착수
- 등록 플로우에 필수 입력 추가 (품목명 외 필수 금지)

## 7. 시작 명령

이 문서를 읽었다면: SPEC.md와 목업 5종을 정독 → 이해한 내용을 10줄로 요약 보고 → 사용자 확인 후 M0 착수.
