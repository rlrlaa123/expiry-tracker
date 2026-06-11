import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/ui/tokens';

/** M6에서 구현 — 월별 그룹, 소진/폐기 뱃지, "다시 샀어요" 시트 */
export default function ArchiveScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>아카이브</Text>
      <Text style={styles.hint}>소진·폐기한 품목이 여기에 모여요 (준비 중)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.ink,
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
  },
});
