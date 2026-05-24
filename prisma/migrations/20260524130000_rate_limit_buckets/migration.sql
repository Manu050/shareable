-- Limitador de tasa persistente en BD.
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "window_end" TIMESTAMPTZ(6) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "rate_limit_buckets_window_end_idx" ON "rate_limit_buckets"("window_end");
