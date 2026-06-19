import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { seedKnowledgeBaseCore } from "./kb-seed.server";

const SeedInput = z.object({ force: z.boolean().optional() }).optional();

export const getKnowledgeBaseStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count, error } = await context.supabase
      .from("doc_chunks")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);

    const dbCount = count ?? 0;
    if (dbCount > 0) return { chunkCount: dbCount, source: "database" as const };

    const fs = await import("node:fs");
    const path = await import("node:path");
    const cacheFile = path.resolve(process.cwd(), ".rag-cache", "index.json");
    if (fs.existsSync(cacheFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8")) as unknown[];
        return { chunkCount: cached.length, source: "local" as const };
      } catch {
        // fall through
      }
    }

    const dataDir = path.resolve(process.cwd(), "data");
    const fileCount = fs.existsSync(dataDir)
      ? fs.readdirSync(dataDir).filter((f) => /\.(md|txt|pdf)$/i.test(f)).length
      : 0;
    return { chunkCount: 0, source: "none" as const, docCount: fileCount };
  });

export const seedKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SeedInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment");

    try {
      return await seedKnowledgeBaseCore(context.supabase, apiKey, data?.force ?? false);
    } catch (error) {
      const { clearLocalRagCache, prewarmLocalIndex } = await import("./local-rag.server");
      if (data?.force) clearLocalRagCache();
      const chunkCount = await prewarmLocalIndex(apiKey);
      return { seeded: true, chunkCount, source: "local" as const };
    }
  });
