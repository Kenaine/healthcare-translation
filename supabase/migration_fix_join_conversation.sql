-- Fix join conversation functionality
-- The issue is that RLS prevents users from seeing conversations they haven't joined yet

-- Create a security definer function to handle joining conversations
-- This bypasses RLS policies to check if conversation exists and add participant
CREATE OR REPLACE FUNCTION public.join_conversation_as_patient(conv_id UUID, joining_user_id UUID)
RETURNS jsonb AS $$
DECLARE
    conversation_exists boolean;
    already_participant boolean;
    patient_lang text;
BEGIN
    -- Check if conversation exists (bypasses RLS)
    SELECT EXISTS (
        SELECT 1 FROM public.conversations WHERE id = conv_id
    ) INTO conversation_exists;
    
    IF NOT conversation_exists THEN
        RETURN jsonb_build_object('error', 'Conversation not found');
    END IF;
    
    -- Check if already a participant
    SELECT EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_id = conv_id AND user_id = joining_user_id
    ) INTO already_participant;
    
    IF already_participant THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already joined');
    END IF;
    
    -- Get patient's language preference
    SELECT language INTO patient_lang
    FROM public.profiles
    WHERE id = joining_user_id;
    
    -- Update conversation with patient's language
    UPDATE public.conversations
    SET patient_language = patient_lang
    WHERE id = conv_id;
    
    -- Add as participant with patient role
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES (conv_id, joining_user_id, 'patient');
    
    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
