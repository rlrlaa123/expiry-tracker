# 005. 탭 셸 라우트 구조 — (tabs) 그룹 + 상세 스택

- **맥락**: home-list 목업에 탭바(홈/아카이브/설정)가 있고 상세·카메라·폼은 전체 화면 전환이다. M2 시점에 아카이브(M6)·설정(M5) 화면은 아직 없다.
- **결정**: `app/(tabs)/` 그룹(index·archive·settings)을 expo-router `Tabs`로 만들고, 상세는 `app/item/[id]`로 탭바 밖 Stack push. 아카이브·설정은 placeholder 화면으로 선행 배치.
- **근거**: 목업의 내비게이션 구조를 처음부터 재현해 M5·M6에서 라우트 재배치 없이 화면 내용만 채우면 되게 함. placeholder는 "준비 중" 카피로 미구현임을 명시.
