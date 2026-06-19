import "dotenv/config";
import { prewarmLocalIndex, retrieveLocalContext } from "../src/lib/local-rag.server.ts";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY");
  process.exit(1);
}

const query =
  process.argv[2] ??
  "What are the header parameter requirements for bearer token auth implementation?";

console.log("Building local index from data/ …");
const count = await prewarmLocalIndex(apiKey);
console.log("indexed_chunks:", count);

const results = await retrieveLocalContext(apiKey, query, 3);
console.log("query:", query);
for (const row of results) {
  console.log({
    source: row.source,
    similarity: row.similarity.toFixed(4),
    preview: row.content.slice(0, 80),
  });
}
