-- Add max_group_size column to trainers table (1:1, 1:2, 1:3 sessions only)
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS max_group_size INTEGER DEFAULT 1 CHECK (max_group_size >= 1 AND max_group_size <= 3);

-- Update existing trainers to have default value
UPDATE trainers SET max_group_size = 1 WHERE max_group_size IS NULL;
