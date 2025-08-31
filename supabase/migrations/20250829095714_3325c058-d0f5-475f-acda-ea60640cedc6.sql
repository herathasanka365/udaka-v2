-- Create storage bucket for creator portfolios
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolios', 'portfolios', true);

-- Create policies for portfolio uploads
CREATE POLICY "Users can view portfolio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'portfolios');

CREATE POLICY "Users can upload their own portfolio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own portfolio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own portfolio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'portfolios' AND auth.uid()::text = (storage.foldername(name))[1]);