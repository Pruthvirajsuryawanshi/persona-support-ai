export const PERSONAS = ["Technical Expert", "Frustrated User", "Business Executive"] as const;

export type Persona = (typeof PERSONAS)[number];

export const PERSONA_META: Record<
  Persona,
  { label: string; emoji: string; tone: string; accent: string }
> = {
  "Technical Expert": {
    label: "Technical Expert",
    emoji: "⚙",
    tone: "Precise, technical, code-aware",
    accent:
      "bg-[oklch(0.55_0.12_220)]/15 text-[oklch(0.45_0.14_220)] border-[oklch(0.55_0.12_220)]/30",
  },
  "Frustrated User": {
    label: "Frustrated User",
    emoji: "❤",
    tone: "Empathetic, calm, reassuring",
    accent: "bg-[oklch(0.65_0.18_25)]/12 text-[oklch(0.5_0.18_25)] border-[oklch(0.65_0.18_25)]/30",
  },
  "Business Executive": {
    label: "Business Executive",
    emoji: "◆",
    tone: "Concise, outcome-focused",
    accent:
      "bg-[oklch(0.55_0.12_280)]/15 text-[oklch(0.45_0.14_280)] border-[oklch(0.55_0.12_280)]/30",
  },
};

/** Escalate when top cosine similarity from RAG is below this value. */
export const RETRIEVAL_CONFIDENCE_THRESHOLD = 0.4;

/** @deprecated Use RETRIEVAL_CONFIDENCE_THRESHOLD */
export const CONFIDENCE_THRESHOLD = RETRIEVAL_CONFIDENCE_THRESHOLD;

export const SENSITIVE_KEYWORDS = [
  "refund",
  "chargeback",
  "lawyer",
  "legal",
  "sue",
  "lawsuit",
  "cancel my account",
  "delete my account",
  "duplicate charge",
  "fraud",
  "unauthorized charge",
  "demand",
];

export type RetrievedChunk = {
  source: string;
  title: string | null;
  content: string;
  similarity: number;
};

export type HandoffSummary = {
  persona: Persona;
  detected_issue: string;
  retrieved_sources: string[];
  confidence_score: number;
  recommended_action: string;
  escalation_reason: "sensitive_topic" | "low_confidence" | "repeated_frustration";
};
