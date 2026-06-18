import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "lovable-ai-gateway",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": apiKey,
    },
  });
}

export async function embedText(apiKey: string, input: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input,
    }),
  });
  if (!res.ok) {
    throw new Error(`Embedding failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0].embedding;
}
