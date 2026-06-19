"""
src/classifier.py
Persona detection module.

Analyzes an incoming support message and classifies it into one of three
customer personas using Gemini's structured JSON output:
  - Technical Expert
  - Frustrated User
  - Business Executive
"""

import json
from google import genai
from google.genai import types
from src.config import GEMINI_API_KEY, GEMINI_MODEL


def classify_customer_persona(user_message: str) -> dict:
    """
    Analyzes the user's message and classifies it into one of three target personas.

    Args:
        user_message: The raw support message from the customer.

    Returns:
        A dict with keys: persona (str), confidence (float 0–1), reasoning (str)

    Example:
        >>> result = classify_customer_persona("Our API keeps returning 401 errors")
        >>> result["persona"]
        'Technical Expert'
    """
    client = genai.Client(api_key=GEMINI_API_KEY)

    system_instruction = (
        "You are an advanced classification engine. Your task is to analyze the "
        "sentiment, vocabulary, and tone of an incoming support message and classify "
        "it into exactly one of three customer personas:\n"
        "1. 'Technical Expert': Uses jargon, asks about APIs/code/configs/error codes, "
        "wants detailed explanations, mentions logs or system diagnostics.\n"
        "2. 'Frustrated User': Uses emotional language, exclamation marks, mentions "
        "urgency, expresses anger or repeated failure.\n"
        "3. 'Business Executive': Focuses on business impact, ROI, timelines, "
        "deliverables, and brevity. Avoids technical jargon.\n\n"
        "Provide your evaluation strictly in the requested JSON structure."
    )

    # Structured JSON output schema (Gemini controlled generation)
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "persona": {
                "type": "STRING",
                "enum": ["Technical Expert", "Frustrated User", "Business Executive"],
            },
            "confidence": {"type": "NUMBER"},
            "reasoning": {"type": "STRING"},
        },
        "required": ["persona", "confidence", "reasoning"],
    }

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=response_schema,
            temperature=0.1,
        ),
    )

    return json.loads(response.text)


# ── Standalone smoke-test ───────────────────────────────────────────────────────
if __name__ == "__main__":
    test_cases = [
        "Our production API key stopped working with a 401 Unauthorized block.",
        "I've been waiting for hours and NOTHING is working! This is unacceptable!",
        "What is the projected timeline for resolving the billing dispute backlog?",
    ]
    for msg in test_cases:
        print(f"\nMessage: {msg[:60]}...")
        result = classify_customer_persona(msg)
        print(json.dumps(result, indent=2))
