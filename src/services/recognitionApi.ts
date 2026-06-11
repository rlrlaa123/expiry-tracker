import { parseAiResponse, type AiRecognition } from '@/domain/aiResponse';

/** 프록시 응답 2초↑ 대비 타임아웃 5초 + 폴백 (DEV-GUIDE M4) */
const TIMEOUT_MS = 5_000;

/** 배포된 Workers URL — .env의 EXPO_PUBLIC_RECOGNIZE_URL로 주입 (키 아님, 공개 가능) */
const BASE_URL = process.env.EXPO_PUBLIC_RECOGNIZE_URL;

export interface AiRequestInput {
  imageBase64: string;
  ocrText: string;
  /** 사용자 카테고리 이름 목록 — 프롬프트에 동적 주입됨 */
  categories: string[];
  deviceId: string;
}

/**
 * AI 인식 요청. 실패·오프라인·타임아웃은 전부 null — 호출부는 OCR-only로 진행 (에러 팝업 금지).
 */
export async function requestAiRecognition(input: AiRequestInput): Promise<AiRecognition | null> {
  if (!BASE_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/recognize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image: input.imageBase64,
        ocr_text: input.ocrText,
        categories: input.categories,
        device_id: input.deviceId,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: unknown };
    if (typeof data.text !== 'string') return null;
    return parseAiResponse(data.text, input.categories);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
