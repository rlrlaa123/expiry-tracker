import { requireOptionalNativeModule } from 'expo';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteError } from '@/ui/RouteError';
import { useToast } from '@/ui/Toast';
import { colors, spacing, typography } from '@/ui/tokens';

/** 렌더 중 JS 에러 시 까만 화면 대신 복구 UI */
export const ErrorBoundary = RouteError;

/**
 * 네이티브 캡처 모듈은 구 dev build APK에 없을 수 있다 (ADR 008).
 * require가 throw하면 Metro가 LogBox 에러를 찍고 모듈 캐시도 오염되므로,
 * throw 없는 requireOptionalNativeModule로 먼저 존재를 확인한 뒤에만 require한다.
 */
function loadCaptureModules() {
  if (
    !requireOptionalNativeModule('ExpoCamera') ||
    !requireOptionalNativeModule('ExponentImagePicker')
  ) {
    return null;
  }
  /* eslint-disable @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require */
  const camera = require('expo-camera') as typeof import('expo-camera') | undefined;
  const picker = require('expo-image-picker') as typeof import('expo-image-picker') | undefined;
  /* eslint-enable @typescript-eslint/no-require-imports */
  // Metro는 한 번 throw한 모듈을 다음 require에서 undefined로 줄 수 있어 형태까지 확인
  if (!camera?.CameraView || typeof picker?.launchImageLibraryAsync !== 'function') return null;
  return { camera, picker };
}

export default function CameraScreen() {
  const modules = loadCaptureModules();
  if (!modules) return <RebuildNotice />;
  return <CameraBody modules={modules} />;
}

function RebuildNotice() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.notice}>
      <Text style={styles.noticeTitle}>카메라 모듈이 아직 없어요</Text>
      <Text style={styles.noticeHint}>새 개발 빌드(APK)를 설치하면 촬영 등록이 열려요</Text>
      <Pressable onPress={() => router.back()} style={styles.noticeBtn} accessibilityRole="button">
        <Text style={styles.noticeBtnLabel}>돌아가기</Text>
      </Pressable>
    </SafeAreaView>
  );
}

/** 확대 단계 — zoom prop은 0(없음)~1(최대). 각인을 크게 잡기 위한 디지털 보조 */
const ZOOM_STEPS = [0, 0.15, 0.3, 0.45] as const;

function CameraBody({ modules }: { modules: NonNullable<ReturnType<typeof loadCaptureModules>> }) {
  const { CameraView, useCameraPermissions } = modules.camera;
  const router = useRouter();
  const toast = useToast();
  const cameraRef = useRef<InstanceType<typeof CameraView>>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [zoomStep, setZoomStep] = useState(0);

  const goForm = (photoUri: string) => {
    router.replace({ pathname: '/form', params: { photoUri } });
  };

  const capture = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      // 셔터음 최소화 — 일부 한국 단말은 통신사 정책으로 OS가 소리를 강제할 수 있음
      const photo = await cameraRef.current.takePictureAsync({ shutterSound: false });
      goForm(photo.uri);
    } catch {
      toast('촬영이 안 됐어요 — 다시 한 번 눌러 주세요');
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    if (busy) return;
    try {
      const result = await modules.picker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      const asset = result.assets?.[0];
      if (asset) goForm(asset.uri);
    } catch {
      toast('사진을 불러오지 못했어요 — 다시 시도해 주세요');
    }
  };

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.notice}>
        <Text style={styles.noticeTitle}>카메라 권한이 필요해요</Text>
        <Text style={styles.noticeHint}>
          {permission.canAskAgain
            ? '라벨 사진 한 장으로 품목을 등록해요'
            : '시스템 설정 > 앱 > 유통기한 트래커에서 카메라를 허용해 주세요'}
        </Text>
        {permission.canAskAgain ? (
          <Pressable onPress={requestPermission} style={styles.noticeBtn} accessibilityRole="button">
            <Text style={styles.noticeBtnLabel}>권한 허용</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={pickFromGallery} style={styles.noticeAlt} accessibilityRole="button">
          <Text style={styles.noticeAltLabel}>갤러리에서 선택할게요</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        animateShutter={false}
        enableTorch={torch}
        zoom={ZOOM_STEPS[zoomStep]}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="닫기">
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
          <Pressable
            onPress={() => setTorch((v) => !v)}
            hitSlop={12}
            style={[styles.torchBtn, torch && styles.torchBtnOn]}
            accessibilityRole="button"
            accessibilityLabel={torch ? '손전등 끄기' : '손전등 켜기'}
            accessibilityState={{ selected: torch }}
          >
            <Text style={styles.torchIcon}>🔦</Text>
          </Pressable>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.hint}>각인된 기한은 🔦 켜고 비스듬히 — 글자에 그림자가 지게</Text>

          {/* 확대 단계 — 각인을 크게 잡기 (Android 핀치줌 미지원 대체) */}
          <View style={styles.zoomRow}>
            <Pressable
              onPress={() => setZoomStep((s) => Math.max(0, s - 1))}
              disabled={zoomStep === 0}
              hitSlop={10}
              style={[styles.zoomBtn, zoomStep === 0 && styles.zoomBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="축소"
            >
              <Text style={styles.zoomBtnLabel}>−</Text>
            </Pressable>
            <View style={styles.zoomDots}>
              {ZOOM_STEPS.map((_, i) => (
                <View key={i} style={[styles.zoomDot, i <= zoomStep && styles.zoomDotOn]} />
              ))}
            </View>
            <Pressable
              onPress={() => setZoomStep((s) => Math.min(ZOOM_STEPS.length - 1, s + 1))}
              disabled={zoomStep === ZOOM_STEPS.length - 1}
              hitSlop={10}
              style={[styles.zoomBtn, zoomStep === ZOOM_STEPS.length - 1 && styles.zoomBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="확대"
            >
              <Text style={styles.zoomBtnLabel}>＋</Text>
            </Pressable>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={pickFromGallery} hitSlop={10} accessibilityRole="button" accessibilityLabel="갤러리에서 선택">
              <Text style={styles.galleryIcon}>🖼️</Text>
            </Pressable>
            <Pressable
              onPress={capture}
              disabled={busy}
              style={({ pressed }) => [styles.shutter, (pressed || busy) && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="촬영"
            >
              <View style={styles.shutterInner} />
            </Pressable>
            {/* 좌우 균형용 자리 */}
            <View style={styles.galleryGhost} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#101210',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  closeIcon: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  torchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,18,16,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchBtnOn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  torchIcon: {
    fontSize: 20,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(16,18,16,0.55)',
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  zoomBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnDisabled: {
    opacity: 0.3,
  },
  zoomBtnLabel: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  zoomDots: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  zoomDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  zoomDotOn: {
    backgroundColor: '#FFFFFF',
  },
  bottom: {
    paddingBottom: 34,
    gap: spacing.lg,
    alignItems: 'center',
  },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    backgroundColor: 'rgba(16,18,16,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingHorizontal: 44,
  },
  galleryIcon: {
    fontSize: 30,
  },
  galleryGhost: {
    width: 30,
  },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  notice: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  noticeTitle: {
    ...typography.heading,
    color: colors.ink,
  },
  noticeHint: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
  noticeBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 99,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  noticeBtnLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  noticeAlt: {
    marginTop: spacing.sm,
    paddingVertical: 6,
  },
  noticeAltLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
});
