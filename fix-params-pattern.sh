#!/bin/bash

# Next.js 15 params Promise 패턴 자동 수정 스크립트
# 사용법: bash fix-params-pattern.sh

echo "🔧 Fixing Next.js 15 params pattern..."
echo ""

# API route 파일들 찾기
find app/api -type f -name "route.ts" | while read file; do
  if grep -q "params.*:" "$file"; then
    echo "📝 Fixing: $file"

    # route handler params pattern 수정
    # From: ({ params }: { params: { id: string } })
    # To: ({ params }: { params: Promise<{ id: string }> })
    sed -i '' 's/params: { params: \([^}]*\) }/params: { params: Promise<\1> }/g' "$file"

    echo "   ✅ Updated params type to Promise"
  fi
done

echo ""
echo "✅ Done! Now you need to add 'await params' in the function body manually."
echo "   Example: const { id } = await params"
