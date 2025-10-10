# 02. E2E 테스트 완벽 가이드

> **목표**: 실제 사용자 시나리오를 자동으로 테스트 (예약, 로그인, 결제 등)

---

## 📋 목차

1. [Playwright 설정](#1-playwright-설정)
2. [핵심 시나리오 테스트](#2-핵심-시나리오-테스트)
3. [테스트 실행](#3-테스트-실행)
4. [CI 통합](#4-ci-통합)

---

## 1. Playwright 설정

### 1.1 Playwright 설치 (5분)

```bash
npm init playwright@latest
```

**선택 옵션:**
```
✓ TypeScript
✓ tests 폴더에 테스트 저장
✓ GitHub Actions 워크플로우 추가
✓ Chromium, Firefox, Safari 설치
```

---

### 1.2 설정 파일 수정

**파일: `playwright.config.ts`**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 2. 핵심 시나리오 테스트

### 2.1 예약 플로우 테스트

**파일: `tests/e2e/booking-flow.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('예약 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/customer/dashboard')
  })

  test('고객이 트레이너를 검색하고 예약할 수 있다', async ({ page }) => {
    // 1. 트레이너 목록으로 이동
    await page.goto('/trainers')

    // 2. 검색 필터 사용
    await page.fill('input[placeholder*="검색"]', '재활')
    await page.selectOption('select[name="service_type"]', 'home_visit')
    await page.click('button:has-text("검색")')

    // 3. 검색 결과 확인
    await expect(page.locator('.trainer-card')).toHaveCount.greaterThan(0)

    // 4. 첫 번째 트레이너 선택
    await page.click('.trainer-card:first-child')

    // 5. 예약 페이지로 이동
    await page.click('button:has-text("예약하기")')

    // 6. 예약 정보 입력
    await page.fill('input[name="date"]', '2025-02-01')
    await page.selectOption('select[name="time"]', '14:00')
    await page.selectOption('select[name="duration"]', '60')
    await page.fill('textarea[name="notes"]', '허리 재활 필요')

    // 7. 가격 확인
    const price = await page.locator('.total-price').textContent()
    expect(price).toContain('130,000원')

    // 8. 예약 제출
    await page.click('button:has-text("예약 신청")')

    // 9. 성공 메시지 확인
    await expect(page.locator('.success-message')).toBeVisible()
    await expect(page).toHaveURL(/\/customer\/bookings/)
  })

  test('예약 취소 기능', async ({ page }) => {
    // 1. 예약 목록으로 이동
    await page.goto('/customer/bookings')

    // 2. 첫 번째 예약 선택
    await page.click('.booking-card:first-child')

    // 3. 취소 버튼 클릭
    await page.click('button:has-text("예약 취소")')

    // 4. 취소 사유 입력
    await page.selectOption('select[name="reason"]', 'schedule_change')
    await page.fill('textarea[name="notes"]', '일정 변경')

    // 5. 취소 수수료 확인
    const fee = await page.locator('.cancellation-fee').textContent()
    expect(fee).toMatch(/수수료: \d+,\d+원/)

    // 6. 최종 취소 확인
    await page.click('button:has-text("취소 확인")')

    // 7. 상태 변경 확인
    await expect(page.locator('.status-badge')).toHaveText('취소됨')
  })
})
```

---

### 2.2 인증 플로우 테스트

**파일: `tests/e2e/auth.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('인증 플로우', () => {
  test('회원가입 → 프로필 설정 → 대시보드', async ({ page }) => {
    // 1. 회원가입 페이지
    await page.goto('/signup')

    // 2. 정보 입력
    const email = `test${Date.now()}@example.com`
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', 'TestPass123!')
    await page.fill('input[name="confirmPassword"]', 'TestPass123!')
    await page.click('button[type="submit"]')

    // 3. 프로필 설정 페이지로 자동 이동
    await page.waitForURL('/auth/setup/customer')

    // 4. 기본 정보 입력
    await page.fill('input[name="full_name"]', '테스트사용자')
    await page.fill('input[name="phone"]', '010-1234-5678')
    await page.selectOption('select[name="age"]', '65')
    await page.click('button:has-text("완료")')

    // 5. 대시보드로 이동 확인
    await expect(page).toHaveURL('/customer/dashboard')
    await expect(page.locator('h1')).toContainText('대시보드')
  })

  test('로그인 실패 처리', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // 에러 메시지 확인
    await expect(page.locator('.error-message')).toBeVisible()
    await expect(page.locator('.error-message')).toContainText('이메일 또는 비밀번호')
  })
})
```

---

### 2.3 모바일 테스트

**파일: `tests/e2e/mobile.spec.ts`**

```typescript
import { test, expect } from '@playwright/test'

test.describe('모바일 예약 플로우', () => {
  test.use({
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  })

  test('모바일에서 트레이너 검색 및 예약', async ({ page }) => {
    await page.goto('/login')
    // ... 로그인 ...

    // 모바일 메뉴 열기
    await page.click('[aria-label="메뉴"]')
    await page.click('text="트레이너 찾기"')

    // 모바일 필터
    await page.click('button:has-text("필터")')
    await page.check('input[value="home_visit"]')
    await page.click('button:has-text("적용")')

    // 트레이너 선택
    await page.click('.trainer-card:first-child')

    // 모바일에서도 예약 가능 확인
    await expect(page.locator('button:has-text("예약하기")')).toBeVisible()
  })
})
```

---

## 3. 테스트 실행

### 3.1 기본 실행

```bash
# 헤드리스 모드 (백그라운드)
npx playwright test

# UI 모드 (브라우저 보면서 테스트)
npx playwright test --ui

# 특정 브라우저만
npx playwright test --project=chromium

# 특정 파일만
npx playwright test booking-flow
```

---

### 3.2 디버깅

```bash
# 디버그 모드 (느리게 실행)
npx playwright test --debug

# Trace 보기
npx playwright show-trace trace.zip
```

---

## 4. CI 통합

**파일: `.github/workflows/e2e.yml`**

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📊 체크리스트

- [ ] Playwright 설치 완료
- [ ] 예약 플로우 테스트 작성
- [ ] 인증 플로우 테스트 작성
- [ ] 모바일 테스트 작성
- [ ] npx playwright test 성공
- [ ] CI 워크플로우 추가

---

**다음**: [03-ERROR_MONITORING.md](./03-ERROR_MONITORING.md)
