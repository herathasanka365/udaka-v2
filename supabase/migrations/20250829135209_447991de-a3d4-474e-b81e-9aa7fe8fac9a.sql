-- Add missing enum values to notification_type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'event_published';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'application_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'application_approved';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'application_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'application_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'request_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'request_accepted';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'request_rejected';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'request_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'booking_confirmed';