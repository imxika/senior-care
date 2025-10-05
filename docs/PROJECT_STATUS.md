# 🏥 Senior Care MVP - 프로젝트 현황 분석

**작성일**: 2025-10-02 (Day 1)
**최종 업데이트**: 2025-10-07 (Day 6 완료)
**버전**: 3.4.0
**상태**: MVP 개발 진행 중 (90% 완료)

---

## 📅 개발 타임라인

### Day 1 (2025-10-02)
- ✅ 프로젝트 초기 설정
- ✅ Supabase 데이터베이스 스키마 구축
- ✅ 인증 시스템 구현
- ✅ 기본 레이아웃 및 라우팅
- ✅ 트레이너 목록 페이지
- ✅ 역할별 대시보드 구조 생성

### Day 2 (2025-10-03) - 코드 리팩토링 및 예약 시스템 고도화
- ✅ **코드베이스 구조 개선** (오전)
  - `/lib/constants.ts` 생성 - 예약 상태, 가격 상수 중앙화
  - `/lib/types.ts` 생성 - 공통 타입 정의 중앙화
  - `/lib/utils.ts` 확장 - 날짜/시간, 가격 계산, 타입 매핑 유틸리티 추가

- ✅ **RLS 정책 수정 및 검증** (오전)
  - bookings 테이블 RLS 정책 완전 재구축
  - 고객 본인 예약만 조회 가능하도록 수정
  - 트레이너 본인 예약만 조회/수정 가능하도록 수정
  - 관리자 모든 예약 접근 권한 부여
  - RLS 정책 테스트 완료

- ✅ **회원가입 플로우 개선** (오전)
  - 트리거 함수 `handle_new_user()` 검증
  - 회원가입 시 profiles → customers 자동 생성 확인
  - 중복 레코드 생성 방지 로직 추가
  - signup/page.tsx 에러 처리 개선

- ✅ **예약 시스템 버그 수정** (오전)
  - 트레이너 예약 목록에서 권한 체크 로직 수정 (profile_id vs trainer.id)
  - 예약 생성 시 고객 레코드 자동 생성 로직 추가
  - 예약 생성 성공 메시지 추가
  - 예약 카드에서 트레이너 프로필 클릭 가능하도록 개선
  - 예약 상세 정보 표시 개선
  - 로그아웃 기능 구현 완료

- ✅ **예약 타입 시스템 구현** (오후 전반) 🎯 **메이저 기능**
  - **데이터베이스 스키마 확장**:
    - `booking_type` enum 추가 (direct, recommended)
    - `price_multiplier` 필드 추가 (지정: 1.3, 추천: 1.0)
    - `admin_matched_at`, `admin_matched_by` 필드 추가
    - `trainer_id` NULLABLE 변경 (추천 예약 지원)
    - 체크 제약 및 인덱스 추가

  - **지정 예약 (Direct Booking)**:
    - 기존 예약 플로우 유지
    - 가격 30% 추가 (프리미엄 서비스)
    - 트레이너 직접 선택

  - **추천 예약 (Recommended Booking)** 🆕:
    - `/booking/recommended` 페이지 생성
    - 트레이너 선택 없이 예약 요청
    - 고객 요청사항 (주소, 필요 전문분야) 수집
    - 관리자 매칭 대기 상태

  - **Admin 트레이너 매칭 시스템** 🆕:
    - `/admin/bookings/recommended` - 매칭 대기 목록
    - `/admin/bookings/recommended/[id]/match` - 트레이너 선택
    - 자동 매칭 점수 알고리즘 (초기):
      - 서비스 타입 일치 (30점)
      - 전문분야 매칭 (20점/개)
      - 서비스 지역 일치 (25점)
      - 경력 가점 (2점/년, 최대 10점)
      - 자격증 가점 (3점/개)
    - 점수순 트레이너 정렬 및 추천

  - **UI/UX 개선**:
    - `BookingTypeSelector` 컴포넌트 생성
    - 홈페이지에 예약 타입 선택 버튼 추가
    - 가격 비교 표시 (지정 vs 추천)
    - 예약 카드에 예약 타입 배지 표시

- ✅ **가격 계산 로직 업데이트**
  - `calculatePricingInfo()` 함수 수정
  - 예약 타입별 price_multiplier 적용
  - base_price, final_price 구분

- ✅ **추천 예약 시스템 고도화** (오후 후반) 🎯 **메이저 업그레이드**
  - **예산 필터링 시스템**:
    - `RECOMMENDED_MAX_HOURLY_RATE` 상수 추가 (₩100,000)
    - 가격 기반 점수 계산 (최대 15점)
    - Admin UI에 예산 필터 토글 체크박스
    - "예산 초과" 배지 표시

  - **부하 분산 알고리즘**:
    - 트레이너별 미래 예약 수 집계 (pending + confirmed)
    - 예약 수 기반 점수 (최대 20점)
    - 0건: 20점, 1-2건: 15점, 3-4건: 10점, 5-6건: 5점, 7+건: 0점
    - 예약 수 표시 ("예약 X건 (여유/보통/많음/과부하)")

  - **UX 개선**:
    - 트레이너 매칭 성공 메시지 (Alert + 아이콘)
    - 1.5초 지연 후 자동 리다이렉트
    - 트레이너 이름 fallback (full_name || email || default)
    - 추천 예약 카드: "매칭 대기 중" + "추천 예약" 배지
    - 조건부 Link (매칭된 예약만 클릭 가능)

  - **RLS 정책 수정 및 버그 수정**:
    - `20251003_add_admin_rls_policies.sql` 마이그레이션 실행
    - Admin 전체 데이터 조회 권한 부여
    - RLS 순환 참조 문제 해결
    - Next.js 15 async params 패턴 적용
    - CHECK constraint 만족 (status = 'confirmed')
    - hourly_rate NULL 안전 처리

  - **최종 매칭 알고리즘 (7가지 기준)**:
    1. 서비스 타입 일치 (30점)
    2. 전문분야 매칭 (20점/개)
    3. 서비스 지역 일치 (25점)
    4. 경력 가점 (2점/년, 최대 10점)
    5. 자격증 가점 (3점/개)
    6. **가격 점수 (최대 15점)** 🆕
    7. **부하 분산 점수 (최대 20점)** 🆕
    - **총점 범위**: 0 ~ 140점+

