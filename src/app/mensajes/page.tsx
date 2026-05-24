import Link from "next/link";
import { redirect } from "next/navigation";
import { formatRelative } from "date-fns";
import { es } from "date-fns/locale";
import { MessageCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mensajes · Shareable" };
export const dynamic = "force-dynamic";

function initials(name?: string | null) {
  const src = name?.trim() || "?";
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function MensajesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/mensajes");

  const userId = session.user.id;

  const [convs, unreadRows] = await Promise.all([
    prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      orderBy: { createdAt: "desc" },
      include: {
        user1: { select: { id: true, name: true, image: true } },
        user2: { select: { id: true, name: true, image: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true },
        },
      },
    }),
    prisma.directMessage.groupBy({
      by: ["conversationId"],
      where: {
        readAt: null,
        senderId: { not: userId },
        conversation: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      },
      _count: { id: true },
    }),
  ]);
  const unreadMap = new Map(unreadRows.map((r) => [r.conversationId, r._count.id]));

  const items = convs.map((c) => ({
    id: c.id,
    other: c.user1Id === userId ? c.user2 : c.user1,
    last: c.messages[0] ?? null,
    unread: unreadMap.get(c.id) ?? 0,
  }));

  // Sort by last message time (most recent first), conversations without
  // messages go to the bottom.
  items.sort((a, b) => {
    const ta = a.last ? new Date(a.last.createdAt).getTime() : 0;
    const tb = b.last ? new Date(b.last.createdAt).getTime() : 0;
    return tb - ta;
  });

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Mensajes</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
          <MessageCircle className="size-10 text-muted-foreground/40" />
          <p className="font-medium">No tienes conversaciones aún.</p>
          <p>Visita el perfil de un vecino y pulsa "Enviar mensaje".</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/40">
          {items.map(({ id, other, last, unread }) => (
            <li key={id}>
              <Link
                href={`/mensajes/${id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
                  unread > 0 && "bg-primary/5",
                )}
              >
                <Avatar className="size-10 shrink-0">
                  {other.image && <AvatarImage src={other.image} alt="" />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials(other.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("truncate text-sm font-medium", unread > 0 && "font-semibold")}>
                      {other.name ?? "Vecino"}
                    </span>
                    {last && (
                      <span
                        className="ml-auto shrink-0 text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatRelative(new Date(last.createdAt), new Date(), { locale: es })}
                      </span>
                    )}
                  </div>
                  <p className={cn("truncate text-xs text-muted-foreground", unread > 0 && "font-medium text-foreground/80")}>
                    {last
                      ? (last.senderId === userId ? "Tú: " : "") + last.content
                      : "Conversación nueva"}
                  </p>
                </div>

                {unread > 0 && (
                  <Badge className="ml-2 shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                    {unread}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
