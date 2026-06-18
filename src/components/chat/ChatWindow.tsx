import { useState } from "react";
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

export function ChatWindow({ threadId }: { threadId: string }) {
  const queryClient = useQueryClient();
  const getMessagesFn = useServerFn(getThreadMessages);
  const sendFn = useServerFn(sendMessage);
  // (focus state managed by AI Elements PromptInput internally)

  const messagesQuery = useQuery({
    queryKey: ["messages", threadId],
    queryFn: () => getMessagesFn({ data: { threadId } }),
  });

  const [pendingUser, setPendingUser] = useState<string | null>(null);

  const sendMut = useMutation({
    mutationFn: (message: string) => sendFn({ data: { threadId, message } }),
    onMutate: (m) => setPendingUser(m),
    onSuccess: () => {
      setPendingUser(null);
      queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (e: Error) => {
      setPendingUser(null);
      toast.error(e.message);
    },
  });


  const handleSubmit = (m: PromptInputMessage) => {
    const text = m.text?.trim();
    if (!text || sendMut.isPending) return;
    sendMut.mutate(text);
  };

  const isLoading = sendMut.isPending;
  const messages = messagesQuery.data ?? [];

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
          {messages.length === 0 && !pendingUser && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Ask anything about your support docs.
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

          {pendingUser && (
            <>
              <Message from="user">
                <MessageContent>
                  <div className="whitespace-pre-wrap">{pendingUser}</div>
                </MessageContent>
              </Message>
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>Classifying persona, retrieving sources…</Shimmer>
                </MessageContent>
              </Message>
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background">
        <div className="max-w-3xl mx-auto w-full px-4 py-3">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              ref={textareaRef}
              placeholder="Ask a question — persona is detected automatically…"
              disabled={isLoading}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={isLoading ? "submitted" : undefined}
                disabled={isLoading}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
