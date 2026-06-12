import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '@/db/client';
import { categories } from '@/db/schema';
import { todayIso, type IsoDate } from '@/domain/date';
import { parseDates } from '@/domain/dateParser';
import { computeExpiry, dday as calcDday } from '@/domain/expiry';
import { AddCategorySheet } from '@/features/categories/AddCategorySheet';
import { formatDot } from '@/features/items/enrich';
import { createItem } from '@/features/items/mutations';
import { mergeRecognition, recognizeCapture, type CaptureRecognition } from '@/services/recognize';
import { persistThumbnail } from '@/services/thumbnails';
import { BottomSheet, SheetOption } from '@/ui/BottomSheet';
import { hapticSuccess } from '@/ui/haptics';
import { RouteError } from '@/ui/RouteError';
import { useToast } from '@/ui/Toast';
import { colors, radius, spacing } from '@/ui/tokens';

/** 렌더 중 JS 에러 시 까만 화면 대신 복구 UI */
export const ErrorBoundary = RouteError;

const BASE_LOCATIONS = ['욕실', '주방', '약장'];

/** 자유 형식 날짜 텍스트 → IsoDate (ADR 007 — parseDates 재사용) */
function parseDateInput(text: string): IsoDate | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return parseDates(trimmed)[0]?.value ?? null;
}

