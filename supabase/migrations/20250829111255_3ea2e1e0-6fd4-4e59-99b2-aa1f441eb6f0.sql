-- Fix RLS policies for events and users tables

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Clients can read and update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data except role" ON public.users;

-- Create better RLS policies for events table
CREATE POLICY "Clients can insert their own events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can read and update their own events" 
ON public.events 
FOR ALL
TO authenticated
USING (auth.uid() = client_id);

CREATE POLICY "Creators can read active events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (status = 'active'::event_status);

-- Create better RLS policies for users table
CREATE POLICY "Users can insert their own profile" 
ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own profile" 
ON public.users 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow creators to be viewed by clients for searching
CREATE POLICY "Clients can view creator profiles" 
ON public.users 
FOR SELECT 
TO authenticated
USING (role = 'creator'::user_role);

-- Create a function to handle user creation after auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, age, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''), 
          COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'::user_role), 
          COALESCE((NEW.raw_user_meta_data->>'age')::integer, 18),
          now(), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();