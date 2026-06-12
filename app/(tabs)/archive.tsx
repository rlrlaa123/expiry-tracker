import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RebuySheet } from '@/features/archive/RebuySheet';
import { useArchivedItems, type ArchivedEntry } from '@/features/archive/useArchivedItems';
import { categoryEmoji, formatDot } from '@/features/items/enrich';
import { deleteItem, rebuyItem } from '@/features/items/mutations';
import { dday as calcDday } from '@/domain/expiry';
import { todayIso } from '@/domain/date';
import { BottomSheet, SheetOption } from '@/ui/BottomSheet';
import { hapticLight } from '@/ui/haptics';
import { useToast } from '@/ui/Toast';
import { colors, radius, spacing, typography } from '@/ui/tokens';

type ArchiveFilter = 'all' | 'consumed' | 'discarded';

const FILTERS: { key: ArchiveFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'consumed', label: '소진' },
  { key: 'discarded', label: '폐기' },
];

export default function ArchiveScreen() {
  const router = useRouter();
  const toast = useToast();
  const entries = useArchivedItems();
  const [filter, setFilter] = useState<ArchiveFilter>('all');
  const [target, setTarget] = useState<ArchivedEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArchivedEntry | null>(null);
  const [rebought, setRebought] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () => entries.filter((e) => filter === 'all' || e.item.status === filter),
    [entries, filter],
  );

  const handleRebuy = async (exp: string | null) => {
    if (!target) return;
    const name = target.item.name;
    const sourceId = target.item.id;
    setTarget(null);
    const result = await rebuyItem(sourceId, exp);
    if (!result) return;
    setRebought((prev) => new Set(prev).add(sourceId));
    const d = calcDday(result.expiry?.date ?? null, todayIso());
    toast(d === null ? `${name} · 기한 미설정으로 재등록됨` : `${name} · 홈에 재등록됨 (D-${d})`);
  };

  // 이력 삭제 — 노출 버튼 없이 길게 누르기 뒤에만 (보존이 기본, UX-SCENARIOS S4)
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const name = deleteTarget.item.name;
    const id = deleteTarget.item.id;
    setDeleteTarget(null);
    await deleteItem(id);
    toast(`'${name}' 이력까지 삭제됨`);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.appbar}>
        <Text style={styles.title}>아카이브</Text>
        <Text style={styles.subtitle}>
          소진·폐기한 물건의 이력 — 다시 살 때 원탭으로 재등록하세요
        </Text>
      </View>

      <View style={styles.filters}>
        {FILTERS.map(({ key, label }) => {
          const on = key === filter;
          return (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.fchip, on && styles.fchipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.fchipLabel, on && styles.fchipLabelOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>
            아직 이력이 없어요.{'\n'}홈에서 소진·폐기 처리한 물건이 여기에 모여요.
          </Text>
        ) : (
          rows.map((entry, i) => {
            const showMonth = i === 0 || rows[i - 1].monthKey !== entry.monthKey;
            const consumed = entry.item.status === 'consumed';
            const meta = [formatDot(entry.item.updatedAt), entry.usage].filter(Boolean).join(' · ');
            const done = rebought.has(entry.item.id);
            return (
              <View key={entry.item.id}>
                {showMonth && <Text style={styles.monthCap}>{entry.monthKey}</Text>}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                  onPress={() => router.push(`/item/${entry.item.id}`)}
                  onLongPress={() => {
                    hapticLight();
                    setDeleteTarget(entry);
                  }}
                  delayLongPress={450}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.item.name} 상세 (길게 누르면 삭제)`}
                >
                  <View style={styles.emojiBox}>
                    <Text style={styles.emoji}>{categoryEmoji(entry.item.categoryId)}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {entry.item.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.st, consumed ? styles.stUsed : styles.stDisc]}>
                        {consumed ? '소진' : '폐기'}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {meta}
                      </Text>
                    </View>
                  </View>
                  {done ? (
                    <Text style={styles.rebuyDone}>재등록됨 ✓</Text>
                  ) : (
                    <Pressable
                      onPress={() => setTarget(entry)}
                      style={({ pressed }) => [styles.rebuy, pressed && { opacity: 0.7 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.item.name} 다시 샀어요`}
                    >
                      <Text style={styles.rebuyLabel}>다시 샀어요</Text>
                    </Pressable>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>

      {target && (
        <RebuySheet entry={target} onClose={() => setTarget(null)} onRebuy={handleRebuy} />
      )}

      <BottomSheet
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`'${deleteTarget?.item.name ?? ''}' 완전 삭제`}
        description="이력까지 영구 삭제돼요. 되돌릴 수 없어요. 이력을 남겨두면 다시 살 때 도움이 돼요."
      >
        <SheetOption label="삭제할게요" danger onPress={handleDelete} />
        <SheetOption label="취소" muted onPress={() => setDeleteTarget(null)} />
      </BottomSheet>
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
    gap: 3,
  },
  title: {
    ...typography.title,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12.5,
    color: colors.muted,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  fchip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  fchipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  fchipLabel: {
    fontSize: 13,
    color: colors.ink,
  },
  fchipLabelOn: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13.5,
    lineHeight: 21,
    paddingVertical: 34,
  },
  monthCap: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    marginTop: 6,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 9,
  },
  emojiBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#E7EFE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  st: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    overflow: 'hidden',
  },
  stUsed: {
    backgroundColor: colors.primarySoft,
    color: colors.primary,
  },
  stDisc: {
    backgroundColor: colors.graySoft,
    color: colors.muted,
  },
  meta: {
    fontSize: 12,
    color: colors.muted,
    flexShrink: 1,
  },
  rebuy: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  rebuyLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  rebuyDone: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.muted,
  },
});
