"""
app.py
Persona-Adaptive Customer Support Agent — Streamlit Web UI

Run:
    streamlit run app.py
"""

import json
import time
import streamlit as st
from src.config import CONFIDENCE_THRESHOLD
from src.classifier import classify_customer_persona
from src.rag_pipeline import LocalRAGPipeline
from src.generator import generate_adaptive_response

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Persona Support AI",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ─────────────────────────────────────────────────────────────────
st.markdown(
    """
    <style>
    /* ── Global ── */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

    /* ── Hide default Streamlit chrome ── */
    #MainMenu, footer, header { visibility: hidden; }
    .block-container { padding-top: 1rem; padding-bottom: 0; }

    /* ── Sidebar ── */
    [data-testid="stSidebar"] { background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%); }
    [data-testid="stSidebar"] * { color: #e2e8f0 !important; }
    [data-testid="stSidebar"] .stButton > button {
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white !important;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        width: 100%;
    }
    [data-testid="stSidebar"] .stButton > button:hover {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        transform: translateY(-1px);
    }

    /* ── Chat messages ── */
    .user-bubble {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        border-radius: 18px 18px 4px 18px;
        padding: 0.75rem 1.1rem;
        margin-left: auto;
        max-width: 72%;
        box-shadow: 0 2px 12px rgba(99,102,241,0.3);
        font-size: 0.95rem;
        line-height: 1.5;
        word-wrap: break-word;
    }
    .assistant-bubble {
        background: #1e1e2e;
        border: 1px solid #2d2d3d;
        color: #e2e8f0;
        border-radius: 18px 18px 18px 4px;
        padding: 0.9rem 1.2rem;
        max-width: 80%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        font-size: 0.95rem;
        line-height: 1.6;
    }
    .msg-row-user { display: flex; justify-content: flex-end; margin-bottom: 1rem; }
    .msg-row-assistant { display: flex; justify-content: flex-start; margin-bottom: 1rem; }

    /* ── Persona badge ── */
    .persona-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.72rem;
        font-weight: 600;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        margin-bottom: 0.5rem;
        letter-spacing: 0.02em;
    }
    .badge-technical { background: rgba(59,130,246,0.15); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3); }
    .badge-frustrated { background: rgba(239,68,68,0.12); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
    .badge-executive  { background: rgba(168,85,247,0.15); color: #d8b4fe; border: 1px solid rgba(168,85,247,0.3); }

    /* ── Sources ── */
    .sources-block {
        margin-top: 0.7rem;
        padding-top: 0.6rem;
        border-top: 1px solid #2d2d3d;
        font-size: 0.78rem;
        color: #94a3b8;
    }
    .source-chip {
        display: inline-block;
        background: #2d2d3d;
        border-radius: 6px;
        padding: 0.15rem 0.5rem;
        margin: 0.15rem 0.2rem 0 0;
        font-size: 0.73rem;
        color: #94a3b8;
    }

    /* ── Escalation card ── */
    .escalation-card {
        background: linear-gradient(135deg, #1f1010 0%, #2d1515 100%);
        border: 1px solid rgba(239,68,68,0.35);
        border-radius: 12px;
        padding: 1rem 1.1rem;
        margin-top: 0.3rem;
    }
    .escalation-header {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: #f87171;
        font-weight: 600;
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
    }
    .escalation-reason-badge {
        font-size: 0.68rem;
        font-weight: 500;
        background: rgba(239,68,68,0.15);
        color: #fca5a5;
        border-radius: 999px;
        padding: 0.1rem 0.5rem;
    }
    .escalation-msg { color: #e2e8f0; font-size: 0.9rem; line-height: 1.5; }

    /* ── Chat input styling ── */
    .stChatInputContainer { border-top: 1px solid #2d2d3d !important; }
    textarea { background: #1e1e2e !important; color: #e2e8f0 !important; }

    /* ── Example query buttons ── */
    .example-btn { text-align: left !important; }
    </style>
    """,
    unsafe_allow_html=True,
)

# ── Persona helpers ────────────────────────────────────────────────────────────
PERSONA_META = {
    "Technical Expert": {"emoji": "⚙️", "badge_class": "badge-technical", "label": "Technical Expert"},
    "Frustrated User":  {"emoji": "❤️", "badge_class": "badge-frustrated", "label": "Frustrated User"},
    "Business Executive": {"emoji": "◆", "badge_class": "badge-executive", "label": "Business Executive"},
}

ESCALATION_REASON_LABELS = {
    "sensitive_topic":      "Sensitive topic",
    "low_confidence":       "Low documentation confidence",
    "repeated_frustration": "Repeated frustration",
}

# ── Session state init ─────────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []          # [{"role", "content", "persona", "confidence", "sources", "escalated", "handoff", "reasoning"}]
if "pipeline" not in st.session_state:
    st.session_state.pipeline = None
