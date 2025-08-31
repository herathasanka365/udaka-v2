-- Fix any database functions that might be using 'approved' instead of 'accepted'
-- First, let's check and update the notification trigger function that handles application updates

DROP FUNCTION IF EXISTS public.notify_creator_of_application_update() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_creator_of_application_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only notify if status changed
  IF OLD.status != NEW.status THEN
    INSERT INTO public.notifications (user_id, type, message)
    SELECT 
      NEW.creator_id,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'application_accepted'::notification_type
        WHEN NEW.status = 'rejected' THEN 'application_rejected'::notification_type
        ELSE 'application_updated'::notification_type
      END,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'Congratulations! Your application for "' || e.title || '" has been accepted'
        WHEN NEW.status = 'rejected' THEN 'Your application for "' || e.title || '" was not selected this time'
        ELSE 'Your application status for "' || e.title || '" has been updated'
      END
    FROM public.events e
    WHERE e.id = NEW.event_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER application_status_update_notification
    AFTER UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_creator_of_application_update();