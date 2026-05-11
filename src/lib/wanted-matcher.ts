import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

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
  return result.count;
}
