# Persona Support AI

An intelligent customer support agent powered by **Gemini 2.5 Flash** that automatically detects each user's communication style and adapts its responses accordingly — technical, empathetic, or concise.

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
