-- Healthcare Translation Bridge Database Schema
-- This script creates all necessary tables, policies, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- STEP 1: CREATE ALL TABLES (without RLS policies)
-- =====================================================

-- PROFILES TABLE
-- Extends auth.users with additional profile information
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CONVERSATIONS TABLE
-- Stores conversation metadata
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    doctor_language TEXT NOT NULL,
    patient_language TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- GUEST_SESSIONS TABLE
-- Manages temporary guest access
CREATE TABLE IF NOT EXISTS public.guest_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    guest_name TEXT NOT NULL,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CONVERSATION_PARTICIPANTS TABLE
-- Tracks who can access each conversation
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    guest_session_id UUID REFERENCES public.guest_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('doctor', 'patient')) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT user_or_guest_check CHECK (
        (user_id IS NOT NULL AND guest_session_id IS NULL) OR
        (user_id IS NULL AND guest_session_id IS NOT NULL)
    )
);

-- MESSAGES TABLE
-- Stores all conversation messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id TEXT NOT NULL,
    sender_role TEXT CHECK (sender_role IN ('doctor', 'patient')) NOT NULL,
    original_text TEXT,
    translated_text TEXT,
    audio_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(original_text, '') || ' ' || COALESCE(translated_text, ''))
    ) STORED
);

-- SUMMARIES TABLE
-- Stores AI-generated conversation summaries
CREATE TABLE IF NOT EXISTS public.summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    summary_text TEXT NOT NULL,
    symptoms TEXT[],
    diagnoses TEXT[],
    medications TEXT[],
    follow_up_actions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =====================================================
-- STEP 2: CREATE INDEXES
-- =====================================================

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_creator_id ON public.conversations(creator_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- Indexes for guest_sessions
CREATE INDEX IF NOT EXISTS idx_guest_sessions_token ON public.guest_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_conversation_id ON public.guest_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON public.guest_sessions(expires_at);

-- Indexes for conversation_participants
CREATE INDEX IF NOT EXISTS idx_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_guest_session_id ON public.conversation_participants(guest_session_id);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON public.messages USING GIN(search_vector);

-- Indexes for summaries
CREATE INDEX IF NOT EXISTS idx_summaries_conversation_id ON public.summaries(conversation_id);

-- =====================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Profiles are created on signup"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in"
    ON public.conversations FOR SELECT
    USING (
        creator_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their conversations"
    ON public.conversations FOR UPDATE
    USING (creator_id = auth.uid());

CREATE POLICY "Creators can delete their conversations"
    ON public.conversations FOR DELETE
    USING (creator_id = auth.uid());

-- Guest sessions policies
CREATE POLICY "Conversation creators can view guest sessions"
    ON public.guest_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Conversation creators can create guest sessions"
    ON public.guest_sessions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id
            AND creator_id = auth.uid()
        )
    );

-- Conversation participants policies
CREATE POLICY "Users can view participants in their conversations"
    ON public.conversation_participants FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can add participants to their conversations"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id
            AND creator_id = auth.uid()
        )
    );

-- Messages policies
CREATE POLICY "Participants can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND (
                user_id = auth.uid() OR
                guest_session_id::text = sender_id
            )
        )
    );

CREATE POLICY "Participants can send messages in their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = messages.conversation_id
            AND (
                user_id = auth.uid() OR
                guest_session_id::text = sender_id
            )
        )
    );

-- Summaries policies
CREATE POLICY "Conversation participants can view summaries"
    ON public.summaries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Conversation participants can create summaries"
    ON public.summaries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE id = conversation_id
            AND creator_id = auth.uid()
        )
    );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for conversations updated_at
DROP TRIGGER IF EXISTS set_updated_at_conversations ON public.conversations;
CREATE TRIGGER set_updated_at_conversations
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- STORAGE BUCKETS
-- For audio file storage
-- =====================================================

-- Create storage bucket for audio files (run this in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audio-messages', 'audio-messages', false);

-- Storage policies (add these after creating the bucket)
-- CREATE POLICY "Authenticated users can upload audio"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'audio-messages' AND auth.role() = 'authenticated');

-- CREATE POLICY "Users can view audio in their conversations"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'audio-messages');

-- CREATE POLICY "Users can delete their own audio"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'audio-messages' AND auth.uid()::text = (storage.foldername(name))[1]);
