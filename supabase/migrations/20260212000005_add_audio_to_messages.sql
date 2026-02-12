-- Add audio_url column to messages table for voice messages
ALTER TABLE messages ADD COLUMN audio_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN messages.audio_url IS 'URL to audio recording stored in Supabase Storage';