if "kb_ready" not in st.session_state:
    st.session_state.kb_ready = False


@st.cache_resource(show_spinner=False)
def load_pipeline() -> LocalRAGPipeline:
    """Load (or build) the RAG pipeline once per session."""
    pipeline = LocalRAGPipeline()
    if pipeline.get_chunk_count() == 0:
        pipeline.ingest_all_documents()
    return pipeline


# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🤖 Persona Support AI")
    st.markdown("*Powered by Gemini 2.5 Flash + ChromaDB*")
    st.divider()

    # Knowledge base status
    st.markdown("### 📚 Knowledge Base")
    try:
        pipeline = load_pipeline()
        chunk_count = pipeline.get_chunk_count()
        if chunk_count > 0:
            st.success(f"✅ {chunk_count} chunks indexed")
            st.session_state.kb_ready = True
            st.session_state.pipeline = pipeline
        else:
            st.warning("⚠️ Knowledge base is empty")
    except Exception as e:
        st.error(f"❌ Error loading KB: {e}")
        pipeline = None

    if st.button("🔄 Re-index Knowledge Base"):
        with st.spinner("Re-indexing…"):
            try:
                p = LocalRAGPipeline()
                p.clear_index()
                summary = p.ingest_all_documents()
                st.session_state.pipeline = p
                st.success(f"✅ Indexed {sum(summary.values())} chunks from {len(summary)} files")
                st.rerun()
            except Exception as e:
                st.error(f"Failed: {e}")

    st.divider()

    # Escalation thresholds display
    st.markdown("### ⚡ Escalation Triggers")
    st.markdown(
        f"""
- 🔑 **Sensitive keywords** detected  
- 📉 **Similarity score** < `{CONFIDENCE_THRESHOLD}`  
- 😤 **Repeated frustration** (≥ 2 turns)
        """
    )
    st.divider()

    # Example queries
    st.markdown("### 💡 Example Queries")
    examples = [
        "Where is the guide to clear cookies? It's been an hour!",
        "What are the header parameters for bearer token auth?",
        "Our uptime is decreasing. Timeline for billing disputes?",
        "Database integration causing internal errors.",
        "Duplicate charges — I demand an immediate refund!",
    ]
    for ex in examples:
        if st.button(f"📝 {ex[:45]}…" if len(ex) > 45 else f"📝 {ex}", key=ex, help=ex):
            st.session_state["pending_example"] = ex
            st.rerun()

    st.divider()
    if st.button("🗑️ Clear conversation"):
        st.session_state.messages = []
        st.rerun()


# ── Main area ──────────────────────────────────────────────────────────────────
st.markdown(
    "<h1 style='font-size:1.6rem; font-weight:700; margin-bottom:0.25rem;'>"
    "🤖 Persona-Adaptive Customer Support Agent</h1>"
    "<p style='color:#94a3b8; font-size:0.85rem; margin-bottom:1rem;'>"
    "Powered by <b>Gemini 2.5 Flash</b> · RAG with <b>ChromaDB</b> · "
    "Persona-aware responses · Human escalation</p>",
    unsafe_allow_html=True,
)


def render_persona_badge(persona: str, confidence: float | None = None) -> str:
    meta = PERSONA_META.get(persona, {"emoji": "?", "badge_class": "badge-technical", "label": persona})
    conf_text = f" · {confidence*100:.0f}%" if confidence is not None else ""
    return (
        f'<span class="persona-badge {meta["badge_class"]}">'
        f'{meta["emoji"]} {meta["label"]}{conf_text}</span>'
    )


def render_sources(sources: list[dict]) -> str:
    if not sources:
        return ""
    chips = "".join(
        f'<span class="source-chip">📄 {s["source"]} '
        f'<span style="opacity:0.6">({s["score"]:.2f})</span></span>'
        for s in sources
    )
    return f'<div class="sources-block">📎 Sources: {chips}</div>'


def render_escalation_card(content: str, handoff: dict | None, reason: str | None) -> str:
    reason_label = ESCALATION_REASON_LABELS.get(reason or "", "")
    badge = f'<span class="escalation-reason-badge">· {reason_label}</span>' if reason_label else ""
    return (
        f'<div class="escalation-card">'
        f'<div class="escalation-header">🚨 Escalated to human agent {badge}</div>'
        f'<div class="escalation-msg">{content}</div>'
        f"</div>"
    )


