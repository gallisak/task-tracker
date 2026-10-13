-- DropIndex
DROP INDEX "workspace_invitations_email_idx";

-- DeleteRows
DELETE FROM "workspace_invitations";

-- AlterTable
ALTER TABLE "workspace_invitations" ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "token_hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_hash_key" ON "workspace_invitations"("token_hash");
