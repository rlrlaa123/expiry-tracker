import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Category, Item } from '@/db/schema';
import { todayIso } from '@/domain/date';
import { lifeProgress } from '@/domain/expiry';
import { ExpEditSheet } from '@/features/item-detail/ExpEditSheet';
import { ExpiryCard } from '@/features/item-detail/ExpiryCard';
import { categoryEmoji, formatDot, type EnrichedItem } from '@/features/items/enrich';
import { archiveItem, openItem, updateItemExp } from '@/features/items/mutations';
import { useItem } from '@/features/items/useItems';
import { BottomSheet, SheetOption } from '@/ui/BottomSheet';
import { hapticLight, hapticSuccess } from '@/ui/haptics';
import { useToast } from '@/ui/Toast';
import { colors, radius, spacing } from '@/ui/tokens';

function paoLabel(item: Item, category: Category | null): string {
  if (item.paoMonths === 0) return '설정 안 함';
  if (item.paoMonths != null) return `${item.paoMonths}개월 (직접 설정)`;
  if (category?.paoMonths) return `${category.paoMonths}개월 (${category.name} 기본값)`;
  return '—';
}

function InfoRow({
  label,
  value,
  dim,
  last,
}: {
  label: string;
  value: string;
  dim?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.irow, last && styles.irowLast]}>
      <Text style={styles.irowKey}>{label}</Text>
      <Text style={[styles.irowValue, dim && styles.irowValueDim]}>{value}</Text>
    </View>
  );
}

export default function ItemDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useItem(id);

  if (!entry) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.notFound}>품목을 찾을 수 없어요</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.appbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="뒤로">
          <Text style={styles.appbarIcon}>←</Text>
        </Pressable>
      </View>
      <DetailBody entry={entry} />
    </SafeAreaView>
  );
}

function DetailBody({ entry }: { entry: EnrichedItem }) {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { item, category, expiry, dday } = entry;
  const today = todayIso();
  const opened = item.openedAt !== null;
  const progressPct = expiry ? lifeProgress(item.openedAt ?? item.createdAt, expiry.date, today) : null;

  const [confirm, setConfirm] = useState<'consumed' | 'discarded' | null>(null);
  const [editingExp, setEditingExp] = useState(false);

  const handleOpen = async () => {
    hapticLight();
    const next = await openItem(item.id);
    toast(next ? `개봉 기록됨 · 만료 ${formatDot(next.date)} (${next.basis})` : '개봉 기록됨 · 기한 미설정');
  };

  const handleArchive = async () => {
    if (!confirm) return;
    const status = confirm;
    setConfirm(null);
    hapticSuccess();
    await archiveItem(item.id, status);
    toast(status === 'consumed' ? '소진 처리됨 · 아카이브로 이동' : '폐기 처리됨 · 아카이브로 이동');
    router.back();
  };

  const handleSaveExp = async (exp: string | null) => {
    setEditingExp(false);
    await updateItemExp(item.id, exp);
    toast('유통기한 수정됨');
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{categoryEmoji(item.categoryId)}</Text>
        </View>

        <Text style={styles.name}>{item.name}</Text>
        {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}

        <View style={styles.tagRow}>
          {category ? <Tag label={category.name} /> : null}
          {item.location ? <Tag label={`📍 ${item.location}`} /> : null}
          <Tag label={opened ? '개봉됨' : '미개봉'} />
        </View>

        <ExpiryCard
          expiry={expiry}
          dday={dday}
          progressPct={progressPct}
          startLabel={opened ? '개봉' : '등록'}
        />

        <View style={styles.infoCard}>
          <Pressable
            onPress={() => setEditingExp(true)}
            accessibilityRole="button"
            accessibilityLabel="유통기한 수정"
          >
            <View style={[styles.irow, styles.irowEditable]}>
              <Text style={styles.irowKey}>유통기한</Text>
              <Text style={[styles.irowValue, !item.exp && styles.irowValueDim]}>
                {item.exp ? formatDot(item.exp) : '—'} <Text style={styles.editHint}>✏️</Text>
              </Text>
            </View>
          </Pressable>
          <InfoRow label="제조일" value={item.mfg ? formatDot(item.mfg) : '—'} dim />
          <InfoRow label="개봉일" value={item.openedAt ? formatDot(item.openedAt) : '미개봉'} />
          <InfoRow label="개봉 후 사용기한" value={paoLabel(item, category)} last />
        </View>

        {item.memo ? (
          <View style={styles.memoCard}>
            <Text style={styles.memoLabel}>메모</Text>
            <Text style={styles.memoText}>{item.memo}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.actionbar, { paddingBottom: Math.max(insets.bottom, 14) + 12 }]}>
        {opened ? (
          <ActionButton label="소진했어요" primary onPress={() => setConfirm('consumed')} />
        ) : (
          <ActionButton label="개봉했어요" primary onPress={handleOpen} />
        )}
        <ActionButton label="폐기" danger onPress={() => setConfirm('discarded')} />
      </View>

      <BottomSheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'consumed' ? '소진 처리' : '폐기 처리'}
        description={
          confirm === 'consumed'
            ? '다 썼군요! 아카이브로 이동해요. 다시 사면 원탭으로 재등록할 수 있어요.'
            : '아카이브로 이동해요. 폐기 이력은 재구매 판단에 참고돼요.'
        }
      >
        <SheetOption label="확인" onPress={handleArchive} />
        <SheetOption label="취소" muted onPress={() => setConfirm(null)} />
      </BottomSheet>

      {editingExp && (
        <ExpEditSheet
          initial={item.exp}
          onClose={() => setEditingExp(false)}
          onSave={handleSaveExp}
        />
      )}
    </>
  );
}

function ActionButton({
  label,
  primary,
  danger,
  onPress,
}: {
  label: string;
  primary?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.abtn,
        primary && styles.abtnPrimary,
        danger && styles.abtnDanger,
        pressed && { opacity: 0.8 },
      ]}
      accessibilityRole="button"
    >
      <Text
        style={[styles.abtnLabel, primary && styles.abtnLabelPrimary, danger && styles.abtnLabelDanger]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    fontSize: 15,
    color: colors.muted,
  },
  appbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  appbarIcon: {
    fontSize: 19,
    color: colors.ink,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 130,
  },
  hero: {
    height: 170,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    // 목업 gradient 대체 단색 — ADR 006
    backgroundColor: '#E7EFE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroEmoji: {
    fontSize: 74,
  },
  name: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: colors.ink,
  },
  brand: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
    marginBottom: spacing.lg,
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 12,
    color: colors.ink,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  irow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  irowLast: {
    borderBottomWidth: 0,
  },
  irowEditable: {
    paddingVertical: 11,
  },
  editHint: {
    fontSize: 12,
  },
  actionbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 18,
    paddingTop: 14,
    backgroundColor: colors.canvas,
  },
  abtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  abtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  abtnDanger: {
    borderColor: '#EFD3D0',
  },
  abtnLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.ink,
  },
  abtnLabelPrimary: {
    color: '#FFFFFF',
  },
  abtnLabelDanger: {
    color: colors.danger,
  },
  irowKey: {
    fontSize: 13,
    color: colors.muted,
  },
  irowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  irowValueDim: {
    color: colors.muted,
    fontWeight: '400',
  },
  memoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
  },
  memoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  memoText: {
    fontSize: 13.5,
    color: colors.muted,
  },
});
