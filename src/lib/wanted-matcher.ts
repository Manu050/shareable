import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { mailNewMatch } from "@/lib/mailer";

// Funciones de match entre WantedItem (peticiones) e Item (objetos).
// La consulta usa PostGIS `ST_DWithin` con la columna `radius_m` de la
// petición (cada vecino decide su radio). No hay índice GIST aún — para un
// barrio el coste secuencial es despreciable.

type ItemForMatch = {
  id: string;
  ownerId: string;
  category: string;
  pricePerDay: Prisma.Decimal | number;
  latitude: number;
  longitude: number;
};

type WantedForMatch = {
  id: string;
  requesterId: string;
  category: string;
  maxPricePerDay: Prisma.Decimal | number | null;
  latitude: number;
  longitude: number;
  radiusM: number;
};

export async function findMatchesForItem(item: ItemForMatch) {
  // Cuando se publica un Item nuevo, buscamos peticiones abiertas y vigentes
  // cuyo radio incluye al item, misma categoría, presupuesto suficiente y
  // que no sean del propio dueño.
  return prisma.$queryRaw<{ id: string }[]>`
    SELECT w.id
    FROM wanted_items w
    WHERE w.status = 'open'
      AND w.category = ${item.category}
      AND w.requester_id <> ${item.ownerId}::uuid
      AND (w.expires_at IS NULL OR w.expires_at > now())
      AND (w.max_price_per_day IS NULL OR w.max_price_per_day >= ${item.pricePerDay})
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${item.longitude}, ${item.latitude}), 4326)::geography,
        w.radius_m
      )
  `;
}

export async function findMatchesForWanted(wanted: WantedForMatch) {
  // Cuando se publica una petición Se Busca nueva, buscamos items activos
  // dentro del radio de la petición que cumplan precio y no sean del propio
  // requester.
  const maxPriceClause =
    wanted.maxPricePerDay == null
      ? Prisma.empty
      : Prisma.sql`AND i.price_per_day <= ${wanted.maxPricePerDay}`;

  return prisma.$queryRaw<{ id: string }[]>`
    SELECT i.id
    FROM items i
    WHERE i.is_active = true
      AND i.category = ${wanted.category}
      AND i.owner_id <> ${wanted.requesterId}::uuid
      ${maxPriceClause}
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(i.longitude, i.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${wanted.longitude}, ${wanted.latitude}), 4326)::geography,
        ${wanted.radiusM}
      )
  `;
}

export async function persistMatches(
  pairs: { wantedItemId: string; itemId: string }[],
) {
  if (pairs.length === 0) return 0;
  const result = await prisma.wantedItemMatch.createMany({
    data: pairs,
    skipDuplicates: true,
  });

  // Notify requesters about new matches (fire-and-forget, one email per wanted item).
  if (result.count > 0) {
    const uniqueWantedIds = [...new Set(pairs.map((p) => p.wantedItemId))];
    const allItemIds = [...new Set(pairs.map((p) => p.itemId))];

    const [wanteds, items] = await Promise.all([
      prisma.wantedItem.findMany({
        where: { id: { in: uniqueWantedIds } },
        select: {
          id: true,
          title: true,
          requester: { select: { email: true, name: true } },
        },
      }),
      prisma.item.findMany({
        where: { id: { in: allItemIds } },
        select: { id: true, title: true },
      }),
    ]);

    const itemMap = new Map(items.map((i) => [i.id, i.title]));
    // Pre-indexamos pairs por wantedItemId para evitar un find() O(n) por loop.
    const firstItemFor = new Map<string, string>();
    for (const p of pairs) {
      if (!firstItemFor.has(p.wantedItemId)) firstItemFor.set(p.wantedItemId, p.itemId);
    }

    for (const w of wanteds) {
      const matchedItemId = firstItemFor.get(w.id);
      const itemTitle = matchedItemId ? (itemMap.get(matchedItemId) ?? "un objeto") : "un objeto";
      void mailNewMatch(w.requester.email, w.requester.name, w.title, itemTitle, w.id);
    }
  }

  return result.count;
}
