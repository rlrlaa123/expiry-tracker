import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useItem } from '@/features/items/useItems';
import { colors, spacing, typography } from '@/ui/tokens';

/** M2-6에서 목업 item-detail로 교체 예정인 스텁 */
export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useItem(id);

  return (
    <View style={styles.center}>
      <Text style={styles.title}>{entry?.item.name ?? '품목을 찾을 수 없어요'}</Text>
      <Text style={styles.hint}>상세 화면 준비 중</Text>
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
