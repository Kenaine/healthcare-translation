-- Remove guest session support from conversation_participants
-- This migration makes user_id required and removes guest session columns

-- STEP 1: First drop the policies that depend on guest_session_id
DROP POLICY IF EXISTS "Participants can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages in their conversations" ON public.messages;

-- STEP 2: Create new policies without guest session checks
CREATE POLICY "Participants can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages in their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- STEP 3: Now we can safely drop the guest_session_id column
ALTER TABLE public.conversation_participants 
DROP CONSTRAINT IF EXISTS user_or_guest_check;

-- Delete any guest participants (if any exist)
DELETE FROM public.conversation_participants WHERE user_id IS NULL;

ALTER TABLE public.conversation_participants 
DROP COLUMN IF EXISTS guest_session_id;

-- STEP 4: Make user_id NOT NULL
ALTER TABLE public.conversation_participants 
ALTER COLUMN user_id SET NOT NULL;

-- STEP 5: Remove guest session related policies and table
DROP POLICY IF EXISTS "Conversation creators can view guest sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "Conversation creators can create guest sessions" ON public.guest_sessions;

-- Drop the guest_sessions table
DROP TABLE IF EXISTS public.guest_sessions CASCADE;

