import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/ui/tokens';

/** M3-5에서 확인/편집 폼으로 교체 예정인 스텁 */
export default function FormScreen() {
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();
  return (
    <View style={styles.center}>
      <Text style={styles.title}>새 품목</Text>
      <Text style={styles.hint} numberOfLines={1}>
        {photoUri ?? '사진 없음'}
      </Text>
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
  },
});
