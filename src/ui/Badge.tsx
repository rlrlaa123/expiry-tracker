import { StyleSheet, Text, View } from 'react-native';

import type { BadgeLevel } from '@/domain/expiry';
import { colors } from '@/ui/tokens';

/** D-day 뱃지 4단계+미설정 색 (DEV-GUIDE §4-2, 목업 .badge) */
const PALETTE: Record<BadgeLevel, { bg: string; fg: string }> = {
  expired: { bg: colors.dangerSoft, fg: colors.danger },
  d7: { bg: colors.orangeSoft, fg: colors.orange },
  d30: { bg: colors.yellowSoft, fg: colors.yellow },
  safe: { bg: colors.greenSoft, fg: colors.green },
  none: { bg: colors.graySoft, fg: colors.muted },
};

export function Badge({ level, label }: { level: BadgeLevel; label: string }) {
  const { bg, fg } = PALETTE[level];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
  },
});
