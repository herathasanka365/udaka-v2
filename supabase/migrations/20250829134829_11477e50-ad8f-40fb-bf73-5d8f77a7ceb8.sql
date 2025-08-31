-- Fix foreign key constraint for events table
-- Drop the existing foreign key constraint that references non-existent users table
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_client_id_fkey;

-- Add the correct foreign key constraint that references profiles table
ALTER TABLE public.events 
ADD CONSTRAINT events_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;