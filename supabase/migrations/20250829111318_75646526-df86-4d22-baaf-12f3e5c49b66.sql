-- Create current user profile if missing
INSERT INTO public.users (id, email, name, role, age, created_at, updated_at)
VALUES ('c89bd637-8401-433f-b86d-c5c511f3bccd', 'udaka@gmail.com', 'Test User', 'client', 25, now(), now())
ON CONFLICT (id) DO NOTHING;