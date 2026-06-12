import { describe, expect, it } from 'vitest';

import { buildPrompt } from './prompt';

describe('buildPrompt — SPEC §11 프롬프트 조립', () => {
  it('사용자 카테고리를 주입하고 기타는 항상 마지막에 1회', () => {
    const p = buildPrompt(['선크림', '안약'], 'OCR');
    expect(p).toContain('[선크림, 안약, 기타]');
  });

  it('카테고리에 기타가 이미 있어도 중복되지 않음', () => {
    const p = buildPrompt(['선크림', '기타', '안약'], 'OCR');
    expect(p).toContain('[선크림, 안약, 기타]');
  });

  it('중복·빈 문자열 카테고리 제거', () => {
    const p = buildPrompt(['선크림', '선크림', ''], 'OCR');
    expect(p).toContain('[선크림, 기타]');
  });

  it('OCR 텍스트가 프롬프트 끝에 동봉됨', () => {
    expect(buildPrompt([], '유통기한 2027.03.15')).toMatch(/OCR 텍스트: 유통기한 2027\.03\.15$/);
  });

  it('환각 방지 규칙(모르면 null)이 포함됨', () => {
    expect(buildPrompt([], '')).toContain('모르면 null');
  });
});
