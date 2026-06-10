import { describe, expect, it } from 'vitest';

import { parseDates } from './dateParser';

describe('parseDates — 실제 라벨 샘플', () => {
  it('1. "유통기한: 2026.08.15"', () => {
    expect(parseDates('유통기한: 2026.08.15')).toEqual([
      { type: 'EXP', value: '2026-08-15', raw: '2026.08.15' },
    ]);
  });

  it('2. "EXP 2027-03-31"', () => {
    expect(parseDates('EXP 2027-03-31')).toEqual([
      { type: 'EXP', value: '2027-03-31', raw: '2027-03-31' },
    ]);
  });

  it('3. "2027.03까지 사용" — 월 표기는 말일로', () => {
    expect(parseDates('2027.03까지 사용')).toEqual([
      { type: 'EXP', value: '2027-03-31', raw: '2027.03' },
    ]);
  });

  it('4. "제조 2024.01.05"', () => {
    expect(parseDates('제조 2024.01.05')).toEqual([
      { type: 'MFG', value: '2024-01-05', raw: '2024.01.05' },
    ]);
  });

  it('5. "MFG 20240105" — 8자리 연속 숫자', () => {
    expect(parseDates('MFG 20240105')).toEqual([
      { type: 'MFG', value: '2024-01-05', raw: '20240105' },
    ]);
  });

  it('6. "20261231까지"', () => {
    expect(parseDates('20261231까지')).toEqual([
      { type: 'EXP', value: '2026-12-31', raw: '20261231' },
    ]);
  });

  it('7. "사용기한 25.06.30" — YY는 2000년대 가정', () => {
    expect(parseDates('사용기한 25.06.30')).toEqual([
      { type: 'EXP', value: '2025-06-30', raw: '25.06.30' },
    ]);
  });

  it('8. "제조번호 A123 2023.11.02" — 줄 단위 문맥', () => {
    expect(parseDates('제조번호 A123 2023.11.02')).toEqual([
      { type: 'MFG', value: '2023-11-02', raw: '2023.11.02' },
    ]);
  });

  it('9. "BBE 2026-09" — 월 표기 말일 정규화', () => {
    expect(parseDates('BBE 2026-09')).toEqual([
      { type: 'EXP', value: '2026-09-30', raw: '2026-09' },
    ]);
  });

  it('10. 문맥 없는 "2025.05.10" → UNKNOWN', () => {
    expect(parseDates('2025.05.10')).toEqual([
      { type: 'UNKNOWN', value: '2025-05-10', raw: '2025.05.10' },
    ]);
  });

  it('11. "제조일자: 2024년 3월 5일" — 한글 단위', () => {
    expect(parseDates('제조일자: 2024년 3월 5일')).toEqual([
      { type: 'MFG', value: '2024-03-05', raw: '2024년 3월 5일' },
    ]);
  });

  it('12. 여러 줄: 제조일과 유통기한 각각 분류', () => {
    expect(parseDates('제조 2024.01.05\n2026.01.04까지')).toEqual([
      { type: 'MFG', value: '2024-01-05', raw: '2024.01.05' },
      { type: 'EXP', value: '2026-01-04', raw: '2026.01.04' },
    ]);
  });

  it('13. 한 줄에 제조+유통 혼재 — 근접 문맥으로 각각 분류', () => {
    expect(parseDates('제조 2023.05.01 / 2025.04.30까지')).toEqual([
      { type: 'MFG', value: '2023-05-01', raw: '2023.05.01' },
      { type: 'EXP', value: '2025-04-30', raw: '2025.04.30' },
    ]);
  });

  it('14. 유효하지 않은 날짜(13월, 2월 30일)는 무시', () => {
    expect(parseDates('2026.13.01 2026.02.30')).toEqual([]);
  });

  it('15. 날짜가 없으면 빈 배열', () => {
    expect(parseDates('나이아신아마이드 세럼 30ml')).toEqual([]);
  });

  it('16. 로트번호 등 긴 숫자열에 포함된 8자리는 매칭하지 않음', () => {
    expect(parseDates('LOT 1234202612310')).toEqual([]);
  });

  it('17. 동일 날짜·타입 중복은 한 번만', () => {
    expect(parseDates('EXP 2026.08.15\n유통기한 2026.08.15')).toEqual([
      { type: 'EXP', value: '2026-08-15', raw: '2026.08.15' },
    ]);
  });
});
