import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/ui/Badge';
import { colors, radius, spacing } from '@/ui/tokens';

import { categoryEmoji, type EnrichedItem } from '../items/enrich';

/** 만료 임박 TOP 5 가로 카드 (목업 .top5) — 기한 있는 품목만, 임박순 상위 5개 */
export function Top5({
  entries,
  onPressItem,
}: {
  entries: EnrichedItem[];
  onPressItem: (id: string) => void;
}) {
  const top = entries.filter((e) => e.expiry !== null).slice(0, 5);
  if (top.length === 0) return null;

  return (
    <View>
      <Text style={styles.caption}>만료 임박 TOP 5</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {top.map((e) => (
          <Pressable
            key={e.item.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => onPressItem(e.item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${e.item.name}, ${e.badge.label}`}
          >
            <Text style={styles.emoji}>{categoryEmoji(e.item.categoryId)}</Text>
            <Text style={styles.name} numberOfLines={2}>
              {e.item.name}
            </Text>
            <Badge level={e.badge.level} label={e.badge.label} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    marginTop: 6,
    marginBottom: spacing.sm,
  },
  row: {
    gap: 10,
    paddingBottom: 6,
    marginBottom: spacing.sm,
  },
  card: {
    width: 108,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 11,
    paddingTop: 11,
    paddingBottom: 10,
    gap: 6,
  },
  pressed: {
    opacity: 0.7,
  },
  emoji: {
    fontSize: 22,
  },
  name: {
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 16.5,
    height: 33,
    color: colors.ink,
  },
});
