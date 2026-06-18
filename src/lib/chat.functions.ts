import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PERSONAS, CONFIDENCE_THRESHOLD, SENSITIVE_KEYWORDS, type Persona } from "./personas";

const SendMessageInput = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

type RetrievedChunk = {
  source: string;
  title: string | null;
  content: string;
  similarity: number;
};

type ClassifyResult = {
  persona: Persona;
  confidence: number;
  reasoning: string;
};

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendMessageInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase, userId } = context;

    // Verify thread belongs to user
    const { data: thread, error: threadErr } = await supabase
      .from("threads")
      .select("id, title")
      .eq("id", data.threadId)
      .single();
    if (threadErr || !thread) throw new Error("Thread not found");

    // Persist user message immediately
    const { data: userMsg, error: userMsgErr } = await supabase
      .from("messages")
      .insert({
        thread_id: data.threadId,
        user_id: userId,
        role: "user",
        content: data.message,
      })
      .select("*")
      .single();
    if (userMsgErr) throw new Error(userMsgErr.message);

    // 1. Classify persona
    const classification = await classifyPersona(apiKey, data.message);

    // 2. Retrieve top-k chunks via embedding + match function
    const { embedText, createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const queryEmbedding = await embedText(apiKey, data.message);
    const { data: matches, error: matchErr } = await supabase.rpc("match_doc_chunks", {
      query_embedding: queryEmbedding as unknown as string,
      match_count: 4,
    });
    if (matchErr) throw new Error(`Retrieval failed: ${matchErr.message}`);
    const chunks: RetrievedChunk[] = (matches ?? []) as RetrievedChunk[];
    const topScore = chunks.length > 0 ? Math.max(...chunks.map((c) => c.similarity)) : 0;

    // 3. Escalation triggers
    const sensitive = SENSITIVE_KEYWORDS.some((kw) =>
      data.message.toLowerCase().includes(kw),
    );
    const lowConfidence = topScore < CONFIDENCE_THRESHOLD;
    const escalate = sensitive || lowConfidence;

    let assistantContent: string;
    let handoff: Record<string, unknown> | null = null;

    if (escalate) {
      handoff = {
        reason: sensitive
          ? "Sensitive topic detected (billing / refund / legal / account modification)"
          : "Low retrieval confidence",
        persona: classification.persona,
        persona_confidence: classification.confidence,
        top_retrieval_score: Number(topScore.toFixed(3)),
        customer_issue: data.message,
        retrieved_sources: chunks.map((c) => ({
          source: c.source,
          similarity: Number(c.similarity.toFixed(3)),
        })),
        recommended_action: sensitive
          ? "Human agent should review the account, verify identity, and address the financial/legal concern directly."
          : "Knowledge base did not match. Human agent should triage and capture any missing documentation.",
        created_at: new Date().toISOString(),
      };
      assistantContent =
        classification.persona === "Frustrated User"
          ? "I completely understand how frustrating this is, and I want to make sure it's handled correctly. I'm connecting you with a human specialist right now — they'll have the full context of this conversation when they pick up."
          : classification.persona === "Business Executive"
            ? "This requires direct human handling. I'm routing this to a specialist now. Expected first response: under 15 minutes during business hours. The full context has been packaged for them."
            : "I don't have a confident answer for this from the knowledge base. I'm escalating to a human engineer with the full conversation context, the persona classification, and the retrieval trace.";
    } else {
      // 4. Adaptive generation
      const gateway = createLovableAiGatewayProvider(apiKey);
      const { generateText } = await import("ai");
      const personaInstructions = personaPrompt(classification.persona);
      const contextText = chunks
        .map(
          (c, i) =>
            `[${i + 1}] Source: ${c.source}${c.title ? ` — ${c.title}` : ""} (similarity ${c.similarity.toFixed(2)})\n${c.content}`,
        )
        .join("\n\n---\n\n");

      const systemPrompt = `${personaInstructions}

CRITICAL RULES:
- Base your response ONLY on the FACTUAL CONTEXT below.
- Do not invent steps, URLs, code, or policy that aren't in the context.
- Cite sources inline using [n] matching the bracketed context entries.
- If the context doesn't cover an aspect of the question, say so plainly.

FACTUAL CONTEXT:
${contextText}`;

      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: systemPrompt,
        prompt: data.message,
        temperature: 0.2,
      });
      assistantContent = text;
    }

    // 5. Persist assistant message
    const { data: assistantMsg, error: aErr } = await supabase
      .from("messages")
      .insert({
        thread_id: data.threadId,
        user_id: userId,
        role: "assistant",
        content: assistantContent,
        persona: classification.persona,
        persona_confidence: classification.confidence,
        escalated: escalate,
        handoff_summary: handoff as never,
        sources: chunks.map((c) => ({
          source: c.source,
          title: c.title,
          similarity: Number(c.similarity.toFixed(3)),
        })) as never,
        top_score: Number(topScore.toFixed(3)),
      })
      .select("*")
      .single();
    if (aErr) throw new Error(aErr.message);

    // 6. Touch thread + rename if first turn
    const updates: { updated_at: string; title?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (thread.title === "New conversation") {
      updates.title = data.message.slice(0, 60);
    }
    await supabase.from("threads").update(updates).eq("id", data.threadId);

    return {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      classification,
    };
  });

function personaPrompt(persona: Persona): string {
  switch (persona) {
    case "Technical Expert":
      return `You are a Senior Systems Engineer responding to a fellow technical user.
- Use precise terminology, exact parameter names, and code blocks where useful.
- Structure with numbered steps or fenced code where it helps comprehension.
- Skip soft pleasantries. Get to root cause and verification steps.
- Mention relevant error codes, headers, and config flags.`;
    case "Frustrated User":
      return `You are an empathetic Customer Care Specialist.
- Open with one sincere, brief acknowledgment of the inconvenience (no theatrics).
- Use plain language. Avoid jargon and avoid long paragraphs.
- Give 3-5 simple bulleted steps the user can do right now.
- End by offering a clear next step if it still doesn't work.`;
    case "Business Executive":
      return `You are a concise Client Relations Director responding to a senior stakeholder.
- Lead with the direct answer or status in one sentence.
- Quantify impact and timelines where possible.
- Keep it to under ~120 words. No code. No deep configuration detail.
- Close with one clear next action.`;
  }
}

async function classifyPersona(apiKey: string, message: string): Promise<ClassifyResult> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are a classification engine. Classify the support message into EXACTLY ONE persona:
- "Technical Expert": uses APIs/code/configs/jargon, asks systems-level questions.
- "Frustrated User": emotional, urgent, exclamation marks, expresses inconvenience or anger.
- "Business Executive": brief, focused on impact, ROI, timelines, deliverables.

Respond with ONLY a compact JSON object: {"persona":"...","confidence":0-1,"reasoning":"one short sentence"}.`,
        },
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    throw new Error(`Classification failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = json.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as ClassifyResult;
    if (!PERSONAS.includes(parsed.persona)) {
      return { persona: "Technical Expert", confidence: 0.3, reasoning: "Fallback" };
    }
    return {
      persona: parsed.persona,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return { persona: "Technical Expert", confidence: 0.3, reasoning: "Parse fallback" };
  }
}
