import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    throw redirect({ to: "/chat" });
  },
  component: () => null,
});
