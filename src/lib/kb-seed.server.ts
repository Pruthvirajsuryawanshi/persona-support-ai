import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loadKnowledgeBaseDocumentsAsync, chunkText, toVectorLiteral } from "./kb-loader.server";
import { embedText } from "./ai-gateway.server";
import { clearLocalRagCache } from "./local-rag.server";

export async function seedKnowledgeBaseCore(
  supabase: SupabaseClient<Database>,
  apiKey: string,
  force = false,
): Promise<{ seeded: boolean; chunkCount: number }> {
  const { count: existingCount } = await supabase
    .from("doc_chunks")
    .select("*", { count: "exact", head: true });

  if ((existingCount ?? 0) > 0 && !force) {
    return { seeded: false, chunkCount: existingCount ?? 0 };
  }

  clearLocalRagCache();

  await supabase.from("doc_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const docs = await loadKnowledgeBaseDocumentsAsync();
  let inserted = 0;

  for (const doc of docs) {
    const chunks = chunkText(doc.content, 500, 50);
    for (let idx = 0; idx < chunks.length; idx++) {
      const c = chunks[idx];
      const embedding = await embedText(apiKey, c);
      const { error } = await supabase.from("doc_chunks").insert({
        source: doc.source,
        title: doc.title,
        chunk_index: idx,
        content: c,
        embedding: toVectorLiteral(embedding) as unknown as string,
      });
      if (error) throw new Error(`Insert failed: ${error.message}`);
      inserted++;
    }
  }

  return { seeded: true, chunkCount: inserted };
}

export async function ensureKnowledgeBaseSeeded(
  supabase: SupabaseClient<Database>,
  apiKey: string,
): Promise<void> {
  const { count, error } = await supabase
    .from("doc_chunks")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) === 0) {
    await seedKnowledgeBaseCore(supabase, apiKey, true);
  }
}
