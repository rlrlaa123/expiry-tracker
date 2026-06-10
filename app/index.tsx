import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { categories } from '@/db/schema';
import { colors, radius, spacing, typography } from '@/ui/tokens';

/**
 * M1 임시 홈 — 시드된 카테고리를 표시해 DB 파이프라인을 검증한다.
 * M2에서 품목 리스트(임박순, Top5, 뱃지)로 교체 예정.
 */
export default function HomeScreen() {
  const { data: cats } = useLiveQuery(db.select().from(categories));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.appbar}>
        <Text style={styles.title}>유통기한</Text>
      </View>
      <Text style={styles.sectionLabel}>기본 카테고리 (M1 시드 확인용)</Text>
      <FlatList
        data={cats ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: cat }) => (
          <View style={styles.card}>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catMeta}>
              {cat.paoMonths ? `개봉 후 ${cat.paoMonths}개월` : 'PAO 미설정'}
              {cat.shelfLifeMonths ? ` · 보존 ${cat.shelfLifeMonths}개월` : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyHint}>카테고리를 불러오는 중…</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  appbar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.muted,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  catName: {
    ...typography.heading,
    color: colors.ink,
  },
  catMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  empty: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyHint: {
    ...typography.caption,
    color: colors.muted,
  },
});
