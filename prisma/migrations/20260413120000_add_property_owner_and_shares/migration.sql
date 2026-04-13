-- Replace global address unique (per origin/main) with per-owner uniqueness after adding ownerUserId.
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_address_unique";
ALTER TABLE "Property" DROP CONSTRAINT IF EXISTS "Property_street1_city_state_postalCode_key";

-- Backfill existing rows before NOT NULL without a permanent server default.
ALTER TABLE "Property" ADD COLUMN "ownerUserId" TEXT NOT NULL DEFAULT 'legacy-unassigned';

ALTER TABLE "Property" ALTER COLUMN "ownerUserId" DROP DEFAULT;

ALTER TABLE "Property" ADD CONSTRAINT "Property_address_unique_per_owner" UNIQUE ("ownerUserId", "street1", "city", "state", "postalCode");

CREATE INDEX "Property_ownerUserId_idx" ON "Property"("ownerUserId");

CREATE TABLE "PropertyShare" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "inviteeUserId" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyShare_propertyId_invitedEmail_key" ON "PropertyShare"("propertyId", "invitedEmail");

CREATE INDEX "PropertyShare_inviteeUserId_idx" ON "PropertyShare"("inviteeUserId");

CREATE INDEX "PropertyShare_invitedEmail_idx" ON "PropertyShare"("invitedEmail");

ALTER TABLE "PropertyShare" ADD CONSTRAINT "PropertyShare_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
