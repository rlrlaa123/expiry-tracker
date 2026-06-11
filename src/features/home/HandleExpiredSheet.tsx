import { BottomSheet, SheetOption } from '@/ui/BottomSheet';

import type { EnrichedItem } from '../items/enrich';

/** 만료 품목 처리 시트 (목업 home-list .sheet, SPEC §4 폐기/아직 사용/기한 연장) */
export function HandleExpiredSheet({
  target,
  onClose,
  onDiscard,
  onKeep,
  onExtend,
}: {
  target: EnrichedItem | null;
  onClose: () => void;
  onDiscard: () => void;
  onKeep: () => void;
  onExtend: () => void;
}) {
  return (
    <BottomSheet
      visible={target !== null}
      onClose={onClose}
      title={target?.item.name ?? ''}
      description="만료된 품목이에요. 어떻게 할까요?"
    >
      <SheetOption
        label="폐기했어요"
        hint="아카이브로 이동 · 다시 사면 원탭 재등록"
        onPress={onDiscard}
      />
      <SheetOption label="아직 사용 중이에요" hint="만료 뱃지를 유지한 채 목록에 남겨요" onPress={onKeep} />
      <SheetOption label="기한 연장" hint="직접 확인했어요 · +30일" onPress={onExtend} />
    </BottomSheet>
  );
}
