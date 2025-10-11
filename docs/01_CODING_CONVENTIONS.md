# Coding Conventions

Senior Care MVP 프로젝트의 코딩 컨벤션 및 스타일 가이드입니다.

## 목차
- [TypeScript 컨벤션](#typescript-컨벤션)
- [React/Next.js 패턴](#reactnextjs-패턴)
- [Supabase 쿼리 패턴](#supabase-쿼리-패턴)
- [로딩 상태 & UX 패턴](#로딩-상태--ux-패턴)
- [파일 구조](#파일-구조)
- [네이밍 규칙](#네이밍-규칙)
- [에러 처리](#에러-처리)

---

## TypeScript 컨벤션

### 타입 정의 위치

```typescript
// ✅ 컴포넌트와 같은 파일에 인터페이스 정의
interface PageProps {
  params: Promise<{ id: string }>
  searchParams?: { [key: string]: string | string[] | undefined }
}

export default async function Page({ params, searchParams }: PageProps) {
  // ...
}
```

```typescript
// ✅ 재사용 타입은 별도 파일
// types/database.ts
export interface Customer {
  id: string
  profile_id: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  // ...
}
```

### 엄격한 타입 체크

```typescript
// ✅ 명시적 타입 선언
const { data: customer }: { data: Customer | null } = await supabase
  .from('customers')
  .select('*')
  .single()

// ✅ null 체크
if (!customer) {
  redirect('/error')
}

// ❌ any 사용 금지
const data: any = await fetchData()  // 피하기
```

---

## React/Next.js 패턴

### 컴포넌트 구조

```typescript
// ✅ 권장 패턴
'use client'  // 클라이언트 컴포넌트인 경우

import { useState } from 'react'  // 1. React imports
import { useRouter } from 'next/navigation'  // 2. Next.js imports
import { Button } from '@/components/ui/button'  // 3. UI components
import { createClient } from '@/lib/supabase/client'  // 4. Lib functions
import type { Customer } from '@/types/database'  // 5. Types

interface ComponentProps {  // 6. Interface 정의
  customer: Customer
  onUpdate?: () => void
}

export function Component({ customer, onUpdate }: ComponentProps) {
  // 7. Hooks (최상단)
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 8. 함수 정의
  const handleSubmit = async () => {
    // ...
  }

  // 9. JSX return
  return (
    <div className="container">
      {/* ... */}
    </div>
  )
}
```

### Server vs Client Components

```typescript
// ✅ Server Component (기본)
// - 데이터 fetch
// - SEO 중요한 페이지
// - 'use client' 선언 없음

export default async function Page() {
  const supabase = await createClient()  // server client
  const { data } = await supabase.from('...').select()

  return <div>{/* ... */}</div>
}
```

```typescript
// ✅ Client Component
// - 상태 관리 (useState, useReducer)
// - 브라우저 API 사용
// - 이벤트 핸들러
// - 'use client' 선언 필수

'use client'

export function Component() {
  const [state, setState] = useState()
  // ...
}
```

### Next.js 15 Dynamic Routes

```typescript
// ✅ Next.js 15 패턴 (params는 Promise)
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params  // ⚠️ await 필수!

  // id 사용
}
```

```typescript
// ❌ Next.js 14 이전 패턴 (사용 금지)
interface PageProps {
  params: { id: string }  // Promise 아님
}

export default async function Page({ params }: PageProps) {
  const id = params.id  // await 없음
}
```

---

## Supabase 쿼리 패턴

### 기본 패턴

```typescript
// ✅ 서버 컴포넌트
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
```

```typescript
// ✅ 클라이언트 컴포넌트
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()  // await 없음
```

### ID 변환 체인

```typescript
// ✅ user.id → customer.id 변환
const { data: { user } } = await supabase.auth.getUser()

// 1단계: customer 레코드 조회
const { data: customer } = await supabase
  .from('customers')
  .select('id')
  .eq('profile_id', user.id)
  .single()

// 2단계: customer.id 사용
const { data: bookings } = await supabase
  .from('bookings')
  .select('*')
  .eq('customer_id', customer.id)  // ⚠️ user.id 아님!
```

### JOIN 패턴

```typescript
// ✅ 관계 데이터 조회
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    *,
    customer:customers(
      id,
      profiles!customers_profile_id_fkey(
        full_name,
        phone
      )
    ),
    trainer:trainers(
      id,
      profiles!trainers_profile_id_fkey(
        full_name,
        avatar_url
      )
    )
  `)
```

### 에러 처리

```typescript
// ✅ 명시적 에러 처리
const { data, error } = await supabase
  .from('customers')
  .select('*')

if (error) {
  console.error('Error fetching customers:', error)
  return { error: error.message }
}

if (!data) {
  return { error: 'No data found' }
}

// data 사용
```

---

## 로딩 상태 & UX 패턴

### 로딩 상태 네이밍

```typescript
// ✅ Boolean 변수: is 접두사 사용
const [isLoading, setIsLoading] = useState(false)
const [isSubmitting, setIsSubmitting] = useState(false)
const [isProcessing, setIsProcessing] = useState(false)

// ❌ 사용 금지
const [loading, setLoading] = useState(false)  // is 없음
const [submit, setSubmit] = useState(false)    // 동사형
```

### 비동기 함수 패턴

```typescript
// ✅ try-catch-finally 패턴
const handleSubmit = async () => {
  setIsLoading(true)

  try {
    const response = await fetch('/api/endpoint')
    if (!response.ok) throw new Error('Failed')

    const data = await response.json()
    // 성공 처리
  } catch (error) {
    console.error('Error:', error)
    // 에러 처리
  } finally {
    setIsLoading(false)  // ⚠️ finally에서 항상 false로
  }
}
```

### 버튼 로딩 상태

```typescript
// ✅ 버튼 비활성화 + 스피너 + 텍스트 변경
import { Loader2 } from 'lucide-react'

<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      처리 중...
    </>
  ) : (
    '제출하기'
  )}
</Button>
```

### 독립적인 로딩 상태 (다중 버튼)

```typescript
// ✅ 각 버튼마다 독립적인 상태
const [isEmailLoading, setIsEmailLoading] = useState(false)
const [isKakaoLoading, setIsKakaoLoading] = useState(false)
const [isGoogleLoading, setIsGoogleLoading] = useState(false)

// ❌ 공유 상태 (모든 버튼이 동시에 로딩됨)
const [isLoading, setIsLoading] = useState(false)
```

### 페이지 로딩 컴포넌트

프로젝트에는 5가지 재사용 가능한 로딩 컴포넌트가 있습니다 (`components/loading/`):

```typescript
// 1. SimpleLoading (기본) - 빠른 페이지
import { SimpleLoading } from '@/components/loading'
export default function Loading() {
  return <SimpleLoading message="로딩 중..." />
}

// 2. GradientLoading (프리미엄) ⭐ - 예약/결제
import { GradientLoading } from '@/components/loading'
export default function Loading() {
  return (
    <GradientLoading
      message="잠시만 기다려주세요"
      submessage="최적의 트레이너를 찾고 있습니다"
    />
  )
}

// 3. MinimalLoading (럭셔리) - 관리자
import { MinimalLoading } from '@/components/loading'
export default function Loading() {
  return <MinimalLoading />
}

// 4. AnimatedLoading (브랜드) - 대시보드
import { AnimatedLoading } from '@/components/loading'
export default function Loading() {
  return <AnimatedLoading />
}

// 5. SkeletonLoading (레이아웃) - 목록
import { SkeletonLoading } from '@/components/loading'
export default function Loading() {
  return <SkeletonLoading type="list" />  // list, card, detail, form
}
```

**선택 가이드:**

| 상황 | 추천 | 이유 |
|------|------|------|
| 예약/결제 | GradientLoading | 프리미엄 |
| 관리자 | MinimalLoading | 전문적 |
| 대시보드 | AnimatedLoading | 친근함 |
| 목록 | SkeletonLoading | 빠름 |

### Optimistic Updates

즉시 반응이 필요한 경우 (좋아요, 즐겨찾기 등):

```typescript
// ✅ Optimistic Update 패턴
const handleToggle = async () => {
  // 1. 이전 상태 저장
  const previous = isFavorited

  // 2. 즉시 UI 업데이트
  setIsFavorited(!isFavorited)

  try {
    // 3. 백그라운드 요청
    await api.toggle()
  } catch (error) {
    // 4. 실패 시 롤백
    setIsFavorited(previous)
    toast.error('실패')
  }
}
```

### 로딩 UX 계층

```
Level 1: 버튼 스피너 (0.5~3초) → 즉시 피드백
Level 2: NProgress 바 (전환) → 진행 표시
Level 3: Loading 페이지 (1초+) → 전체 로딩
Level 4: Optimistic (즉시) → 지연 숨김
```

---

## 파일 구조

### 디렉토리 구조

```
senior-care/
├── app/
│   ├── (auth)/              # 인증 관련 페이지
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # 대시보드 (인증 필요)
│   │   ├── customer/
│   │   ├── trainer/
│   │   └── admin/
│   ├── (public)/            # 공개 페이지
│   │   └── trainers/
│   ├── api/                 # API routes
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                  # shadcn/ui components
│   └── [feature]-[name].tsx # 기능별 컴포넌트
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── utils.ts
├── types/                   # TypeScript 타입 정의
├── docs/                    # 프로젝트 문서
└── supabase/
    └── migrations/
```

### 파일 네이밍

```
✅ 컴포넌트:        PascalCase.tsx
                  BookingForm.tsx
                  CustomerBookingCard.tsx

✅ 페이지:          page.tsx (Next.js App Router)
                  layout.tsx
                  loading.tsx
                  error.tsx

✅ API Routes:     route.ts

✅ 액션:           actions.ts
                  [feature]-actions.ts

✅ Lib/Utils:     kebab-case.ts
                  supabase-client.ts
                  date-utils.ts

✅ 타입:           PascalCase.ts
                  Database.ts
                  User.ts

✅ 문서:           UPPERCASE.md
                  README.md
                  DATABASE_SCHEMA.md
```

---

## 네이밍 규칙

### 변수명

```typescript
// ✅ camelCase
const userName = 'John'
const isLoading = true
const hasPermission = false

// ✅ 불린은 is/has/can 접두사
const isActive = true
const hasAccess = false
const canEdit = true

// ✅ 배열은 복수형
const customers = []
const bookings = []
const trainers = []

// ❌ 피하기
const UserName = 'John'  // PascalCase는 컴포넌트/타입만
const loading = true  // 불린 의미 불명확
const customer = []  // 배열인데 단수형
```

### 함수명

```typescript
// ✅ 동사 + 명사
const fetchCustomers = async () => {}
const createBooking = async () => {}
const updateProfile = async () => {}
const deleteTrainer = async () => {}

// ✅ 이벤트 핸들러는 handle 접두사
const handleSubmit = () => {}
const handleClick = () => {}
const handleChange = () => {}

// ✅ boolean 반환은 is/has/can
const isValidEmail = (email: string) => boolean
const hasPermission = (user: User) => boolean
const canEdit = (booking: Booking) => boolean
```

### 컴포넌트명

```typescript
// ✅ PascalCase, 명사
export function CustomerDashboard() {}
export function BookingForm() {}
export function TrainerCard() {}

// ✅ 기능 설명적
export function BecomeTrainerForm() {}
export function InactivityLogout() {}

// ❌ 피하기
export function dashboard() {}  // 소문자
export function Form() {}  // 너무 일반적
export function Component1() {}  // 의미 없음
```

### 상수명

```typescript
// ✅ UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5 * 1024 * 1024  // 5MB
const API_BASE_URL = 'https://api.example.com'
const INACTIVITY_TIMEOUT = 30 * 60 * 1000  // 30분

// ✅ enum도 동일
enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
```

---

## 에러 처리

### Server Actions

```typescript
// ✅ 통일된 에러 응답 형식
'use server'

export async function createBooking(formData: FormData) {
  try {
    const supabase = await createClient()

    // 검증
    if (!formData.get('date')) {
      return { error: '날짜를 선택해주세요.' }
    }

    // DB 작업
    const { data, error } = await supabase
      .from('bookings')
      .insert({ ... })

    if (error) {
      console.error('Booking creation error:', error)
      return { error: '예약 생성 중 오류가 발생했습니다.' }
    }

    // 성공
    return { success: true, data }

  } catch (error) {
    console.error('Unexpected error:', error)
    return { error: '예상치 못한 오류가 발생했습니다.' }
  }
}
```

### 클라이언트 컴포넌트

```typescript
// ✅ try-catch + 사용자 친화적 메시지
const handleSubmit = async () => {
  setLoading(true)
  setError(null)

  try {
    const result = await createBooking(formData)

    if (result.error) {
      setError(result.error)
      return
    }

    // 성공 처리
    router.push('/success')

  } catch (error) {
    setError('요청 처리 중 오류가 발생했습니다.')
    console.error('Submit error:', error)
  } finally {
    setLoading(false)
  }
}
```

---

## CSS/Tailwind 컨벤션

### 클래스 순서

```tsx
// ✅ 권장 순서
<div
  className="
    flex items-center justify-between  // Layout
    w-full max-w-md                     // Sizing
    p-4 gap-2                           // Spacing
    bg-white border rounded-lg          // Appearance
    text-lg font-bold                   // Typography
    hover:bg-gray-50                    // States
    transition-colors                   // Transitions
  "
>
```

### cn 유틸리티 사용

```tsx
// ✅ 조건부 클래스
import { cn } from '@/lib/utils'

<div
  className={cn(
    "base-class",
    isActive && "active-class",
    variant === 'primary' && "primary-variant",
    className  // props로 받은 추가 클래스
  )}
>
```

---

## 폼 처리 패턴

### Server Action 폼

```tsx
// ✅ 기본 패턴
'use client'

export function Form() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await serverAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드 */}
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button disabled={loading}>제출</Button>
    </form>
  )
}
```

### Select 컴포넌트 패턴

```tsx
// ✅ shadcn Select + FormData
'use client'

export function FormWithSelect() {
  const [selectValue, setSelectValue] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    formData.set('select_field', selectValue)  // Select 값 추가

    await serverAction(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Select value={selectValue} onValueChange={setSelectValue}>
        <SelectTrigger>
          <SelectValue placeholder="선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">옵션 1</SelectItem>
        </SelectContent>
      </Select>
    </form>
  )
}
```

---

## 주석 컨벤션

### 코드 주석

```typescript
// ✅ 의도를 설명하는 주석
// 사용자가 30분 동안 활동이 없으면 자동 로그아웃
const INACTIVITY_TIMEOUT = 30 * 60 * 1000

// ✅ 복잡한 로직 설명
// 1. customer.id 조회 (user.id는 profiles.id이므로 변환 필요)
// 2. bookings.customer_id로 예약 조회
const { data: customer } = await supabase...

// ⚠️ 임시 해결책 표시
// TODO: 추후 이메일 인증 추가
// FIXME: 동시성 문제 해결 필요
// HACK: 임시 우회 방법

// ❌ 불필요한 주석
// 사용자 이름을 설정
const userName = 'John'  // 코드만 봐도 명확
```

---

## 체크리스트

### 새 페이지 추가 시
- [ ] Server/Client Component 구분 명확
- [ ] params는 Promise로 타입 정의 (Next.js 15)
- [ ] 인증 체크 (필요시)
- [ ] 에러 처리 구현
- [ ] 로딩 상태 구현

### 새 컴포넌트 추가 시
- [ ] shadcn/ui 컴포넌트 우선 사용
- [ ] Props 타입 인터페이스 정의
- [ ] className props 받아서 cn()으로 병합
- [ ] 필요시 'use client' 선언

### DB 쿼리 작성 시
- [ ] ID 참조 확인 (user.id vs customer.id)
- [ ] 에러 처리 추가
- [ ] null 체크 추가
- [ ] console.error로 로깅

### Server Action 작성 시
- [ ] 'use server' 선언
- [ ] try-catch 에러 처리
- [ ] 일관된 응답 형식 ({ error } | { success, data })
- [ ] revalidatePath 호출 (필요시)

---

**마지막 업데이트**: 2025-01-11
**작성자**: Claude Code
**버전**: 2.0 (Loading UX 패턴 추가)