### Day 3 (2025-10-05) - 알림 시스템 구현 🎯
- ✅ **실시간 알림 시스템 구현**
  - Supabase Realtime 활성화 (notifications 테이블)
  - 실시간 알림 드롭다운 UI (`/components/notification-dropdown.tsx`)
  - 알림 아이콘 배지 (읽지 않은 알림 수 표시)
  - 알림 카테고리별 아이콘 (예약, 매칭, 시스템)

- ✅ **트레이너 매칭 알림 자동 생성**
  - Admin 매칭 완료 시 트레이너에게 알림 발송
  - 알림 타입: 'trainer_matched'
  - 알림 클릭 시 예약 상세 페이지 이동

- ✅ **추천 예약 알림 자동 생성**
  - 고객이 추천 예약 요청 시 관리자에게 알림 발송
  - 알림 타입: 'recommended_booking_created'
  - 알림 클릭 시 매칭 페이지 이동

- ✅ **알림 설정 기능**
  - 알림 카테고리별 토글 설정
  - 예약 알림, 매칭 알림, 시스템 알림 개별 ON/OFF
  - 설정 페이지 UI 구현 (`/app/(dashboard)/admin/settings/page.tsx`)

- ✅ **사운드 알림**
  - 새 알림 도착 시 사운드 재생
  - AudioContext 초기화 (사용자 인터랙션 후)
  - 알림 사운드 토글 설정

- ✅ **알림 읽음 처리**
  - 알림 클릭 시 자동으로 읽음 처리
  - 읽지 않은 알림 배지 업데이트
  - 실시간 UI 반영

- ✅ **알림 라우팅 수정**
  - 트레이너: `/trainer/bookings/${bookingId}`
  - 고객: `/customer/bookings/${bookingId}`
  - 관리자: `/admin/bookings/recommended/${bookingId}/match`

### Day 4 (2025-10-06) - 트레이너 승인 시스템 🎯
- ✅ **트레이너 예약 카드 클릭 가능**
  - TrainerBookingCard 클릭 시 상세 페이지 이동
  - 액션 버튼 클릭 시 이벤트 전파 방지 (stopPropagation)
  - Hover 효과 및 커서 포인터 추가

- ✅ **트레이너 승인/거절 시스템 구현**
  - **데이터베이스 스키마**:
    - `rejection_reason` enum 추가 (personal_emergency, health_issue, schedule_conflict, distance_too_far, customer_requirements, other)
    - `rejection_reason`, `rejection_note` 필드 추가 (bookings 테이블)
    - 거절 사유 추적 및 패널티 측정 준비

  - **트레이너 가용 시간 관리**:
    - `trainer_availability` 테이블 생성
    - 요일별 시간 슬롯 설정 (day_of_week, start_time, end_time)
    - 가용 시간 관리 페이지 (`/app/(dashboard)/trainer/availability/page.tsx`)
    - 요일별 그룹화 표시 및 다중 시간 슬롯 지원

  - **1시간 거절 윈도우 시스템**:
    - Admin 매칭 시 status를 'pending'으로 설정 (confirmed → pending 변경)
    - `admin_matched_at` 타임스탬프 기록
    - 매칭 후 1시간 이내에만 거절 가능
    - 1시간 경과 시 자동 승인 (Auto-approval)

  - **거절 다이얼로그 UI**:
    - 거절 사유 선택 (Select 컴포넌트)
    - 상세 사유 입력 (Textarea, 선택사항)
    - 확인/취소 버튼

  - **예약 상세 페이지 액션 버튼**:
    - BookingActions 클라이언트 컴포넌트 생성
    - 승인/거절 버튼 (status = 'pending'일 때만 표시)
    - 1시간 타이머 표시 ("X분 남음" or "시간 만료")
    - 시간 만료 시 거절 버튼 비활성화 및 자동 승인 안내

  - **Check Constraint 수정**:
    - 추천 예약 + pending 상태 + trainer_id 존재 허용
    - `check_recommended_booking` 제약 업데이트

- ✅ **취소/거절된 예약 표시**
  - 트레이너 예약 페이지에 "취소/거절된 예약" 섹션 추가
  - status = 'cancelled' or 'no_show' 필터링
  - 빨간색 XCircle 아이콘 표시
  - 예약 건수 카운트

### Day 5 (2025-10-06) - 고객 UX 개선 & 자동화 🎯

