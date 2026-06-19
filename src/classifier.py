"""
src/classifier.py
Persona detection module.

Analyzes an incoming support message and classifies it into one of three
customer personas using OpenRouter's Llama model:
  - Technical Expert
  - Frustrated User
  - Business Executive
"""

import json
import requests
from src.config import OPENROUTER_API_KEY, OPENROUTER_MODEL


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
        "Respond ONLY with valid JSON in this exact format:\n"
        '{"persona": "...", "confidence": 0.0-1.0, "reasoning": "..."}'
    )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:8080",
        "X-Title": "Persona Support Agent",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.1,
        "max_tokens": 500,
    }
    
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
    )
    
    if response.status_code != 200:
        error_msg = response.json().get("error", {}).get("message", "Unknown error")
        raise Exception(f"OpenRouter API error ({response.status_code}): {error_msg}")
    
    result = response.json()
    response_text = result["choices"][0]["message"]["content"]
    
    # Parse JSON response
    try:
        classification = json.loads(response_text)
    except json.JSONDecodeError:
        # If JSON parsing fails, try to extract JSON from the response
        import re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            classification = json.loads(json_match.group())
        else:
            raise ValueError(f"Could not parse JSON from response: {response_text}")
    
    return classification


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
