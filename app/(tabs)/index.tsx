import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ItemRow } from '@/features/home/ItemRow';
import { useActiveItems } from '@/features/items/useItems';
import { colors, spacing, typography } from '@/ui/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const entries = useActiveItems();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.appbar}>
        <Text style={styles.title}>우리집 물건</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: entry }) => (
          <ItemRow entry={entry} onPress={() => router.push(`/item/${entry.item.id}`)} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>조건에 맞는 품목이 없어요</Text>}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="품목 등록 (카메라)"
      >
        <Text style={styles.fabIcon}>📷</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  appbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: spacing.sm,
    paddingBottom: 110,
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13.5,
    paddingVertical: 34,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 8 },
  },
  fabPressed: {
    opacity: 0.85,
  },
  fabIcon: {
    fontSize: 24,
  },
});
