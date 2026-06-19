# Persona Support AI

An intelligent customer support agent powered by **Gemini 2.5 Flash** that automatically detects each user's communication style and adapts its responses accordingly — technical, empathetic, or concise.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧠 **Persona Detection** | Classifies every message into one of 3 personas using Gemini 2.5 Flash |
| 💬 **Conversation Memory** | Remembers the full thread history — follow-up questions work like ChatGPT |
| ✍️ **Typewriter Effect** | Responses appear word-by-word for a natural chat experience |
| 🚨 **Smart Escalation** | Sensitive topics (billing, legal, fraud) auto-route to a human agent |
| 🔐 **Auth** | Email/password + Google OAuth via Supabase |
| 🗂️ **Thread Management** | Create, rename, and delete conversation threads |

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
     │         (Technical Expert / Frustrated User / Business Executive)
     │
     ├──► Sensitive keyword check?
     │         (refund, fraud, legal, chargeback, etc.)
     │         YES → Human escalation message
     │         NO  ↓
     │
     ├──► Fetch last 20 messages from thread (conversation memory)
     │
     └──► Gemini 2.5 Flash ──► Adaptive response (in your persona's tone)
                                       │
                               Saved to Supabase → Displayed with typewriter effect
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

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [TanStack Start](https://tanstack.com/start) (React + Vite SSR) |
| Routing | [TanStack Router](https://tanstack.com/router) |
| AI | [Google Gemini 2.5 Flash](https://aistudio.google.com) via `@ai-sdk/google` |
| Database & Auth | [Supabase](https://supabase.com) (Postgres + Row Level Security) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| UI Components | [Radix UI](https://radix-ui.com) + custom AI elements |
| State | [TanStack Query](https://tanstack.com/query) |
| Markdown | [Streamdown](https://github.com/streamdown/streamdown) |

---

## 📁 Project Structure

```
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
│   ├── chat.functions.ts       # Core: persona classify → memory → Gemini → save
│   ├── ai-gateway.server.ts    # Gemini provider factory
│   ├── personas.ts             # Persona types, threshold, sensitive keywords
│   ├── threads.functions.ts    # Thread CRUD server functions
│   ├── rag.functions.ts        # Knowledge base seeding (optional)
│   └── seed-docs.ts            # Sample support documentation
│
└── integrations/
    └── supabase/               # Supabase client, auth middleware, types
```

---

## ⚡ Escalation Keywords

The following keywords in a message automatically trigger a human escalation (no AI response):

`refund` · `chargeback` · `lawyer` · `legal` · `sue` · `lawsuit` · `cancel my account` · `delete my account` · `duplicate charge` · `fraud` · `unauthorized charge`

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

## 🧪 Example Test Questions

Try these to see each persona in action:

**⚙️ Technical Expert:**
> "My API requests are returning 429 errors even below the rate limit. I'm using exponential backoff at 500ms. Could this be a per-endpoint limit? What headers should I inspect?"

**❤️ Frustrated User:**
> "This is ridiculous! I've been trying to log in for 2 hours and keep getting 'session expired'. Nothing is working!"

**◆ Business Executive:**
> "What's the SLA for premium support and typical P1 incident resolution time?"

**🚨 Escalation trigger:**
> "I was charged twice this month and I want a refund immediately."

---

## 🤝 Contributing

This project is connected to [Lovable](https://lovable.dev). Avoid force-pushing, rebasing, or squashing commits that are already pushed — it rewrites history on Lovable's side.

---

## 📄 License

MIT
