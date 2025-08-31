-- Fix the foreign key constraint in availabilities table
-- Drop the existing foreign key constraint that references non-existent users table
ALTER TABLE public.availabilities DROP CONSTRAINT IF EXISTS availabilities_creator_id_fkey;

-- Add the correct foreign key constraint to reference creator_profiles
ALTER TABLE public.availabilities 
ADD CONSTRAINT availabilities_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.creator_profiles(id) ON DELETE CASCADE;