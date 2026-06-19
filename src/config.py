"""
src/config.py
App-wide configuration — thresholds, paths, and environment loading.
"""

import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv()

# ── API Credentials ────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

if not GEMINI_API_KEY:
    raise EnvironmentError(
        "GEMINI_API_KEY is not set. "
        "Add it to your .env file: GEMINI_API_KEY=\"your_key_here\""
    )

# ── Model Names ────────────────────────────────────────────────────────────────
GEMINI_MODEL: str = "gemini-2.5-flash-preview-05-20"   # Change to "gemini-2.0-flash" if unavailable
EMBEDDING_MODEL: str = "text-embedding-004"

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
CONFIDENCE_THRESHOLD: float = 0.40   # Escalate if top cosine similarity is below this

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