# ── Render existing messages ───────────────────────────────────────────────────
chat_container = st.container()
with chat_container:
    for msg in st.session_state.messages:
        if msg["role"] == "user":
            st.markdown(
                f'<div class="msg-row-user"><div class="user-bubble">{msg["content"]}</div></div>',
                unsafe_allow_html=True,
            )
        else:
            badge_html = render_persona_badge(msg.get("persona", ""), msg.get("confidence"))
            if msg.get("escalated"):
                body_html = render_escalation_card(
                    msg["content"],
                    msg.get("handoff"),
                    msg.get("escalation_reason"),
                )
            else:
                response_text = msg["content"].replace("\n", "<br>")
                body_html = f"<div>{response_text}</div>"
            sources_html = render_sources(msg.get("sources") or [])

            st.markdown(
                f'<div class="msg-row-assistant">'
                f'<div class="assistant-bubble">'
                f"{badge_html}{body_html}{sources_html}"
                f"</div></div>",
                unsafe_allow_html=True,
            )

            # Show expandable handoff JSON if escalated
            if msg.get("escalated") and msg.get("handoff"):
                with st.expander("📋 View Handoff JSON", expanded=False):
                    st.code(json.dumps(msg["handoff"], indent=2), language="json")


# ── Handle example query injection ────────────────────────────────────────────
user_input = None
if "pending_example" in st.session_state:
    user_input = st.session_state.pop("pending_example")

# ── Chat input box ─────────────────────────────────────────────────────────────
chat_in = st.chat_input("Ask a support question — persona is detected automatically…")
if chat_in:
    user_input = chat_in


# ── Process user message ───────────────────────────────────────────────────────
def process_message(message: str):
    if not st.session_state.get("kb_ready"):
        st.error("Knowledge base is not ready. Please click 'Re-index Knowledge Base' in the sidebar.")
        return

    p: LocalRAGPipeline = st.session_state.pipeline

    # Save user message
    st.session_state.messages.append({"role": "user", "content": message})

    # Show user bubble immediately
    st.markdown(
        f'<div class="msg-row-user"><div class="user-bubble">{message}</div></div>',
        unsafe_allow_html=True,
    )

    # Processing indicator
    with st.spinner("Classifying persona and retrieving context…"):
        # 1. Classify persona
        try:
            classification = classify_customer_persona(message)
        except Exception as e:
            st.error(f"Classification error: {e}")
            return

        persona = classification.get("persona", "Technical Expert")
        confidence = classification.get("confidence", 0.5)
        reasoning = classification.get("reasoning", "")

        # 2. Retrieve context
        try:
            context_chunks = p.retrieve_context(message)
        except Exception as e:
            st.error(f"Retrieval error: {e}")
            return

        # 3. Build conversation history for multi-turn memory
        history = [
            {
                "role": m["role"],
                "content": m["content"],
                "persona": m.get("persona"),
                "escalated": m.get("escalated", False),
            }
            for m in st.session_state.messages[:-1]  # exclude current user message
        ]

        # 4. Generate response
        try:
            result = generate_adaptive_response(message, persona, context_chunks, history)
        except Exception as e:
            st.error(f"Generation error: {e}")
            return

    # 5. Render assistant response
    badge_html = render_persona_badge(persona, confidence)
    if result["escalated"]:
        reason = (result.get("handoff_summary") or {}).get("escalation_reason")
        body_html = render_escalation_card(result["response"], result.get("handoff_summary"), reason)
    else:
        response_text = result["response"].replace("\n", "<br>")
        body_html = f"<div>{response_text}</div>"

    sources_html = render_sources(
        [{"source": c["source"], "score": c["score"]} for c in context_chunks]
        if not result["escalated"]
        else []
    )

    st.markdown(
        f'<div class="msg-row-assistant">'
        f'<div class="assistant-bubble">'
        f"{badge_html}{body_html}{sources_html}"
        f"</div></div>",
        unsafe_allow_html=True,
    )

    # Show expandable handoff JSON
    if result["escalated"] and result.get("handoff_summary"):
        with st.expander("📋 View Handoff JSON", expanded=True):
            st.code(json.dumps(result["handoff_summary"], indent=2), language="json")

    # Show classification reasoning in expander (debug / transparency)
    if reasoning:
        with st.expander(f"🔍 Classification reasoning ({persona})", expanded=False):
            st.markdown(f"**Confidence:** {confidence*100:.0f}%")
            st.markdown(f"**Reasoning:** {reasoning}")
            if context_chunks:
                st.markdown("**Top retrieved chunks:**")
                for c in context_chunks:
                    st.markdown(f"- `[{c['score']:.3f}]` **{c['source']}** — {c['text'][:100]}…")

    # 6. Save assistant message to session state
    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": result["response"],
            "persona": persona,
            "confidence": confidence,
            "reasoning": reasoning,
            "escalated": result["escalated"],
            "escalation_reason": (result.get("handoff_summary") or {}).get("escalation_reason"),
            "handoff": result.get("handoff_summary"),
            "sources": [
                {"source": c["source"], "score": c["score"]} for c in context_chunks
            ],
        }
    )


if user_input:
    process_message(user_input)
