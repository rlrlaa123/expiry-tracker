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
  // 뒤에 숫자(또는 구분자+숫자)가 이어지면 로트번호('2025.06.30.01')이므로 제외
  {
    regex: /(20\d{2})\s?[.\-/년]\s?(\d{1,2})\s?[.\-/월]\s?(\d{1,2})일?(?!\d)(?![.\-/]\d)/g,
    build: (m) => fullDate(+m[1], +m[2], +m[3]),
  },
  // YYYYMMDD (연속 8자리, 앞뒤에 숫자 없음)
  {
    regex: /(?<!\d)(20\d{2})(\d{2})(\d{2})(?!\d)/g,
    build: (m) => fullDate(+m[1], +m[2], +m[3]),
  },
  // YY.MM.DD (2000년대 가정) — 로트번호('25.06.30.99') 가드 포함
  {
    regex: /(?<!\d)(\d{2})\s?[.\-/]\s?(\d{1,2})\s?[.\-/]\s?(\d{1,2})(?!\d)(?![.\-/]\d)/g,
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

export interface AdoptedDates {
  exp: IsoDate | null;
  mfg: IsoDate | null;
  /** UNKNOWN 단일을 EXP로 가정했음 — UI에서 low confidence(노란 테두리) 처리 */
  expAssumed: boolean;
}

/**
 * 파싱된 날짜들에서 폼 prefill 값을 채택 (SPEC §11 클라이언트 후처리 2).
 * EXP 우선(복수면 가장 이른 날짜), MFG는 함께 보존,
 * EXP 없이 UNKNOWN이 정확히 1개면 EXP로 가정하되 low 처리.
 */
export function adoptDates(dates: ParsedDate[]): AdoptedDates {
  const exps = dates.filter((d) => d.type === 'EXP').map((d) => d.value);
  const mfg = dates.find((d) => d.type === 'MFG')?.value ?? null;
  if (exps.length > 0) {
    return { exp: exps.reduce((a, b) => (b < a ? b : a)), mfg, expAssumed: false };
  }
  const unknowns = dates.filter((d) => d.type === 'UNKNOWN');
  if (unknowns.length === 1) {
    return { exp: unknowns[0].value, mfg, expAssumed: true };
  }
  return { exp: null, mfg, expAssumed: false };
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