### Day 6 (2025-10-07) - 즐겨찾기, 프로필 사진, 예약 페이지 개선 🎯
- ✅ **즐겨찾기 기능 구현**
  - **데이터베이스 스키마**:
    - `favorites` 테이블 생성 (customer_id, trainer_id)
    - UNIQUE 제약 조건 (고객당 트레이너 중복 방지)
    - RLS 정책 설정 (고객 본인 즐겨찾기만 조회/수정/삭제)
    - 트레이너는 자신이 즐겨찾기된 목록 조회 가능

  - **즐겨찾기 토글 버튼**:
    - FavoriteToggleButton 컴포넌트 생성
    - 실시간 즐겨찾기 상태 확인
    - 하트 아이콘 fill 애니메이션
    - 트레이너 상세 페이지에 통합
    - Toast 알림 (추가/해제 완료)

  - **즐겨찾기 페이지**:
    - `/customer/favorites` 페이지 생성
    - 카드 그리드 레이아웃 (3열)
    - 트레이너 정보 (프로필, 평점, 전문분야, 경력, 요금)
    - 프로필 보기 / 예약하기 버튼
    - 즐겨찾기 해제 버튼

- ✅ **프로필 사진 업로드 기능**
  - **Supabase Storage 설정**:
    - `profiles` 버킷 생성 (Public)
    - 5MB 파일 크기 제한
    - 이미지 타입 제한 (jpeg, png, gif, webp)
    - Storage RLS 정책 설정

  - **AvatarUpload 컴포넌트**:
    - 프로필 사진 미리보기
    - Hover 시 카메라 아이콘 오버레이
    - 파일 타입/크기 검증
    - Supabase Storage 업로드
    - profiles 테이블 avatar_url 업데이트
    - 이전 아바타 자동 삭제
    - 업로드 진행 상태 표시

  - **프로필 페이지**:
    - `/customer/profile` - 고객 프로필 페이지
    - `/trainer/profile` - 트레이너 프로필 페이지
    - 프로필 사진 섹션 (좌측)
    - 기본 정보 섹션 (우측)
    - 상세 정보 카드 (하단)

- ✅ **예약 관리 페이지 통일**
  - **Admin 예약 페이지 리팩토링**:
    - 섹션별 분리 → 단일 테이블 구조
    - 필터 컴포넌트 (상태, 타입, 정렬)
    - 실시간 검색 (debounce 150ms)
    - 페이지네이션 (10개/페이지)
    - Pending 예약 노란 배경 강조

  - **Customer 예약 페이지 리팩토링**:
    - 섹션별 분리 → 단일 테이블 구조
    - 필터 컴포넌트 (상태, 타입, 정렬)
    - 실시간 검색 (debounce 150ms)
    - 페이지네이션 (10개/페이지)
    - 통계 카드 유지 (예정/대기/완료/취소)

  - **필터 컴포넌트** (Client Component):
    - BookingFilters (Admin용)
    - CustomerBookingFilters (Customer용)
    - URL searchParams 기반 상태 관리
    - Debounce 검색 (150ms)
    - 필터 변경 시 1페이지로 리셋

- ✅ **SQL 마이그레이션**
  - `11-favorites.sql` - 즐겨찾기 테이블 및 RLS
  - `12-storage-policies.sql` - Storage RLS 정책
- ✅ **고객 대시보드 개선**
  - **추천 예약 카드 추가** (대시보드 최상단):
    - Purple/Pink 그라데이션 배경
    - Sparkles 아이콘 + "AI 맞춤 트레이너 매칭"
    - `/booking/recommended` 링크

  - **트레이너 찾기 카드 수정**:
    - "직접 트레이너 선택" 설명 추가
    - 기존 지정 예약 플로우 유지

  - **트레이너 되기 카드 추가**:
    - Green 그라데이션 배경
    - GraduationCap 아이콘
    - `/customer/become-trainer` 링크

- ✅ **예약 진행 상태 트래커 구현** 🚀 **메이저 기능**
  - **BookingProgressTracker 컴포넌트** (`/components/booking-progress-tracker.tsx`):
    - 배달앱 스타일 스텝 진행 표시
    - 애니메이션 효과 (pulse for current step)
    - 상태별 색상 코딩:
      - 완료: 녹색 (bg-green-500)
      - 진행중: 파란색 + Pulse 애니메이션 (bg-blue-500 animate-pulse)
      - 취소: 빨간색 (bg-red-500)
      - 대기: 회색 (bg-gray-100)

  - **지정 예약 플로우**:
    1. 예약 접수 (Check 아이콘)
    2. 트레이너 확인 중 (Clock 아이콘)
    3. 예약 확정 (CheckCircle 아이콘)
    4. 서비스 준비 완료 (Sparkles 아이콘)

  - **추천 예약 플로우**:
    1. 예약 접수 (Check 아이콘)
    2. 트레이너 매칭 (UserCheck 아이콘)
    3. 트레이너 승인 대기 (Clock 아이콘)
    4. 예약 확정 (CheckCircle 아이콘)
    5. 서비스 준비 완료 (Sparkles 아이콘)

  - **타임스탬프 표시**:
    - 각 단계별 완료 시각 표시
    - 한국어 날짜/시간 포맷
    - 진행중 단계는 시각 미표시

  - **고객 대시보드 통합**:
    - 최근 활성 예약 자동 조회 (status: pending, confirmed, in_progress)
    - 프로그레스 트래커 자동 표시
    - 진행 상태 실시간 반영

