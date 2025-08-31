-- Remove all RLS policies and disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to insert their own data" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read their own data" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to update their own data except role" ON public.users;
DROP POLICY IF EXISTS "Allow clients to read creators" ON public.users;
DROP POLICY IF EXISTS "Allow creators to read other creators" ON public.users;

DROP POLICY IF EXISTS "Clients can read and update their own events" ON public.events;
DROP POLICY IF EXISTS "Creators can read active events" ON public.events;

DROP POLICY IF EXISTS "Clients can read applications for their events" ON public.applications;
DROP POLICY IF EXISTS "Creators can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Creators can read their own applications" ON public.applications;
DROP POLICY IF EXISTS "Creators can update their own applications" ON public.applications;

DROP POLICY IF EXISTS "Creators can read and update their own availability" ON public.availabilities;
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contacts;
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can read and update their own saved searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Anyone can read team data" ON public.team;

-- Create new profile tables
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('creator', 'client')),
    account_tier TEXT DEFAULT 'free' CHECK (account_tier IN ('free', 'premium', 'pro')),
    phone TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.creator_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    age INTEGER,
    bio TEXT,
    keywords TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT,
    website TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at
    BEFORE UPDATE ON public.creator_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_profiles_updated_at
    BEFORE UPDATE ON public.client_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();