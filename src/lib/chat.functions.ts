import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SENSITIVE_KEYWORDS, type Persona } from "./personas";

const SendMessageInput = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});

type ClassifyResult = {
  persona: Persona;
  confidence: number;
  reasoning: string;
};

function getApiKey(): string {
  let apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    try {
      const fs = require("node:fs");
      const path = require("node:path");
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

    // 1. Classify persona using Gemini
    const classification = await classifyPersona(apiKey, data.message);

    // 2. Fetch conversation history for this thread (last 20 messages, excluding the one just saved)
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("thread_id", data.threadId)
      .neq("id", userMsg.id)           // exclude the message we just inserted
      .order("created_at", { ascending: true })
      .limit(20);

    // Build messages array: prior turns + current user message
    const conversationMessages: { role: "user" | "assistant"; content: string }[] = [
      ...(history ?? [])
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: data.message },
    ];

    // 3. Check for sensitive keywords — escalate those to human
    const sensitive = SENSITIVE_KEYWORDS.some((kw) =>
      data.message.toLowerCase().includes(kw),
    );

    let assistantContent: string;
    let handoff: Record<string, unknown> | null = null;

    if (sensitive) {
      // Sensitive topic → escalate to human agent
      handoff = {
        reason: "Sensitive topic detected (billing / refund / legal / account modification)",
        persona: classification.persona,
        persona_confidence: classification.confidence,
        customer_issue: data.message,
        recommended_action:
          "Human agent should review the account, verify identity, and address the financial/legal concern directly.",
        created_at: new Date().toISOString(),
      };
      assistantContent =
        classification.persona === "Frustrated User"
          ? "I completely understand how frustrating this is, and I want to make sure it's handled correctly. I'm connecting you with a human specialist right now — they'll have the full context of this conversation when they pick up."
          : classification.persona === "Business Executive"
            ? "This requires direct human handling. I'm routing this to a specialist now. Expected first response: under 15 minutes during business hours. The full context has been packaged for them."
            : "This topic requires direct human review. I'm escalating to a specialist with the full conversation context.";
    } else {
      // 4. Answer with full conversation history → Gemini 2.5 Flash
      const { createGeminiProvider } = await import("./ai-gateway.server");
      const { generateText } = await import("ai");
      const provider = createGeminiProvider(apiKey);
      const personaInstructions = personaPrompt(classification.persona);

      const systemPrompt = `${personaInstructions}

You are a helpful customer support AI with memory of this entire conversation.
RULES:
- Keep responses SHORT. This is a live chat, not a document.
- Answer only what was asked. Do not add unrequested sections or caveats.
- Never use headers (##). Prefer plain sentences or a short bullet list.
- Be honest if you don't know — never invent URLs, prices, or policies.`;

      const { text } = await generateText({
        model: provider("gemini-2.5-flash"),
        system: systemPrompt,
        messages: conversationMessages,   // ← full history, not just one prompt
        temperature: 0.3,
      });
      assistantContent = text;
    }

    // 4. Persist assistant message
    const { data: assistantMsg, error: aErr } = await supabase
      .from("messages")
      .insert({
        thread_id: data.threadId,
        user_id: userId,
        role: "assistant",
        content: assistantContent,
        persona: classification.persona,
        persona_confidence: classification.confidence,
        escalated: sensitive,
        handoff_summary: handoff as never,
        sources: [] as never,
        top_score: 0,
      })
      .select("*")
      .single();
    if (aErr) throw new Error(aErr.message);

    // 5. Touch thread + rename if first turn
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
      return `You are a Senior Systems Engineer in a live support chat.
- Be direct and concise — 3 to 6 sentences max.
- Use bullet points or a short code block only when truly needed.
- No intros, no "Great question!", no filler. Get straight to the answer.`;
    case "Frustrated User":
      return `You are an empathetic support agent in a live chat.
- Max 4 short sentences or 3 bullet points.
- One brief empathetic opener (one sentence), then the fix.
- Plain words only. No jargon.`;
    case "Business Executive":
      return `You are a Client Relations Director in a live chat.
- Answer in 2–3 sentences max.
- Lead with the direct answer. One clear next step at the end.
- No code, no lists, no technical detail.`;
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
