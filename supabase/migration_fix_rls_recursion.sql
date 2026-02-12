-- Fix infinite recursion in RLS policies
-- The issue is circular dependency between conversations and conversation_participants policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;

-- Create a security definer function to check if user is conversation creator
-- This bypasses RLS policies to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_conversation_creator(conv_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = conv_id AND creator_id = user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate conversations SELECT policy (only check creator, no participant check to avoid recursion)
CREATE POLICY "Users can view conversations they created"
    ON public.conversations FOR SELECT
    USING (creator_id = auth.uid());

-- Add separate policy for viewing conversations as participant
CREATE POLICY "Users can view conversations they joined"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM public.conversation_participants 
            WHERE conversation_id = id 
            AND user_id = auth.uid()
        )
    );

-- Recreate conversation_participants SELECT policy (simplified)
CREATE POLICY "Users can view participants in their conversations"
    ON public.conversation_participants FOR SELECT
    USING (
        user_id = auth.uid() OR
        public.is_conversation_creator(conversation_id, auth.uid())
    );

-- Recreate conversation_participants INSERT policy using security definer function
CREATE POLICY "Users can add participants to their conversations"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (
        public.is_conversation_creator(conversation_id, auth.uid())
    );
