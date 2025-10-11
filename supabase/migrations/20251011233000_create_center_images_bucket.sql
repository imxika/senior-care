-- Create storage bucket for center images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'center-images',
  'center-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for center images

-- Anyone can view center images (public bucket)
CREATE POLICY "Anyone can view center images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'center-images');

-- Trainers can upload images for their centers
CREATE POLICY "Trainers can upload center images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'center-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM trainers
      WHERE trainers.profile_id = auth.uid()
    )
  );

-- Trainers can update their own center images
CREATE POLICY "Trainers can update own center images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'center-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM trainers
      WHERE trainers.profile_id = auth.uid()
    )
  );

-- Trainers can delete their own center images
CREATE POLICY "Trainers can delete own center images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'center-images'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM trainers
      WHERE trainers.profile_id = auth.uid()
    )
  );

-- Admins can do everything with center images
CREATE POLICY "Admins can manage all center images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'center-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );
