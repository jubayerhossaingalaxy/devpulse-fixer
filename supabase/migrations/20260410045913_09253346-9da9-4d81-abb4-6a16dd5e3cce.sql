CREATE TABLE public.auto_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  topic TEXT,
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  facebook_post_id TEXT,
  error_message TEXT,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read auto_posts" ON public.auto_posts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert auto_posts" ON public.auto_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update auto_posts" ON public.auto_posts FOR UPDATE USING (true);