import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/ui/tokens';

/** M5에서 구현 — 알림 시각/단계, 카테고리 관리, 데이터 섹션 */
export default function SettingsScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>설정</Text>
      <Text style={styles.hint}>알림·카테고리 설정이 여기에 들어가요 (준비 중)</Text>
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
