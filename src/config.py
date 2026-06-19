"""
src/config.py
App-wide configuration — thresholds, paths, and environment loading.
"""

import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv()

# ── API Credentials ────────────────────────────────────────────────────────────
OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")

if not OPENROUTER_API_KEY:
    raise EnvironmentError(
        "OPENROUTER_API_KEY is not set. "
        "Add it to your .env file: OPENROUTER_API_KEY=\"your_key_here\""
    )

# ── Model Names ────────────────────────────────────────────────────────────────
OPENROUTER_MODEL: str = "meta-llama/llama-3.1-70b-instruct"  # High-quality open model via OpenRouter
EMBEDDING_MODEL: str = "text-embedding-3-small"  # Using OpenAI via OpenRouter

# ── RAG / Chunking ─────────────────────────────────────────────────────────────
CHUNK_SIZE: int = 500          # Characters per chunk
CHUNK_OVERLAP: int = 50        # Characters shared between adjacent chunks
TOP_K: int = 3                 # Number of retrieved chunks per query

# ── Vector Database ────────────────────────────────────────────────────────────
CHROMA_DB_DIR: str = "./chroma_db"          # Persistent ChromaDB storage folder
CHROMA_COLLECTION: str = "support_kb"      # Collection name inside ChromaDB

# ── Knowledge Base ─────────────────────────────────────────────────────────────
DATA_DIR: str = "./data"       # Folder containing .txt / .md / .pdf support docs

# ── Escalation ─────────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD: float = 0.20   # Escalate if top cosine similarity is below this

SENSITIVE_KEYWORDS: list[str] = [
    "refund",
    "chargeback",
    "lawyer",
    "legal",
    "sue",
    "lawsuit",
    "cancel my account",
    "delete my account",
    "duplicate charge",
    "fraud",
    "unauthorized charge",
    "demand",
    "court",
    "attorney",
]

# ── Personas ───────────────────────────────────────────────────────────────────
PERSONAS: list[str] = ["Technical Expert", "Frustrated User", "Business Executive"]
