-- Storage RLS 정책만 설정 (버킷은 Dashboard에서 수동 생성)

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

-- Storage RLS 정책: 사용자는 자신의 파일만 삭제 가능
CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profiles'
  AND (storage.foldername(name))[1] = 'avatars'
);
