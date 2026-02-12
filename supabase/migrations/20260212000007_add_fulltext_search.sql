-- Phase 7: Search Functionality - Database Setup
-- Run this in Supabase SQL Editor

-- 1. Drop existing search_vector column if it exists (in case it was created as generated)
ALTER TABLE messages DROP COLUMN IF EXISTS search_vector;

-- 2. Add search_vector column for full-text search (regular column, not generated)
ALTER TABLE messages ADD COLUMN search_vector tsvector;

-- 2. Create function to update search vector
CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.original_text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.translated_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to automatically update search_vector on insert/update
DROP TRIGGER IF EXISTS messages_search_vector_trigger ON messages;
CREATE TRIGGER messages_search_vector_trigger
  BEFORE INSERT OR UPDATE OF original_text, translated_text
  ON messages
  FOR EACH ROW
  EXECUTE FUNCTION messages_search_vector_update();

-- 4. Update all existing messages with search vectors
UPDATE messages 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(original_text, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(translated_text, '')), 'B');

-- 5. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS messages_search_vector_idx 
  ON messages 
  USING GIN (search_vector);

-- 6. Create index on conversation_id for faster filtering
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_idx 
  ON messages (conversation_id, created_at DESC);

-- Verify setup
SELECT 
  'search_vector column exists' as check_type,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'search_vector'
  ) as status;

SELECT 
  'search_vector index exists' as check_type,
  EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'messages' 
    AND indexname = 'messages_search_vector_idx'
  ) as status;

-- Test search (should return messages matching 'hello')
SELECT 
  id, 
  original_text, 
  translated_text,
  ts_rank(search_vector, to_tsquery('english', 'hello')) as rank
FROM messages
WHERE search_vector @@ to_tsquery('english', 'hello')
ORDER BY rank DESC
LIMIT 5;
