import { defineConfig } from 'vitest/config';

// 루트 vitest.config.ts로의 상향 탐색 차단 — CI는 proxy/만 설치하므로 루트 설정을 읽으면 죽는다
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
