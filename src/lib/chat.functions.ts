import fs from "node:fs";
import path from "node:path";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  RETRIEVAL_CONFIDENCE_THRESHOLD,
  SENSITIVE_KEYWORDS,
  type HandoffSummary,
  type Persona,
  type RetrievedChunk,
} from "./personas";

const SendMessageInput = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

type ClassifyResult = {
  persona: Persona;
  confidence: number;
  reasoning: string;
};

const TOP_K = 3;

function getApiKey(): string {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    try {
      const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf-8");
      const match = envContent.match(/GEMINI_API_KEY="?([^"\n]+)"?/);
      if (match) apiKey = match[1];
    } catch {
      // ignore
    }
  }
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in environment");
  return apiKey;
}

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendMessageInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = getApiKey();
    const { supabase, userId } = context;

    const { data: thread, error: threadErr } = await supabase
      .from("threads")
      .select("id, title")
      .eq("id", data.threadId)
      .single();
    if (threadErr || !thread) throw new Error("Thread not found");

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

    const classification = await classifyPersona(apiKey, data.message);

    const { ensureKnowledgeBaseSeeded } = await import("./kb-seed.server");
    try {
      await ensureKnowledgeBaseSeeded(supabase, apiKey);
    } catch (seedError) {
      console.warn("Supabase KB seed skipped, will use local fallback:", seedError);
    }

    const { data: history } = await supabase
      .from("messages")
      .select("role, content, persona")
      .eq("thread_id", data.threadId)
      .neq("id", userMsg.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const conversationMessages: { role: "user" | "assistant"; content: string }[] = [
      ...(history ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: data.message },
    ];

    const retrievedChunks = await retrieveContext(supabase, apiKey, data.message);
    const topScore =
      retrievedChunks.length > 0 ? Math.max(...retrievedChunks.map((c) => c.similarity)) : 0;

    const sensitive = SENSITIVE_KEYWORDS.some((kw) => data.message.toLowerCase().includes(kw));

    const priorFrustratedTurns = (history ?? []).filter(
      (m) => m.role === "assistant" && m.persona === "Frustrated User",
    ).length;
    const repeatedFrustration =
      classification.persona === "Frustrated User" && priorFrustratedTurns >= 1;

    const lowConfidence = retrievedChunks.length === 0 || topScore < RETRIEVAL_CONFIDENCE_THRESHOLD;

    const shouldEscalate = sensitive || lowConfidence || repeatedFrustration;

    let assistantContent: string;
    let handoff: HandoffSummary | null = null;

    if (shouldEscalate) {
      const escalationReason: HandoffSummary["escalation_reason"] = sensitive
        ? "sensitive_topic"
        : repeatedFrustration
          ? "repeated_frustration"
          : "low_confidence";

      handoff = {
        persona: classification.persona,
        detected_issue: data.message,
        retrieved_sources: [...new Set(retrievedChunks.map((c) => c.source))],
        confidence_score: topScore,
        recommended_action: recommendedAction(escalationReason, classification.persona),
        escalation_reason: escalationReason,
      };

      assistantContent = escalationMessage(classification.persona, escalationReason);
    } else {
      const { createGeminiProvider } = await import("./ai-gateway.server");
      const { generateText } = await import("ai");
      const provider = createGeminiProvider(apiKey);
      const personaInstructions = personaPrompt(classification.persona);
      const contextBlock = buildContextBlock(retrievedChunks);

      const systemPrompt = `${personaInstructions}

CRITICAL RULES:
- Base your response ONLY on the provided context documents below.
- Do not hallucinate URLs, prices, policies, or steps not found in the context.
- If the context does not contain enough detail, say so briefly.
- Keep responses SHORT. This is a live chat, not a document.
- Answer only what was asked. Never use headers (##).

FACTUAL CONTEXT DOCUMENTS:
${contextBlock}`;

      const { text } = await generateText({
        model: provider("gemini-2.5-flash"),
        system: systemPrompt,
        messages: conversationMessages,
        temperature: 0.2,
      });
      assistantContent = text;
    }

    const sourcesForDb = retrievedChunks.map((c) => ({
      source: c.source,
      title: c.title,
      similarity: c.similarity,
    }));

    const { data: assistantMsg, error: aErr } = await supabase
      .from("messages")
      .insert({
        thread_id: data.threadId,
        user_id: userId,
        role: "assistant",
        content: assistantContent,
        persona: classification.persona,
        persona_confidence: classification.confidence,
        escalated: shouldEscalate,
        handoff_summary: handoff as never,
        sources: sourcesForDb as never,
        top_score: topScore,
      })
      .select("*")
      .single();
    if (aErr) throw new Error(aErr.message);

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

async function retrieveContext(
  supabase: SupabaseClient<Database>,
  apiKey: string,
  query: string,
): Promise<RetrievedChunk[]> {
  const fromDb = await retrieveFromSupabase(supabase, apiKey, query);
  if (fromDb.length > 0) return fromDb;

  const { retrieveLocalContext } = await import("./local-rag.server");
  return retrieveLocalContext(apiKey, query, TOP_K);
}

async function retrieveFromSupabase(
  supabase: SupabaseClient<Database>,
  apiKey: string,
  query: string,
): Promise<RetrievedChunk[]> {
  const { embedText } = await import("./ai-gateway.server");
  const { toVectorLiteral } = await import("./kb-loader.server");

  const embedding = await embedText(apiKey, query);
  const { data, error } = await supabase.rpc("match_doc_chunks", {
    query_embedding: toVectorLiteral(embedding),
    match_count: TOP_K,
  });

  if (error) {
    console.warn("Supabase RAG retrieval error:", error.message);
    return [];
  }

  return (
    (data ?? []) as Array<{
      source: string;
      title: string | null;
      content: string;
      similarity: number;
    }>
  ).map((row) => ({
    source: row.source,
    title: row.title,
    content: row.content,
    similarity: row.similarity,
  }));
}

function buildContextBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "(No matching documents found.)";
  return chunks.map((c) => `Source [${c.source}]: ${c.content}`).join("\n\n");
}

