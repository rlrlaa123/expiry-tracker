import { describe, expect, it } from 'vitest';

import { adoptDates, parseDates, parsePaoHint } from './dateParser';

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

  it('18. 점으로 이어지는 로트번호는 날짜로 오인하지 않음', () => {
    expect(parseDates('LOT 25.06.30.99')).toEqual([]);
    expect(parseDates('LOT 2025.06.30.01')).toEqual([]);
  });

  it('19. 날짜 뒤 문장부호·조사는 그대로 인식', () => {
    expect(parseDates('25.06.30까지')).toEqual([
      { type: 'EXP', value: '2025-06-30', raw: '25.06.30' },
    ]);
    expect(parseDates('유통기한 2025.06.30.')).toEqual([
      { type: 'EXP', value: '2025-06-30', raw: '2025.06.30' },
    ]);
  });

  it('20. 도트 각인 오독 복원: 비슷한 글자가 섞인 8자리 (실라벨: 설화수)', () => {
    // 실제 각인 EXP20290419를 ML Kit이 'EP20290d19'로 읽음 — d→4 복원
    expect(parseDates('OV10EP20290d19개제')).toEqual([
      { type: 'UNKNOWN', value: '2029-04-19', raw: '20290d19' },
    ]);
    // O→0 복원 + 같은 줄 '제조' 문맥이면 MFG
    expect(parseDates('제조 2024O115')).toEqual([
      { type: 'MFG', value: '2024-01-15', raw: '2024O115' },
    ]);
  });

  it('21. 퍼지 복원의 보수성: 숫자가 적거나 날짜로 무효면 매칭 안 함', () => {
    expect(parseDates('CODE 20ABCDEF')).toEqual([]); // 숫자 2개뿐
    expect(parseDates('LOT 20851315')).toEqual([]); // 13월 — 무효
    expect(parseDates('bE2020b19')).toEqual([]); // 8자 미달 구간
    expect(parseDates('LOT 1234202612310')).toEqual([]); // 긴 숫자열 내부는 여전히 제외
  });
});

describe('parsePaoHint — 라벨의 개봉 후 사용기한 심볼 (12M)', () => {
  it('단독 NM 표기를 개월로 (실라벨: 설화수 12M)', () => {
    expect(parsePaoHint('12M\n설화수 옥용팩')).toBe(12);
    expect(parsePaoHint('6 M')).toBe(6);
  });

  it('용량 표기(120 mL)나 일반 단어에는 반응하지 않음', () => {
    expect(parsePaoHint('120 mL/4.05 fl. oz.')).toBeNull();
    expect(parsePaoHint('MADE IN KOREA')).toBeNull();
    expect(parsePaoHint('TN13M2')).toBeNull();
  });

  it('범위 밖(0, 37+)은 무시', () => {
    expect(parsePaoHint('0M')).toBeNull();
    expect(parsePaoHint('99M')).toBeNull();
  });
});

describe('adoptDates — 파싱 결과 채택 (SPEC §11 후처리)', () => {
  const d = (type: 'EXP' | 'MFG' | 'UNKNOWN', value: string) => ({ type, value, raw: value });

  it('EXP가 있으면 EXP 채택, MFG도 함께 보존', () => {
    expect(adoptDates([d('MFG', '2024-01-05'), d('EXP', '2026-01-04')])).toEqual({
      exp: '2026-01-04',
      mfg: '2024-01-05',
      expAssumed: false,
    });
  });

  it('EXP 복수면 가장 이른 날짜 (보수적 채택)', () => {
    expect(adoptDates([d('EXP', '2027-05-01'), d('EXP', '2026-08-15')])).toEqual({
      exp: '2026-08-15',
      mfg: null,
      expAssumed: false,
    });
  });

  it('MFG만 있으면 exp는 비움 (보존기간 가산은 computeExpiry 몫)', () => {
    expect(adoptDates([d('MFG', '2024-01-05')])).toEqual({
      exp: null,
      mfg: '2024-01-05',
      expAssumed: false,
    });
  });

  it('UNKNOWN 단일이면 EXP로 가정 + expAssumed(low 처리)', () => {
    expect(adoptDates([d('UNKNOWN', '2026-12-31')])).toEqual({
      exp: '2026-12-31',
      mfg: null,
      expAssumed: true,
    });
  });

  it('UNKNOWN 복수면 채택하지 않음 (사용자 확인 유도)', () => {
    expect(adoptDates([d('UNKNOWN', '2024-01-05'), d('UNKNOWN', '2026-12-31')])).toEqual({
      exp: null,
      mfg: null,
      expAssumed: false,
    });
  });

  it('EXP가 있으면 UNKNOWN은 무시', () => {
    expect(adoptDates([d('EXP', '2026-08-15'), d('UNKNOWN', '2024-01-05')])).toEqual({
      exp: '2026-08-15',
      mfg: null,
      expAssumed: false,
    });
  });

  it('빈 배열이면 전부 null', () => {
    expect(adoptDates([])).toEqual({ exp: null, mfg: null, expAssumed: false });
  });
});
