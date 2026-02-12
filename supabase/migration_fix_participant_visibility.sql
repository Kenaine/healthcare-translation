-- Fix participant visibility - allow viewing all participants in conversations you're part of
-- Use SECURITY DEFINER to avoid RLS recursion

-- Drop old policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view all participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;

-- Drop and recreate function to ensure it's clean
DROP FUNCTION IF EXISTS public.user_is_in_conversation(UUID, UUID) CASCADE;

-- Create a security definer function to check if user is in a conversation
-- This bypasses RLS to prevent recursion
CREATE OR REPLACE FUNCTION public.user_is_in_conversation(conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = conv_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policy for viewing participants (using SECURITY DEFINER function)
CREATE POLICY "Users can view all participants in their conversations"
    ON public.conversation_participants FOR SELECT
    USING (
        public.user_is_in_conversation(conversation_id, auth.uid())
    );

-- Recreate INSERT policy for adding participants (requires is_conversation_creator function)
CREATE POLICY "Users can add participants to their conversations"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (
        public.is_conversation_creator(conversation_id, auth.uid())
    );