- ✅ **자동 승인 시스템 구축** ⚙️
  - **Vercel Cron Job 설정**:
    - `/api/cron/auto-approve/route.ts` API 엔드포인트 생성
    - 10분마다 실행 (`*/10 * * * *`)
    - `vercel.json` 설정 파일 생성

  - **자동 승인 로직**:
    - `admin_matched_at`에서 1시간 경과한 pending 예약 검색
    - status를 'pending' → 'confirmed'로 업데이트
    - 트레이너가 할당된 추천 예약만 대상

  - **데이터베이스 함수 (대체 방안)**:
    - `auto_approve_pending_bookings()` 함수 생성
    - SECURITY DEFINER 권한
    - Supabase pg_cron 활용 가능

- ✅ **SQL 마이그레이션 Idempotency 개선**
  - `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` 패턴
  - `CREATE TABLE IF NOT EXISTS`
  - `DROP POLICY IF EXISTS` before `CREATE POLICY`
  - `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
  - `CREATE INDEX IF NOT EXISTS`
  - 중복 실행 안전성 확보

---

## 📊 현재 구현 완성 상태

### ✅ **완전 구현 완료** (100%)

#### 1. **인증 시스템**
- [x] 이메일/비밀번호 로그인
- [x] 카카오/구글 소셜 로그인 준비
- [x] 회원가입
- [x] 사용자 타입 선택 (고객/트레이너/관리자)
- [x] 로그아웃
- [x] Middleware 기반 라우트 보호

#### 2. **데이터베이스 스키마** - **Day 4 추가 확장** 🔒
- [x] Profiles (사용자 프로필)
- [x] Customers (고객 정보)
- [x] Trainers (트레이너 정보)
- [x] Bookings (예약) - **Day 4: rejection_reason, rejection_note 추가**
- [x] Notifications (알림) - **Day 3: 완전 구현**
- [x] Trainer Availability (트레이너 가용 시간) - **Day 4: 신규**
- [x] RLS 정책 (Row Level Security) - **Day 2 완전 재구축**
- [x] Admin 계정 설정
- [x] Database Trigger (handle_new_user) - **Day 2 검증**
- [x] Auto-approval Function - **Day 5: 신규**

#### 3. **예약 시스템** - **Day 5 완전 구현** ✨
- [x] 예약 생성 폼 (날짜, 시간, 서비스 타입)
- [x] 예약 타입 (지정/추천) - **Day 2**
- [x] 트레이너 승인/거절 시스템 - **Day 4**
- [x] 1시간 거절 윈도우 - **Day 4**
- [x] 자동 승인 시스템 - **Day 5**
- [x] 예약 취소 (고객, 24시간 전 제한)
- [x] 예약 상태 관리 (pending → confirmed → in_progress → completed/cancelled)
- [x] 예약 목록 페이지 (관리자/트레이너/고객)
- [x] 예약 상세 페이지 (트레이너 포함) - **Day 4**
- [x] 예약 진행 상태 트래커 - **Day 5**
- [x] Server Actions로 안전한 상태 변경
- [x] 고객 레코드 자동 생성 - **Day 2**
- [x] 거절 사유 추적 - **Day 4**

#### 4. **알림 시스템** - **Day 3 완전 구현** 🔔
- [x] 실시간 알림 (Supabase Realtime)
- [x] 알림 드롭다운 UI
- [x] 알림 아이콘 배지 (읽지 않은 알림 수)
- [x] 자동 알림 생성 (트레이너 매칭, 추천 예약)
- [x] 알림 설정 (카테고리별 토글)
- [x] 사운드 알림
- [x] 알림 읽음 처리
- [x] 알림 라우팅 (역할별)

#### 5. **트레이너 관리** - **Day 4 추가** 🏋️
- [x] 트레이너 목록 조회
- [x] 트레이너 상세 페이지
- [x] 예약 페이지
- [x] 트레이너 가용 시간 관리 - **Day 4**
- [x] 예약 승인/거절 - **Day 4**
- [x] 취소/거절 예약 조회 - **Day 4**
- [ ] 검색/필터 기능
- [ ] 프로필 편집
- [ ] 리뷰 시스템

#### 6. **Admin 기능** - **Day 2-3 크게 개선** 👨‍💼
- [x] Admin 계정 설정
- [x] Admin 대시보드 기본 구조
- [x] 예약 관리 페이지
- [x] 예약 상세 페이지
- [x] 트레이너 매칭 시스템 - **Day 2**
- [x] 매칭 알고리즘 (7가지 기준) - **Day 2**
- [x] 알림 설정 - **Day 3**
- [ ] 트레이너 승인/거부 기능 완성
- [ ] 통계 대시보드
- [ ] 매출 관리

#### 7. **코드 품질 및 유지보수성** - **Day 5 강화** 🔧
- [x] `/lib/constants.ts` - 상수 중앙화
- [x] `/lib/types.ts` - 타입 정의 중앙화
- [x] `/lib/utils.ts` - 유틸리티 함수 확장
- [x] 코드 중복 제거
- [x] 타입 안정성 향상
- [x] 에러 처리 개선
- [x] SQL Idempotency - **Day 5**

#### 8. **UI 컴포넌트 & 페이지** - **Day 5 개선** 🎨
- [x] Header (로그인 상태 실시간 반영)
- [x] 홈페이지
- [x] 트레이너 목록 페이지
- [x] 트레이너 상세 페이지
- [x] 트레이너 예약 페이지
- [x] Admin 대시보드
- [x] Admin 예약 관리 페이지
- [x] Admin 예약 상세 페이지
- [x] Admin 설정 페이지 - **Day 3**
- [x] Trainer 대시보드
- [x] Trainer 예약 관리 페이지
- [x] Trainer 가용 시간 페이지 - **Day 4**
- [x] Trainer 예약 상세 페이지 - **Day 4**
- [x] Customer 대시보드 - **Day 5 크게 개선**
- [x] Customer 예약 관리 페이지
- [x] 예약 진행 상태 트래커 - **Day 5**
- [x] 알림 드롭다운 - **Day 3**
- [x] shadcn/ui 컴포넌트 일관성 유지
- [x] 예약 카드 컴포넌트 (Trainer/Customer) - **Day 4 클릭 가능**

#### 9. **기술 스택**
- [x] Next.js 15.5.4 (App Router + Server Actions)
- [x] TypeScript (strict mode)
- [x] Supabase (Auth + Database + Realtime + RLS)
- [x] Vercel Cron Jobs - **Day 5**
- [x] Tailwind CSS
- [x] shadcn/ui
- [x] date-fns (날짜 포맷팅)

---

## 🚧 **부분 구현** (50-90%)

### 1. **회원가입 플로우** (80%)
- [x] 사용자 타입 선택
- [x] 고객 프로필 설정 - **Day 2 자동화**
- [x] 트레이너 프로필 설정
- [x] 회원가입 에러 처리 - **Day 2 개선**
- [ ] 이메일 인증
- [ ] 전화번호 인증
- [ ] 신분증 업로드 (트레이너)

---

## ❌ **미구현** (0%)

### 1. **핵심 기능**
- [ ] 이메일/SMS 알림 (사이트 내 알림은 Day 3 완료)
- [ ] 구글 캘린더 연동
- [ ] 결제 시스템 (토스페이먼츠/아임포트)
- [ ] 환불 처리
- [ ] 리뷰 시스템
- [ ] 실시간 채팅/메시징
- [ ] 건강 기록 관리

### 2. **부가 기능**
- [ ] 트레이너 검색/필터
- [ ] 프로그램 상세 페이지
- [x] 즐겨찾기 - **Day 6 완료** ✅
- [ ] 최근 본 트레이너
- [ ] 쿠폰/프로모션

### 3. **관리 기능**
- [ ] 트레이너 승인/거부 완성
- [ ] 매출 통계
- [ ] 사용자 행동 분석
- [ ] 이메일 마케팅
- [ ] CRM 시스템
- [ ] 정산 시스템

---

## 🐛 **해결된 이슈**

### Day 2 이슈

#### 1. ✅ RLS 정책 권한 문제
**문제**: 고객이 다른 고객의 예약을 볼 수 있음, 트레이너가 다른 트레이너의 예약을 수정할 수 있음
**해결**: RLS 정책 완전 재작성
```sql
-- 고객용 정책
CREATE POLICY "고객은 본인 예약만 조회"
ON bookings FOR SELECT TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid()));
```

#### 2. ✅ 트레이너 권한 체크 로직 오류
**문제**: `booking.trainer_id !== user.id` - profile_id와 trainer.id 비교 오류
**해결**: 정확한 ID 비교 (trainer.id 조회 후 비교)

#### 3. ✅ 예약 생성 시 고객 레코드 없음 오류
**문제**: 회원가입 직후 예약 시 customers 테이블에 레코드가 없어서 실패
**해결**: 예약 생성 전 고객 레코드 확인 및 자동 생성

#### 4. ✅ 코드 중복 및 매직 넘버 문제
**문제**: 상수와 타입이 여러 파일에 중복 정의됨
**해결**: `/lib/constants.ts`, `/lib/types.ts`, `/lib/utils.ts` 생성하여 중앙화

### Day 3 이슈

#### 5. ✅ 알림 라우팅 404 오류
**문제**: 알림 클릭 시 잘못된 URL로 이동 (404 에러)
**해결**: 역할별 올바른 라우팅 경로 설정
- 트레이너: `/trainer/bookings/${bookingId}`
- 고객: `/customer/bookings/${bookingId}`
- 관리자: `/admin/bookings/recommended/${bookingId}/match`

#### 6. ✅ 오디오 알림 미작동
**문제**: AudioContext 초기화 타이밍 문제로 사운드 재생 안 됨
**해결**: 사용자 인터랙션(드롭다운 클릭) 후 AudioContext 초기화

### Day 4 이슈

#### 7. ✅ Check Constraint 위반
**문제**: `new row for relation "bookings" violates check constraint "check_recommended_booking"`
**근본 원인**: 추천 예약 + pending 상태 + trainer_id 존재 조합이 제약 위반
**해결**: Check constraint 수정 - 추천 예약에서 trainer_id가 있을 때 모든 status 허용
```sql
ALTER TABLE bookings ADD CONSTRAINT check_recommended_booking CHECK (
  (booking_type = 'direct' AND trainer_id IS NOT NULL) OR
  (booking_type = 'recommended' AND (
    (trainer_id IS NULL AND status = 'pending') OR
    (trainer_id IS NOT NULL)  -- 매칭된 경우 모든 상태 허용
  ))
);
```

#### 8. ✅ SQL 마이그레이션 중복 실행 오류
**문제**: Trigger/Policy/Table 이미 존재 에러
**해결**: Idempotent SQL 패턴 적용
- `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object`
- `CREATE TABLE IF NOT EXISTS`
- `DROP POLICY/TRIGGER IF EXISTS`

### Day 5 이슈

#### 9. ✅ 예약 상세 페이지 거절 버튼 없음
**문제**: 알림으로 상세 페이지 이동했으나 승인/거절 버튼 없음
**해결**: BookingActions 클라이언트 컴포넌트 생성 및 통합

---

## 📋 **향후 개발 플랜**

### **Phase 1: MVP 완성** (Day 6-10)

#### Day 6-7: 리뷰 시스템 구현 🎯 **다음 작업**
- [ ] 리뷰 작성 폼 (별점 + 텍스트)
- [ ] 트레이너 프로필에 리뷰 표시
- [ ] 평균 평점 계산
- [ ] 리뷰 관리 (수정/삭제)

#### Day 8: 트레이너 등록 승인 워크플로우
- [ ] 트레이너 승인/거절 버튼 기능
- [ ] 승인시 알림 발송
- [ ] 거절 사유 입력
- [ ] 트레이너 상태 관리

#### Day 9: 검색 & 필터링 개선
- [ ] 지역별 필터
- [ ] 전문분야 필터
- [ ] 가격대 필터
- [ ] 평점순 정렬
- [ ] 검색 결과 페이지네이션

#### Day 10: 프로필 편집
- [ ] 트레이너 프로필 편집
- [ ] 고객 프로필 편집
- [ ] 아바타 이미지 업로드 (Supabase Storage)
- [ ] 인증서 파일 업로드

---

### **Phase 2: 알림 & 결제 연동** (Day 11-17)

#### Day 11-12: 이메일/SMS 알림
- [ ] Resend.com 이메일 알림
- [ ] SMS 알림 (Twilio or 알리고)
- [ ] 예약 리마인더 (1일 전)

#### Day 13-14: 구글 캘린더 연동
- [ ] Google Calendar API 연동
- [ ] 트레이너 가용 시간 동기화
- [ ] 예약 자동 등록

#### Day 15-17: 결제 시스템
- [ ] 토스페이먼츠 or 아임포트 연동
- [ ] 예약금 결제
- [ ] 결제 내역 관리
- [ ] 환불 처리

---

### **Phase 3: 고급 기능** (Day 18-30)

#### 사용자 경험 개선
- [ ] 실시간 채팅 (1:1)
- [ ] 즐겨찾기 기능
- [ ] 최근 본 트레이너
- [ ] 추천 시스템

#### Admin 고급 기능
- [ ] 매출 분석 대시보드
- [ ] 사용자 행동 분석
- [ ] 정산 시스템
- [ ] 마케팅 도구

---

## 🎯 **우선순위 태스크**

### 🔥 **Day 6 즉시 작업** (추천)
1. **리뷰 시스템 구현**
   - reviews 테이블 마이그레이션
   - 리뷰 작성 폼 컴포넌트
   - 평균 평점 계산 로직
   - 트레이너 프로필 통합

### 📅 **단기 목표 (Day 6-10)**
- [ ] 리뷰 시스템 완성
- [ ] 트레이너 승인 워크플로우
- [ ] 검색/필터 고도화
- [ ] 프로필 편집 기능

### 🚀 **중기 목표 (Day 11-17)**
- [ ] 이메일/SMS 알림
- [ ] 캘린더 연동
- [ ] 결제 시스템

### 🌟 **장기 목표 (Day 18-30)**
- [ ] 실시간 채팅
- [ ] 고급 관리 기능
- [ ] 성능 최적화
- [ ] 정식 런칭 준비

---

## 📈 **진행률 요약**

| 카테고리 | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | 상태 |
|---------|-------|-------|-------|-------|-------|------|
| 인증 시스템 | 100% | 100% | 100% | 100% | 100% | ✅ 완료 |
| 데이터베이스 | 80% | 100% | 100% | 100% | 100% | ✅ 완료 |
| 기본 UI | 100% | 100% | 100% | 100% | 100% | ✅ 완료 |
| **예약 시스템** | 60% | 100% | 100% | 100% | **100%** | ✅ **완료** |
| **알림 시스템** | 0% | 0% | **100%** | 100% | 100% | ✅ **완료** ⬆️ |
| **트레이너 관리** | 60% | 70% | 70% | **90%** | 90% | 🚧 **크게 개선** ⬆️ |
| Admin 기능 | 40% | 70% | 80% | 80% | 80% | 🚧 진행중 |
| 코드 품질 | 40% | 85% | 85% | 90% | **95%** | ✅ **완료** ⬆️ |
| 리뷰 시스템 | 0% | 0% | 0% | 0% | 0% | ❌ 미착수 |
| 결제 시스템 | 0% | 0% | 0% | 0% | 0% | ❌ 미착수 |
| 채팅 시스템 | 0% | 0% | 0% | 0% | 0% | ❌ 미착수 |

**진행률 변화**:
- Day 1: ~50%
- Day 2: ~78% (+28%)
- Day 3: ~82% (+4%)
- Day 4: ~84% (+2%)
- **Day 5: ~85% (+1%)**

### Day 3 주요 성과
- ✅ **실시간 알림 시스템 완전 구현** 🔔
  - Supabase Realtime 연동
  - 알림 드롭다운 UI
  - 자동 알림 생성 (매칭, 예약)
  - 사운드 알림
  - 알림 설정 페이지

### Day 4 주요 성과
- ✅ **트레이너 승인/거절 시스템** 🎯
  - 1시간 거절 윈도우
  - 거절 사유 추적
  - 트레이너 가용 시간 관리
  - 예약 상세 페이지 액션 버튼
- ✅ **취소/거절 예약 표시**
- ✅ **Check Constraint 수정**

### Day 5 주요 성과
- ✅ **예약 진행 상태 트래커** 🚀
  - 배달앱 스타일 UI
  - 단계별 애니메이션
  - 지정/추천 예약 플로우 구분
- ✅ **고객 대시보드 개선**
  - 추천 예약 카드 추가
  - 트레이너 되기 카드 추가
- ✅ **자동 승인 시스템** ⚙️
  - Vercel Cron Job (10분 간격)
  - 1시간 경과 자동 승인
- ✅ **SQL Idempotency 완성**

---

## 📦 **생성/수정된 주요 파일**

### Day 3 파일 (2025-10-05)

#### 🆕 새로 생성된 파일 (Day 3)
```
/components/
  └── notification-dropdown.tsx         # 실시간 알림 드롭다운 UI

