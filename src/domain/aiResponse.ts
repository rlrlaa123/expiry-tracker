import { lastDayOfMonth, toIso, type IsoDate } from './date';
import type { ParsedDate, ParsedDateType } from './dateParser';

export type Confidence = 'high' | 'low';

export interface AiRecognition {
  productName: string | null;
  brand: string | null;
  /** 검증된 카테고리 이름 — 목록 밖 값은 '기타'로 강제 */
  category: string | null;
  /** 정규화된 날짜 (YYYY-MM은 말일로) */
  dates: ParsedDate[];
  confidence: {
    productName: Confidence;
    brand: Confidence;
    category: Confidence;
    dates: Confidence;
  };
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function asConfidence(v: unknown): Confidence {
  return v === 'high' ? 'high' : 'low';
}

/** 'YYYY-MM-DD' 또는 'YYYY-MM'(→말일) → 검증된 IsoDate, 그 외 null */
function normalizeDateValue(v: unknown): IsoDate | null {
  if (typeof v !== 'string') return null;
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (full) {
    const [, y, m, d] = full.map(Number);
    if (m < 1 || m > 12 || d < 1 || d > lastDayOfMonth(y, m)) return null;
    return toIso(y, m, d);
  }
  const monthOnly = /^(\d{4})-(\d{2})$/.exec(v);
  if (monthOnly) {
    const [, y, m] = monthOnly.map(Number);
    if (m < 1 || m > 12) return null;
    // 규칙 3: 화장품 '2027.03까지' 관례 — 해당 월 말일로 해석
    return toIso(y, m, lastDayOfMonth(y, m));
  }
  return null;
}

function normalizeDates(v: unknown): ParsedDate[] {
  if (!Array.isArray(v)) return [];
  const out: ParsedDate[] = [];
  for (const item of v) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    const value = normalizeDateValue(rec.value);
    if (!value) continue;
    const type: ParsedDateType =
      rec.type === 'EXP' || rec.type === 'MFG' ? rec.type : 'UNKNOWN';
    out.push({ type, value, raw: asString(rec.raw) ?? value });
  }
  return out;
}

/**
 * 비전 AI 응답 텍스트 → 검증된 인식 결과 (SPEC §11 클라이언트 후처리 — LLM 방어선).
 * 규칙 1: 파싱 실패 시 코드펜스 제거 후 1회 재파싱, 그래도 실패면 null(OCR-only 폴백).
 * 규칙 3: YYYY-MM은 말일로. 규칙 4: 목록 밖 category는 '기타'.
 */
export function parseAiResponse(raw: string, validCategories: string[]): AiRecognition | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const stripped = raw.replace(/```(?:json)?/gi, '').trim();
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const body = parsed as Record<string, unknown>;

  const rawCategory = asString(body.category);
  const category =
    rawCategory === null ? null : validCategories.includes(rawCategory) ? rawCategory : '기타';

  const conf = (typeof body.confidence === 'object' && body.confidence !== null
    ? body.confidence
    : {}) as Record<string, unknown>;

  return {
    productName: asString(body.product_name),
    brand: asString(body.brand),
    category,
    dates: normalizeDates(body.dates),
    confidence: {
      productName: asConfidence(conf.product_name),
      brand: asConfidence(conf.brand),
      category: asConfidence(conf.category),
      dates: asConfidence(conf.dates),
    },
  };
}
