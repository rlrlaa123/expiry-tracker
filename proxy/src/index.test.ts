import { describe, expect, it } from 'vitest';

import { parseRequest } from './index';

const valid = {
  image: 'aGVsbG8=',
  ocr_text: '유통기한 2027.03.15',
  categories: ['선크림', '기타'],
  device_id: 'dev-abc',
};

describe('parseRequest — 입력 검증', () => {
  it('정상 요청 통과', () => {
    expect(parseRequest(valid)).toEqual(valid);
  });

  it('image/device_id 누락·빈 값은 거부', () => {
    expect(parseRequest({ ...valid, image: '' })).toBeNull();
    expect(parseRequest({ ...valid, image: undefined })).toBeNull();
    expect(parseRequest({ ...valid, device_id: '' })).toBeNull();
    expect(parseRequest(null)).toBeNull();
    expect(parseRequest('text')).toBeNull();
  });

  it('비정상 페이로드 차단: 3MB 초과 base64, 80자 초과 device_id', () => {
    expect(parseRequest({ ...valid, image: 'a'.repeat(3_000_001) })).toBeNull();
    expect(parseRequest({ ...valid, device_id: 'x'.repeat(81) })).toBeNull();
  });

  it('categories는 문자열만, 50개·이름 40자로 캡', () => {
    const r = parseRequest({
      ...valid,
      categories: ['선크림', 42, 'x'.repeat(41), ...Array(60).fill('기타')],
    });
    expect(r?.categories.every((c) => typeof c === 'string' && c.length <= 40)).toBe(true);
    expect(r?.categories.length).toBeLessThanOrEqual(50);
  });

  it('ocr_text는 4000자로 잘라냄, 비문자열이면 빈 문자열', () => {
    expect(parseRequest({ ...valid, ocr_text: 'x'.repeat(5000) })?.ocr_text).toHaveLength(4000);
    expect(parseRequest({ ...valid, ocr_text: 123 })?.ocr_text).toBe('');
  });
});