/app/(dashboard)/admin/settings/
  └── page.tsx                          # 관리자 알림 설정 페이지

/app/(public)/booking/recommended/
  └── actions.ts                        # 추천 예약 생성 시 알림 발송

/app/(dashboard)/admin/bookings/recommended/[id]/match/
  └── actions.ts                        # 트레이너 매칭 시 알림 발송
```

#### 🔄 수정된 파일 (Day 3)
```
/components/
  └── header.tsx                        # 알림 드롭다운 통합

/lib/
  └── supabase/client.ts               # Realtime 구독 설정
```

### Day 4 파일 (2025-10-06)

#### 🆕 새로 생성된 파일 (Day 4)
```
/supabase/migrations/
  ├── 20251005150000_add_rejection_reasons_and_availability.sql  # 거절 사유 + 가용 시간
  └── 20251005160000_fix_recommended_booking_constraint.sql      # Check Constraint 수정

/app/(dashboard)/trainer/availability/
  ├── page.tsx                          # 가용 시간 관리 페이지
  ├── availability-form.tsx             # 가용 시간 폼 (클라이언트)
  └── actions.ts                        # 가용 시간 CRUD 액션

/app/(dashboard)/trainer/bookings/[id]/
  ├── page.tsx                          # 예약 상세 페이지
  └── booking-actions.tsx               # 승인/거절 버튼 (클라이언트)
