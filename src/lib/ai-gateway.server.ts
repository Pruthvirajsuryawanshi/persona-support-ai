import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed } from "ai";

export function createGeminiProvider(apiKey: string) {
  return createGoogleGenerativeAI({
    apiKey: apiKey,
  });
}

export async function embedText(apiKey: string, input: string): Promise<number[]> {
  const google = createGeminiProvider(apiKey);
  const { embedding } = await embed({
    model: google.textEmbeddingModel("gemini-embedding-001"),
    value: input,
  });

  // gemini-embedding-001 outputs 3072 dims but the DB schema is vector(1536).
  // Truncate to the first 1536 dimensions so Postgres accepts it.
  // All documents must be re-seeded with the same truncation so similarity
  // scores remain consistent.
  return embedding.slice(0, 1536);
}