function recommendedAction(reason: HandoffSummary["escalation_reason"], persona: Persona): string {
  switch (reason) {
    case "sensitive_topic":
      return "Human agent should review the account, verify identity, and address the financial or legal concern directly.";
    case "repeated_frustration":
      return "Prioritize this ticket — customer shows sustained frustration. Review conversation history and contact directly.";
    case "low_confidence":
      return "Review system logs, verify documentation coverage, and contact the user with a researched answer.";
    default:
      return `Assign to a specialist familiar with ${persona} communication style.`;
  }
}

function escalationMessage(persona: Persona, reason: HandoffSummary["escalation_reason"]): string {
  if (reason === "low_confidence") {
    return persona === "Frustrated User"
      ? "I apologize — I couldn't find the precise answer in our documentation. I'm connecting you with a live specialist who can help right away."
      : persona === "Business Executive"
        ? "I don't have sufficient documentation to answer confidently. Routing to a specialist now — expected first response under 15 minutes during business hours."
        : "I was unable to locate a documented solution for this request. Escalating to a human specialist with full conversation context.";
  }

  if (reason === "repeated_frustration") {
    return "I can see this has been frustrating, and I want to make sure you get the right help. I'm connecting you with a human specialist who will have the full context of this conversation.";
  }

  return persona === "Frustrated User"
    ? "I completely understand how frustrating this is, and I want to make sure it's handled correctly. I'm connecting you with a human specialist right now — they'll have the full context of this conversation when they pick up."
    : persona === "Business Executive"
      ? "This requires direct human handling. I'm routing this to a specialist now. Expected first response: under 15 minutes during business hours. The full context has been packaged for them."
      : "This topic requires direct human review. I'm escalating to a specialist with the full conversation context.";
}

function personaPrompt(persona: Persona): string {
  switch (persona) {
    case "Technical Expert":
      return `You are a Senior Systems Engineer in a live support chat.
- Provide clear root-cause analysis, configuration specs, and precise API pathways or code blocks when the context supports it.
- Be direct and concise — 3 to 6 sentences max.
- Use bullet points or a short code block only when truly needed.`;
    case "Frustrated User":
      return `You are a deeply empathetic Customer Care Specialist in a live chat.
- Begin with one brief empathetic validation, then simple action-oriented bullet steps.
- Max 4 short sentences or 3 bullet points. Plain words only — no jargon.`;
    case "Business Executive":
      return `You are a concise Client Relations Director in a live chat.
- Focus on direct business outcomes, impact summaries, and timelines for resolution.
- Answer in 2–3 sentences max. No code, no lists, no technical detail.`;
  }
}

async function classifyPersona(apiKey: string, message: string): Promise<ClassifyResult> {
  const { createGeminiProvider } = await import("./ai-gateway.server");
  const { generateObject } = await import("ai");
  const provider = createGeminiProvider(apiKey);

  try {
    const { object } = await generateObject({
      model: provider("gemini-2.5-flash"),
      schema: z.object({
        persona: z.enum(["Technical Expert", "Frustrated User", "Business Executive"]),
        confidence: z.number().min(0).max(1),
        reasoning: z.string(),
      }),
      system: `You are a classification engine. Classify the support message into EXACTLY ONE persona:
- "Technical Expert": uses APIs/code/configs/jargon, asks systems-level questions.
- "Frustrated User": emotional, urgent, exclamation marks, expresses inconvenience or anger.
- "Business Executive": brief, focused on impact, ROI, timelines, deliverables.`,
      prompt: message,
      temperature: 0.1,
    });

    return object as ClassifyResult;
  } catch (error) {
    console.error("Classification error:", error);
    return { persona: "Technical Expert", confidence: 0.3, reasoning: "Parse fallback" };
  }
}
