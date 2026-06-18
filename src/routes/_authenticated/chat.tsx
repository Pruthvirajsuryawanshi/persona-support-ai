import { useEffect, useState } from "react";
import { Link, Outlet, createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, LogOut, MessageSquare, Loader2 } from "lucide-react";
import { listThreads, createThread, deleteThread } from "@/lib/threads.functions";
import { seedKnowledgeBase, getKnowledgeBaseStatus } from "@/lib/rag.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Persona Support — AI customer support agent" },
      {
        name: "description",
        content:
          "Chat with a persona-adaptive customer support AI that retrieves grounded answers and escalates when needed.",
      },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const deleteFn = useServerFn(deleteThread);
  const seedFn = useServerFn(seedKnowledgeBase);
  const kbStatusFn = useServerFn(getKnowledgeBaseStatus);

  const threadsQuery = useQuery({
    queryKey: ["threads"],
    queryFn: () => listFn(),
  });

  const kbQuery = useQuery({
    queryKey: ["kb-status"],
    queryFn: () => kbStatusFn(),
  });

  const [seeding, setSeeding] = useState(false);
  useEffect(() => {
    if (kbQuery.data && kbQuery.data.chunkCount === 0 && !seeding) {
      setSeeding(true);
      toast.info("Indexing the knowledge base on first run…", { duration: 8000 });
      seedFn()
        .then((r) => {
          toast.success(`Indexed ${r.chunkCount} document chunks`);
          queryClient.invalidateQueries({ queryKey: ["kb-status"] });
        })
        .catch((e: Error) => toast.error(`Indexing failed: ${e.message}`))
        .finally(() => setSeeding(false));
    }
  }, [kbQuery.data, seedFn, queryClient, seeding]);

  const createMut = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;

  return (
    <div className="grid h-screen grid-cols-[260px_1fr] bg-background">
      <aside className="flex flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          <img src={logo} alt="Persona logo" className="h-7 w-7" width={28} height={28} />
          <div className="font-display tracking-tight">Persona</div>
        </div>

        <div className="p-3">
          <Button
            className="w-full justify-start gap-2"
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
          >
            <Plus className="h-4 w-4" />
            New conversation
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {threadsQuery.isLoading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : threadsQuery.data && threadsQuery.data.length > 0 ? (
            threadsQuery.data.map((t) => {
              const isActive = t.id === activeId;
              return (
                <div
                  key={t.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md text-sm",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/60",
                  )}
                >
                  <Link
                    to="/chat/$threadId"
                    params={{ threadId: t.id }}
                    className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2"
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{t.title}</span>
                  </Link>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 mr-1 p-1.5 rounded text-muted-foreground hover:text-destructive transition"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteMut.mutate(t.id);
                      if (isActive) navigate({ to: "/chat" });
                    }}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No conversations yet
            </div>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-3 text-xs text-muted-foreground space-y-2">
          <div>
            Knowledge base:{" "}
            <span className="text-foreground font-medium">
              {seeding
                ? "indexing…"
                : kbQuery.data
                  ? `${kbQuery.data.chunkCount} chunks`
                  : "—"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
