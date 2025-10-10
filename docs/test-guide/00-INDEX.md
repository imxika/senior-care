# 🧪 Senior Care 테스트 & 모니터링 완벽 가이드

> **대상**: AI 에이전트 & 개발자 모두 활용 가능한 단계별 실전 가이드

---

## 📚 목차

### 🎯 테스트
1. **[01-UNIT_TESTING.md](./01-UNIT_TESTING.md)** - 단위 테스트 완벽 가이드
   - Vitest 설정
   - 유틸리티 함수 테스트
   - 컴포넌트 테스트
   - 커버리지 목표

2. **[02-E2E_TESTING.md](./02-E2E_TESTING.md)** - E2E 테스트 완벽 가이드
   - Playwright 설정
   - 예약 플로우 테스트
   - 인증 플로우 테스트
   - 모바일 테스트

### 📊 모니터링
3. **[03-ERROR_MONITORING.md](./03-ERROR_MONITORING.md)** - 에러 모니터링 가이드
   - Sentry 설정
   - 에러 바운더리
   - Server Action 에러 추적
   - 알림 설정

4. **[04-PERFORMANCE_MONITORING.md](./04-PERFORMANCE_MONITORING.md)** - 성능 모니터링
   - Vercel Analytics
   - Core Web Vitals
   - 성능 측정 포인트

### 🚀 자동화
5. **[05-CICD.md](./05-CICD.md)** - CI/CD 파이프라인
   - GitHub Actions 설정
   - 자동 테스트
   - 자동 배포

### 💻 실전 예시
6. **[examples/](./examples/)** - 복붙 가능한 코드 모음
   - 테스트 코드 예시
   - 설정 파일 예시
   - CI/CD 워크플로우 예시

---

## 🎯 빠른 시작

### 최소한의 필수 작업 (2시간)
```bash
# 1. 단위 테스트 설정 (30분)
npm install -D vitest @testing-library/react @testing-library/jest-dom

# 2. Sentry 설정 (30분)
npx @sentry/wizard@latest -i nextjs

# 3. 핵심 테스트 작성 (1시간)
# examples/utils.test.ts 참고하여 작성
```

### 완벽한 설정 (1주)
- Day 1-2: 단위 테스트
- Day 3-4: E2E 테스트
- Day 5: 모니터링
- Day 6: CI/CD
- Day 7: 문서화 & 정리

---

## 📊 달성 목표

### Phase 1: 기본 (필수)
- [ ] Vitest 설정 완료
- [ ] 핵심 유틸리티 테스트 10개 이상
- [ ] Sentry 에러 모니터링 설정
- [ ] 테스트 커버리지 50%+

### Phase 2: 중급 (권장)
- [ ] E2E 테스트 3개 시나리오 이상
- [ ] Vercel Analytics 설정
- [ ] GitHub Actions CI 설정
- [ ] 테스트 커버리지 70%+

### Phase 3: 고급 (엔터프라이즈)
- [ ] 컴포넌트 테스트 20개 이상
- [ ] 모바일 E2E 테스트
- [ ] 성능 모니터링 대시보드
- [ ] 자동 배포 파이프라인
- [ ] 테스트 커버리지 80%+

---

## 💰 비용 (무료 티어)

| 서비스 | 무료 한도 | MVP 충분? |
|--------|-----------|-----------|
| Vitest | 완전 무료 | ✅ |
| Playwright | 완전 무료 | ✅ |
| Sentry | 5K 이벤트/월 | ✅ |
| Vercel Analytics | 무제한 | ✅ |
| GitHub Actions | 2,000분/월 | ✅ |

**총 비용: $0**

---

## 🤝 에이전트 활용 가이드

### AI 에이전트가 이 문서를 사용하는 법

1. **문서 참조**
   ```
   "docs/test-guide/01-UNIT_TESTING.md를 보고
   lib/utils.ts에 대한 테스트를 작성해주세요"
   ```

2. **예시 복사**
   ```
   "docs/test-guide/examples/utils.test.ts를 참고해서
   lib/constants.ts 테스트를 작성해주세요"
   ```

3. **단계별 실행**
   ```
   "01-UNIT_TESTING.md의 1.1 Vitest 설정부터 시작해주세요"
   ```

### 개발자가 이 문서를 사용하는 법

1. **순서대로 따라하기**
   - 00-INDEX.md (여기) → 01 → 02 → ...

2. **필요한 부분만**
   - "E2E 테스트만 추가하고 싶다" → 02-E2E_TESTING.md

3. **코드 복사**
   - examples/ 폴더에서 필요한 코드 복붙

---

## ⏱️ 예상 소요 시간

| 작업 | 시간 | 난이도 |
|------|------|--------|
| 01. 단위 테스트 설정 | 3-4일 | ⭐⭐⭐ |
| 02. E2E 테스트 설정 | 2-3일 | ⭐⭐⭐⭐ |
| 03. 에러 모니터링 | 1-2일 | ⭐⭐ |
| 04. 성능 모니터링 | 1일 | ⭐ |
| 05. CI/CD 설정 | 1일 | ⭐⭐ |

**총: 8-11일** (약 2주)

---

## 📝 문서 작성 원칙

이 가이드는 다음 원칙으로 작성되었습니다:

1. **실행 가능**: 모든 코드는 복붙 가능
2. **단계별**: 초보자도 따라할 수 있게
3. **설명 포함**: 왜 이렇게 하는지 설명
4. **에이전트 친화적**: AI가 이해하기 쉬운 구조
5. **최신 기술**: Next.js 15, Vitest, Playwright

---

## 🎓 학습 경로

### 초급 → 중급
1. 01-UNIT_TESTING.md 완독
2. examples/utils.test.ts 분석
3. 직접 테스트 1개 작성
4. 03-ERROR_MONITORING.md 설정

### 중급 → 고급
1. 02-E2E_TESTING.md 완독
2. 예약 플로우 테스트 작성
3. 05-CICD.md로 자동화
4. 커버리지 80% 달성

---

## 🔗 관련 문서

- [코딩 컨벤션](../01_CODING_CONVENTIONS.md)
- [코드 리뷰](../CODE_REVIEW.md)
- [README.md](../../README.md)

---

## ✅ 체크리스트

작업 시작 전 확인:
- [ ] Node.js 18+ 설치됨
- [ ] npm 또는 pnpm 설치됨
- [ ] senior-care 프로젝트가 정상 작동함 (npm run dev)
- [ ] Git이 설정되어 있음

---

**마지막 업데이트**: 2025-01-10
**작성자**: Claude Code
**버전**: 1.0.0
**대상 프로젝트**: senior-care (Next.js 15 + Supabase)
