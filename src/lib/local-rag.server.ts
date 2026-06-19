import fs from "node:fs";
import path from "node:path";
import type { RetrievedChunk } from "./personas";
import { loadKnowledgeBaseDocumentsAsync, chunkText } from "./kb-loader.server";
import { embedText } from "./ai-gateway.server";

type IndexedChunk = {
  source: string;
  title: string;
  content: string;
  embedding: number[];
};

const CACHE_DIR = path.resolve(process.cwd(), ".rag-cache");
const CACHE_FILE = path.join(CACHE_DIR, "index.json");

let memoryIndex: IndexedChunk[] | null = null;

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function buildIndex(apiKey: string): Promise<IndexedChunk[]> {
  const docs = await loadKnowledgeBaseDocumentsAsync();
  const index: IndexedChunk[] = [];

  for (const doc of docs) {
    const chunks = chunkText(doc.content, 500, 50);
    for (const content of chunks) {
      const embedding = await embedText(apiKey, content);
      index.push({
        source: doc.source,
        title: doc.title,
        content,
        embedding,
      });
    }
  }

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(index));
  memoryIndex = index;
  return index;
}

async function getIndex(apiKey: string): Promise<IndexedChunk[]> {
  if (memoryIndex) return memoryIndex;

  if (fs.existsSync(CACHE_FILE)) {
    try {
      memoryIndex = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")) as IndexedChunk[];
      if (memoryIndex.length > 0) return memoryIndex;
    } catch {
      // rebuild below
    }
  }

  return buildIndex(apiKey);
}

/** Local fallback when Supabase doc_chunks is empty or unavailable. */
export async function retrieveLocalContext(
  apiKey: string,
  query: string,
  topK = 3,
): Promise<RetrievedChunk[]> {
  const index = await getIndex(apiKey);
  const queryEmbedding = await embedText(apiKey, query);

  return index
    .map((chunk) => ({
      source: chunk.source,
      title: chunk.title,
      content: chunk.content,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

export function clearLocalRagCache(): void {
  memoryIndex = null;
  if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
}

/** Build the local embedding index from data/ (used when Supabase seed is unavailable). */
export async function prewarmLocalIndex(apiKey: string): Promise<number> {
  const index = await buildIndex(apiKey);
  return index.length;
}
