import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ChatRoom, type ChatMessage } from "./chat-room";

export const metadata = { title: "Chat · Shareable" };
export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) {
    redirect(`/auth/login?callbackUrl=/requests/${id}/chat`);
  }

  const [request, initialMessages] = await Promise.all([
    prisma.request.findUnique({
      where: { id },
      include: {
        item: {
          select: {
            id: true,
            title: true,
            owner: { select: { id: true, name: true, image: true } },
          },
        },
        borrower: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.message.findMany({
      where: { requestId: id },
      orderBy: { createdAt: "asc" },
      take: 500,
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    }) as Promise<ChatMessage[]>,
  ]);
  if (!request) notFound();

  const userId = session.user.id;
  if (request.borrowerId !== userId && request.item.owner.id !== userId) {
    notFound();
  }

  const counterpart =
    request.item.owner.id === userId ? request.borrower : request.item.owner;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg p-1 hover:bg-muted"
            aria-label="Volver al panel"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              Chat con {counterpart.name ?? "Vecino"}
            </p>
            <Link
              href={`/items/${request.item.id}`}
              className="truncate text-xs text-muted-foreground hover:underline"
            >
              Sobre: {request.item.title}
            </Link>
          </div>
        </div>
      </header>

      <ChatRoom
        requestId={id}
        currentUserId={userId}
        initialMessages={initialMessages}
      />
    </section>
  );
}