```

#### 🔄 수정된 파일 (Day 4)
```
/components/
  └── trainer-booking-card.tsx          # 클릭 가능 + 거절 다이얼로그

/app/(dashboard)/
  ├── admin/bookings/recommended/[id]/match/actions.ts  # pending 상태로 변경
  └── trainer/bookings/
      ├── page.tsx                      # 취소/거절 섹션 추가
      └── actions.ts                    # rejection_reason, rejection_note 추가

/components/ui/
  └── sidebar.tsx                       # "가능 시간" 메뉴 추가 (트레이너)
```

### Day 5 파일 (2025-10-06)

#### 🆕 새로 생성된 파일 (Day 5)
```
/components/
  └── booking-progress-tracker.tsx     # 예약 진행 상태 트래커

/app/api/cron/auto-approve/
  └── route.ts                          # 자동 승인 Cron API

/supabase/migrations/
  └── 20251005170000_auto_approve_bookings.sql  # 자동 승인 함수

/vercel.json                            # Vercel Cron 설정
```

#### 🔄 수정된 파일 (Day 5)
```
/app/(dashboard)/customer/dashboard/
  └── page.tsx                          # 추천 예약 카드 + 프로그레스 트래커 + 트레이너 되기 카드

/supabase/migrations/
  ├── 20251005150000_add_rejection_reasons_and_availability.sql  # Idempotent 패턴 적용
  └── 20251005160000_fix_recommended_booking_constraint.sql      # Idempotent 패턴 적용