export default function FormScreen() {
  const router = useRouter();
  const toast = useToast();
  const { photoUri } = useLocalSearchParams<{ photoUri?: string }>();
  const { data: cats } = useLiveQuery(db.select().from(categories));

  const [recog, setRecog] = useState<CaptureRecognition | null>(null);
  const [recognizing, setRecognizing] = useState(!!photoUri);
  /** 찍은 사진 스트립 (압축본 uri) — 첫 장이 대표 썸네일로 저장됨 */
  const [photos, setPhotos] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [nameLow, setNameLow] = useState(false);
  const [brand, setBrand] = useState('');
  const [brandLow, setBrandLow] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [baseDateText, setBaseDateText] = useState('');
  const [baseAssumed, setBaseAssumed] = useState(false);
  const [isMfg, setIsMfg] = useState(false);
  const [recognizedMfg, setRecognizedMfg] = useState<IsoDate | null>(null);
  const [isOpened, setIsOpened] = useState(false);
  const [openedText, setOpenedText] = useState(formatDot(todayIso()));
  /** 라벨 12M 심볼 [적용] 시 품목별 PAO 덮어쓰기 */
  const [paoOverride, setPaoOverride] = useState<number | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [extraLocations, setExtraLocations] = useState<string[]>([]);
  const [addingLocation, setAddingLocation] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  // 인식 결과로 비어 있는 필드만 채운다 (사용자 입력 우선, low는 노란 테두리)
  const applyRecognition = useCallback(async (r: CaptureRecognition) => {
    setRecognizedMfg((prev) => prev ?? r.adopted.mfg);
    setBaseDateText((prev) => {
      if (prev !== '') return prev;
      if (r.adopted.exp) {
        setBaseAssumed(r.adopted.expAssumed);
        return formatDot(r.adopted.exp);
      }
      if (r.adopted.mfg) {
        setIsMfg(true);
        return formatDot(r.adopted.mfg);
      }
      return prev;
    });
    if (r.productName) {
      setName((prev) => prev || r.productName!);
      if (r.confidence?.productName === 'low') setNameLow(true);
    }
    if (r.brand) {
      setBrand((prev) => prev || r.brand!);
      if (r.confidence?.brand === 'low') setBrandLow(true);
    }
    if (r.categoryName) {
      const matched = (await db.select().from(categories)).find((c) => c.name === r.categoryName);
      if (matched) setCategoryId((prev) => prev ?? matched.id);
    }
  }, []);

  // 첫 사진 인식
  useEffect(() => {
    if (!photoUri) return;
    let cancelled = false;
    setPhotos([photoUri]);
    recognizeCapture(photoUri).then((r) => {
      if (cancelled) return;
      setRecog(r);
      setRecognizing(false);
      // 원본 → 압축본으로 교체
      setPhotos((prev) => prev.map((u) => (u === photoUri ? r.thumbnailUri : u)));
      void applyRecognition(r);
    });
    return () => {
      cancelled = true;
    };
  }, [photoUri, applyRecognition]);

  // "다른 면 찍기" — 사진 스트립에 추가하고 인식 결과를 병합해 빈 필드 보강 (ADR 010)
  const addAnotherPhoto = async () => {
    if (recognizing) return;
    if (!requireOptionalNativeModule('ExponentImagePicker')) {
      toast('이 빌드에는 카메라 모듈이 없어요');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require
    const picker = require('expo-image-picker') as typeof import('expo-image-picker');
    try {
      const result = await picker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
      const asset = result.assets?.[0];
      if (!asset) return;
      setRecognizing(true);
      setPhotos((prev) => [...prev, asset.uri]);
      const next = await recognizeCapture(asset.uri);
      setPhotos((prev) => prev.map((u) => (u === asset.uri ? next.thumbnailUri : u)));
      const merged = mergeRecognition(recog, next);
      setRecog(merged);
      await applyRecognition(merged);
    } catch {
      toast('촬영이 안 됐어요 — 다시 시도해 주세요');
    } finally {
      setRecognizing(false);
    }
  };

  const category = useMemo(
    () => (cats ?? []).find((c) => c.id === categoryId) ?? null,
    [cats, categoryId],
  );

  // 실시간 만료 계산 (목업 recalc)
  const parsedBase = parseDateInput(baseDateText);
  const parsedOpened = isOpened ? parseDateInput(openedText) : null;
  const expiry = computeExpiry(
    {
      exp: isMfg ? null : parsedBase,
      mfg: isMfg ? parsedBase : recognizedMfg,
      openedAt: parsedOpened,
      paoMonthsOverride: paoOverride,
    },
    {
      paoMonths: category?.paoMonths ?? null,
      shelfLifeMonths: category?.shelfLifeMonths ?? null,
    },
  );
  const dday = calcDday(expiry?.date ?? null, todayIso());

  // PAO 제안: 카테고리 기본값 우선, 없으면 라벨의 12M 심볼 (ADR 010)
  const paoSuggestion = category?.paoMonths
    ? { months: category.paoMonths, source: `${category.name} 기본값` }
    : recog?.paoHint
      ? { months: recog.paoHint, source: '라벨 표기' }
      : null;
  const showPaoBanner = !expiry && paoSuggestion !== null;

  // 목업 3상태: 인식 성공 / 일부만 인식 / 인식 실패
  const recognizedAnything =
    !!recog && (recog.productName !== null || recog.categoryName !== null || !!parsedBase);
  const thumbTitle = recognizing
    ? '사진 인식 중…'
    : !photoUri
      ? '사진 없음'
      : recog?.productName && parsedBase
        ? '사진 인식 완료'
        : recognizedAnything
          ? '일부만 인식했어요'
          : '인식하지 못했어요';

  const locations = useMemo(() => {
    const all = [...BASE_LOCATIONS, ...extraLocations];
    return [...new Set(all)];
  }, [extraLocations]);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const thumbnailUri = recog
        ? persistThumbnail(recog.thumbnailUri, `capture-${Date.now().toString(36)}`)
        : null;
      const { expiry: saved } = await createItem({
        name: name.trim(),
        brand: brand.trim() || null,
        categoryId: categoryId ?? 'builtin-etc',
        thumbnailUri,
        exp: isMfg ? null : parsedBase,
        mfg: isMfg ? parsedBase : recognizedMfg,
        openedAt: parsedOpened,
        paoMonths: paoOverride,
        location,
        memo: memo.trim() || null,
      });
      const d = calcDday(saved?.date ?? null, todayIso());
      const label =
        d === null ? '저장됨 · 기한 미설정' : d >= 0 ? `저장됨 · D-${d}` : `저장됨 · D+${-d}`;
      hapticSuccess();
      router.dismissTo('/(tabs)');
      toast(label, { label: '하나 더 찍기', onPress: () => router.push('/camera') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.dismissTo('/(tabs)')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Text style={styles.appbarTitle}>새 품목</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          accessibilityRole="button"
        >
          <Text style={styles.saveBtnLabel}>저장</Text>
        </Pressable>
      </View>

      {/* edge-to-edge Android에서 adjustResize 미동작 — 키보드 높이만큼 패딩해 입력 가림 방지 */}
      <KeyboardAvoidingView behavior="padding" style={styles.kav}>
        <ScrollView
          contentContainerStyle={styles.sheet}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 사진 스트립: 찍은 사진들 + [다른 면 추가] 타일 */}
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoStrip}
            >
              {photos.length === 0 ? (
                <View style={styles.thumb}>
                  <Text style={styles.thumbEmoji}>📦</Text>
                </View>
              ) : (
                photos.map((uri, i) => (
                  <View key={uri} style={styles.thumb}>
                    <Image source={{ uri }} style={styles.thumbImage} contentFit="cover" />
                    {i === 0 && photos.length > 1 ? (
                      <View style={styles.mainTag}>
                        <Text style={styles.mainTagLabel}>대표</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
              {photoUri ? (
                <Pressable
                  onPress={addAnotherPhoto}
                  disabled={recognizing}
                  style={({ pressed }) => [
                    styles.thumb,
                    styles.addTile,
                    (pressed || recognizing) && { opacity: 0.6 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="다른 면 찍기"
                >
                  <Text style={styles.addTileIcon}>＋</Text>
                  <Text style={styles.addTileLabel}>다른 면</Text>
                </Pressable>
              ) : null}
            </ScrollView>
            <Text style={styles.thumbTitle}>{thumbTitle}</Text>
            <Text style={styles.thumbSub}>기한·상표가 다른 면에 있으면 ＋로 추가해 주세요</Text>
          </View>

          {/* PAO 제안 배너 (부분 성공) — 카테고리 기본값 또는 라벨 12M 심볼 */}
          {showPaoBanner && paoSuggestion ? (
            <View style={styles.paoBanner}>
              <Text style={styles.paoText}>
                {paoSuggestion.source}:{' '}
                <Text style={styles.paoBold}>개봉 후 {paoSuggestion.months}개월</Text>이에요
              </Text>
              <Pressable
                onPress={() => {
                  // 라벨 심볼이면 품목별 PAO로 저장 (카테고리 기본값은 그대로 계산에 쓰임)
                  if (paoSuggestion.source === '라벨 표기') setPaoOverride(paoSuggestion.months);
                  setIsOpened(true);
                  setOpenedText(formatDot(todayIso()));
                }}
                style={styles.paoApply}
                accessibilityRole="button"
              >
                <Text style={styles.paoApplyLabel}>적용</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 품목명 (유일한 필수 입력) */}
          <View style={styles.field}>
            <Text style={styles.label}>
              품목명 <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, nameLow && styles.inputWarn]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                setNameLow(false);
              }}
              placeholder="예: 선크림"
              placeholderTextColor={colors.muted}
            />
            {nameLow ? (
              <Text style={styles.confidenceNote}>인식 신뢰도가 낮아요 — 확인해 주세요</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>브랜드</Text>
            <TextInput
              style={[styles.input, brandLow && styles.inputWarn]}
              value={brand}
              onChangeText={(t) => {
                setBrand(t);
                setBrandLow(false);
              }}
              placeholder="선택 입력"
              placeholderTextColor={colors.muted}
            />
            {brandLow ? (
              <Text style={styles.confidenceNote}>인식 신뢰도가 낮아요 — 확인해 주세요</Text>
            ) : null}
          </View>

          {/* 카테고리 칩 */}
          <View style={styles.field}>
            <Text style={styles.label}>카테고리</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {(cats ?? []).map((c) => {
                const on = c.id === categoryId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategoryId(on ? null : c.id)}
                    style={[styles.chip, on && styles.chipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{c.name}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setAddingCategory(true)}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel="카테고리 추가"
              >
                <Text style={[styles.chipLabel, styles.chipAdd]}>＋</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* 기한 정보 */}
          <View style={styles.dateCard}>
            <Text style={styles.sectionTitle}>기한 정보</Text>

            <View style={styles.field}>
              <Text style={styles.label}>{isMfg ? '제조일' : '유통기한'}</Text>
              <TextInput
                style={[styles.input, baseAssumed && styles.inputWarn]}
                value={baseDateText}
                onChangeText={(t) => {
                  setBaseDateText(t);
                  setBaseAssumed(false);
                }}
                placeholder="예: 2027.03.15 / 2027-03"
                placeholderTextColor={colors.muted}
                keyboardType="numbers-and-punctuation"
              />
              {baseAssumed ? (
                <Text style={styles.confidenceNote}>
                  라벨의 날짜를 유통기한으로 추정했어요 — 확인해 주세요
                </Text>
              ) : null}
              {baseDateText.trim() !== '' && !parsedBase ? (
                <Text style={styles.confidenceNote}>
                  날짜를 읽지 못했어요 — 형식을 확인해 주세요
                </Text>
              ) : null}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>표기가 제조일이에요</Text>
              <Switch
                value={isMfg}
                onValueChange={setIsMfg}
                trackColor={{ false: '#D7D6CE', true: colors.primary }}
                thumbColor="#FFFFFF"
                accessibilityLabel="표기가 제조일이에요"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>이미 개봉했어요</Text>
              <Switch
                value={isOpened}
                onValueChange={(on) => {
                  setIsOpened(on);
                  // 켜는 시점의 오늘로 — 폼을 오래 열어둔 채(자정 경과) 토글해도 정확
                  if (on) setOpenedText(formatDot(todayIso()));
                }}
                trackColor={{ false: '#D7D6CE', true: colors.primary }}
                thumbColor="#FFFFFF"
                accessibilityLabel="이미 개봉했어요"
              />
            </View>
            {isOpened ? (
              <View style={styles.field}>
                <Text style={styles.label}>개봉일</Text>
                <TextInput
                  style={styles.input}
                  value={openedText}
                  onChangeText={setOpenedText}
                  placeholder="예: 2026.06.01"
                  placeholderTextColor={colors.muted}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            ) : null}

            {/* 만료 예정 실시간 카드 */}
            <View style={[styles.expiryCard, !expiry && styles.expiryCardEmpty]}>
              <View style={styles.expiryLeft}>
                <Text style={[styles.expiryCap, !expiry && styles.expiryTextEmpty]}>만료 예정</Text>
                <Text style={[styles.expiryDate, !expiry && styles.expiryTextEmpty]}>
                  {expiry ? formatDot(expiry.date) : '—'}
                </Text>
                <Text style={[styles.expiryWhy, !expiry && styles.expiryTextEmpty]}>
                  {expiry ? expiry.basis : '기한을 입력하면 자동 계산돼요'}
                </Text>
              </View>
              <View style={[styles.ddayPill, !expiry && styles.ddayPillEmpty]}>
                <Text style={[styles.ddayText, !expiry && styles.ddayTextEmpty]}>
                  {dday === null ? 'D-?' : dday >= 0 ? `D-${dday}` : `D+${-dday}`}
                </Text>
              </View>
            </View>
            {dday !== null && dday < 0 ? (
              <Text style={styles.expiredNote}>이미 만료된 제품이에요</Text>
            ) : null}
          </View>

          {/* 보관 위치 */}
          <View style={styles.field}>
            <Text style={styles.label}>보관 위치</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {locations.map((loc) => {
                const on = loc === location;
                return (
                  <Pressable
                    key={loc}
                    onPress={() => setLocation(on ? null : loc)}
                    style={[styles.chip, on && styles.chipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{loc}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setAddingLocation(true)}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel="위치 추가"
              >
                <Text style={[styles.chipLabel, styles.chipAdd]}>＋</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* 메모 */}
          <Pressable onPress={() => setMemoOpen((v) => !v)} accessibilityRole="button">
            <Text style={styles.memoToggle}>{memoOpen ? '－ 메모 접기' : '＋ 메모 추가'}</Text>
          </Pressable>
          {memoOpen ? (
            <TextInput
              style={[styles.input, styles.memoArea]}
              value={memo}
              onChangeText={setMemo}
              placeholder="메모"
              placeholderTextColor={colors.muted}
              multiline
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {addingLocation && (
        <AddLocationSheet
          onClose={() => setAddingLocation(false)}
          onAdd={(loc) => {
            setExtraLocations((prev) => [...prev, loc]);
            setLocation(loc);
            setAddingLocation(false);
          }}
        />
      )}
      {addingCategory && (
        // 설정과 동일한 시트 재사용 (SPEC §7-1 진입점 2곳) — 추가 즉시 선택
        <AddCategorySheet onClose={() => setAddingCategory(false)} onAdded={setCategoryId} />
      )}
    </SafeAreaView>
  );
}

function AddLocationSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (location: string) => void;
}) {
  const [text, setText] = useState('');
  return (
    <BottomSheet
      visible
      onClose={onClose}
      title="보관 위치 추가"
      description="예: 화장대, 냉장고, 차량"
    >
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="위치 이름"
        placeholderTextColor={colors.muted}
        autoFocus
      />
      <View style={{ height: 8 }} />
      <SheetOption
        label="추가"
        onPress={() => {
          const trimmed = text.trim();
          if (trimmed) onAdd(trimmed);
        }}
      />
      <SheetOption label="취소" muted onPress={onClose} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  kav: {
    flex: 1,
  },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  closeIcon: {
    fontSize: 20,
    color: colors.muted,
    width: 36,
  },
  appbarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sheet: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  photoStrip: {
    gap: 10,
    paddingBottom: 10,
  },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#E7EFE4',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainTag: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(28,30,26,0.65)',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainTagLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addTile: {
    backgroundColor: colors.surface,
    gap: 2,
  },
  addTileIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '600',
  },
  addTileLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbEmoji: {
    fontSize: 38,
  },
  thumbTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  thumbSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  paoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paoText: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
  paoBold: {
    fontWeight: '700',
  },
  paoApply: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  paoApplyLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.3,
  },
  req: {
    color: colors.danger,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  inputWarn: {
    borderColor: '#E4B33C',
    backgroundColor: '#FDF8E7',
  },
  confidenceNote: {
    fontSize: 11.5,
    color: '#9A7B18',
  },
  chips: {
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  chipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipLabel: {
    fontSize: 13.5,
    color: colors.ink,
  },
  chipLabelOn: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipAdd: {
    color: colors.muted,
  },
  dateCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.ink,
  },
  expiryCard: {
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  expiryCardEmpty: {
    backgroundColor: '#EDEBE3',
  },
  expiryLeft: {
    flex: 1,
  },
  expiryCap: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  expiryDate: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  expiryWhy: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  expiryTextEmpty: {
    color: colors.muted,
  },
  ddayPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  ddayPillEmpty: {
    backgroundColor: '#DEDCD2',
  },
  ddayText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ddayTextEmpty: {
    color: '#8A8E85',
  },
  expiredNote: {
    fontSize: 12,
    color: colors.danger,
    marginTop: -4,
  },
  memoToggle: {
    fontSize: 13.5,
    color: colors.muted,
    paddingVertical: 2,
  },
  memoArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
});
