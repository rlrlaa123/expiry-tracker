import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { db } from '@/db/client';
import { categories, type Item } from '@/db/schema';
import type { EditableFields } from '@/features/items/mutations';
import { BottomSheet } from '@/ui/BottomSheet';
import { colors, radius } from '@/ui/tokens';

/** 상세 '정보 수정' 시트 — 이름·브랜드·카테고리·위치·메모 (UX-SCENARIOS S4) */
export function EditItemSheet({
  item,
  onClose,
  onSave,
}: {
  item: Item;
  onClose: () => void;
  onSave: (fields: EditableFields) => void;
}) {
  const { data: cats } = useLiveQuery(db.select().from(categories));
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand ?? '');
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [location, setLocation] = useState(item.location ?? '');
  const [memo, setMemo] = useState(item.memo ?? '');

  const canSave = name.trim().length > 0;

  return (
    <BottomSheet visible onClose={onClose} title="정보 수정">
      <Text style={styles.label}>품목명</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="품목명"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>브랜드</Text>
      <TextInput
        style={styles.input}
        value={brand}
        onChangeText={setBrand}
        placeholder="선택 입력"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>카테고리</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {(cats ?? []).map((c) => {
          const on = c.id === categoryId;
          return (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.label}>보관 위치</Text>
      <TextInput
        style={styles.input}
        value={location}
        onChangeText={setLocation}
        placeholder="예: 욕실"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>메모</Text>
      <TextInput
        style={styles.input}
        value={memo}
        onChangeText={setMemo}
        placeholder="메모"
        placeholderTextColor={colors.muted}
      />
      <View style={{ height: 6 }} />
      <Pressable
        onPress={() =>
          onSave({
            name: name.trim(),
            brand: brand.trim() || null,
            categoryId,
            location: location.trim() || null,
            memo: memo.trim() || null,
          })
        }
        disabled={!canSave}
        style={[styles.primary, !canSave && { opacity: 0.4 }]}
        accessibilityRole="button"
      >
        <Text style={styles.primaryLabel}>저장</Text>
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
    paddingVertical: 11,
    fontSize: 14.5,
    color: colors.ink,
    marginBottom: 12,
  },
  chips: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.ink,
  },
  chipLabelOn: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  ghost: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  ghostLabel: {
    fontSize: 13.5,
    color: colors.muted,
  },
});
