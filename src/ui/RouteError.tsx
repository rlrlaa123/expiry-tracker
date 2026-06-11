import type { ErrorBoundaryProps } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/ui/tokens';

/**
 * 라우트 에러 폴백 — JS 에러로 화면이 죽어도 까만 화면 대신 복구 버튼 제공.
 * 카피 톤: 사과 금지, 행동 안내 (DEV-GUIDE M6).
 */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>화면을 표시하지 못했어요</Text>
      <Text style={styles.hint} numberOfLines={3}>
        {error.message}
      </Text>
      <Pressable onPress={retry} style={styles.btn} accessibilityRole="button">
        <Text style={styles.btnLabel}>다시 시도</Text>
      </Pressable>
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
    paddingHorizontal: spacing.xxl,
  },
  title: {
    ...typography.heading,
    color: colors.ink,
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 99,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  btnLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