```

### Day 2 파일 (2025-10-03)

#### 🆕 새로 생성된 파일 (Day 2)
```
/lib/
  ├── constants.ts                      # 예약 상태, 서비스 타입, 가격 상수, RECOMMENDED_MAX_HOURLY_RATE
  └── types.ts                          # 공통 타입 정의 (BookingStatus, ServiceType 등)

/app/(public)/booking/recommended/
  ├── page.tsx                          # 추천 예약 페이지
  ├── actions.ts                        # 추천 예약 생성 액션
  └── recommended-booking-form.tsx      # 추천 예약 폼

/app/(dashboard)/admin/bookings/recommended/
  ├── page.tsx                          # 매칭 대기 목록
  ├── recommended-booking-card.tsx      # 추천 예약 카드
  └── [id]/match/
      ├── page.tsx                      # 트레이너 매칭 페이지
      ├── actions.ts                    # 매칭 액션
      └── trainer-match-list.tsx        # 트레이너 리스트 (점수 알고리즘)

/components/
  └── booking-type-selector.tsx         # 예약 타입 선택 컴포넌트

/supabase/migrations/
  ├── 20251003_fix_rls_policies.sql    # RLS 정책 완전 재구축
  ├── 20251003_add_booking_types.sql   # 예약 타입 시스템 추가
  └── 20251003_add_admin_rls_policies.sql  # Admin RLS 정책 추가

/docs/
  ├── DAY2_COMPLETION_SUMMARY.md        # Day 2 완료 요약
  └── (업데이트) PROJECT_STATUS.md      # Day 2 작업 내용 반영
```

#### 🔄 수정된 파일 (Day 2)
```
/lib/
  ├── constants.ts                      # RECOMMENDED_MAX_HOURLY_RATE, PRICING 업데이트
  ├── types.ts                          # BookingType, hourly_rate null 추가
  └── utils.ts                          # formatPrice null 처리, 가격 계산 유틸 추가

