"""
src/rag_pipeline.py
Retrieval-Augmented Generation pipeline.

Responsibilities:
  1. Document Ingestion  — parse .txt / .md / .pdf from data/
  2. Chunking           — RecursiveCharacterTextSplitter (LangChain)
  3. Embedding          — Gemini text-embedding-004
  4. Storage            — ChromaDB persistent vector database
  5. Retrieval          — Cosine similarity top-K search
"""

import os
from pypdf import PdfReader
from google import genai
import chromadb

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter  # type: ignore

from src.config import (
    GEMINI_API_KEY,
    EMBEDDING_MODEL,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    TOP_K,
    CHROMA_DB_DIR,
    CHROMA_COLLECTION,
    DATA_DIR,
)


class LocalRAGPipeline:
    """
    Full RAG pipeline backed by ChromaDB (persistent) and Gemini embeddings.

    Usage:
        pipeline = LocalRAGPipeline()
        pipeline.ingest_all_documents()          # index data/ on first run
        chunks = pipeline.retrieve_context("How do I reset my password?")
    """

    def __init__(self, db_dir: str = CHROMA_DB_DIR):
        self.genai_client = genai.Client(api_key=GEMINI_API_KEY)

        # Persistent ChromaDB — survives across Streamlit reruns
        self.chroma_client = chromadb.PersistentClient(path=db_dir)

        # Use cosine space so distance translates directly to 1 – similarity
        self.collection = self.chroma_client.get_or_create_collection(
            name=CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )

    # ── Embedding ──────────────────────────────────────────────────────────────

    def get_embedding(self, text: str) -> list[float]:
        """Convert text to a dense embedding vector via Gemini text-embedding-004."""
        response = self.genai_client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        return response.embeddings[0].values

    # ── Ingestion ──────────────────────────────────────────────────────────────

    def _parse_file(self, file_path: str) -> str:
        """Parse a .txt, .md, or .pdf file and return raw text."""
        if file_path.lower().endswith(".pdf"):
            reader = PdfReader(file_path)
            pages = []
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    pages.append(extracted)
            return "\n".join(pages)
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()

    def ingest_document(self, doc_name: str, content: str) -> int:
        """
        Chunk a document and upsert all chunks into ChromaDB.

        Args:
            doc_name: File name used as metadata source label.
            content:  Raw document text.

        Returns:
            Number of chunks ingested.
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", " ", ""],
        )
        chunks = splitter.split_text(content)

        for idx, chunk in enumerate(chunks):
            embedding = self.get_embedding(chunk)
            chunk_id = f"{doc_name}_chunk_{idx}"

            self.collection.upsert(
                ids=[chunk_id],
                embeddings=[embedding],
                metadatas=[{"source": doc_name, "chunk_index": idx}],
                documents=[chunk],
            )

        return len(chunks)

    def ingest_all_documents(self) -> dict[str, int]:
        """
        Load every .txt / .md / .pdf in DATA_DIR and ingest into ChromaDB.
        Skips files already indexed (upsert is idempotent by chunk_id).

        Returns:
            Dict mapping filename → chunk count.
        """
        if not os.path.isdir(DATA_DIR):
            raise FileNotFoundError(f"Knowledge base directory not found: {DATA_DIR}")

        results: dict[str, int] = {}
        supported = (".txt", ".md", ".pdf")

        for filename in sorted(os.listdir(DATA_DIR)):
            if not filename.lower().endswith(supported):
                continue
            file_path = os.path.join(DATA_DIR, filename)
            try:
                content = self._parse_file(file_path)
                count = self.ingest_document(filename, content)
                results[filename] = count
                print(f"  ✓ {filename:40s} → {count} chunks")
            except Exception as exc:
                print(f"  ✗ {filename}: {exc}")

        return results

    # ── Retrieval ──────────────────────────────────────────────────────────────

    def retrieve_context(self, query: str, top_k: int = TOP_K) -> list[dict]:
        """
        Embed the query and return the top-K most similar document chunks.

        Uses cosine similarity: score = 1.0 – cosine_distance.

        Args:
            query:  User's support question.
            top_k:  Number of chunks to return.

        Returns:
            List of dicts: [{text, source, chunk_index, score}]
        """
        query_vector = self.get_embedding(query)

        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=min(top_k, self.get_chunk_count() or 1),
        )

        retrieved: list[dict] = []
        if results and results.get("documents"):
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            distances = results.get("distances", [[]])[0]

            for i, doc in enumerate(docs):
                distance = distances[i] if i < len(distances) else 1.0
                # cosine distance ∈ [0, 2]; with cosine space: dist ≈ 1 – sim
                score = max(0.0, 1.0 - distance)
                retrieved.append(
                    {
                        "text": doc,
                        "source": metas[i]["source"],
                        "chunk_index": metas[i].get("chunk_index", i),
                        "score": round(score, 4),
                    }
                )

        return retrieved

    # ── Utilities ──────────────────────────────────────────────────────────────

    def get_chunk_count(self) -> int:
        """Return total number of chunks currently indexed in ChromaDB."""
        return self.collection.count()

    def clear_index(self) -> None:
        """Delete and recreate the ChromaDB collection (full re-index)."""
        self.chroma_client.delete_collection(CHROMA_COLLECTION)
        self.collection = self.chroma_client.get_or_create_collection(
            name=CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )


# ── Standalone smoke-test ───────────────────────────────────────────────────────
if __name__ == "__main__":
    pipeline = LocalRAGPipeline()

    print(f"Existing chunks: {pipeline.get_chunk_count()}")

    if pipeline.get_chunk_count() == 0:
        print("\nIndexing knowledge base…")
        summary = pipeline.ingest_all_documents()
        print(f"\nTotal files indexed: {len(summary)}")
        print(f"Total chunks: {sum(summary.values())}")

    print("\nRunning test query: 'How do I reset my password?'")
    chunks = pipeline.retrieve_context("How do I reset my password?")
    for c in chunks:
        print(f"  [{c['score']:.3f}] {c['source']} — {c['text'][:80]}…")
