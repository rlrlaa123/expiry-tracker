# 009. expo-notifications + zustand 추가, 설정은 파일 JSON으로 보관

- **맥락**: M5 알림·설정에 로컬 알림 모듈과 설정 상태 보관이 필요. expo-notifications는 네이티브(빌드 #3에 포함 — 취소한 #2와 묶음), zustand는 JS-only(DEV-GUIDE §2 확정 스택).
- **결정**: 설정(알림 시각/단계)은 zustand + persist를 document 디렉터리 `settings.json`에 동기 저장. SQLite 테이블 신설(데이터 모델 변경·승인 필요)은 하지 않음.
- **근거**: 설정은 Item/Category 모델이 아닌 기기 로컬 환경값 — 파일 JSON이면 마이그레이션 없이 충분하고 expo-file-system은 이미 빌드에 포함돼 있다.
