-- Create function to send notifications for new events to creators
CREATE OR REPLACE FUNCTION notify_creators_of_new_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert notifications for all creators whose keywords match the event keywords
  INSERT INTO public.notifications (user_id, type, message)
  SELECT 
    cp.id,
    'event_published'::notification_type,
    'New event "' || NEW.title || '" matches your skills and is looking for talent!'
  FROM public.creator_profiles cp
  WHERE cp.keywords && NEW.keywords  -- Array overlap operator
    AND NEW.status = 'active';
  
  RETURN NEW;
END;
$$;

-- Create function to notify client when creator applies to their event
CREATE OR REPLACE FUNCTION notify_client_of_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get client_id from the event and send notification
  INSERT INTO public.notifications (user_id, type, message)
  SELECT 
    e.client_id,
    'application_received'::notification_type,
    'A creator has applied to your event "' || e.title || '"'
  FROM public.events e
  WHERE e.id = NEW.event_id;
  
  RETURN NEW;
END;
$$;

-- Create function to notify creator when their application status changes
CREATE OR REPLACE FUNCTION notify_creator_of_application_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if status changed
  IF OLD.status != NEW.status THEN
    INSERT INTO public.notifications (user_id, type, message)
    SELECT 
      NEW.creator_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'application_approved'::notification_type
        WHEN NEW.status = 'rejected' THEN 'application_rejected'::notification_type
        ELSE 'application_updated'::notification_type
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Congratulations! Your application for "' || e.title || '" has been approved'
        WHEN NEW.status = 'rejected' THEN 'Your application for "' || e.title || '" was not selected this time'
        ELSE 'Your application status for "' || e.title || '" has been updated'
      END
    FROM public.events e
    WHERE e.id = NEW.event_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to notify creator when they receive a request
CREATE OR REPLACE FUNCTION notify_creator_of_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, message)
  SELECT 
    NEW.creator_id,
    'request_received'::notification_type,
    'You have received a new collaboration request for "' || e.title || '"'
  FROM public.events e
  WHERE e.id = NEW.event_id;
  
  RETURN NEW;
END;
$$;

-- Create function to notify client when they receive a request from creator
CREATE OR REPLACE FUNCTION notify_client_of_creator_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if the request is from creator to client
  INSERT INTO public.notifications (user_id, type, message)
  SELECT 
    NEW.client_id,
    'request_received'::notification_type,
    'A creator has sent you a collaboration request for "' || e.title || '"'
  FROM public.events e
  WHERE e.id = NEW.event_id;
  
  RETURN NEW;
END;
$$;

-- Create function to notify when request status changes
CREATE OR REPLACE FUNCTION notify_request_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if status changed
  IF OLD.status != NEW.status THEN
    -- Notify creator about request status change
    INSERT INTO public.notifications (user_id, type, message)
    SELECT 
      NEW.creator_id,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'request_accepted'::notification_type
        WHEN NEW.status = 'rejected' THEN 'request_rejected'::notification_type
        ELSE 'request_updated'::notification_type
      END,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'Great! Your collaboration request for "' || e.title || '" has been accepted'
        WHEN NEW.status = 'rejected' THEN 'Your collaboration request for "' || e.title || '" was declined'
        ELSE 'Your collaboration request status for "' || e.title || '" has been updated'
      END
    FROM public.events e
    WHERE e.id = NEW.event_id;
    
    -- Notify client about request status change
    INSERT INTO public.notifications (user_id, type, message)
    SELECT 
      NEW.client_id,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'request_accepted'::notification_type
        WHEN NEW.status = 'rejected' THEN 'request_rejected'::notification_type
        ELSE 'request_updated'::notification_type
      END,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'Collaboration request for "' || e.title || '" has been accepted'
        WHEN NEW.status = 'rejected' THEN 'Collaboration request for "' || e.title || '" was declined'
        ELSE 'Collaboration request status for "' || e.title || '" has been updated'
      END
    FROM public.events e
    WHERE e.id = NEW.event_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to notify when booking is created
CREATE OR REPLACE FUNCTION notify_booking_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify creator about new booking
  INSERT INTO public.notifications (user_id, type, message)
  SELECT 
    NEW.creator_id,
    'booking_confirmed'::notification_type,
    'You have a new confirmed booking for "' || e.title || '"'
  FROM public.events e
  WHERE e.id = NEW.event_id;
  
  -- Notify client about booking confirmation
  INSERT INTO public.notifications (user_id, type, message)
  SELECT 
    NEW.client_id,
    'booking_confirmed'::notification_type,
    'Your booking for "' || e.title || '" has been confirmed'
  FROM public.events e
  WHERE e.id = NEW.event_id;
  
  RETURN NEW;
END;
$$;

-- Create triggers for event publishing notifications
CREATE TRIGGER trigger_notify_creators_new_event
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION notify_creators_of_new_event();

-- Create triggers for application notifications
CREATE TRIGGER trigger_notify_client_application
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_of_application();

CREATE TRIGGER trigger_notify_creator_application_update
  AFTER UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_of_application_update();

-- Create triggers for request notifications
CREATE TRIGGER trigger_notify_creator_request
  AFTER INSERT ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_creator_of_request();

CREATE TRIGGER trigger_notify_request_status_update
  AFTER UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_request_status_update();

-- Create triggers for booking notifications
CREATE TRIGGER trigger_notify_booking_created
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_created();

-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;