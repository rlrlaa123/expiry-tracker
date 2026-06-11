import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import type { IsoDate } from '@/domain/date';
import { parseDates } from '@/domain/dateParser';
import { BottomSheet, SheetOption } from '@/ui/BottomSheet';
import { colors } from '@/ui/tokens';

/**
 * 유통기한 인라인 수정 — 네이티브 date picker 대신 자유 형식 텍스트 입력 (ADR 007).
 * OCR 날짜 파서를 재사용해 2027.03.15 / 2027-03 / 20270315 등을 전부 인식한다.
 */
export function ExpEditSheet({
  initial,
  onClose,
  onSave,
}: {
  initial: IsoDate | null;
  onClose: () => void;
  onSave: (exp: IsoDate | null) => void;
}) {
  const [text, setText] = useState(initial ?? '');
  const [error, setError] = useState(false);

  const save = () => {
    const trimmed = text.trim();
    if (trimmed === '') {
      onSave(null);
      return;
    }
    const parsed = parseDates(trimmed)[0];
    if (!parsed) {
      setError(true);
      return;
    }
    onSave(parsed.value);
  };

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title="유통기한 수정"
      description="2027.03.15 · 2027-03 · 20270315 형식 모두 인식해요. 비우면 기한 미설정이 돼요."
    >
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(false);
        }}
        placeholder="예: 2027.03.15"
        placeholderTextColor={colors.muted}
        keyboardType="numbers-and-punctuation"
        autoFocus
      />
      {error ? <Text style={styles.errorText}>날짜를 읽지 못했어요. 형식을 확인해 주세요.</Text> : null}
      <SheetOption label="저장" onPress={save} />
      <SheetOption label="취소" muted onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: colors.ink,
    marginBottom: 8,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 8,
  },
});
