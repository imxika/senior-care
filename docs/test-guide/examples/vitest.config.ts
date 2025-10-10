// ===================================================================
// vitest.config.ts
// Vitest 설정 파일 (프로젝트 루트에 생성)
// ===================================================================

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // 브라우저 환경 시뮬레이션
    environment: 'jsdom',

    // 전역 함수 사용 가능 (describe, it, expect)
    globals: true,

    // 테스트 전 실행할 파일
    setupFiles: './vitest.setup.ts',

    // 커버리지 설정
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'tests/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
