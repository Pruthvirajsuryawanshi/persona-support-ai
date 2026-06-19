export async function embedText(openrouterKey: string, input: string): Promise<number[]> {
  // Use OpenAI's embedding model via OpenRouter
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:8080",
      "X-Title": "Persona Support Agent",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: input,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Embedding API error: ${error.error?.message || "Unknown error"}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding;

  // text-embedding-3-small outputs 1536 dimensions, which matches the DB schema.
  return embedding;
}