/app/(public)/
  ├── page.tsx                          # 예약 타입 선택 버튼 추가
  └── trainers/[id]/booking/
      └── actions.ts                    # 고객 레코드 자동 생성, 성공 메시지 추가

/app/(dashboard)/
  ├── trainer/bookings/actions.ts       # 권한 체크 로직 수정
  ├── customer/bookings/page.tsx        # email 필드 추가, 디버그 로그
  └── admin/bookings/recommended/[id]/match/
      ├── page.tsx                      # async params, 예약 수 조회
      ├── trainer-match-list.tsx        # 예산 필터, 부하 분산 점수, 성공 메시지
      └── actions.ts                    # is_verified/is_active, status 업데이트

/app/(auth)/signup/
  └── page.tsx                          # 에러 처리 개선

/components/
  ├── trainer-booking-card.tsx          # 트레이너 이름 클릭 가능
  └── customer-booking-card.tsx         # 조건부 Link, 이름 fallback, 매칭 대기 표시

/docs/
  ├── DATABASE_SCHEMA.md                # RLS 정책, 트리거 문서화
  ├── PROJECT_STATUS.md                 # Day 2 후반 작업 반영
  └── SENIOR_CARE_SERVICE_PLAN.md       # 매칭 알고리즘 업데이트
```

---

## 🔗 **관련 문서**

- [Supabase 문서](https://supabase.com/docs)
- [Next.js 문서](https://nextjs.org/docs)
- [Shadcn/ui 문서](https://ui.shadcn.com/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [date-fns 문서](https://date-fns.org/)

---

## 💡 **Day 2 학습 내용 및 개선사항**

### 기술적 성과
1. **RLS 정책 완전 이해**: 고객/트레이너/관리자 권한 분리 완벽 구현
2. **Database Trigger 검증**: handle_new_user() 함수 동작 원리 이해
3. **Server Actions 오류 처리**: 고객 레코드 자동 생성 로직 추가
4. **코드 구조 개선**: Constants, Types, Utils 중앙화로 유지보수성 향상
5. **타입 안정성**: TypeScript strict mode 활용

### 프로젝트 관리
- 체계적인 버그 수정 프로세스
- 문서화를 통한 지식 공유
- shadcn/ui 일관성 유지

### 배운 점
- RLS 정책 작성 시 서브쿼리를 활용한 권한 체크 방법
- profile_id와 table.id의 차이점 명확히 이해
- 예약 생성 시 고객 레코드 존재 여부 확인의 중요성

---

**마지막 업데이트**: 2025-10-06 (Day 5 완료)
**담당자**: Sean Kim
**프로젝트 상태**: 🚀 빠르게 진행 중 (5일차 85% 달성)
**다음 목표**: 리뷰 시스템 구현 (Day 6-7)

---

## 🎉 Day 3-5 최종 통계

### Day 3 (알림 시스템)
- ✅ **실시간 알림 완전 구현** (Supabase Realtime)
- ✅ **4개의 새 파일** 생성
- ✅ **2개의 파일** 수정
- ✅ **알림 라우팅 404 수정**
- ✅ **오디오 알림 구현**

### Day 4 (트레이너 승인 시스템)
- ✅ **거절 사유 추적 시스템** 구현
- ✅ **트레이너 가용 시간 관리** 구현
- ✅ **1시간 거절 윈도우** 구현
- ✅ **7개의 새 파일** 생성
- ✅ **5개의 파일** 수정
- ✅ **Check Constraint 수정**
- ✅ **SQL Idempotency 적용**

### Day 5 (고객 UX & 자동화)
- ✅ **예약 진행 상태 트래커** 구현 (배달앱 스타일)
- ✅ **자동 승인 시스템** 구축 (Vercel Cron)
- ✅ **고객 대시보드 개선** (3개 새 카드)
- ✅ **4개의 새 파일** 생성
- ✅ **3개의 파일** 수정

### 해결한 기술적 과제 (Day 3-5)
1. ✅ Supabase Realtime 연동
2. ✅ 알림 라우팅 시스템 (역할별)
3. ✅ AudioContext 초기화 타이밍
4. ✅ Check Constraint 위반 수정
5. ✅ SQL 마이그레이션 Idempotency
6. ✅ 1시간 타이머 로직
7. ✅ Vercel Cron 자동화
8. ✅ 배달앱 스타일 프로그레스 UI

### 5일간 진행률 변화
```
Day 1: 50%
Day 2: 78% (+28%)
Day 3: 82% (+4%)
Day 4: 84% (+2%)
Day 5: 85% (+1%)

주요 완성 영역:
- 예약 시스템: 60% → 100% ✅
- 알림 시스템: 0% → 100% ✅
- 트레이너 관리: 60% → 90% 🚧
- 코드 품질: 40% → 95% ✅
```

### 총 구현 통계 (Day 1-5)
- ✅ **40개 이상의 파일** 생성/수정
- ✅ **7개의 마이그레이션** 작성
- ✅ **5개의 주요 시스템** 완성
  1. 예약 타입 시스템 (지정/추천)
  2. 트레이너 매칭 알고리즘 (7가지 기준)
  3. 실시간 알림 시스템
  4. 트레이너 승인/거절 시스템
  5. 예약 진행 상태 트래커
- ✅ **9개의 주요 버그** 해결
- ✅ **3개의 자동화** 구현 (고객 레코드, 알림, 승인)
