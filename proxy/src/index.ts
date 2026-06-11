import { buildPrompt } from './prompt';
import { checkRateLimit } from './rateLimit';

export interface Env {
  RATE_LIMIT: KVNamespace;
  /** wrangler secret put GEMINI_API_KEY — 코드·리포에 절대 포함 금지 */
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
}

interface RecognizeRequest {
  image: string;
  ocr_text: string;
  categories: string[];
  device_id: string;
}

/** base64 JPEG 상한 — 장변 1024 압축본 기준 넉넉한 값 (비정상 페이로드 차단) */
const MAX_IMAGE_BASE64_LENGTH = 3_000_000;
const GEMINI_TIMEOUT_MS = 8_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function parseRequest(body: unknown): RecognizeRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.image !== 'string' || b.image.length === 0) return null;
  if (b.image.length > MAX_IMAGE_BASE64_LENGTH) return null;
  if (typeof b.device_id !== 'string' || b.device_id.length === 0 || b.device_id.length > 80) {
    return null;
  }
  const categories = Array.isArray(b.categories)
    ? b.categories.filter((c): c is string => typeof c === 'string' && c.length <= 40).slice(0, 50)
    : [];
  const ocrText = typeof b.ocr_text === 'string' ? b.ocr_text.slice(0, 4000) : '';
  return { image: b.image, ocr_text: ocrText, categories, device_id: b.device_id };
}

async function callGemini(env: Env, prompt: string, imageBase64: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

export default {
  /** POST /recognize — 서버 측 데이터 저장 없음 (로컬 우선 원칙) */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/recognize') {
      return json({ error: 'not_found' }, 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'bad_request' }, 400);
    }
    const req = parseRequest(body);
    if (!req) return json({ error: 'bad_request' }, 400);

    const rate = await checkRateLimit(env.RATE_LIMIT, req.device_id);
    if (!rate.allowed) return json({ error: 'rate_limited', scope: rate.reason }, 429);

    try {
      const text = await callGemini(env, buildPrompt(req.categories, req.ocr_text), req.image);
      if (text === null) return json({ error: 'upstream_failed' }, 502);
      // 모델 출력 검증은 클라이언트 후처리(LLM 방어선)가 담당 — 원문 그대로 전달
      return json({ text });
    } catch {
      return json({ error: 'upstream_timeout' }, 504);
    }
  },
};
