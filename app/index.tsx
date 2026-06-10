import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/ui/tokens';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.appbar}>
        <Text style={styles.title}>유통기한</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>아직 등록된 품목이 없어요</Text>
        <Text style={styles.emptyHint}>곧 카메라로 첫 품목을 등록할 수 있어요</Text>
      </View>
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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.ink,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.muted,
  },
});
