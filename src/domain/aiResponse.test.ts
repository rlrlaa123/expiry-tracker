import { describe, expect, it } from 'vitest';

import { parseAiResponse } from './aiResponse';

const CATS = ['선크림', '립 제품', '마스카라', '연고', '안약', '조미료', '기타'];

const okBody = JSON.stringify({
  product_name: '라네즈 워터뱅크 선크림',
  brand: '라네즈',
  category: '선크림',
  dates: [{ type: 'EXP', value: '2028-03-15', raw: '2028.03.15까지' }],
  confidence: { product_name: 'high', brand: 'high', category: 'high', dates: 'high' },
});

describe('parseAiResponse — SPEC §11 클라이언트 후처리', () => {
  it('정상 JSON을 파싱하고 그대로 반환', () => {
    expect(parseAiResponse(okBody, CATS)).toEqual({
      productName: '라네즈 워터뱅크 선크림',
      brand: '라네즈',
      category: '선크림',
      dates: [{ type: 'EXP', value: '2028-03-15', raw: '2028.03.15까지' }],
      confidence: { productName: 'high', brand: 'high', category: 'high', dates: 'high' },
    });
  });

  it('규칙 1: 코드펜스로 감싸진 JSON은 제거 후 1회 재파싱', () => {
    const fenced = '```json\n' + okBody + '\n```';
    expect(parseAiResponse(fenced, CATS)?.productName).toBe('라네즈 워터뱅크 선크림');
  });

  it('규칙 1: 그래도 파싱 불가면 null (OCR-only 폴백 신호)', () => {
    expect(parseAiResponse('죄송합니다, 인식할 수 없습니다.', CATS)).toBeNull();
    expect(parseAiResponse('{broken json', CATS)).toBeNull();
  });

  it('규칙 3: YYYY-MM은 해당 월 말일로 정규화', () => {
    const body = JSON.stringify({
      product_name: null,
      brand: null,
      category: null,
      dates: [{ type: 'EXP', value: '2027-03', raw: '2027.03까지' }],
      confidence: { product_name: 'low', brand: 'low', category: 'low', dates: 'high' },
    });
    expect(parseAiResponse(body, CATS)?.dates).toEqual([
      { type: 'EXP', value: '2027-03-31', raw: '2027.03까지' },
    ]);
  });

  it('규칙 4: 목록 밖 category는 "기타"로 강제', () => {
    const body = JSON.stringify({
      product_name: '핸드크림',
      brand: null,
      category: '핸드케어',
      dates: [],
      confidence: { product_name: 'high', brand: 'low', category: 'low', dates: 'low' },
    });
    expect(parseAiResponse(body, CATS)?.category).toBe('기타');
  });

  it('category가 null이면 null 유지 (기타 강제 아님)', () => {
    const body = JSON.stringify({
      product_name: null,
      brand: null,
      category: null,
      dates: [],
      confidence: { product_name: 'low', brand: 'low', category: 'low', dates: 'low' },
    });
    expect(parseAiResponse(body, CATS)?.category).toBeNull();
  });

  it('유효하지 않은 날짜 value는 버린다', () => {
    const body = JSON.stringify({
      product_name: null,
      brand: null,
      category: null,
      dates: [
        { type: 'EXP', value: '2026-13', raw: 'x' },
        { type: 'EXP', value: 'unknown', raw: 'y' },
        { type: 'MFG', value: '2024-01-05', raw: '20240105' },
      ],
      confidence: { product_name: 'low', brand: 'low', category: 'low', dates: 'low' },
    });
    expect(parseAiResponse(body, CATS)?.dates).toEqual([
      { type: 'MFG', value: '2024-01-05', raw: '20240105' },
    ]);
  });

  it('이상한 date type은 UNKNOWN으로', () => {
    const body = JSON.stringify({
      product_name: null,
      brand: null,
      category: null,
      dates: [{ type: 'BEST_BY', value: '2026-12-31', raw: 'z' }],
      confidence: { product_name: 'low', brand: 'low', category: 'low', dates: 'low' },
    });
    expect(parseAiResponse(body, CATS)?.dates).toEqual([
      { type: 'UNKNOWN', value: '2026-12-31', raw: 'z' },
    ]);
  });

  it('confidence 누락·이상값은 전부 low로 (환각 방어)', () => {
    const body = JSON.stringify({
      product_name: '뭔가',
      brand: null,
      category: null,
      dates: [],
      confidence: { product_name: 'certain' },
    });
    expect(parseAiResponse(body, CATS)?.confidence).toEqual({
      productName: 'low',
      brand: 'low',
      category: 'low',
      dates: 'low',
    });
  });

  it('dates가 배열이 아니거나 누락이면 빈 배열', () => {
    const body = JSON.stringify({
      product_name: null,
      brand: null,
      category: null,
      dates: 'none',
      confidence: {},
    });
    expect(parseAiResponse(body, CATS)?.dates).toEqual([]);
  });

  it('product_name이 문자열이 아니면 null', () => {
    const body = JSON.stringify({
      product_name: 123,
      brand: ['x'],
      category: null,
      dates: [],
      confidence: {},
    });
    const r = parseAiResponse(body, CATS);
    expect(r?.productName).toBeNull();
    expect(r?.brand).toBeNull();
  });
});
