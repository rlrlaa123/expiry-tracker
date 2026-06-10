import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 도메인 순수 함수 테스트 전용 (RN 컴포넌트는 별도 러너 검토 — DEV-GUIDE §2)
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
