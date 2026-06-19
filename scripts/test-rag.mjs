import "dotenv/config";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed } from "ai";

const apiKey = process.env.GEMINI_API_KEY;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

async function embedText(input) {
  const google = createGoogleGenerativeAI({ apiKey });
  const { embedding } = await embed({
    model: google.textEmbeddingModel("gemini-embedding-001"),
    value: input,
  });
  return embedding.slice(0, 1536);
}

const supabase = createClient(url, key);
const query =
  process.argv[2] ??
  "What are the header parameter requirements for bearer token auth implementation?";

const { count } = await supabase
  .from("doc_chunks")
  .select("*", { count: "exact", head: true });
console.log("chunk_count:", count);

const embedding = await embedText(query);
const vector = `[${embedding.join(",")}]`;
const { data, error } = await supabase.rpc("match_doc_chunks", {
  query_embedding: vector,
  match_count: 3,
});

if (error) {
  console.error("rpc_error:", error.message);
  process.exit(1);
}

console.log("query:", query);
for (const row of data ?? []) {
  console.log({
    source: row.source,
    similarity: Number(row.similarity).toFixed(4),
    preview: row.content.slice(0, 80),
  });
}
