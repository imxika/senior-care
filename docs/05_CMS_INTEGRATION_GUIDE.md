# 05. CMS 통합 가이드 (Sanity CMS)

**작성일**: 2025-10-09
**버전**: 1.0.0
**상태**: 계획 단계 (미구현)

---

## 📋 목차

- [개요](#-개요)
- [역할 분리 전략](#-역할-분리-전략)
- [Sanity CMS 구조](#-sanity-cms-구조)
- [구현 가이드](#-구현-가이드)
- [통합 예시](#-통합-예시)
- [배포 및 운영](#-배포-및-운영)

---

## 🎯 개요

### 목적

Senior Care 플랫폼은 **운영 데이터**와 **마케팅 콘텐츠**를 분리하여 관리합니다:

- **Supabase**: 실시간 운영 데이터 (예약, 사용자, 결제, 리뷰)
- **Sanity CMS**: 마케팅 콘텐츠 (웹사이트 텍스트, 이벤트, 블로그)

### 통합 시점

```
Phase 1: MVP 런칭 (Supabase만 사용)
  ↓ (1-2주 운영, 사용자 피드백 수집)
Phase 2: MVP 완성 (UI/UX 개선)
  ↓ (안정화)
Phase 3: CMS 통합 (마케팅 강화)
```

**현재 상태**: Phase 1 (Supabase 98% 완성)

---

## ⚖️ 역할 분리 전략

### Supabase (운영 데이터 100%)

| 데이터 타입 | 테이블 | 이유 |
|------------|--------|------|
| **사용자 인증** | `auth.users`, `profiles` | 보안, RLS |
| **트레이너 정보** | `trainers` | 실시간 평점, 가격, 예약 연동 |
| **고객 정보** | `customers` | 개인정보, 건강 기록 |
| **예약 시스템** | `bookings`, `trainer_availability` | 실시간 업데이트, 트랜잭션 |
| **리뷰 시스템** | `reviews` | 실시간 평점 계산, 신뢰성 |
| **알림** | `notifications` | 실시간 Realtime 연동 |
| **즐겨찾기** | `favorites` | 실시간 상태 변경 |

**핵심**: 트레이너 관련 데이터는 모두 Supabase에서 완결

---

### Sanity CMS (마케팅 & 정적 콘텐츠)

| 데이터 타입 | 스키마 | 업데이트 빈도 | 담당자 |
|------------|--------|--------------|--------|
| **웹사이트 텍스트** | `homePage`, `pageSettings` | 주 1-2회 | 마케터 |
| **이벤트/프로모션** | `event`, `promotion` | 수시 | 마케터 |
| **블로그/뉴스** | `article` | 주 1-3회 | 콘텐츠 팀 |
| **FAQ** | `faq` | 월 1-2회 | CS 팀 |
| **정적 페이지** | `page` | 분기 1회 | 법무/마케팅 |

**핵심**: 개발자 없이 수정 가능한 콘텐츠

---

## 🏗 Sanity CMS 구조

### 프로젝트 정보

```env
# .env.local
NEXT_PUBLIC_SANITY_PROJECT_ID=8cpnsqoc
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=skFyvAKpptJQKDL3MJPd...
```

### 스키마 구성

```
sanity-studio/schemas/senior-care/
├── index.ts                    # 스키마 모음
├── homePage.ts                 # 홈페이지 섹션
├── pageSettings.ts             # 글로벌 설정
├── event.ts                    # 이벤트/프로모션 (기존)
├── promotion.ts                # 쿠폰/할인
├── article.ts                  # 블로그 글
├── faq.ts                      # FAQ
└── page.ts                     # 범용 정적 페이지

❌ 삭제:
├── trainerProfile.ts           # → Supabase trainers 테이블로 통합
└── program.ts                  # → Supabase programs 테이블로 통합
```

---

## 📐 스키마 상세 정의

### 1. homePage (홈페이지)

```typescript
// sanity-studio/schemas/senior-care/homePage.ts
export default {
  name: 'homePage',
  title: '홈페이지',
  type: 'document',
  fields: [
    // Hero Section
    {
      name: 'hero',
      title: 'Hero 섹션',
      type: 'object',
      fields: [
        {
          name: 'title',
          title: '메인 타이틀',
          type: 'string',
          description: '예: 시니어를 위한 맞춤 재활 트레이닝',
        },
        {
          name: 'subtitle',
          title: '서브 타이틀',
          type: 'text',
          rows: 2,
          description: '예: 전문 트레이너와 함께하는 건강한 노후',
        },
        {
          name: 'ctaText',
          title: 'CTA 버튼 텍스트',
          type: 'string',
          initialValue: '무료 상담 신청',
        },
        {
          name: 'ctaLink',
          title: 'CTA 링크',
          type: 'string',
          initialValue: '/booking/recommended',
        },
        {
          name: 'backgroundImage',
          title: '배경 이미지',
          type: 'image',
          options: { hotspot: true },
        },
      ],
    },

    // Features Section
    {
      name: 'features',
      title: '주요 기능',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'icon',
              title: 'Lucide 아이콘명',
              type: 'string',
              description: '예: user-check, home, calendar',
            },
            {
              name: 'title',
              title: '제목',
              type: 'string',
            },
            {
              name: 'description',
              title: '설명',
              type: 'text',
              rows: 3,
            },
          ],
          preview: {
            select: {
              title: 'title',
              subtitle: 'description',
            },
          },
        },
      ],
    },

    // Stats Section
    {
      name: 'stats',
      title: '통계 (숫자 강조)',
      type: 'object',
      fields: [
        {
          name: 'trainersCount',
          title: '트레이너 수',
          type: 'string',
          description: '예: 50+',
        },
        {
          name: 'customersCount',
          title: '고객 수',
          type: 'string',
          description: '예: 500+',
        },
        {
          name: 'satisfactionRate',
          title: '만족도',
          type: 'string',
          description: '예: 98%',
        },
      ],
    },

    // Testimonials Section
    {
      name: 'testimonials',
      title: '고객 후기 (선별)',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', type: 'string', title: '이름' },
            { name: 'age', type: 'string', title: '나이', description: '예: 70대' },
            { name: 'comment', type: 'text', title: '후기', rows: 3 },
            { name: 'rating', type: 'number', title: '평점' },
            { name: 'image', type: 'image', title: '프로필 사진' },
          ],
        },
      ],
    },
  ],
}
```

---

### 2. event (이벤트/프로모션)

```typescript
// sanity-studio/schemas/senior-care/event.ts
export default {
  name: 'event',
  title: '이벤트',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: '제목',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'description',
      title: '설명',
      type: 'text',
      rows: 3,
    },
    {
      name: 'bannerImage',
      title: '배너 이미지',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'startDate',
      title: '시작일',
      type: 'datetime',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'endDate',
      title: '종료일',
      type: 'datetime',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'isActive',
      title: '활성화',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'displayLocation',
      title: '표시 위치',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: '홈페이지', value: 'homepage' },
          { title: '예약 페이지', value: 'booking' },
          { title: '팝업', value: 'popup' },
        ],
      },
    },
    {
      name: 'ctaText',
      title: 'CTA 버튼 텍스트',
      type: 'string',
    },
    {
      name: 'ctaLink',
      title: 'CTA 링크',
      type: 'string',
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
      media: 'bannerImage',
    },
  },
}
```

---

### 3. faq (자주 묻는 질문)

```typescript
// sanity-studio/schemas/senior-care/faq.ts
export default {
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  fields: [
    {
      name: 'question',
      title: '질문',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'answer',
      title: '답변',
      type: 'text',
      rows: 4,
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'category',
      title: '카테고리',
      type: 'string',
      options: {
        list: [
          { title: '예약', value: 'booking' },
          { title: '결제', value: 'payment' },
          { title: '트레이너', value: 'trainer' },
          { title: '서비스', value: 'service' },
        ],
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'order',
      title: '순서',
      type: 'number',
      description: '낮은 숫자일수록 먼저 표시',
      initialValue: 0,
    },
  ],
  preview: {
    select: {
      title: 'question',
      subtitle: 'category',
    },
  },
}
```

---

### 4. article (블로그)

```typescript
// sanity-studio/schemas/senior-care/article.ts
export default {
  name: 'article',
  title: '블로그 글',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: '제목',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'category',
      title: '카테고리',
      type: 'string',
      options: {
        list: [
          { title: '건강 정보', value: 'health-tips' },
          { title: '운동 가이드', value: 'exercise-guide' },
          { title: '성공 사례', value: 'success-stories' },
          { title: '회사 소식', value: 'company-news' },
        ],
      },
    },
    {
      name: 'author',
      title: '작성자',
      type: 'string',
      initialValue: '시니어케어 편집팀',
    },
    {
      name: 'publishedAt',
      title: '게시 날짜',
      type: 'datetime',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'thumbnail',
      title: '썸네일',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'excerpt',
      title: '요약',
      type: 'text',
      rows: 3,
      description: '목록에 표시될 짧은 요약',
    },
    {
      name: 'content',
      title: '본문',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  {
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                  },
                ],
              },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
        },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category',
      media: 'thumbnail',
    },
  },
}
```

---

### 5. page (범용 정적 페이지)

```typescript
// sanity-studio/schemas/senior-care/page.ts
export default {
  name: 'page',
  title: '정적 페이지',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: '페이지 제목',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'content',
      title: '본문',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current',
    },
  },
}
```

---

### 6. pageSettings (글로벌 설정)

```typescript
// sanity-studio/schemas/senior-care/pageSettings.ts
export default {
  name: 'pageSettings',
  title: '페이지 설정',
  type: 'document',
  fields: [
    {
      name: 'siteName',
      title: '사이트명',
      type: 'string',
      initialValue: '시니어케어',
    },
    {
      name: 'siteDescription',
      title: '사이트 설명',
      type: 'text',
      rows: 2,
    },
    {
      name: 'logo',
      title: '로고',
      type: 'image',
    },
    {
      name: 'footer',
      title: 'Footer',
      type: 'object',
      fields: [
        {
          name: 'copyright',
          title: 'Copyright',
          type: 'string',
          initialValue: '© 2025 시니어케어. All rights reserved.',
        },
        {
          name: 'links',
          title: '링크',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'label', type: 'string', title: '라벨' },
                { name: 'url', type: 'string', title: 'URL' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
```

---

### index.ts (스키마 모음)

```typescript
// sanity-studio/schemas/senior-care/index.ts
import homePage from './homePage'
import pageSettings from './pageSettings'
import event from './event'
import faq from './faq'
import article from './article'
import page from './page'

export const seniorCareSchemas = [
  homePage,
  pageSettings,
  event,
  faq,
  article,
  page,
]
```

---

## 🔧 구현 가이드

### Step 1: 패키지 설치

```bash
cd /Users/seankim/Documents/VScode/_2025/senior-care

npm install @sanity/client @sanity/image-url
npm install --save-dev @sanity/types
```

---

### Step 2: Sanity 클라이언트 설정

```typescript
// lib/sanity-client.ts
import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  useCdn: true, // 프로덕션에서 CDN 사용
})

// 이미지 URL 빌더
const builder = imageUrlBuilder(sanityClient)

export function urlFor(source: any) {
  return builder.image(source)
}
```

---

### Step 3: GROQ 쿼리 함수

```typescript
// lib/queries/sanity.ts
import { groq } from 'next-sanity'

// 홈페이지 콘텐츠
export const homePageQuery = groq`
  *[_type == "homePage"][0] {
    hero,
    features,
    stats,
    testimonials
  }
`

// 활성 이벤트 조회
export const activeEventsQuery = groq`
  *[_type == "event"
    && isActive == true
    && startDate <= $now
    && endDate >= $now
    && $location in displayLocation
  ] | order(startDate desc)
`

// FAQ 조회
export const faqQuery = groq`
  *[_type == "faq"] | order(category, order) {
    question,
    answer,
    category
  }
`

// 블로그 목록
export const articlesQuery = groq`
  *[_type == "article"] | order(publishedAt desc) [0...10] {
    _id,
    title,
    slug,
    category,
    publishedAt,
    thumbnail,
    excerpt
  }
`

// 블로그 상세
export const articleQuery = groq`
  *[_type == "article" && slug.current == $slug][0] {
    title,
    category,
    author,
    publishedAt,
    content,
    thumbnail
  }
`

// 정적 페이지
export const pageQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    title,
    content
  }
`

// 글로벌 설정
export const settingsQuery = groq`
  *[_type == "pageSettings"][0] {
    siteName,
    siteDescription,
    logo,
    footer
  }
`
```

---

### Step 4: 타입 정의

```typescript
// types/sanity.ts
export interface HomePage {
  hero: {
    title: string
    subtitle: string
    ctaText: string
    ctaLink: string
    backgroundImage?: any
  }
  features: Array<{
    icon: string
    title: string
    description: string
  }>
  stats: {
    trainersCount: string
    customersCount: string
    satisfactionRate: string
  }
  testimonials?: Array<{
    name: string
    age: string
    comment: string
    rating: number
    image?: any
  }>
}

export interface Event {
  _id: string
  title: string
  description: string
  bannerImage?: any
  startDate: string
  endDate: string
  isActive: boolean
  displayLocation: string[]
  ctaText?: string
  ctaLink?: string
}

export interface FAQ {
  question: string
  answer: string
  category: string
}

export interface Article {
  _id: string
  title: string
  slug: { current: string }
  category: string
  author: string
  publishedAt: string
  thumbnail?: any
  excerpt: string
  content?: any[]
}

export interface Page {
  title: string
  content: any[]
}

export interface PageSettings {
  siteName: string
  siteDescription: string
  logo?: any
  footer: {
    copyright: string
    links: Array<{
      label: string
      url: string
    }>
  }
}
```

---

## 💡 통합 예시

### 1. 홈페이지 Hero 섹션

```typescript
// app/(public)/page.tsx
import { sanityClient, urlFor } from '@/lib/sanity-client'
import { homePageQuery } from '@/lib/queries/sanity'
import type { HomePage } from '@/types/sanity'

export default async function HomePage() {
  // Sanity: 마케팅 콘텐츠
  const content = await sanityClient.fetch<HomePage>(homePageQuery)

  // Supabase: 실시간 통계 (선택사항)
  const { data: realStats } = await supabase.rpc('get_homepage_stats')

  return (
    <div>
      {/* Hero Section */}
      <section
        className="hero relative h-screen bg-cover bg-center"
        style={{
          backgroundImage: content.hero.backgroundImage
            ? `url(${urlFor(content.hero.backgroundImage).url()})`
            : undefined
        }}
      >
        <div className="hero-content">
          <h1 className="text-5xl font-bold">{content.hero.title}</h1>
          <p className="text-xl mt-4">{content.hero.subtitle}</p>
          <Link
            href={content.hero.ctaLink}
            className="btn btn-primary mt-8"
          >
            {content.hero.ctaText}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="features py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {content.features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="stats bg-primary text-white py-16">
        <div className="grid grid-cols-3 gap-8">
          <Stat
            label="트레이너"
            value={realStats?.trainers || content.stats.trainersCount}
          />
          <Stat
            label="고객"
            value={realStats?.customers || content.stats.customersCount}
          />
          <Stat
            label="만족도"
            value={content.stats.satisfactionRate}
          />
        </div>
      </section>
    </div>
  )
}
```

---

### 2. 이벤트 배너 컴포넌트

```typescript
// components/event-banner.tsx
import { sanityClient, urlFor } from '@/lib/sanity-client'
import { activeEventsQuery } from '@/lib/queries/sanity'
import type { Event } from '@/types/sanity'
import Link from 'next/link'

interface Props {
  location: 'homepage' | 'booking' | 'popup'
}

export async function EventBanner({ location }: Props) {
  const now = new Date().toISOString()

  const events = await sanityClient.fetch<Event[]>(
    activeEventsQuery,
    { now, location }
  )

  if (!events || events.length === 0) return null

  const event = events[0] // 최신 이벤트 1개만

  return (
    <div className="event-banner bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg">
      {event.bannerImage && (
        <img
          src={urlFor(event.bannerImage).width(800).url()}
          alt={event.title}
          className="w-full h-48 object-cover rounded-md mb-4"
        />
      )}
      <h3 className="text-2xl font-bold text-white">{event.title}</h3>
      <p className="text-white/90 mt-2">{event.description}</p>
      {event.ctaLink && (
        <Link
          href={event.ctaLink}
          className="btn btn-white mt-4 inline-block"
        >
          {event.ctaText || '자세히 보기'}
        </Link>
      )}
    </div>
  )
}

// 사용
// app/(public)/page.tsx
<EventBanner location="homepage" />

// app/(public)/trainers/[id]/booking/page.tsx
<EventBanner location="booking" />
```

---

### 3. FAQ 페이지

```typescript
// app/(public)/faq/page.tsx
import { sanityClient } from '@/lib/sanity-client'
import { faqQuery } from '@/lib/queries/sanity'
import type { FAQ } from '@/types/sanity'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const CATEGORY_LABELS = {
  booking: '예약',
  payment: '결제',
  trainer: '트레이너',
  service: '서비스',
}

export default async function FAQPage() {
  const faqs = await sanityClient.fetch<FAQ[]>(faqQuery)

  // 카테고리별 그룹화
  const grouped = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = []
    acc[faq.category].push(faq)
    return acc
  }, {} as Record<string, FAQ[]>)

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">자주 묻는 질문</h1>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
          </h2>

          <Accordion type="single" collapsible className="w-full">
            {items.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  )
}
```

---

### 4. 블로그 목록 페이지

```typescript
// app/(public)/blog/page.tsx
import { sanityClient, urlFor } from '@/lib/sanity-client'
import { articlesQuery } from '@/lib/queries/sanity'
import type { Article } from '@/types/sanity'
import Link from 'next/link'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function BlogPage() {
  const articles = await sanityClient.fetch<Article[]>(articlesQuery)

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">건강 정보 블로그</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {articles.map((article) => (
          <Link
            key={article._id}
            href={`/blog/${article.slug.current}`}
            className="group"
          >
            <article className="border rounded-lg overflow-hidden hover:shadow-lg transition">
              {article.thumbnail && (
                <img
                  src={urlFor(article.thumbnail).width(400).url()}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <span className="text-sm text-primary">{article.category}</span>
                <h2 className="text-xl font-bold mt-2 group-hover:text-primary">
                  {article.title}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {article.excerpt}
                </p>
                <time className="text-sm text-muted-foreground mt-4 block">
                  {format(new Date(article.publishedAt), 'PPP', { locale: ko })}
                </time>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

---

### 5. 블로그 상세 페이지

```typescript
// app/(public)/blog/[slug]/page.tsx
import { sanityClient } from '@/lib/sanity-client'
import { articleQuery } from '@/lib/queries/sanity'
import type { Article } from '@/types/sanity'
import { PortableText } from '@portabletext/react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  const article = await sanityClient.fetch<Article>(articleQuery, { slug })

  if (!article) {
    return <div>글을 찾을 수 없습니다.</div>
  }

  return (
    <div className="container mx-auto py-12 max-w-3xl">
      <article>
        <header className="mb-8">
          <span className="text-primary text-sm">{article.category}</span>
          <h1 className="text-4xl font-bold mt-2">{article.title}</h1>
          <div className="flex items-center gap-4 mt-4 text-muted-foreground">
            <span>{article.author}</span>
            <span>•</span>
            <time>
              {format(new Date(article.publishedAt), 'PPP', { locale: ko })}
            </time>
          </div>
        </header>

        <div className="prose prose-lg max-w-none">
          <PortableText value={article.content} />
        </div>
      </article>
    </div>
  )
}
```

---

## 🚀 배포 및 운영

### Sanity Studio 배포

```bash
# 1. Sanity Studio 배포
cd /Users/seankim/Documents/VScode/_2025/sanity-studio
npm run deploy

# 배포 URL: https://seankim.sanity.studio (예시)
```

---

### Next.js 환경 변수 (Vercel)

```env
# Vercel 환경 변수 설정
NEXT_PUBLIC_SANITY_PROJECT_ID=8cpnsqoc
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=skFyvAKpptJQKDL3MJPd...
```

---

### ISR (Incremental Static Regeneration)

```typescript
// 정적 페이지 리밸리데이션
export const revalidate = 3600 // 1시간마다 재생성

// 또는 On-Demand Revalidation
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const { path } = await request.json()
  revalidatePath(path)
  return Response.json({ revalidated: true })
}
```

---

### Sanity Webhooks (자동 재배포)

```typescript
// Sanity Studio → Webhook 설정
// URL: https://your-site.com/api/revalidate
// Events: create, update, delete
// Dataset: production

// app/api/sanity-webhook/route.ts
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const body = await request.json()

  // 변경된 문서 타입에 따라 재검증
  switch (body._type) {
    case 'homePage':
      revalidatePath('/')
      break
    case 'event':
      revalidatePath('/')
      revalidatePath('/booking/recommended')
      break
    case 'article':
      revalidatePath('/blog')
      revalidatePath(`/blog/${body.slug.current}`)
      break
    // ...
  }

  return Response.json({ success: true })
}
```

---

## 📅 구현 타임라인

### Phase 1: 기본 연동 (1-2일)

```yaml
Day 1:
  - Sanity 스키마 정리 (기존 삭제, 신규 추가)
  - Sanity 클라이언트 설정
  - 기본 쿼리 함수 작성
  - 타입 정의

Day 2:
  - 홈페이지 Hero 섹션 연동
  - 이벤트 배너 컴포넌트
  - 테스트 데이터 입력
```

---

### Phase 2: 정적 페이지 (1일)

```yaml
Day 3:
  - FAQ 페이지 구현
  - About 페이지 (page 스키마 활용)
  - Terms/Privacy 페이지
  - Footer 링크 연동
```

---

### Phase 3: 블로그 (2-3일, 선택)

```yaml
Day 4-5:
  - Article 스키마 완성
  - 블로그 목록 페이지
  - 블로그 상세 페이지
  - SEO 메타데이터
  - 카테고리 필터

Day 6 (선택):
  - 검색 기능
  - 관련 글 추천
  - 소셜 공유 버튼
```

---

## ✅ 체크리스트

### 구현 전

- [ ] Sanity 프로젝트 접근 확인
- [ ] 환경 변수 설정 확인
- [ ] 기존 스키마 백업

### 구현 중

- [ ] Sanity 클라이언트 설정
- [ ] 스키마 작성 (homePage, event, faq, article, page)
- [ ] GROQ 쿼리 작성
- [ ] 타입 정의
- [ ] 컴포넌트 통합

### 구현 후

- [ ] Sanity Studio 배포
- [ ] 테스트 데이터 입력
- [ ] 프로덕션 테스트
- [ ] Webhook 설정 (자동 재배포)
- [ ] 문서화

---

## 🔗 참고 자료

- [Sanity Docs](https://www.sanity.io/docs)
- [Next.js + Sanity Guide](https://www.sanity.io/guides/nextjs-app-router)
- [GROQ Query Cheat Sheet](https://www.sanity.io/docs/query-cheat-sheet)
- [Portable Text React](https://github.com/portabletext/react-portabletext)

---

**작성자**: Claude Code (Sean Kim 요청)
**최종 수정**: 2025-10-09
**다음 업데이트**: CMS 통합 시작 시점
