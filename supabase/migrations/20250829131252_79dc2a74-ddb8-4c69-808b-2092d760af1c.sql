-- Create event_roles table for roles within events
CREATE TABLE public.event_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  needed_count INTEGER NOT NULL DEFAULT 1,
  role_budget NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create requests table for invitations sent to creators
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_role_id UUID REFERENCES public.event_roles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bookings table for confirmed creator assignments
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_role_id UUID NOT NULL REFERENCES public.event_roles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  start_date DATE,
  end_date DATE,
  final_budget NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_roles
CREATE POLICY "Users can view event roles for their events" 
ON public.event_roles FOR SELECT 
USING (
  event_id IN (
    SELECT id FROM public.events WHERE client_id = auth.uid()
  )
);

CREATE POLICY "Users can create event roles for their events" 
ON public.event_roles FOR INSERT 
WITH CHECK (
  event_id IN (
    SELECT id FROM public.events WHERE client_id = auth.uid()
  )
);

CREATE POLICY "Users can update event roles for their events" 
ON public.event_roles FOR UPDATE 
USING (
  event_id IN (
    SELECT id FROM public.events WHERE client_id = auth.uid()
  )
);

-- RLS Policies for requests
CREATE POLICY "Clients can view their requests" 
ON public.requests FOR SELECT 
USING (client_id = auth.uid());

CREATE POLICY "Creators can view requests sent to them" 
ON public.requests FOR SELECT 
USING (creator_id = auth.uid());

CREATE POLICY "Clients can create requests" 
ON public.requests FOR INSERT 
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Both parties can update request status" 
ON public.requests FOR UPDATE 
USING (client_id = auth.uid() OR creator_id = auth.uid());

-- RLS Policies for bookings
CREATE POLICY "Clients can view their bookings" 
ON public.bookings FOR SELECT 
USING (client_id = auth.uid());

CREATE POLICY "Creators can view their bookings" 
ON public.bookings FOR SELECT 
USING (creator_id = auth.uid());

CREATE POLICY "Clients can create bookings" 
ON public.bookings FOR INSERT 
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Both parties can update booking status" 
ON public.bookings FOR UPDATE 
USING (client_id = auth.uid() OR creator_id = auth.uid());

-- Add update triggers
CREATE TRIGGER update_event_roles_updated_at
  BEFORE UPDATE ON public.event_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();