# Persona Support AI

An intelligent customer support agent powered by **Gemini 2.5 Flash** that automatically detects each user's communication style and adapts its responses accordingly — technical, empathetic, or concise.

Built with **Python 3.11 · Streamlit · ChromaDB · LangChain · google-genai · pypdf**.

---

## 🏗️ Architecture Diagram

```
[User Message]
      │
      ▼
[Persona Classifier] ─── Gemini 2.5 Flash (structured JSON output)
      │
      ▼
Persona ∈ { "Technical Expert" | "Frustrated User" | "Business Executive" }
      │
      ├──► [RAG Pipeline]
      │         • LangChain RecursiveCharacterTextSplitter (500 chars / 50 overlap)
      │         • Gemini text-embedding-004
      │         • ChromaDB PersistentClient (cosine similarity)
      │         └──► Top-3 chunks retrieved
      │
      ├──► [Escalation Check]
      │         • Sensitive keywords? (refund / fraud / legal…)   → sensitive_topic
      │         • Top cosine similarity < 0.40?                   → low_confidence
      │         • Repeated Frustrated User turns ≥ 2?             → repeated_frustration
      │
      │  YES ──► [Human Handoff JSON]
      │               { persona, issue, documents_used,
      │                 attempted_steps, confidence_score,
      │                 escalation_reason, recommendation }
      │
      │  NO  ──► [Adaptive Response Generator]
      │               Persona-specific system prompt
      │               + FACTUAL CONTEXT DOCUMENTS
      │               + Full conversation history (multi-turn)
      │               └──► Gemini 2.5 Flash → grounded response
      │
      ▼
[Streamlit Chat UI]
  • Persona badge (emoji + confidence %)
  • Retrieved source citations
  • Response or escalation card
  • Expandable handoff JSON
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 **Persona Detection** | Classifies every message into 1 of 3 personas (structured JSON via Gemini) |
| 📚 **RAG Knowledge Base** | 18 support articles indexed in ChromaDB; cosine similarity top-3 retrieval |
| 🎯 **Adaptive Responses** | Different tone/format per persona — code blocks, empathy, or executive summary |
| 🚨 **Smart Escalation** | 3 configurable triggers → human handoff JSON with full conversation context |
| 💬 **Conversation Memory** | Multi-turn history passed to every Gemini call |
| 🌐 **Web UI** | Streamlit chat interface with dark theme, persona badges, source citations |

---

## 🧠 Persona System

| Persona | Detected By | Response Style |
|---|---|---|
| ⚙️ **Technical Expert** | API/code/config terms, error codes, jargon | Code blocks, root-cause analysis, numbered steps |
| ❤️ **Frustrated User** | Emotional language, exclamation marks, urgency | Empathy first, plain language, 3–5 bullet steps |
| ◆ **Business Executive** | Impact/ROI/timeline focus, brevity | 2–3 sentences, outcome-focused, no jargon |

---

## 🐍 Python Setup (Primary)

### Prerequisites

- Python 3.11 or higher
- Google Gemini API key → [Get one here](https://aistudio.google.com/app/apikey)

### 1. Clone & Create Virtual Environment

```bash
git clone <your-repo-url>
cd persona-support-ai

python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

**Packages installed** (exact spec):

| Library | Version | Purpose |
|---|---|---|
| `google-genai` | `>=0.1.0` | Official Google SDK for Gemini LLMs and Embeddings |
| `streamlit` | `>=1.30.0` | Interactive Chat Web UI |
| `chromadb` | `>=0.4.0` | Local Vector Database for index retrieval |
| `langchain` | `>=0.1.0` | Document chunking orchestration |
| `langchain-text-splitters` | `>=0.2.0` | RecursiveCharacterTextSplitter |
| `pypdf` | `>=3.0.0` | Native PDF reading and parsing |
| `python-dotenv` | `>=1.0.0` | Environment variable management |

### 3. Configure API Key

The `.env` file already exists at the project root. Ensure it contains:

```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
```

### 4. Run the App

```bash
streamlit run app.py
```

Open **http://localhost:8501**

The knowledge base is indexed automatically on first run (ChromaDB persisted to `./chroma_db`).
To force a re-index, click **🔄 Re-index Knowledge Base** in the sidebar.

---

## 📁 Project Structure

