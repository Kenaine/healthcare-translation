-- Add language preference to profiles
-- This allows users to set their preferred language during signup and in their profile

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en' NOT NULL;

-- Add a check constraint for valid language codes
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_language_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_language_check 
CHECK (language IN ('en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'tl', 'vi', 'th'));

-- Update existing users to have 'en' as default if not set
UPDATE public.profiles SET language = 'en' WHERE language IS NULL;

-- Update handle_new_user function to include language from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, language)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
        COALESCE(NEW.raw_user_meta_data->>'language', 'en')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
