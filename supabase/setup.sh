#!/bin/bash
# Supabase 데이터베이스 설정 스크립트

echo "🚀 Supabase 데이터베이스 설정 시작..."

# Supabase CLI 설치 확인
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI가 설치되어 있지 않습니다."
    echo "📦 설치: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI 확인 완료"

# 프로젝트 링크 (이미 링크되어 있으면 스킵)
echo "🔗 Supabase 프로젝트 링크 중..."
supabase link --project-ref dwyfxngmkhrqffnxdbcj

# 데이터베이스 스키마 적용
echo "📊 데이터베이스 스키마 적용 중..."
supabase db push --db-url "postgresql://postgres.dwyfxngmkhrqffnxdbcj:XyRt7cU0sGECsI4i@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

# RLS 정책 적용
echo "🔒 Row Level Security 정책 적용 중..."
psql "postgresql://postgres.dwyfxngmkhrqffnxdbcj:XyRt7cU0sGECsI4i@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres" < supabase/policies.sql

echo "✅ 데이터베이스 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. TypeScript 타입 생성: npm run db:types"
echo "2. 개발 서버 실행: npm run dev"