```
persona-support-ai/
│
├── data/                              # Knowledge base (18 documents)
│   ├── api_troubleshooting.md
│   ├── billing_policy.txt
│   ├── password_reset_guide.pdf       ← PDF (required)
│   ├── database_integration.md
│   ├── interface_loading_issues.md
│   ├── rate_limits.md
│   ├── sso_setup.md
│   ├── two_factor_auth.md
│   ├── webhook_configuration.md
│   ├── data_export.md
│   ├── onboarding_guide.md
│   ├── account_deletion_policy.txt
│   ├── sla_policy.md
│   ├── mobile_app_troubleshooting.md
│   ├── gdpr_data_privacy.txt
│   ├── payment_methods.md
│   ├── team_permissions.md
│   └── service_outage_faq.md
│
├── src/
│   ├── __init__.py
│   ├── config.py                      ← API keys, thresholds, paths
│   ├── classifier.py                  ← Persona detection (Gemini JSON output)
│   ├── rag_pipeline.py                ← ChromaDB ingestion + retrieval
│   ├── generator.py                   ← Persona-adaptive prompt + LLM call
│   └── escalator.py                   ← Escalation triggers + handoff JSON
│
├── app.py                             ← Streamlit Web UI
├── requirements.txt                   ← Python dependencies
├── .env                               ← API key (git-ignored)
└── README.md
```

---

## 🔑 Persona Detection Strategy

**Classification method**: Zero-shot structured JSON output via Gemini 2.5 Flash.

**Prompt design**: The system instruction instructs Gemini to evaluate three signals:
1. **Vocabulary** — presence of technical terms, jargon, error codes
2. **Tone** — emotional intensity, urgency markers, exclamation marks
3. **Intent** — whether the message focuses on business outcomes vs. technical resolution

**Output schema** (controlled generation):
```json
{
  "persona": "Technical Expert | Frustrated User | Business Executive",
  "confidence": 0.0–1.0,
  "reasoning": "Short explanation of classification decision"
}
```

`temperature=0.1` is used to ensure consistent, deterministic classification.

---

## 📊 RAG Pipeline Design

| Step | Implementation |
|---|---|
| **Chunking** | `RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)` — separators: `\n\n`, `\n`, ` `, `""` |
| **Embedding** | `gemini text-embedding-004` via `google-genai` SDK |
| **Vector store** | `ChromaDB PersistentClient` — cosine similarity space (`hnsw:space: cosine`) |
| **Retrieval** | Top-3 chunks; score = `1.0 - cosine_distance` |
| **PDF parsing** | `PdfReader` from `pypdf`, page-by-page extraction |
| **Persistence** | `./chroma_db` — no re-indexing after first run |

---

## ⚡ Escalation Logic

Escalation is triggered when **any** of these conditions is met:

| Trigger | Condition | Reason Code |
|---|---|---|
| Sensitive keywords | Query contains: `refund`, `chargeback`, `fraud`, `legal`, `lawsuit`, `duplicate charge`… | `sensitive_topic` |
| Low confidence | Top retrieved similarity < **0.40** | `low_confidence` |
| Repeated frustration | Current persona = Frustrated User **AND** ≥ 1 prior frustrated assistant turn | `repeated_frustration` |

**Priority order**: sensitive_topic > repeated_frustration > low_confidence

**Handoff JSON includes**:
```json
{
  "persona": "Frustrated User",
  "issue": "User's message (first 200 chars)",
  "documents_used": ["billing_policy.txt"],
  "attempted_steps": ["Prior agent response 1", "..."],
  "confidence_score": 0.35,
  "escalation_reason": "sensitive_topic",
  "conversation_history": [...last 6 turns...],
  "recommendation": "Verify customer identity and address billing concern directly."
}
```

---

## 🧪 Verification Scenarios

| # | User Message | Expected Persona | Expected Behavior |
|---|---|---|---|
| 1 | *"Where is the guide to clear cookies? It's been an hour and nothing is loading!"* | **Frustrated User** | Empathize + simple steps from `interface_loading_issues.md` |
| 2 | *"What are the header parameter requirements for bearer token auth?"* | **Technical Expert** | Headers + code from `api_troubleshooting.md` |
| 3 | *"Our uptime is decreasing. Timeline for billing disputes?"* | **Business Executive** | Concise + timeline from `billing_policy.txt` + `sla_policy.md` |
| 4 | *"Database integration causing internal errors"* | **Technical Expert** | Steps from `database_integration.md` |
| 5 | *"Duplicate charges — I demand an immediate refund!"* | **Frustrated User** | **Escalation** → sensitive_topic + handoff JSON |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Language** | Python 3.11+ |
| **LLM** | Google Gemini 2.5 Flash (`google-genai`) |
| **Embeddings** | Gemini `text-embedding-004` |
| **Agent Framework** | `google-genai` structured output + `langchain-text-splitters` |
| **Vector Database** | ChromaDB (persistent, cosine similarity) |
| **PDF Parsing** | `pypdf` |
| **UI** | Streamlit |
| **Env Management** | `python-dotenv` |

---

## 🔐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google AI Studio API key |

---

## ⚠️ Known Limitations

