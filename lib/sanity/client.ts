import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '8cpnsqoc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true, // CDN 사용 (빠른 읽기)
})

// Write 권한이 필요한 경우 (서버 사이드만)
export const sanityWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '8cpnsqoc',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN, // .env.local에 추가 필요
  useCdn: false,
})

// 이미지 URL 빌더
const builder = imageUrlBuilder(sanityClient)

export function urlFor(source: any) {
  return builder.image(source)
}
