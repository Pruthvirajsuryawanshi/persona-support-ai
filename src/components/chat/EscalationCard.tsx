import { useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export function EscalationCard({
  content,
  handoff,
}: {
  content: string;
  handoff: Record<string, unknown> | null;
}) {
  const [open, setOpen] = useState(false);
  const reason = handoff?.escalation_reason as string | undefined;
  const reasonLabel =
    reason === "sensitive_topic"
      ? "Sensitive topic"
      : reason === "low_confidence"
        ? "Low documentation confidence"
        : reason === "repeated_frustration"
          ? "Repeated frustration"
          : null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-destructive font-medium text-sm">
        <UserRound className="h-4 w-4" />
        Escalated to human agent
        {reasonLabel && (
          <span className="text-[10px] font-normal uppercase tracking-wider text-destructive/70">
            · {reasonLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{content}</p>
      {handoff && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("h-3 w-3 transition", open && "rotate-180")} />
            Handoff JSON
          </button>
          {open && (
            <pre className="mt-2 overflow-x-auto rounded-md bg-background/60 border p-3 text-[11px] leading-relaxed">
              <code>{JSON.stringify(handoff, null, 2)}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
