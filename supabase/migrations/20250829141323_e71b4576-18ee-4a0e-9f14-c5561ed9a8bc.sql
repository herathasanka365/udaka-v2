-- Fix the foreign key constraint in applications table
-- Drop the existing foreign key constraint that references non-existent users table
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_creator_id_fkey;

-- Add the correct foreign key constraint to reference creator_profiles
ALTER TABLE public.applications 
ADD CONSTRAINT applications_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;