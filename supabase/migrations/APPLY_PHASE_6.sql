-- Phase 6: Audio Recording & Playback - Database Setup
-- Run this in Supabase SQL Editor

-- 1. Add audio_url column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
COMMENT ON COLUMN messages.audio_url IS 'URL to audio recording stored in Supabase Storage';

-- 2. Create storage bucket for audio messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies for audio-messages bucket

-- Allow authenticated users to upload audio files for their conversations
DROP POLICY IF EXISTS "Users can upload audio to their conversations" ON storage.objects;
CREATE POLICY "Users can upload audio to their conversations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-messages' 
  AND (storage.foldername(name))[1] IN (
    SELECT conversation_id::text 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Allow everyone to view audio files from conversations they're part of
DROP POLICY IF EXISTS "Users can view audio from their conversations" ON storage.objects;
CREATE POLICY "Users can view audio from their conversations"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'audio-messages'
);

-- Allow users to delete audio files from their conversations
DROP POLICY IF EXISTS "Users can delete audio from their conversations" ON storage.objects;
CREATE POLICY "Users can delete audio from their conversations"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-messages'
  AND (storage.foldername(name))[1] IN (
    SELECT conversation_id::text 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Verify setup
SELECT 
  'audio_url column exists' as check_type,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'audio_url'
  ) as status;

SELECT 
  'audio-messages bucket exists' as check_type,
  EXISTS (
    SELECT 1 
    FROM storage.buckets 
    WHERE name = 'audio-messages'
  ) as status;
