# 유통기한 트래커

비식품 생활용품(화장품·의약품·조미료)의 사용기한을 사진 한 장으로 등록하고 만료 전에 알려주는 로컬 우선 개인용 트래커.

- 스펙: `docs/SPEC.md` / 개발 지시서: `docs/DEV-GUIDE.md` / 목업: `docs/mockups/`
- 작업 규칙: `CLAUDE.md`

## 개발

```bash
npm install
git config core.hooksPath .githooks   # 시크릿 커밋 차단 훅 (clone 후 1회)
npm run tunnel                        # WSL2 → 폰 접속은 반드시 tunnel
```

검증: `npm run typecheck && npm run lint && npm test`

## 구조

```
app/            # expo-router 화면
src/domain/     # 순수 도메인 로직 (RN import 금지)
src/db/         # drizzle 스키마·시드
src/features/   # 화면별 훅/컴포넌트
src/ui/         # 공용 UI + tokens.ts
src/services/   # 카메라·OCR·인식 API
proxy/          # Cloudflare Workers AI 프록시
```
