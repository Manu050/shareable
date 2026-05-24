import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { uploadRoot } from "@/lib/uploads";

const ORPHAN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type CleanupResult = {
  scanned: number;
  deleted: number;
  errors: number;
  freedBytes: number;
};

export async function cleanupOrphanUploads(): Promise<CleanupResult> {
  const root = uploadRoot();
  const now = Date.now();
  let scanned = 0;
  let deleted = 0;
  let errors = 0;
  let freedBytes = 0;

  // Fetch all known URLs from DB in parallel.
  const [itemImages, userImages] = await Promise.all([
    prisma.itemImage.findMany({ select: { url: true } }),
    prisma.user.findMany({ where: { image: { not: null } }, select: { image: true } }),
  ]);

  const knownUrls = new Set<string>([
    ...itemImages.map((r) => r.url),
    ...userImages.map((r) => r.image!),
  ]);

  const CONCURRENCY = 8;

  for (const kind of ["items", "avatars"] as const) {
    const dir = path.join(root, kind);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }

    const candidates = files.filter((f) => {
      if (!f.endsWith(".webp")) return false;
      scanned++;
      return !knownUrls.has(`/uploads/${kind}/${f}`);
    });

    // Procesa los candidatos en oleadas concurrentes para no serializar I/O.
    for (let i = 0; i < candidates.length; i += CONCURRENCY) {
      const batch = candidates.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (file) => {
          const abs = path.join(dir, file);
          try {
            const info = await stat(abs);
            if (now - info.mtimeMs < ORPHAN_MAX_AGE_MS) {
              return { kind: "skip" as const };
            }
            await unlink(abs);
            return { kind: "deleted" as const, size: info.size };
          } catch {
            return { kind: "error" as const };
          }
        }),
      );
      for (const r of results) {
        if (r.kind === "deleted") {
          deleted++;
          freedBytes += r.size;
        } else if (r.kind === "error") {
          errors++;
        }
      }
    }
  }

  return { scanned, deleted, errors, freedBytes };
}
