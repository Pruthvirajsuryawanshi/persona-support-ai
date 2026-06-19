
-- Allow authenticated users to seed/re-index the shared knowledge base (no service role in local .env).
CREATE POLICY "authenticated insert kb" ON public.doc_chunks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated delete kb" ON public.doc_chunks
  FOR DELETE TO authenticated USING (true);
