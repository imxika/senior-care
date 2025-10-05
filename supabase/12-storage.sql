-- Storage 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profiles',
  'profiles',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 정책: 누구나 프로필 사진 조회 가능
CREATE POLICY "Public profiles are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profiles');

-- Storage RLS 정책: 인증된 사용자는 업로드 가능
CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Storage RLS 정책: 사용자는 자신의 파일만 수정 가능
CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.filename(name))::text
);

-- Storage RLS 정책: 사용자는 자신의 파일만 삭제 가능
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
);

COMMENT ON COLUMN storage.buckets.id IS 'profiles 버킷: 사용자 프로필 사진 저장';
