import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getThreadMessages } from "@/lib/threads.functions";
import { sendMessage } from "@/lib/chat.functions";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { PersonaBadge } from "./PersonaBadge";
import { EscalationCard } from "./EscalationCard";
import { SourcesList } from "./SourcesList";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import type { Persona } from "@/lib/personas";

type Source = { source: string; title: string | null; similarity: number };

// Typewriter hook — reveals text word by word for a streaming feel
function useTypewriter(fullText: string, active: boolean) {
  const [displayed, setDisplayed] = useState("");
  const idxRef = useRef(0);

  useEffect(() => {
    if (!active || !fullText) {
      setDisplayed("");
      idxRef.current = 0;
      return;
    }

    // Split into words so we reveal naturally
    const words = fullText.split(" ");
    idxRef.current = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      idxRef.current += 1;
      setDisplayed(words.slice(0, idxRef.current).join(" "));
      if (idxRef.current >= words.length) {
        clearInterval(interval);
      }
    }, 18); // ~55 words/sec — feels like fast typing

    return () => clearInterval(interval);
  }, [fullText, active]);

  const done = active && displayed.length >= fullText.length;
  return { displayed, done };
}

export function ChatWindow({ threadId }: { threadId: string }) {
  const queryClient = useQueryClient();
  const getMessagesFn = useServerFn(getThreadMessages);
  const sendFn = useServerFn(sendMessage);

  const messagesQuery = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => getMessagesFn({ data: { threadId } }),
  });

  const [pendingUser, setPendingUser] = useState<string | null>(null);
  // Latest assistant response being "typed out"
  const [typingContent, setTypingContent] = useState<string>("");
  const [typingPersona, setTypingPersona] = useState<Persona | null>(null);
  const [typingEscalated, setTypingEscalated] = useState(false);
  const [typingHandoff, setTypingHandoff] = useState<Record<string, unknown> | null>(null);
  const [showTyping, setShowTyping] = useState(false);

  const { displayed, done } = useTypewriter(typingContent, showTyping);

  // When typewriter finishes, refresh messages from DB and hide typing bubble
  useEffect(() => {
    if (done && showTyping) {
      const t = setTimeout(() => {
        setShowTyping(false);
        setTypingContent("");
        setTypingPersona(null);
        setTypingEscalated(false);
        setTypingHandoff(null);
        queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
        queryClient.invalidateQueries({ queryKey: ["threads"] });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [done, showTyping, queryClient, threadId]);

  const sendMut = useMutation({
    mutationFn: (message: string) => sendFn({ data: { threadId, message } }),
    onMutate: (m) => {
      setPendingUser(m);
      setShowTyping(false);
      setTypingContent("");
    },
    onSuccess: (result) => {
      setPendingUser(null);
      const assistant = result.assistantMessage;
      setTypingPersona(result.classification?.persona ?? null);
      setTypingEscalated(assistant.escalated ?? false);
      setTypingHandoff((assistant.handoff_summary as Record<string, unknown> | null) ?? null);
      setTypingContent(assistant.content ?? "");
      setShowTyping(true);
    },
    onError: (e: Error) => {
      setPendingUser(null);
      toast.error(e.message);
    },
  });

  const handleSubmit = (m: PromptInputMessage) => {
    const text = m.text?.trim();
    if (!text || sendMut.isPending || showTyping) return;
    sendMut.mutate(text);
  };

  const isLoading = sendMut.isPending;
  const messages = messagesQuery.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
          {messages.length === 0 && !pendingUser && !showTyping && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Ask anything — persona is detected automatically.
            </div>
          )}

          {messages.map((msg) => {
            if (msg.role === "user") {
              return (
                <Message key={msg.id} from="user">
                  <MessageContent>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </MessageContent>
                </Message>
              );
            }
            return (
              <Message key={msg.id} from="assistant">
                <MessageContent>
                  {msg.persona && (
                    <PersonaBadge
                      persona={msg.persona as Persona}
                      confidence={msg.persona_confidence ?? undefined}
                    />
                  )}
                  {msg.escalated ? (
                    <EscalationCard
                      content={msg.content}
                      handoff={msg.handoff_summary as Record<string, unknown> | null}
                    />
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  )}
                  {!msg.escalated && msg.sources && (msg.sources as Source[]).length > 0 && (
                    <SourcesList sources={msg.sources as Source[]} />
                  )}
                </MessageContent>
              </Message>
            );
          })}

          {/* Pending user bubble (while waiting for response) */}
          {pendingUser && (
            <Message from="user">
              <MessageContent>
                <div className="whitespace-pre-wrap">{pendingUser}</div>
              </MessageContent>
            </Message>
          )}

          {/* Thinking shimmer (before response arrives) */}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}

          {/* Live typewriter bubble */}
          {showTyping && (
            <Message from="assistant">
              <MessageContent>
                {typingPersona && <PersonaBadge persona={typingPersona} />}
                {typingEscalated ? (
                  <EscalationCard content={displayed} handoff={typingHandoff} />
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Streamdown>{displayed}</Streamdown>
                    {/* Blinking cursor while typing */}
                    {!done && (
                      <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
                    )}
                  </div>
                )}
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background">
        <div className="max-w-3xl mx-auto w-full px-4 py-3">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              placeholder="Ask a question — persona is detected automatically…"
              disabled={isLoading || showTyping}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={isLoading || showTyping ? "submitted" : undefined}
                disabled={isLoading || showTyping}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
