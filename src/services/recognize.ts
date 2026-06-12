import { db } from '@/db/client';
import { categories } from '@/db/schema';
import type { AiRecognition } from '@/domain/aiResponse';
import { adoptDates, parseDates, type AdoptedDates, type ParsedDate } from '@/domain/dateParser';

import { getDeviceId } from './deviceId';
import { prepareImage } from './imagePipeline';
import { recognizeKoreanText } from './ocr';
import { requestAiRecognition } from './recognitionApi';

export interface CaptureRecognition {
  /** 압축본(캐시) — 저장 시 persistThumbnail로 영구 위치 이동 */
  thumbnailUri: string;
  ocrText: string;
  dates: ParsedDate[];
  adopted: AdoptedDates;
  /** AI 인식 필드 — 오프라인/실패 시 null (OCR-only) */
  productName: string | null;
  brand: string | null;
  categoryName: string | null;
  confidence: AiRecognition['confidence'] | null;
}

function dedupeDates(dates: ParsedDate[]): ParsedDate[] {
  const seen = new Set<string>();
  return dates.filter((d) => {
    const key = `${d.type}:${d.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 촬영/갤러리 사진 1장 → 인식 결과.
 * 1차 온디바이스 OCR(기한) + 2차 AI(품목명·카테고리) 하이브리드 (SPEC §10).
 * 실패는 전부 조용한 폴백 — 에러 팝업 금지: AI 실패 = OCR-only, OCR 실패 = 빈 폼.
 */
export async function recognizeCapture(photoUri: string): Promise<CaptureRecognition> {
  const [prepared, ocrText] = await Promise.all([
    prepareImage(photoUri).catch((e): { uri: string; compressed: boolean } => {
      if (__DEV__) console.warn('[recognize] prepareImage 실패:', e?.message ?? e);
      return { uri: photoUri, compressed: false };
    }),
    recognizeKoreanText(photoUri).catch((e) => {
      if (__DEV__) console.warn('[recognize] OCR 실패:', e?.message ?? e);
      return '';
    }),
  ]);
  if (__DEV__) {
    // 인식 품질 진단용 — 프로덕션 번들에서는 제거됨
    console.log('[recognize] OCR 텍스트 (' + ocrText.length + '자):\n' + ocrText.slice(0, 600));
  }

  let ai: AiRecognition | null = null;
  // 압축 실패 시 AI 스킵 — 수 MB 원본의 base64Sync는 JS 스레드를 길게 막는다
  if (prepared.compressed) {
    try {
      const cats = await db.select({ name: categories.name }).from(categories);
      // 동적 import()는 dev 청크 로드가 실기기에서 깨질 수 있어 동기 require 사용
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- 의도적 lazy require
      const { File } = require('expo-file-system') as typeof import('expo-file-system');
      ai = await requestAiRecognition({
        imageBase64: new File(prepared.uri).base64Sync(),
        ocrText,
        categories: cats.map((c) => c.name),
        deviceId: getDeviceId(),
      });
    } catch {
      ai = null;
    }
  }

  const dates = dedupeDates([...(ai?.dates ?? []), ...parseDates(ocrText)]);
  if (__DEV__) {
    console.log(
      '[recognize] 파싱된 날짜:',
      JSON.stringify(dates),
      '→ 채택:',
      JSON.stringify(adoptDates(dates)),
    );
  }
  return {
    thumbnailUri: prepared.uri,
    ocrText,
    dates,
    adopted: adoptDates(dates),
    productName: ai?.productName ?? null,
    brand: ai?.brand ?? null,
    categoryName: ai?.category ?? null,
    confidence: ai?.confidence ?? null,
  };
}
