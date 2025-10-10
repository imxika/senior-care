// ===================================================================
// vitest.setup.ts
// Vitest 초기 설정 파일 (프로젝트 루트에 생성)
// ===================================================================

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// 각 테스트 후 자동 cleanup
afterEach(() => {
  cleanup()
})

// 환경변수 모킹 (테스트용)
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
