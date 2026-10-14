-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_hash_key" ON "AdminSession"("token_hash");

-- CreateIndex
CREATE INDEX "AdminSession_admin_id_idx" ON "AdminSession"("admin_id");

-- CreateIndex
CREATE INDEX "AdminSession_expires_at_idx" ON "AdminSession"("expires_at");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

