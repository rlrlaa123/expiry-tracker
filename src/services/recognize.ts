import { adoptDates, parseDates, type AdoptedDates, type ParsedDate } from '@/domain/dateParser';

import { prepareImage } from './imagePipeline';
import { recognizeKoreanText } from './ocr';

export interface CaptureRecognition {
  /** 압축본(캐시) — 저장 시 persistThumbnail로 영구 위치 이동 */
  thumbnailUri: string;
  ocrText: string;
  dates: ParsedDate[];
  adopted: AdoptedDates;
  /** M4 AI 인식 필드 — M3(OCR-only)에서는 항상 null */
  productName: string | null;
  brand: string | null;
  categoryName: string | null;
}

/**
 * 촬영/갤러리 사진 1장 → 인식 결과 (M3: OCR-only, M4에서 AI 프록시 합류).
 * 실패는 전부 조용한 폴백 — 에러 팝업 금지 (SPEC §1-2): OCR 실패 = 빈 폼, 압축 실패 = 원본 사용.
 */
export async function recognizeCapture(photoUri: string): Promise<CaptureRecognition> {
  const [prepared, ocrText] = await Promise.all([
    prepareImage(photoUri).catch(() => ({ uri: photoUri })),
    recognizeKoreanText(photoUri).catch(() => ''),
  ]);
  const dates = parseDates(ocrText);
  return {
    thumbnailUri: prepared.uri,
    ocrText,
    dates,
    adopted: adoptDates(dates),
    productName: null,
    brand: null,
    categoryName: null,
  };
}
