import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // FormData 파싱
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucketName = formData.get('bucketName') as string
    const folder = formData.get('folder') as string || ''

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다' },
        { status: 400 }
      )
    }

    if (!bucketName) {
      return NextResponse.json(
        { error: '버킷 이름이 없습니다' },
        { status: 400 }
      )
    }

    // 파일 크기 체크 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 5MB 이하여야 합니다' },
        { status: 400 }
      )
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '이미지 파일만 업로드 가능합니다' },
        { status: 400 }
      )
    }

    // 파일명 생성 (UUID + 확장자)
    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = folder ? `${folder}/${fileName}` : fileName

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다' },
        { status: 500 }
      )
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return NextResponse.json({
      url: urlData.publicUrl,
      path: data.path,
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// 이미지 삭제 API
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')
    const bucketName = searchParams.get('bucketName')

    if (!path || !bucketName) {
      return NextResponse.json(
        { error: '경로 또는 버킷 이름이 없습니다' },
        { status: 400 }
      )
    }

    // Storage에서 삭제
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path])

    if (error) {
      console.error('Storage delete error:', error)
      return NextResponse.json(
        { error: '파일 삭제에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
