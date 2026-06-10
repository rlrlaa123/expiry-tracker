import { type IsoDate, lastDayOfMonth, toIso } from './date';

export type ParsedDateType = 'EXP' | 'MFG' | 'UNKNOWN';

export interface ParsedDate {
  type: ParsedDateType;
  /** YYYY-MM-DD (월만 표기된 날짜는 해당 월 말일로 정규화) */
  value: IsoDate;
  /** 라벨 원문 표기 (인식 근거 표시·디버깅용) */
  raw: string;
}

const EXP_CONTEXT = /까지|유통|사용기한|EXP|BBE/i;
const MFG_CONTEXT = /제조|MFG/i;

interface Candidate {
  start: number;
  end: number;
  raw: string;
  value: IsoDate;
}

/** 우선순위 순서 — 긴 패턴 먼저 매칭해 부분 중복 방지 */
const PATTERNS: { regex: RegExp; build: (m: RegExpExecArray) => IsoDate | null }[] = [
  // YYYY.MM.DD / YYYY-MM-DD / YYYY/MM/DD / YYYY년 MM월 DD일
  {
    regex: /(20\d{2})\s?[.\-/년]\s?(\d{1,2})\s?[.\-/월]\s?(\d{1,2})일?/g,
    build: (m) => fullDate(+m[1], +m[2], +m[3]),
  },
  // YYYYMMDD (연속 8자리, 앞뒤에 숫자 없음)
  {
    regex: /(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)/g,
    build: (m) => fullDate(+m[1], +m[2], +m[3]),
  },
  // YY.MM.DD (2000년대 가정)
  {
    regex: /(?<!\d)(\d{2})\s?[.\-/]\s?(\d{1,2})\s?[.\-/]\s?(\d{1,2})(?!\d)/g,
    build: (m) => fullDate(2000 + +m[1], +m[2], +m[3]),
  },
  // YYYY.MM / YYYY-MM / YYYY년 MM월 → 해당 월 말일
  {
    regex: /(20\d{2})\s?[.\-/년]\s?(\d{1,2})월?(?![\d.\-/일])/g,
    build: (m) => monthEnd(+m[1], +m[2]),
  },
];

function fullDate(y: number, m: number, d: number): IsoDate | null {
  if (m < 1 || m > 12 || d < 1 || d > lastDayOfMonth(y, m)) return null;
  return toIso(y, m, d);
}

function monthEnd(y: number, m: number): IsoDate | null {
  if (m < 1 || m > 12) return null;
  return toIso(y, m, lastDayOfMonth(y, m));
}

function classify(line: string, c: Candidate): ParsedDateType {
  // 1순위: 날짜 직전/직후 근접 문맥 ("제조 2024.01.05", "2027.03까지")
  const near =
    line.slice(Math.max(0, c.start - 12), c.start) + ' ' + line.slice(c.end, c.end + 8);
  if (EXP_CONTEXT.test(near)) return 'EXP';
  if (MFG_CONTEXT.test(near)) return 'MFG';
  // 2순위: 같은 줄 전체 (한쪽 키워드만 있을 때)
  const lineExp = EXP_CONTEXT.test(line);
  const lineMfg = MFG_CONTEXT.test(line);
  if (lineExp && !lineMfg) return 'EXP';
  if (lineMfg && !lineExp) return 'MFG';
  return 'UNKNOWN';
}

/** OCR 텍스트에서 날짜를 전부 추출하고 EXP/MFG/UNKNOWN으로 분류 (DEV-GUIDE §4-3) */
export function parseDates(ocrText: string): ParsedDate[] {
  const results: ParsedDate[] = [];
  const seen = new Set<string>();

  for (const line of ocrText.split(/\r?\n/)) {
    const candidates: Candidate[] = [];
    for (const { regex, build } of PATTERNS) {
      regex.lastIndex = 0;
      for (let m = regex.exec(line); m !== null; m = regex.exec(line)) {
        const start = m.index;
        const end = start + m[0].length;
        // 이미 더 높은 우선순위 패턴이 차지한 구간과 겹치면 스킵
        if (candidates.some((c) => start < c.end && end > c.start)) continue;
        const value = build(m);
        if (value) candidates.push({ start, end, raw: m[0].trim(), value });
      }
    }

    candidates.sort((a, b) => a.start - b.start);
    for (const c of candidates) {
      const type = classify(line, c);
      const key = `${type}:${c.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ type, value: c.value, raw: c.raw });
    }
  }
  return results;
}
