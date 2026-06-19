"""
src/generator.py
Persona-Adaptive Response Generator.

Combines the classified persona, retrieved document chunks, and conversation
history to build a grounded system prompt, then calls Gemini to produce a
persona-appropriate response.
"""

from google import genai
from google.genai import types
from src.config import GEMINI_API_KEY, GEMINI_MODEL
from src.escalator import check_escalation


def _persona_instructions(persona: str) -> str:
    """Return the system instruction block for the given persona."""
    if persona == "Technical Expert":
        return (
            "You are a Senior Systems Engineer providing live technical support.\n"
            "- Deliver precise root-cause analysis and configuration specifications.\n"
            "- Include code blocks, API pathways, or exact error-resolution steps when supported by context.\n"
            "- Keep language exact and structured. Avoid marketing language.\n"
            "- Use bullet points or numbered lists for multi-step procedures."
        )
    elif persona == "Frustrated User":
        return (
            "You are a deeply empathetic Customer Care Specialist in a live support chat.\n"
            "- Begin with a single warm, genuine validation of their difficulty.\n"
            "- Use simple, clear, reassuring language — no jargon.\n"
            "- List action steps as short bullet points (3–5 max).\n"
            "- Keep the total response under 150 words. Be calm and reassuring throughout."
        )
    else:  # Business Executive
        return (
            "You are a concise Client Relations Director.\n"
            "- Lead with the direct answer or business impact summary.\n"
            "- Include a resolution timeline where relevant.\n"
            "- Keep the response under 100 words — no code, no bullet lists, no technical detail.\n"
            "- Use professional, outcome-focused language."
        )


def _build_context_block(context_chunks: list[dict]) -> str:
    """Format retrieved chunks into a readable context block for the prompt."""
    if not context_chunks:
        return "(No matching documents found in the knowledge base.)"
    lines = []
    for chunk in context_chunks:
        lines.append(f"Source [{chunk['source']}]:\n{chunk['text']}")
    return "\n\n".join(lines)


def _build_conversation_contents(
    conversation_history: list[dict],
    user_query: str,
    system_prompt: str,
) -> list:
    """
    Build the multi-turn message list for the Gemini API.

    conversation_history format:
        [{"role": "user"|"assistant", "content": "..."}]
    """
    contents = []
    for turn in conversation_history:
        role = "user" if turn["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=turn["content"])]))
    # Append the current query
    contents.append(types.Content(role="user", parts=[types.Part(text=user_query)]))
    return contents


def generate_adaptive_response(
    user_query: str,
    persona: str,
    context_chunks: list[dict],
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Generate a persona-appropriate, context-grounded response.

    Steps:
        1. Run escalation check — if triggered, return handoff payload.
        2. Select persona-specific system instructions.
        3. Compile grounded system prompt with FACTUAL CONTEXT DOCUMENTS.
        4. Call Gemini with full conversation history for multi-turn memory.

    Args:
        user_query:           The user's current message.
        persona:              Detected persona string.
        context_chunks:       Retrieved RAG chunks [{text, source, score}].
        conversation_history: Prior turns [{"role": ..., "content": ...}].

    Returns:
        {
            "escalated": bool,
            "response": str,
            "handoff_summary": dict | None,
        }
    """
    history = conversation_history or []

    # ── Step 1: Escalation check ───────────────────────────────────────────────
    escalation_result = check_escalation(user_query, persona, context_chunks, history)
    if escalation_result["should_escalate"]:
        return {
            "escalated": True,
            "response": escalation_result["escalation_message"],
            "handoff_summary": escalation_result["handoff_summary"],
        }

    # ── Step 2: Build persona-specific system prompt ───────────────────────────
    persona_instructions = _persona_instructions(persona)
    context_block = _build_context_block(context_chunks)

    full_system_prompt = (
        f"{persona_instructions}\n\n"
        "CRITICAL RULES:\n"
        "- Base your response ONLY on the provided FACTUAL CONTEXT DOCUMENTS below.\n"
        "- Do not hallucinate URLs, prices, policies, or steps not present in the context.\n"
        "- If context lacks enough detail, say so briefly and suggest contacting support.\n"
        "- This is a live chat — keep responses concise and direct.\n"
        "- Never use markdown headers (##). Plain text or bullet points only.\n\n"
        f"FACTUAL CONTEXT DOCUMENTS:\n{context_block}"
    )

    # ── Step 3: Build conversation contents ────────────────────────────────────
    client = genai.Client(api_key=GEMINI_API_KEY)
    contents = _build_conversation_contents(history, user_query, full_system_prompt)

    # ── Step 4: Generate response ──────────────────────────────────────────────
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=full_system_prompt,
            temperature=0.2,
        ),
    )

    return {
        "escalated": False,
        "response": response.text,
        "handoff_summary": None,
    }


# ── Standalone smoke-test ───────────────────────────────────────────────────────
if __name__ == "__main__":
    import json
    from src.rag_pipeline import LocalRAGPipeline

    pipeline = LocalRAGPipeline()
    if pipeline.get_chunk_count() == 0:
        print("Indexing knowledge base first…")
        pipeline.ingest_all_documents()

    test_queries = [
        ("What are the header parameter requirements for bearer token auth?", "Technical Expert"),
        ("My page won't load and I've been waiting an hour! Help!", "Frustrated User"),
        ("When will billing disputes be resolved?", "Business Executive"),
    ]

    for query, persona in test_queries:
        print(f"\n{'='*60}")
        print(f"Persona : {persona}")
        print(f"Query   : {query}")
        chunks = pipeline.retrieve_context(query)
        result = generate_adaptive_response(query, persona, chunks)
        if result["escalated"]:
            print(f"ESCALATED: {result['response']}")
            print(f"Handoff  : {json.dumps(result['handoff_summary'], indent=2)}")
        else:
            print(f"Response : {result['response']}")