1. **Re-indexing on new documents**: Adding files to `data/` requires a manual re-index via the sidebar button (the pipeline uses upsert, so unchanged chunks won't be duplicated).
2. **PDF image-based content**: If the PDF contains scanned images rather than selectable text, `pypdf` will extract blank pages. Use text-based PDFs.
3. **Embedding dimension**: `text-embedding-004` produces 768-dimension vectors. All documents must be re-indexed together to ensure consistent similarity scores.
4. **No streaming**: Gemini responses are returned in full (no token streaming) in the current Streamlit implementation.
5. **Single-user session**: Conversation history is stored in Streamlit session state and resets on page refresh.
6. **Rate limits**: Gemini API has per-minute token limits. For very large knowledge bases, consider adding retry/backoff logic around embedding calls.

---

## 📝 Available Scripts

```bash
# Run the Streamlit app
streamlit run app.py

# Test persona classifier only
python -m src.classifier

# Test RAG pipeline only
python -m src.rag_pipeline

# Test escalation logic only
python -m src.escalator

# Test full response generator
python -m src.generator
```

---

## 🤝 Contributing

This project is connected to [Lovable](https://lovable.dev). Avoid force-pushing, rebasing, or squashing commits that are already pushed.

---

## 📄 License

MIT

---

## ✨ Features

| Feature                    | Description                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------- |
| 🧠 **Persona Detection**   | Classifies every message into one of 3 personas using Gemini 2.5 Flash              |
| 💬 **Conversation Memory** | Remembers the full thread history — follow-up questions work like ChatGPT           |
| ✍️ **Typewriter Effect**   | Responses appear word-by-word for a natural chat experience                         |
| 📚 **RAG Knowledge Base**  | Retrieves top-K doc chunks via cosine similarity; answers are grounded in `data/`   |
| 🚨 **Smart Escalation**    | Sensitive topics, low retrieval confidence, or repeated frustration → human handoff |
| 🔐 **Auth**                | Email/password + Google OAuth via Supabase                                          |
| 🗂️ **Thread Management**   | Create, rename, and delete conversation threads                                     |

---

## 🧠 Persona System

The AI detects which of 3 personas the user is, then adapts its tone and format:

### ⚙️ Technical Expert

- Detects: API terms, error codes, jargon, config questions
- Responds with: Code blocks, numbered steps, precise terminology, no fluff

### ❤️ Frustrated User

- Detects: Exclamation marks, emotional language, urgent tone
- Responds with: Empathy first, plain language, 3–5 simple bullet steps

### ◆ Business Executive

- Detects: Short messages about impact, ROI, timelines, deliverables
- Responds with: One-sentence answer, quantified outcomes, under 120 words

---

## 🔄 How It Works

When you send a message:

```
Your Message
     │
     ├──► Gemini 2.5 Flash ──► Persona Classification
     │
     ├──► Embed query ──► Supabase pgvector ──► Top-3 chunks (cosine similarity)
     │
     ├──► Escalation check?
     │         • Sensitive keywords (refund, fraud, legal…)
     │         • Top similarity score < 0.45
     │         • Repeated frustrated turns
     │         YES → Handoff JSON + escalation message
     │         NO  ↓
     │
     ├──► Fetch last 20 messages (conversation memory)
     │
     └──► Gemini 2.5 Flash ──► Persona-adaptive, context-grounded response
                                       │
                               Saved with sources + top_score → typewriter UI
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/app/apikey) Gemini API key

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd persona-support-ai
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root:

```env
# Supabase
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"

# Gemini AI (get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Run Locally

```bash
npm run dev
```

Open **http://localhost:8080**

### Knowledge base not indexing?

If every question escalates with *"unable to locate a documented solution"*, the vector index is empty or failed to seed:

1. In [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**, run the migration in `supabase/migrations/20260619104500_doc_chunks_seed_policies.sql` (allows authenticated seeding without a service-role key).
2. In the app sidebar, click the **refresh icon** next to “Knowledge base” to re-index.
3. Confirm the sidebar shows something like `120 chunks` (not `0 chunks`).

Optional: add `SUPABASE_SERVICE_ROLE_KEY` to `.env` from Supabase → Project Settings → API if you prefer admin-based seeding.

---

## 🛠️ Tech Stack

| Layer           | Technology                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| Framework       | [TanStack Start](https://tanstack.com/start) (React + Vite SSR)             |
| Routing         | [TanStack Router](https://tanstack.com/router)                              |
| AI              | [Google Gemini 2.5 Flash](https://aistudio.google.com) via `@ai-sdk/google` |
| Database & Auth | [Supabase](https://supabase.com) (Postgres + Row Level Security)            |
| Styling         | [Tailwind CSS v4](https://tailwindcss.com)                                  |
| UI Components   | [Radix UI](https://radix-ui.com) + custom AI elements                       |
| State           | [TanStack Query](https://tanstack.com/query)                                |
| Markdown        | [Streamdown](https://github.com/streamdown/streamdown)                      |

---

## 📁 Project Structure

```
data/                           # Knowledge base (.md, .txt, .pdf) — indexed on first run
├── api_troubleshooting.md
├── billing_policy.txt
├── password_reset_guide.pdf
└── …

src/
├── routes/
│   ├── __root.tsx              # App shell, auth state listener
│   ├── auth.tsx                # Sign in / Sign up page
│   ├── index.tsx               # Redirect to /chat
│   └── _authenticated/
│       ├── route.tsx           # Auth guard
│       ├── chat.tsx            # Sidebar (threads, KB status)
│       ├── chat.index.tsx      # Empty state
│       └── chat.$threadId.tsx  # Active conversation
│
├── components/
│   ├── chat/
│   │   ├── ChatWindow.tsx      # Main chat UI with typewriter effect
│   │   ├── PersonaBadge.tsx    # Shows detected persona + confidence
│   │   ├── EscalationCard.tsx  # Human handoff card
│   │   └── SourcesList.tsx     # Citation sources display
│   └── ai-elements/            # Reusable AI UI primitives
│
├── lib/
│   ├── chat.functions.ts       # Classify → RAG → escalate/generate → save
│   ├── kb-loader.server.ts     # Load data/ files, chunk, PDF parse
│   ├── ai-gateway.server.ts    # Gemini provider + embeddings
│   ├── personas.ts             # Persona types, thresholds, sensitive keywords
│   ├── threads.functions.ts    # Thread CRUD server functions
│   └── rag.functions.ts        # Knowledge base seeding
│
└── integrations/
    └── supabase/               # Supabase client, auth middleware, types
```

---

## ⚡ Escalation Triggers

Escalation happens when **any** of these is true:

1. **Sensitive keywords** — `refund`, `chargeback`, `lawyer`, `legal`, `sue`, `lawsuit`, `cancel my account`, `delete my account`, `duplicate charge`, `fraud`, `unauthorized charge`, `demand`
2. **Low retrieval confidence** — top cosine similarity from RAG is below **0.40**
3. **Repeated frustration** — current message is Frustrated User and a prior turn was also classified Frustrated User

Handoff JSON includes: `persona`, `detected_issue`, `retrieved_sources`, `confidence_score`, `recommended_action`, `escalation_reason`.

---

## 📋 Assignment Alignment (AdSparkX)

| Spec step                                                      | Implementation                                                   |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| Persona classifier (3 personas, JSON)                          | `src/lib/chat.functions.ts` → `classifyPersona()`                |
| Knowledge base (`data/` .md/.txt/.pdf)                         | `data/` + `src/lib/kb-loader.server.ts`                          |
| Chunking (500 / 50 overlap)                                    | `chunkText()` in `kb-loader.server.ts`                           |
| Vector embeddings + cosine search                              | `embedText()` + Supabase `match_doc_chunks` RPC                  |
| Persona-adaptive generator                                     | `personaPrompt()` + grounded system prompt                       |
| Escalation (sensitive / low confidence / repeated frustration) | `sendMessage()` in `chat.functions.ts`                           |
| Handoff JSON                                                   | `HandoffSummary` in `personas.ts`, shown in `EscalationCard.tsx` |

**Stack note:** Assignment references Python/Streamlit/ChromaDB; this repo uses TypeScript/TanStack Start/Supabase pgvector as an equivalent full-stack implementation.

Regenerate the PDF knowledge base file: `node scripts/generate-pdf.mjs`

---

## 🔐 Authentication

- **Email/Password** — standard sign-up/sign-in
- **Google OAuth** — one-click via Supabase's native OAuth
- All threads and messages are scoped to the authenticated user via Supabase Row Level Security

---

## 📝 Available Scripts

```bash
npm run dev       # Start development server (http://localhost:8080)
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
npm run format    # Format with Prettier
```

---

## 🧪 Verification Scenarios (Assignment)

| #   | Message                                                                            | Expected                                                   |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | _"Where is the guide to clear cookies? It's been an hour and nothing is loading!"_ | Frustrated User + steps from `interface_loading_issues.md` |
| 2   | _"What are the header parameter requirements for bearer token auth?"_              | Technical Expert + headers from `api_troubleshooting.md`   |
| 3   | _"Our uptime is decreasing. Timeline for billing dispute resolution?"_             | Business Executive + timeline from `billing_policy.txt`    |
| 4   | _"Database integration causing internal errors"_                                   | Technical Expert + steps from `database_integration.md`    |
| 5   | _"Duplicate charges. I demand an immediate refund!"_                               | Escalation + handoff JSON (sensitive topic)                |

Also try an obscure question with no matching docs → low-confidence escalation.

---

## 🤝 Contributing

This project is connected to [Lovable](https://lovable.dev). Avoid force-pushing, rebasing, or squashing commits that are already pushed — it rewrites history on Lovable's side.

---

## 📄 License

MIT
