-- Add is_hidden column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden ON reviews(is_hidden);
