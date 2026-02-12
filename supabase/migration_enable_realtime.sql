-- Enable Realtime for messages and conversation_participants tables
-- Fixes issue where Realtime subscriptions don't connect

-- Step 1: Add REPLICA IDENTITY FULL to enable Realtime subscriptions
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_participants REPLICA IDENTITY FULL;

-- Step 2: Enable Realtime by adding tables to the publication
-- Check if publication exists, if not this will fail silently
DO $$
BEGIN
  -- Try to add messages table to supabase_realtime publication
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Try to drop tables from publication (ignore errors if they're not in the publication)
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'messages table not in publication or other error: %', SQLERRM;
    END;
    
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.conversation_participants;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'conversation_participants table not in publication or other error: %', SQLERRM;
    END;
    
    -- Add tables to publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
    
    RAISE NOTICE 'Added tables to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'supabase_realtime publication does not exist';
  END IF;
END $$;

-- Step 3: Fix messages RLS policies to use SECURITY DEFINER to avoid recursion
-- Drop existing messages policies
DROP POLICY IF EXISTS "Participants can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages in their conversations" ON public.messages;

-- Create SECURITY DEFINER function to check if user is participant (if not exists from earlier migration)
CREATE OR REPLACE FUNCTION public.user_is_in_conversation(conv_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = conv_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate messages SELECT policy using SECURITY DEFINER function
CREATE POLICY "Participants can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        public.user_is_in_conversation(conversation_id, auth.uid())
    );

-- Recreate messages INSERT policy using SECURITY DEFINER function
CREATE POLICY "Participants can send messages in their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        public.user_is_in_conversation(conversation_id, auth.uid())
    );
