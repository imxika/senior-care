# 🎨 Loading Components Library

재사용 가능한 고급스러운 로딩 컴포넌트 라이브러리

---

## 📦 컴포넌트 목록

### 1️⃣ Simple Loading (기본)
**사용 시기:** 빠른 작업, 간단한 페이지 전환

```tsx
import { SimpleLoading } from '@/components/loading'

export default function Loading() {
  return <SimpleLoading message="로딩 중..." />
}
```

**특징:**
- ⚡ 가장 가벼움
- 🎯 단순하고 명확
- 📱 모든 상황에 적합

---

### 2️⃣ Gradient Loading (프리미엄) ⭐ **추천**
**사용 시기:** 중요한 페이지, 예약/결제 플로우

```tsx
import { GradientLoading } from '@/components/loading'

export default function Loading() {
  return (
    <GradientLoading
      message="잠시만 기다려주세요"
      submessage="최적의 트레이너를 찾고 있습니다"
    />
  )
}
```

**특징:**
- ✨ 그라데이션 배경
- 🌊 펄스 애니메이션
- 💫 고급스러운 느낌
- 📊 프로그레스 바

**적합한 곳:**
- `/booking/recommended` - 추천 예약
- `/checkout` - 결제 페이지
- `/trainers/[id]/booking` - 트레이너 예약

---

### 3️⃣ Minimal Loading (미니멀 럭셔리)
**사용 시기:** 프리미엄 느낌, 관리자 대시보드

```tsx
import { MinimalLoading } from '@/components/loading'

export default function Loading() {
  return (
    <MinimalLoading
      message="Loading"
      submessage="Please wait..."
    />
  )
}
```

**특징:**
- 🎨 우아한 타이포그래피
- ⭕ 세련된 스피너
- 🖤 미니멀 디자인

**적합한 곳:**
- `/admin/*` - 관리자 페이지
- `/trainer/settings` - 설정 페이지

---

### 4️⃣ Animated Loading (애니메이션 일러스트)
**사용 시기:** 브랜드 강조, 시니어 친화적

```tsx
import { AnimatedLoading } from '@/components/loading'

export default function Loading() {
  return (
    <AnimatedLoading
      message="건강한 삶을 준비하고 있습니다"
      submessage="최고의 트레이너와 함께하세요"
    />
  )
}
```

**특징:**
- 💗 시니어 케어 테마
- 🎭 회전하는 아이콘
- 🎨 브랜드 아이덴티티

**적합한 곳:**
- `/customer/dashboard` - 고객 대시보드
- `/trainers` - 트레이너 목록
- 랜딩 페이지

---

### 5️⃣ Skeleton Loading (레이아웃 미리보기)
**사용 시기:** 목록 페이지, 많은 데이터 로드

```tsx
import { SkeletonLoading } from '@/components/loading'

export default function Loading() {
  return <SkeletonLoading type="list" />
}
```

**타입:**
- `list` - 목록 페이지 (예약 목록, 트레이너 목록)
- `card` - 카드 그리드 (대시보드)
- `detail` - 상세 페이지 (트레이너 상세)
- `form` - 폼 페이지 (프로필 수정)

**특징:**
- 📐 레이아웃 미리 표시
- 🚀 체감 속도 향상
- 🎯 깜빡임 없음

**적합한 곳:**
- `/customer/bookings` - 예약 목록
- `/trainers` - 트레이너 목록
- `/admin/users` - 사용자 관리

---

## 🎯 사용 가이드

### 기본 사용법

```tsx
// app/(public)/booking/recommended/loading.tsx
import { GradientLoading } from '@/components/loading'

export default function Loading() {
  return <GradientLoading />
}
```

### 커스터마이징

```tsx
import { GradientLoading } from '@/components/loading'

export default function Loading() {
  return (
    <GradientLoading
      message="예약을 준비하고 있습니다"
      submessage="잠시만 기다려주세요"
      className="min-h-screen"
    />
  )
}
```

---

## 📋 추천 조합

### 고객용 페이지
```tsx
// 예약 플로우
GradientLoading - 프리미엄 느낌
AnimatedLoading - 친근한 느낌

// 목록/대시보드
SkeletonLoading - 빠른 체감 속도
```

### 관리자 페이지
```tsx
// 대시보드/설정
MinimalLoading - 전문적인 느낌

// 목록/데이터
SkeletonLoading - 레이아웃 유지
```

### 트레이너 페이지
```tsx
// 프로필/설정
MinimalLoading - 깔끔한 느낌

// 예약 관리
SkeletonLoading - 효율적
```

---

## 🎨 스타일 가이드

### 색상
- **Primary (파란색):** SimpleLoading, MinimalLoading
- **Gradient (보라/핑크):** GradientLoading, AnimatedLoading
- **Gray (회색):** SkeletonLoading

### 메시지 톤
- **고객용:** 친근하고 따뜻한 메시지
  - "잠시만 기다려주세요"
  - "건강한 삶을 준비하고 있습니다"

- **관리자용:** 전문적이고 간결한 메시지
  - "Loading..."
  - "Processing..."

- **트레이너용:** 전문적이지만 친근한 메시지
  - "로딩 중..."
  - "데이터를 불러오는 중입니다"

---

## 💡 팁

1. **일관성 유지:** 같은 섹션에서는 같은 로딩 컴포넌트 사용
2. **상황에 맞게:** 중요한 페이지일수록 고급스러운 컴포넌트
3. **성능 고려:** 빠른 페이지는 SimpleLoading, 느린 페이지는 SkeletonLoading
4. **메시지 커스터마이징:** 페이지에 맞는 메시지로 사용자 경험 향상

---

## 🚀 빠른 적용

현재 프로젝트의 모든 `loading.tsx` 파일을 한번에 업그레이드하려면:

```bash
# 1. 추천 예약 - GradientLoading
# app/(public)/booking/recommended/loading.tsx

# 2. 트레이너 목록 - SkeletonLoading (list)
# app/(public)/trainers/loading.tsx

# 3. 예약 목록 - SkeletonLoading (list)
# app/(dashboard)/customer/bookings/loading.tsx

# 4. 대시보드 - AnimatedLoading
# app/(dashboard)/customer/dashboard (별도 구현 필요)
```
