import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useToast } from '@/ui/Toast';
import { BottomSheet } from '@/ui/BottomSheet';
import { Stepper } from '@/ui/Stepper';
import { colors, radius } from '@/ui/tokens';

import { addCategory } from './mutations';

const PAO_MAX = 36;

/**
 * 새 카테고리 시트 (목업 settings .sheet) — 진입점 2곳에서 재사용:
 * 설정 > 카테고리 '＋', 확인/편집 폼 카테고리 칩 '＋' (SPEC §7-1)
 */
export function AddCategorySheet({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded?: (id: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [pao, setPao] = useState(12);

  const save = async () => {
    const result = await addCategory(name, pao || null);
    if (!result.ok) {
      toast(result.reason === 'empty' ? '카테고리 이름을 입력해 주세요' : '이미 있는 카테고리예요');
      return;
    }
    onClose();
    toast(`'${name.trim()}' 추가됨 · 사진 인식에도 반영돼요`);
    onAdded?.(result.id);
  };

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title="새 카테고리"
      description="여기서 만든 카테고리는 사진 인식에도 반영돼요 — AI가 자동으로 분류해 드립니다."
    >
      <Text style={styles.label}>이름</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="예: 향수, 렌즈용품, 반려동물 간식"
        placeholderTextColor={colors.muted}
        autoFocus
      />
      <View style={styles.paoRow}>
        <Text style={styles.paoLabel}>개봉 후 사용기한</Text>
        <Stepper
          label={pao ? `${pao}개월` : '없음'}
          onMinus={() => setPao((v) => Math.max(0, v - 1))}
          onPlus={() => setPao((v) => Math.min(PAO_MAX, v + 1))}
        />
      </View>
      <Text style={styles.note}>0으로 내리면 “설정 안 함” — 개봉해도 기한을 줄이지 않아요.</Text>
      <Pressable onPress={save} style={styles.primary} accessibilityRole="button">
        <Text style={styles.primaryLabel}>추가하기</Text>
      </Pressable>
      <Pressable onPress={onClose} style={styles.ghost} accessibilityRole="button">
        <Text style={styles.ghostLabel}>취소</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 14,
  },
  paoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  note: {
    fontSize: 11.5,
    color: colors.muted,
    lineHeight: 17,
    marginBottom: 16,
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ghost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostLabel: {
    fontSize: 13.5,
    color: colors.muted,
  },
});
