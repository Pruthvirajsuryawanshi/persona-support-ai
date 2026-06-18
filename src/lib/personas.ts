export const PERSONAS = [
  "Technical Expert",
  "Frustrated User",
  "Business Executive",
] as const;

export type Persona = (typeof PERSONAS)[number];

export const PERSONA_META: Record<
  Persona,
  { label: string; emoji: string; tone: string; accent: string }
> = {
  "Technical Expert": {
    label: "Technical Expert",
    emoji: "⚙",
    tone: "Precise, technical, code-aware",
    accent: "bg-[oklch(0.55_0.12_220)]/15 text-[oklch(0.45_0.14_220)] border-[oklch(0.55_0.12_220)]/30",
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
    accent: "bg-[oklch(0.55_0.12_280)]/15 text-[oklch(0.45_0.14_280)] border-[oklch(0.55_0.12_280)]/30",
  },
};

export const CONFIDENCE_THRESHOLD = 0.45;

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
];
