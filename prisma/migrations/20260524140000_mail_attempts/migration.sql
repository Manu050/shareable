-- Registro de intentos fallidos / skipped de envío de email.
CREATE TYPE "MailStatus" AS ENUM ('failed', 'skipped');

CREATE TABLE "mail_attempts" (
    "id" UUID NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "kind" VARCHAR(64) NOT NULL,
    "status" "MailStatus" NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mail_attempts_status_created_at_idx" ON "mail_attempts"("status", "created_at");
