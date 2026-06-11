import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/ui/tokens';

/**
 * 네이티브 캡처 모듈은 dev build #2부터 포함 — 구 APK에서 홈이 죽지 않도록
 * 라우트 파일 최상위가 아니라 렌더 시점에 require (ADR 008).
 */
function loadCaptureModules() {
  try {
    return {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require
      camera: require('expo-camera') as typeof import('expo-camera'),
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require
      picker: require('expo-image-picker') as typeof import('expo-image-picker'),
    };
  } catch {
    return null;
  }
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

function CameraBody({ modules }: { modules: NonNullable<ReturnType<typeof loadCaptureModules>> }) {
  const { CameraView, useCameraPermissions } = modules.camera;
  const router = useRouter();
  const cameraRef = useRef<InstanceType<typeof CameraView>>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  const goForm = (photoUri: string) => {
    router.replace({ pathname: '/form', params: { photoUri } });
  };

  const capture = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      goForm(photo.uri);
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    if (busy) return;
    const result = await modules.picker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    const asset = result.assets?.[0];
    if (asset) goForm(asset.uri);
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
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="닫기">
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.hint}>기한 표기가 잘 보이게 찍어 주세요</Text>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    alignItems: 'flex-start',
  },
  closeIcon: {
    fontSize: 22,
    color: '#FFFFFF',
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
