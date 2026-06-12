import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { categories } from '@/db/schema';
import type { DigestSettings } from '@/domain/notification-planner';
import { AddCategorySheet } from '@/features/categories/AddCategorySheet';
import { deleteCategory, setCategoryPao } from '@/features/categories/mutations';
import { useSettings } from '@/features/settings/store';
import {
  ensureNotificationPermission,
  getNotificationPermissionStatus,
  rescheduleDigest,
} from '@/services/notifications';
import { BottomSheet, SheetOption } from '@/ui/BottomSheet';
import { Stepper } from '@/ui/Stepper';
import { useToast } from '@/ui/Toast';
import { colors, radius, spacing, typography } from '@/ui/tokens';

const PAO_MAX = 36;

const STAGE_ROWS: { key: keyof DigestSettings['stages']; label: string; desc: string }[] = [
  { key: 'd30', label: 'D-30 알림', desc: '한 달 전 — 여유 있게 소진 계획' },
  { key: 'd7', label: 'D-7 알림', desc: '일주일 전 — 이번 주에 쓰세요' },
  { key: 'd1', label: 'D-1 알림', desc: '하루 전 — 마지막 안내' },
  { key: 'd0', label: '만료일 알림', desc: '만료 당일 — 폐기/연장 처리 안내' },
];

function formatTime(hour: number, minute: number): string {
  const ampm = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${ampm} ${h12}:${String(minute).padStart(2, '0')}`;
}

function previewText({ hour, minute, stages }: DigestSettings): string {
  const on = STAGE_ROWS.filter((s) => stages[s.key]).map((s) => s.label.replace(' 알림', ''));
  if (on.length === 0) return '모든 알림이 꺼져 있어요. 만료를 놓칠 수 있어요.';
  return `매일 ${formatTime(hour, minute)}에 ${on.join(' · ')} 단계를 한 번에 묶어서 알려드려요.`;
}

export default function SettingsScreen() {
  const toast = useToast();
  const settings = useSettings();
  const { data: cats } = useLiveQuery(db.select().from(categories));
  const [timeSheetOpen, setTimeSheetOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'undetermined' | 'unavailable'
  >('granted');

  useEffect(() => {
    getNotificationPermissionStatus().then(setPermission);
  }, []);

  const requestPermission = async () => {
    const ok = await ensureNotificationPermission();
    setPermission(ok ? 'granted' : await getNotificationPermissionStatus());
    if (ok) {
      void rescheduleDigest();
      toast('알림이 켜졌어요');
    }
  };

  const toggleStage = async (key: keyof DigestSettings['stages'], on: boolean) => {
    settings.setStage(key, on);
    if (on && permission !== 'granted') await requestPermission();
    void rescheduleDigest();
  };

  const changePao = async (id: string, name: string, current: number | null, delta: number) => {
    const next = Math.min(PAO_MAX, Math.max(0, (current ?? 0) + delta));
    await setCategoryPao(id, next);
    toast(next ? `${name} → 개봉 후 ${next}개월` : `${name} → PAO 설정 안 함`);
  };

  // 파괴적 동작 — 확인 시트를 거친다 (UX-SCENARIOS S7)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const removeCategory = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    await deleteCategory(id);
    toast(`'${name}' 삭제됨 · 소속 품목은 '기타'로 이동`);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.appbar}>
        <Text style={styles.title}>설정</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.secCap}>알림</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => setTimeSheetOpen(true)} accessibilityRole="button">
            <View style={styles.rowText}>
              <Text style={styles.rowKey}>묶음 알림 시각</Text>
              <Text style={styles.rowDesc}>하루 한 번, 이 시각에 모아서 알려드려요</Text>
            </View>
            <Text style={styles.timeValue}>{formatTime(settings.hour, settings.minute)}</Text>
          </Pressable>
          {STAGE_ROWS.map(({ key, label, desc }) => (
            <View key={key} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowKey}>{label}</Text>
                <Text style={styles.rowDesc}>{desc}</Text>
              </View>
              <Switch
                value={settings.stages[key]}
                onValueChange={(on) => toggleStage(key, on)}
                trackColor={{ false: '#D7D6CE', true: colors.primary }}
                thumbColor="#FFFFFF"
                accessibilityLabel={label}
              />
            </View>
          ))}
          {permission === 'denied' || permission === 'undetermined' ? (
            <Pressable style={[styles.row, styles.rowLast]} onPress={requestPermission} accessibilityRole="button">
              <View style={styles.rowText}>
                <Text style={[styles.rowKey, { color: colors.danger }]}>알림 권한이 꺼져 있어요</Text>
                <Text style={styles.rowDesc}>
                  {permission === 'denied'
                    ? '시스템 설정 > 앱 > 유통기한 트래커에서 허용해 주세요'
                    : '탭해서 알림을 허용해 주세요'}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.preview}>{previewText(settings)}</Text>

        <Text style={styles.secCap}>카테고리 · 개봉 후 사용기한 (PAO)</Text>
        <View style={styles.card}>
          {(cats ?? []).map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowKey}>
                  {c.name}
                  {c.builtin ? '' : '  '}
                  {!c.builtin && <Text style={styles.kTag}>내가 추가</Text>}
                </Text>
              </View>
              <View style={styles.catActions}>
                <Stepper
                  label={c.paoMonths ? `${c.paoMonths}개월` : '없음'}
                  onMinus={() => changePao(c.id, c.name, c.paoMonths, -1)}
                  onPlus={() => changePao(c.id, c.name, c.paoMonths, +1)}
                />
                {!c.builtin ? (
                  <Pressable
                    onPress={() => setDeleteTarget({ id: c.id, name: c.name })}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.name} 삭제`}
                  >
                    <Text style={styles.del}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
          <Pressable
            style={[styles.row, styles.rowLast]}
            onPress={() => setAddSheetOpen(true)}
            accessibilityRole="button"
          >
            <Text style={styles.addRow}>＋ 새 카테고리 추가</Text>
          </Pressable>
        </View>

        <Text style={styles.secCap}>데이터</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowKey}>저장 위치</Text>
              <Text style={styles.rowDesc}>
                모든 데이터는 이 기기에만 저장돼요. 서버로 전송되지 않아요.
              </Text>
            </View>
            <Text style={styles.deviceTag}>이 기기</Text>
          </View>
          <View style={[styles.row, styles.rowLast, styles.dimRow]}>
            <View style={styles.rowText}>
              <Text style={styles.rowKey}>클라우드 백업</Text>
              <Text style={styles.rowDesc}>기기를 바꿔도 데이터 유지</Text>
            </View>
            <Text style={styles.soonChip}>준비 중</Text>
          </View>
        </View>

        <Text style={styles.secCap}>정보</Text>
        <View style={styles.card}>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowKey}>앱 버전</Text>
            <Text style={styles.rowDesc}>0.1.0 (MVP)</Text>
          </View>
        </View>
      </ScrollView>

      {timeSheetOpen && (
        <TimeSheet
          hour={settings.hour}
          minute={settings.minute}
          onClose={() => setTimeSheetOpen(false)}
          onChange={async (h, m) => {
            settings.setTime(h, m);
            if (permission !== 'granted') await requestPermission();
            void rescheduleDigest();
            toast('알림 시각이 변경됐어요');
          }}
        />
      )}
      {addSheetOpen && <AddCategorySheet onClose={() => setAddSheetOpen(false)} />}

      <BottomSheet
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={`'${deleteTarget?.name ?? ''}' 카테고리 삭제`}
        description="소속 품목은 '기타'로 이동하고 품목 데이터는 보존돼요."
      >
        <SheetOption label="삭제할게요" danger onPress={removeCategory} />
        <SheetOption label="취소" muted onPress={() => setDeleteTarget(null)} />
      </BottomSheet>
    </SafeAreaView>
  );
}

