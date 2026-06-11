import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/ui/Badge';
import { colors, radius, spacing } from '@/ui/tokens';

import { categoryEmoji, formatDot, shortBasis, type EnrichedItem } from '../items/enrich';

function metaLine({ item, expiry }: EnrichedItem): string {
  const detail = expiry
    ? `${formatDot(expiry.date)} 만료 (${shortBasis(expiry.basis)})`
    : '기한을 설정해 주세요';
  return item.location ? `${item.location} · ${detail}` : detail;
}

export function ItemRow({
  entry,
  onPress,
  onOpen,
  onHandle,
}: {
  entry: EnrichedItem;
  onPress: () => void;
  /** 행 내 원탭 개봉 (미개봉 품목) */
  onOpen: () => void;
  /** 만료 품목 처리 시트 열기 */
  onHandle: () => void;
}) {
  const { item, badge, dday } = entry;
  const expired = dday !== null && dday < 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${badge.label}`}
    >
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{categoryEmoji(item.categoryId)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {metaLine(entry)}
        </Text>
      </View>
      <Badge level={badge.level} label={badge.label} />
      {expired ? (
        <Pressable
          onPress={onHandle}
          style={({ pressed }) => [styles.act, styles.actDanger, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} 만료 처리`}
        >
          <Text style={[styles.actLabel, styles.actLabelDanger]}>처리</Text>
        </Pressable>
      ) : !item.openedAt ? (
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.act, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${item.name} 개봉`}
        >
          <Text style={styles.actLabel}>개봉</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 9,
  },
  pressed: {
    opacity: 0.7,
  },
  emojiBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    // 목업 gradient(150deg,#DCEAE4→#F2EFE3) 대체 단색 — ADR 006
    backgroundColor: '#E7EFE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
  },
  meta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
  },
  act: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  actDanger: {
    borderColor: colors.danger,
  },
  actLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  actLabelDanger: {
    color: colors.danger,
  },
});
