import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Category, Item } from '@/db/schema';
import type { IsoDate } from '@/domain/date';
import { parseDates } from '@/domain/dateParser';
import { categoryEmoji } from '@/features/items/enrich';
import { BottomSheet } from '@/ui/BottomSheet';
import { colors, radius } from '@/ui/tokens';

/** "다시 샀어요" 시트 (archive-mockup .sheet) — 기한만 입력하면 재등록 완료 */
export function RebuySheet({
  entry,
  onClose,
  onRebuy,
}: {
  entry: { item: Item; category: Category | null };
  onClose: () => void;
  onRebuy: (exp: IsoDate | null) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  const { item, category } = entry;

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(true);
      return;
    }
    const parsed = parseDates(trimmed)[0];
    if (!parsed) {
      setError(true);
      return;
    }
    onRebuy(parsed.value);
  };

  return (
    <BottomSheet visible onClose={onClose} title="">
      <View style={styles.head}>
        <View style={styles.emojiBox}>
          <Text style={styles.emoji}>{categoryEmoji(item.categoryId)}</Text>
        </View>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.sub}>
            {[category?.name, item.location].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <Text style={styles.guide}>
        기존 정보를 그대로 가져왔어요. 새 제품의 유통기한만 입력하면 홈에 다시 등록됩니다.
      </Text>
      <Text style={styles.label}>유통기한</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError(false);
        }}
        placeholder="예: 2027.03.15 / 2027-03"
        placeholderTextColor={colors.muted}
        keyboardType="numbers-and-punctuation"
        autoFocus
      />
      {error ? <Text style={styles.errorText}>날짜를 읽지 못했어요 — 형식을 확인해 주세요</Text> : null}
      <Pressable onPress={save} style={styles.primary} accessibilityRole="button">
        <Text style={styles.primaryLabel}>홈에 재등록</Text>
      </Pressable>
      <Pressable onPress={() => onRebuy(null)} style={styles.ghost} accessibilityRole="button">
        <Text style={styles.ghostLabel}>기한은 나중에 입력할게요</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  emojiBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#E7EFE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  sub: {
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 2,
  },
  guide: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: 14,
  },
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
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
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
