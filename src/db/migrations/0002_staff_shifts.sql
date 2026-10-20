CREATE TABLE IF NOT EXISTS "staff_shifts" (
  "id" serial PRIMARY KEY NOT NULL,
  "staff_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "shift_type" varchar(20) NOT NULL,
  "starts_at" timestamp NOT NULL,
  "ends_at" timestamp NOT NULL,
  "rotation_id" varchar(36),
  "notes" text,
  "created_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "staff_shifts_staff_start_idx" ON "staff_shifts" ("staff_id", "starts_at");
CREATE INDEX IF NOT EXISTS "staff_shifts_period_idx" ON "staff_shifts" ("starts_at", "ends_at");
