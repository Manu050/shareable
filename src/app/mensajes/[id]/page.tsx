import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { DmRoom, type DmMessage } from "./dm-room";

export const dynamic = "force-dynamic";

function initials(name?: string | null) {
  const src = name?.trim() || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      user1: { select: { name: true } },
      user2: { select: { name: true } },
    },
  });
  const name = conv?.user1.name ?? conv?.user2.name ?? "Mensaje";
  return { title: `${name} · Mensajes · Shareable` };
}

export default async function DmPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user?.id) redirect(`/auth/login?callbackUrl=/mensajes/${id}`);

  const userId = session.user.id;

  const conv = await prisma.conversation.findFirst({
    where: { id, OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: {
      user1: { select: { id: true, name: true, image: true } },
      user2: { select: { id: true, name: true, image: true } },
    },
  });
  if (!conv) notFound();

  const other = conv.user1Id === userId ? conv.user2 : conv.user1;

  // Cargo primero, marco después — evita marcar como leído un mensaje que
  // llegue entre las dos queries y nunca llegó al cliente.
  const initialMessages = (await prisma.directMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 500,
    include: { sender: { select: { id: true, name: true, image: true } } },
  })) satisfies DmMessage[];

  const last = initialMessages[initialMessages.length - 1];
  if (last) {
    await prisma.directMessage.updateMany({
      where: {
        conversationId: id,
        senderId: { not: userId },
        readAt: null,
        createdAt: { lte: last.createdAt },
      },
      data: { readAt: new Date() },
    });
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="flex items-center gap-3 rounded-2xl border border-border bg-card/40 px-4 py-3">
        <Link href="/mensajes" className="rounded-lg p-1 hover:bg-muted" aria-label="Volver a mensajes">
          <ArrowLeft className="size-4" />
        </Link>
        <Avatar className="size-8">
          {other.image && <AvatarImage src={other.image} alt="" />}
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initials(other.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link href={`/usuarios/${other.id}`} className="truncate text-sm font-medium hover:underline">
            {other.name ?? "Vecino"}
          </Link>
          <p className="text-xs text-muted-foreground">Mensaje directo</p>
        </div>
      </header>

      <DmRoom
        conversationId={id}
        currentUserId={userId}
        initialMessages={initialMessages}
      />
    </section>
  );
}
