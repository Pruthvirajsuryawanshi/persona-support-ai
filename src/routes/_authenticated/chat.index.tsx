import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: EmptyState,
});

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-6">
        <img
          src={logo}
          alt=""
          className="h-16 w-16 mx-auto opacity-90"
          width={64}
          height={64}
        />
        <div className="space-y-2">
          <h1 className="font-display text-3xl">Start a conversation</h1>
          <p className="text-muted-foreground">
            Persona detects whether you write like a technical expert, a frustrated user, or a
            busy executive — and adapts its tone, depth, and structure to match.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-left text-xs">
          <Example label="Technical" body="What are the header parameter requirements for bearer-token auth?" />
          <Example label="Frustrated" body="Where is the cookies guide? Nothing is loading on your interface!" />
          <Example label="Executive" body="Need a timeline for resolving billing disputes." />
        </div>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Click "New conversation" to begin.
        </p>
      </div>
    </div>
  );
}

function Example({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground/90 leading-snug">"{body}"</div>
    </div>
  );
}
