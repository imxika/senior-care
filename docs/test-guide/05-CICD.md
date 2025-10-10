# 05. CI/CD 파이프라인 설정

> **목표**: 코드 푸시 시 자동으로 테스트 → 빌드 → 배포

---

## 1. GitHub Actions 설정

### 1.1 테스트 자동화

**파일: `.github/workflows/test.yml`**

```yaml
name: Tests & Quality Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run E2E tests
        run: npx playwright test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

      - name: Build
        run: npm run build

      - name: Type check
        run: npx tsc --noEmit
```

---

### 1.2 자동 배포 (Vercel)

**파일: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

---

## 2. Secrets 설정

**GitHub Repository → Settings → Secrets and variables → Actions**

추가할 Secrets:
```
SUPABASE_URL
SUPABASE_ANON_KEY
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SLACK_WEBHOOK (선택)
```

---

## 3. 브랜치 전략

```
main        (프로덕션)
 ↑
develop     (개발)
 ↑
feature/*   (기능 개발)
```

**규칙:**
- `feature/*` → `develop` PR 시 테스트 실행
- `develop` → `main` PR 시 테스트 + 스테이징 배포
- `main` 푸시 시 프로덕션 배포

---

## 📊 체크리스트

- [ ] .github/workflows/test.yml 생성
- [ ] .github/workflows/deploy.yml 생성
- [ ] GitHub Secrets 설정
- [ ] 테스트 푸시 후 Actions 확인

---

**완료!** 모든 가이드 작성 끝.
