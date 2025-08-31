-- Fix the foreign key constraint in notifications table
-- The notifications table is trying to reference a non-existent users table
-- Drop the existing foreign key constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Add the correct foreign key constraint to reference profiles table (where user data is stored)
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;