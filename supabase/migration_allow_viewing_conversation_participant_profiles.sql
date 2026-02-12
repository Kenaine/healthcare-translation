-- Allow users to view profiles of other participants in their conversations
-- This enables seeing names of doctors/patients you're chatting with

-- Drop all existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;

-- Create new policy that allows viewing own profile AND conversation participants
CREATE POLICY "Users can view profiles of conversation participants"
    ON public.profiles FOR SELECT
    USING (
        -- User can view their own profile
        auth.uid() = id 
        OR
        -- User can view profiles of people in conversations they're part of
        EXISTS (
            SELECT 1 
            FROM public.conversation_participants cp1
            INNER JOIN public.conversation_participants cp2 
                ON cp1.conversation_id = cp2.conversation_id
            WHERE cp1.user_id = auth.uid()  -- Current user is in the conversation
            AND cp2.user_id = profiles.id    -- The profile being viewed is also in that conversation
        )
    );
