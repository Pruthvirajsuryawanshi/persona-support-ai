import { PERSONA_META, type Persona } from "@/lib/personas";
import { cn } from "@/lib/utils";

export function PersonaBadge({
  persona,
  confidence,
}: {
  persona: Persona;
  confidence?: number;
}) {
  const meta = PERSONA_META[persona];
  if (!meta) return null;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        meta.accent,
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
      <span>Detected: {meta.label}</span>
      {typeof confidence === "number" && (
        <span className="opacity-60">· {Math.round(confidence * 100)}%</span>
      )}
    </div>
  );
}
