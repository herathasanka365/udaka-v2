-- Allow creators to create bookings when accepting invitations
CREATE POLICY "Creators can create bookings when accepting invitations" 
ON public.bookings 
FOR INSERT 
WITH CHECK (creator_id = auth.uid());