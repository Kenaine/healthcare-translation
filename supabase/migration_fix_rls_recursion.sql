-- Fix infinite recursion in RLS policies
-- The issue is circular dependency between conversations and conversation_participants policies

-- Step 1: Drop existing problematic policies FIRST (before dropping functions)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they created" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they joined" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they are involved in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;

-- Step 2: Now drop existing functions to allow parameter name changes
DROP FUNCTION IF EXISTS public.is_conversation_creator(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID, UUID) CASCADE;

-- Create a security definer function to check if user is conversation creator
-- This bypasses RLS policies to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_conversation_creator(conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = conv_id AND creator_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a security definer function to check if user is a participant
-- This bypasses RLS policies to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = conv_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate conversations SELECT policy using security definer functions
CREATE POLICY "Users can view conversations they are involved in"
    ON public.conversations FOR SELECT
    USING (
        creator_id = auth.uid() OR
        public.is_conversation_participant(id, auth.uid())
    );

-- Recreate conversation_participants SELECT policy using security definer function
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
