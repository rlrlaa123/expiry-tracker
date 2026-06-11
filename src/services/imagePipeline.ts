const MAX_LONG_SIDE = 1024;
const JPEG_QUALITY = 0.7;

export interface PreparedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * 원본 사진 → 장변 1024px JPEG 압축 (SPEC §11 — AI 전송·썸네일 겸용).
 * expo-image-manipulator는 구 dev build APK에 없을 수 있어 throw 없이 존재 확인 후
 * lazy import (ADR 008). 없으면 던지고 — 호출부가 원본 uri 폴백으로 처리한다.
 */
export async function prepareImage(uri: string): Promise<PreparedImage> {
  const { requireOptionalNativeModule } = await import('expo');
  if (!requireOptionalNativeModule('ExpoImageManipulator')) {
    throw new Error('image manipulator unavailable in this build');
  }
  const { ImageManipulator, SaveFormat } = await import('expo-image-manipulator');
  const context = ImageManipulator.manipulate(uri);
  let ref = await context.renderAsync();
  const longSide = Math.max(ref.width, ref.height);
  if (longSide > MAX_LONG_SIDE) {
    const scale = MAX_LONG_SIDE / longSide;
    context.resize({
      width: Math.round(ref.width * scale),
      height: Math.round(ref.height * scale),
    });
    ref = await context.renderAsync();
  }
  const saved = await ref.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}
