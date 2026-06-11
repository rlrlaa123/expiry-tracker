import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { distinctLocations, filterEntries, type HomeFilter } from '@/features/home/filter';
import { FilterChips } from '@/features/home/FilterChips';
import { ItemRow } from '@/features/home/ItemRow';
import { Top5 } from '@/features/home/Top5';
import { useActiveItems } from '@/features/items/useItems';
import { colors, spacing, typography } from '@/ui/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const entries = useActiveItems();
  const [filter, setFilter] = useState<HomeFilter>({ kind: 'all' });
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const locations = useMemo(() => distinctLocations(entries), [entries]);
  const rows = useMemo(() => filterEntries(entries, filter, query), [entries, filter, query]);
  const goDetail = (id: string) => router.push(`/item/${id}`);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.appbar}>
        <Text style={styles.title}>우리집 물건</Text>
        <Pressable
          onPress={() => {
            setSearchOpen((v) => !v);
            if (searchOpen) setQuery('');
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="품목명 검색"
        >
          <Text style={styles.searchIcon}>🔍</Text>
        </Pressable>
      </View>

      {searchOpen && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="품목명 검색"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(e) => e.item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <Top5 entries={entries} onPressItem={goDetail} />
            <FilterChips active={filter} locations={locations} onChange={setFilter} />
          </>
        }
        renderItem={({ item: entry }) => (
          <ItemRow entry={entry} onPress={() => goDetail(entry.item.id)} />
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
  searchIcon: {
    fontSize: 19,
  },
  searchWrap: {
    paddingHorizontal: 18,
    paddingTop: spacing.sm,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.ink,
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
