-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-messages', 'audio-messages', true);

-- Set up RLS policies for audio-messages bucket
-- Allow authenticated users to upload audio files for their conversations
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
CREATE POLICY "Users can view audio from their conversations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-messages'
  AND (storage.foldername(name))[1] IN (
    SELECT conversation_id::text 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete audio files from their conversations
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
