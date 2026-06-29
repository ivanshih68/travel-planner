-- Add images column to activities table
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT '{}';

-- Create trip_shares table
CREATE TABLE IF NOT EXISTS "trip_shares" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "shared_with" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_shares_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
ALTER TABLE "trip_shares" ADD CONSTRAINT "trip_shares_trip_id_shared_with_key" UNIQUE ("trip_id", "shared_with");

-- Create indexes
CREATE INDEX IF NOT EXISTS "trip_shares_shared_with_idx" ON "trip_shares"("shared_with");

-- Add foreign keys
ALTER TABLE "trip_shares" ADD CONSTRAINT "trip_shares_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trip_shares" ADD CONSTRAINT "trip_shares_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
