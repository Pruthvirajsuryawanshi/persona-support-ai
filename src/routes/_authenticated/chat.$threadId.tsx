import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/chat/ChatWindow";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  return <ChatWindow key={threadId} threadId={threadId} />;
}
