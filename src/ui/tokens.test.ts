// vitest 파이프라인 검증용 스모크 테스트 — M1에서 도메인 테스트가 들어오면 역할 종료
import { describe, expect, it } from 'vitest';

import { colors, radius } from './tokens';

describe('design tokens', () => {
  it('4단계 뱃지 색이 모두 정의되어 있다 (만료/D-7/D-30/안전)', () => {
    expect(colors.danger).toBe('#D24B3F');
    expect(colors.orange).toBe('#D97E2B');
    expect(colors.yellow).toBe('#C9A227');
    expect(colors.green).toBe(colors.primary);
  });

  it('기본 radius는 목업과 동일한 14', () => {
    expect(radius.md).toBe(14);
  });
});
