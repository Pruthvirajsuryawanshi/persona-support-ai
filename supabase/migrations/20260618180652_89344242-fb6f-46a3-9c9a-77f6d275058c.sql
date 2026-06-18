
-- Revoke direct execute on internal trigger fn
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Make match function SECURITY INVOKER (doc_chunks has SELECT for authenticated)
CREATE OR REPLACE FUNCTION public.match_doc_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 4
)
RETURNS TABLE (
  id uuid,
  source text,
  title text,
  content text,
  similarity float
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT d.id, d.source, d.title, d.content,
         1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.doc_chunks d
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
GRANT EXECUTE ON FUNCTION public.match_doc_chunks(vector, int) TO authenticated;
