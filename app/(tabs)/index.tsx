import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { distinctLocations, filterEntries, type HomeFilter } from '@/features/home/filter';
import { FilterChips } from '@/features/home/FilterChips';
import { HandleExpiredSheet } from '@/features/home/HandleExpiredSheet';
import { ItemRow } from '@/features/home/ItemRow';
import { Top5 } from '@/features/home/Top5';
import { formatDot, type EnrichedItem } from '@/features/items/enrich';
import { archiveItem, extendItemExpiry, openItem } from '@/features/items/mutations';
import { useActiveItems } from '@/features/items/useItems';
import { useToast } from '@/ui/Toast';
import { colors, spacing, typography } from '@/ui/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const entries = useActiveItems();
  const [filter, setFilter] = useState<HomeFilter>({ kind: 'all' });
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [handleTarget, setHandleTarget] = useState<EnrichedItem | null>(null);

  const locations = useMemo(() => distinctLocations(entries), [entries]);
  const rows = useMemo(() => filterEntries(entries, filter, query), [entries, filter, query]);
  const goDetail = (id: string) => router.push(`/item/${id}`);

  const handleOpen = async (entry: EnrichedItem) => {
    const expiry = await openItem(entry.item.id);
    toast(expiry ? `개봉 기록됨 · 만료 ${formatDot(expiry.date)}` : '개봉 기록됨 · 기한 미설정');
  };

  const closeSheet = () => setHandleTarget(null);
  const handleDiscard = async () => {
    if (!handleTarget) return;
    closeSheet();
    await archiveItem(handleTarget.item.id, 'discarded');
    toast('아카이브로 이동했어요');
  };
  const handleKeep = () => {
    closeSheet();
    toast('목록에 남겨둘게요');
  };
  const handleExtend = async () => {
    if (!handleTarget) return;
    closeSheet();
    const expiry = await extendItemExpiry(handleTarget.item.id);
    if (expiry) toast(`기한 연장됨 · ${formatDot(expiry.date)}`);
  };

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
          <ItemRow
            entry={entry}
            onPress={() => goDetail(entry.item.id)}
            onOpen={() => handleOpen(entry)}
            onHandle={() => setHandleTarget(entry)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>조건에 맞는 품목이 없어요</Text>}
      />

      <Pressable
        onPress={() => router.push('/camera')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
        accessibilityLabel="품목 등록 (카메라)"
      >
        <Text style={styles.fabIcon}>📷</Text>
      </Pressable>

      <HandleExpiredSheet
        target={handleTarget}
        onClose={closeSheet}
        onDiscard={handleDiscard}
        onKeep={handleKeep}
        onExtend={handleExtend}
      />
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
