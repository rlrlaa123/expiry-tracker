import { requireOptionalNativeModule } from 'expo';
import { Image } from 'react-native';

const MAX_LONG_SIDE = 1024;
const JPEG_QUALITY = 0.7;
/** OCR 재시도용 — 썸네일(1024)보다 크게 잡아 각인 글리프에 픽셀을 더 준다 */
const OCR_MAX_LONG_SIDE = 1600;
/** 중앙 크롭 비율 — 가장자리(여백·배경)를 잘라 글자가 프레임에서 차지하는 비중을 높임 */
const CENTER_CROP_RATIO = 0.7;

type ManipAction = { resize: { width?: number; height?: number } } | { crop: ManipCrop };
interface ManipCrop {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

function loadManipulator() {
  if (!requireOptionalNativeModule('ExpoImageManipulator')) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require
  return require('expo-image-manipulator') as typeof import('expo-image-manipulator');
}

export interface PreparedImage {
  uri: string;
  /** false면 압축 실패로 원본 uri 그대로 — 수 MB 원본이므로 base64 전송 금지 */
  compressed: boolean;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
  );
}

/**
 * 원본 사진 → 장변 1024px JPEG 압축 (SPEC §11 — AI 전송·썸네일 겸용).
 * expo-image-manipulator는 구 dev build APK에 없을 수 있어 throw 없이 존재 확인 후
 * lazy import (ADR 008). 없거나 실패하면 던지고 — 호출부가 원본 uri 폴백으로 처리한다.
 *
 * 신규 컨텍스트 API(manipulate → renderAsync 2회)는 실기기에서 촬영 직후
 * 네이티브 크래시(까만 화면)를 일으켜, 치수는 RN Image.getSize로 얻고
 * 변환은 검증된 manipulateAsync 단일 호출로 수행한다.
 *
 * 동적 import()는 Expo dev 서버가 별도 청크로 지연 로드해 실기기에서
 * "Requiring unknown module"로 깨진다 — 동기 require로 같은 lazy 의미를 유지.
 */
export async function prepareImage(uri: string): Promise<PreparedImage> {
  const manip = loadManipulator();
  if (!manip) throw new Error('image manipulator unavailable in this build');
  const { width, height } = await getImageSize(uri);
  const longSide = Math.max(width, height);
  // 한 변만 지정하면 비율 유지 — 장변을 1024로 캡
  const actions: ManipAction[] =
    longSide > MAX_LONG_SIDE
      ? [width >= height ? { resize: { width: MAX_LONG_SIDE } } : { resize: { height: MAX_LONG_SIDE } }]
      : [];
  const saved = await manip.manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: manip.SaveFormat.JPEG,
  });
  return { uri: saved.uri, compressed: true };
}

/**
 * OCR 재시도용 중앙 크롭본 — 원본(고해상도)에서 중앙 70%를 잘라 글자 비중을 키운다.
 * 1차 전체 OCR이 날짜를 못 찾았을 때만 호출 (각인·도트 기한 보강). 실패 시 null.
 */
export async function cropCenterForOcr(uri: string): Promise<string | null> {
  try {
    const manip = loadManipulator();
    if (!manip) return null;
    const { width, height } = await getImageSize(uri);
    const cropW = Math.round(width * CENTER_CROP_RATIO);
    const cropH = Math.round(height * CENTER_CROP_RATIO);
    const actions: ManipAction[] = [
      {
        crop: {
          originX: Math.round((width - cropW) / 2),
          originY: Math.round((height - cropH) / 2),
          width: cropW,
          height: cropH,
        },
      },
    ];
    const cropLong = Math.max(cropW, cropH);
    if (cropLong > OCR_MAX_LONG_SIDE) {
      const scale = OCR_MAX_LONG_SIDE / cropLong;
      actions.push(
        cropW >= cropH
          ? { resize: { width: Math.round(cropW * scale) } }
          : { resize: { height: Math.round(cropH * scale) } },
      );
    }
    const saved = await manip.manipulateAsync(uri, actions, {
      compress: 0.85,
      format: manip.SaveFormat.JPEG,
    });
    return saved.uri;
  } catch {
    return null;
  }
}
