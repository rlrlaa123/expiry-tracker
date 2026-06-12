import { requireOptionalNativeModule } from 'expo';
import { Image } from 'react-native';

const MAX_LONG_SIDE = 1024;
const JPEG_QUALITY = 0.7;

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
  if (!requireOptionalNativeModule('ExpoImageManipulator')) {
    throw new Error('image manipulator unavailable in this build');
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- 구 APK 폴백을 위한 의도적 lazy require
  const { manipulateAsync, SaveFormat } =
    require('expo-image-manipulator') as typeof import('expo-image-manipulator');

  const { width, height } = await getImageSize(uri);
  const longSide = Math.max(width, height);
  // 한 변만 지정하면 비율 유지 — 장변을 1024로 캡
  const actions =
    longSide > MAX_LONG_SIDE
      ? [width >= height ? { resize: { width: MAX_LONG_SIDE } } : { resize: { height: MAX_LONG_SIDE } }]
      : [];
  const saved = await manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return { uri: saved.uri, compressed: true };
}
