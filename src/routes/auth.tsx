import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in — Persona Support" },
      {
        name: "description",
        content: "Sign in to chat with the Persona-adaptive AI support agent.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message ?? "Google sign-in failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="h-10 w-10" width={40} height={40} />
          <span className="font-display text-lg tracking-tight">Persona Support</span>
        </div>
        <div className="space-y-6">
          <h1 className="font-display text-4xl leading-tight">
            Support that meets every customer where they are.
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            An AI agent that detects whether you're a technical expert, a frustrated user,
            or a busy executive — then answers in the register that fits.
          </p>
          <ul className="space-y-3 text-primary-foreground/85 text-sm">
            <li>· Persona classification on every message</li>
            <li>· Retrieval-grounded answers, no hallucinations</li>
            <li>· Automatic handoff to a human when confidence is low</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">© Persona Support</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-3">
            <img src={logo} alt="" className="h-9 w-9" width={36} height={36} />
            <span className="font-display tracking-tight">Persona Support</span>
          </div>

          <div>
            <h2 className="font-display text-2xl">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Sign in to continue your conversations."
                : "Start chatting with the support agent in seconds."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={googleSignIn}
            disabled={busy}
          >
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          {mode === "signin" && (
            <div className="p-4 border rounded-md bg-muted/50 text-sm flex flex-col items-center">
              <p className="font-medium mb-1">Demo Credentials</p>
              <p className="text-muted-foreground">Email: demo@example.com</p>
              <p className="text-muted-foreground mb-3">Password: SuperDemoPersona!2026</p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setEmail("demo@example.com");
                  setPassword("SuperDemoPersona!2026");
                }}
              >
                Fill Credentials
              </Button>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">
                  At least 12 characters. Mix letters, numbers, and a symbol.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
