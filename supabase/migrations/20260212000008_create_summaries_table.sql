-- Phase 8: AI Summary Generation - Database Setup
-- Run this in Supabase SQL Editor

-- 0. Drop existing table if it exists (in case of previous failed attempts)
DROP TABLE IF EXISTS summaries CASCADE;

-- 1. Create summaries table
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Summary content (structured JSON)
  overall_summary TEXT NOT NULL,
  symptoms TEXT[] DEFAULT '{}',
  diagnoses TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  follow_up_actions TEXT[] DEFAULT '{}',
  patient_concerns TEXT[] DEFAULT '{}',
  doctor_recommendations TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS summaries_conversation_id_idx ON summaries(conversation_id);
CREATE INDEX IF NOT EXISTS summaries_created_at_idx ON summaries(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Users can read summaries for their conversations
CREATE POLICY "Users can view summaries for their conversations"
  ON summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = summaries.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Only doctors can generate summaries
CREATE POLICY "Doctors can create summaries"
  ON summaries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'doctor'
    )
    AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = summaries.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Users can update their own summaries
CREATE POLICY "Users can update their summaries"
  ON summaries
  FOR UPDATE
  USING (summaries.generated_by = auth.uid())
  WITH CHECK (summaries.generated_by = auth.uid());

-- Users can delete their summaries
CREATE POLICY "Users can delete their summaries"
  ON summaries
  FOR DELETE
  USING (summaries.generated_by = auth.uid());

-- 5. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER summaries_updated_at_trigger
  BEFORE UPDATE ON summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_summaries_updated_at();

-- Verify setup
SELECT 
  'summaries table exists' as check_type,
  EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'summaries'
  ) as status;

SELECT 
  'summaries RLS enabled' as check_type,
  relrowsecurity as status
FROM pg_class
WHERE relname = 'summaries';
