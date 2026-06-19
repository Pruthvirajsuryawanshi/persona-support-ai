"""
src/escalator.py
Escalation logic and human handoff summary generator.

Escalation is triggered when ANY of these conditions is true:
  1. Sensitive keyword detected in the user's message (billing/legal/fraud)
  2. Top retrieval confidence score is below CONFIDENCE_THRESHOLD (0.40)
  3. Repeated frustration — current + at least one prior frustrated turn
"""

import json
from src.config import CONFIDENCE_THRESHOLD, SENSITIVE_KEYWORDS


# ── Persona-aware escalation messages ──────────────────────────────────────────

def _escalation_message(persona: str, reason: str) -> str:
    """Return a persona-appropriate escalation message."""
    if reason == "low_confidence":
        if persona == "Frustrated User":
            return (
                "I'm sorry — I couldn't find the precise answer in our documentation. "
                "I'm connecting you with a live specialist right away who can help resolve this for you."
            )
        elif persona == "Business Executive":
            return (
                "I don't have sufficient documentation to answer this confidently. "
                "Routing to a specialist now — expected first response within 15 minutes during business hours."
            )
        else:
            return (
                "I was unable to locate a documented solution for this request. "
                "Escalating to a human specialist with full conversation context."
            )

    if reason == "repeated_frustration":
        return (
            "I can see this situation has been very frustrating, and I want to make sure "
            "you get the right help immediately. I'm connecting you with a human specialist "
            "who will have the full context of our conversation."
        )

    # sensitive_topic
    if persona == "Frustrated User":
        return (
            "I completely understand how frustrating this is. Because this involves a sensitive "
            "matter, I'm connecting you with a human specialist right now — they'll have the full "
            "context and authority to resolve this for you directly."
        )
    elif persona == "Business Executive":
        return (
            "This requires direct human handling. Routing to a specialist now. "
            "Expected first response: within 15 minutes during business hours. "
            "The full context has been packaged for them."
        )
    else:
        return (
            "This topic requires direct human review due to its sensitive nature. "
            "I'm escalating to a specialist with the full conversation context attached."
        )


def _recommended_action(reason: str, persona: str) -> str:
    """Return actionable next steps for the human agent."""
    if reason == "sensitive_topic":
        return (
            "Verify customer identity, review account activity, and address the "
            "financial or legal concern directly. Prioritize based on urgency."
        )
    elif reason == "repeated_frustration":
        return (
            "Prioritize this ticket — customer shows sustained frustration. "
            "Review full conversation history and contact them directly."
        )
    else:
        return (
            "Review system logs, verify knowledge base coverage for this topic, "
            "and contact the user with a researched, accurate answer."
        )


# ── Main escalation check ──────────────────────────────────────────────────────

def check_escalation(
    user_query: str,
    persona: str,
    context_chunks: list[dict],
    conversation_history: list[dict],
) -> dict:
    """
    Evaluate all escalation triggers and return a structured result.

    Args:
        user_query:           Current user message.
        persona:              Detected persona string.
        context_chunks:       Retrieved RAG chunks [{text, source, score}].
        conversation_history: Full prior turns [{"role": ..., "content": ..., "persona": ...}].

    Returns:
        {
            "should_escalate": bool,
            "reason": str | None,        # "sensitive_topic" | "low_confidence" | "repeated_frustration"
            "escalation_message": str | None,
            "handoff_summary": dict | None,
        }
    """
    query_lower = user_query.lower()

    # ── Trigger 1: Sensitive keywords ──────────────────────────────────────────
    detected_keyword = next(
        (kw for kw in SENSITIVE_KEYWORDS if kw in query_lower), None
    )
    sensitive = detected_keyword is not None

    # ── Trigger 2: Low retrieval confidence ────────────────────────────────────
    best_score = max((c["score"] for c in context_chunks), default=0.0)
    low_confidence = len(context_chunks) == 0 or best_score < CONFIDENCE_THRESHOLD

    # ── Trigger 3: Repeated frustration ────────────────────────────────────────
    prior_frustrated_turns = sum(
        1
        for turn in conversation_history
        if turn.get("role") == "assistant" and turn.get("persona") == "Frustrated User"
    )
    repeated_frustration = persona == "Frustrated User" and prior_frustrated_turns >= 1

    # ── Priority order ─────────────────────────────────────────────────────────
    if sensitive:
        reason = "sensitive_topic"
    elif repeated_frustration:
        reason = "repeated_frustration"
    elif low_confidence:
        reason = "low_confidence"
    else:
        return {
            "should_escalate": False,
            "reason": None,
            "escalation_message": None,
            "handoff_summary": None,
        }

    # ── Build handoff summary ──────────────────────────────────────────────────
    # Collect conversation steps attempted before escalation
    attempted_steps = [
        turn["content"][:120]
        for turn in conversation_history
        if turn.get("role") == "assistant" and not turn.get("escalated")
    ]

    handoff = generate_handoff_summary(
        user_query=user_query,
        persona=persona,
        context_chunks=context_chunks,
        reason=reason,
        conversation_history=conversation_history,
        attempted_steps=attempted_steps,
        best_score=best_score,
    )

    return {
        "should_escalate": True,
        "reason": reason,
        "escalation_message": _escalation_message(persona, reason),
        "handoff_summary": handoff,
    }


def generate_handoff_summary(
    user_query: str,
    persona: str,
    context_chunks: list[dict],
    reason: str,
    conversation_history: list[dict] | None = None,
    attempted_steps: list[str] | None = None,
    best_score: float = 0.0,
) -> dict:
    """
    Generate a structured JSON handoff report for the human support agent.

    Returns:
        {
            "persona": str,
            "issue": str,
            "documents_used": [str],
            "attempted_steps": [str],
            "confidence_score": float,
            "escalation_reason": str,
            "conversation_history": [...],
            "recommendation": str,
        }
    """
    history = conversation_history or []
    steps = attempted_steps or []

    return {
        "persona": persona,
        "issue": user_query[:200],
        "documents_used": list({c["source"] for c in context_chunks}),
        "attempted_steps": steps[:5],        # Last 5 agent responses before escalation
        "confidence_score": round(best_score, 4),
        "escalation_reason": reason,
        "conversation_history": [
            {"role": t["role"], "content": t["content"][:200]}
            for t in history[-6:]            # Last 6 turns for context
        ],
        "recommendation": _recommended_action(reason, persona),
    }


# ── Standalone smoke-test ───────────────────────────────────────────────────────
if __name__ == "__main__":
    # Test: sensitive topic
    result = check_escalation(
        user_query="I have duplicate charges and demand a refund immediately!",
        persona="Frustrated User",
        context_chunks=[{"text": "...", "source": "billing_policy.txt", "score": 0.72}],
        conversation_history=[],
    )
    print("Sensitive topic test:")
    print(f"  Should escalate: {result['should_escalate']}")
    print(f"  Reason         : {result['reason']}")
    print(f"  Handoff JSON   :\n{json.dumps(result['handoff_summary'], indent=2)}")

    # Test: low confidence
    result2 = check_escalation(
        user_query="Tell me about your quantum encryption protocols",
        persona="Technical Expert",
        context_chunks=[],
        conversation_history=[],
    )
    print("\nLow confidence test:")
    print(f"  Should escalate: {result2['should_escalate']}")
    print(f"  Reason         : {result2['reason']}")