function TimeSheet({
  hour,
  minute,
  onClose,
  onChange,
}: {
  hour: number;
  minute: number;
  onClose: () => void;
  onChange: (hour: number, minute: number) => void;
}) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  return (
    <BottomSheet
      visible
      onClose={() => {
        if (h !== hour || m !== minute) onChange(h, m);
        onClose();
      }}
      title="묶음 알림 시각"
      description={`매일 ${formatTime(h, m)}에 알려드려요 — 닫으면 저장돼요`}
    >
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>시</Text>
        <Stepper
          label={String(h).padStart(2, '0')}
          onMinus={() => setH((v) => (v + 23) % 24)}
          onPlus={() => setH((v) => (v + 1) % 24)}
        />
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel}>분</Text>
        <Stepper
          label={String(m).padStart(2, '0')}
          onMinus={() => setM((v) => (v + 55) % 60)}
          onPlus={() => setM((v) => (v + 5) % 60)}
        />
      </View>
    </BottomSheet>
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
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  secCap: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  dimRow: {
    opacity: 0.6,
  },
  rowText: {
    flex: 1,
  },
  rowKey: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  rowDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  kTag: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  catActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  del: {
    fontSize: 14,
    color: colors.danger,
    paddingHorizontal: 4,
  },
  addRow: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.primary,
  },
  preview: {
    fontSize: 12.5,
    color: colors.muted,
    lineHeight: 18,
    marginTop: spacing.sm,
    paddingHorizontal: 4,
  },
  deviceTag: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  soonChip: {
    fontSize: 11.5,
    color: colors.muted,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
});
