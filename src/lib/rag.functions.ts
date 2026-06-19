import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getKnowledgeBaseStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("doc_chunks")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return { chunkCount: count ?? 0 };
  });

export const seedKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SEED_DOCS } = await import("./seed-docs");
    const { embedText } = await import("./ai-gateway.server");

    // Always clear and re-seed so embeddings stay in sync with the current model.
    await supabaseAdmin.from("doc_chunks").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const CHUNK_SIZE = 600;
    const OVERLAP = 80;
    function chunk(text: string): string[] {
      const out: string[] = [];
      let i = 0;
      while (i < text.length) {
        out.push(text.slice(i, i + CHUNK_SIZE));
        if (i + CHUNK_SIZE >= text.length) break;
        i += CHUNK_SIZE - OVERLAP;
      }
      return out;
    }

    let inserted = 0;
    for (const doc of SEED_DOCS) {
      const chunks = chunk(doc.content);
      for (let idx = 0; idx < chunks.length; idx++) {
        const c = chunks[idx];
        const embedding = await embedText(apiKey, c);
        const { error } = await supabaseAdmin.from("doc_chunks").insert({
          source: doc.source,
          title: doc.title,
          chunk_index: idx,
          content: c,
          // pgvector accepts a JSON array literal as text
          embedding: embedding as unknown as string,
        });
        if (error) throw new Error(`Insert failed: ${error.message}`);
        inserted++;
      }
    }
    return { seeded: true, chunkCount: inserted };
  });
