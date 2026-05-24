/**
 * Standalone orphan-image cleanup script.
 * Run with: npx tsx scripts/cleanup-orphans.ts
 *
 * Cron example (Debian, daily at 03:00):
 *   0 3 * * * cd /opt/shareable && npx tsx scripts/cleanup-orphans.ts >> /var/log/shareable-cleanup.log 2>&1
 */
import { cleanupOrphanUploads } from "../src/lib/cleanup";
import { cleanupExpiredRateLimits } from "../src/lib/rate-limit";

async function main() {
  console.log(`[cleanup] Starting — ${new Date().toISOString()}`);
  const result = await cleanupOrphanUploads();
  const mb = (result.freedBytes / 1024 / 1024).toFixed(2);
  console.log(
    `[cleanup] Uploads — scanned: ${result.scanned}, deleted: ${result.deleted}, errors: ${result.errors}, freed: ${mb} MB`,
  );

  const buckets = await cleanupExpiredRateLimits();
  console.log(`[cleanup] Rate-limit buckets — pruned: ${buckets}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("[cleanup] Fatal:", err);
  process.exit(1);
});
