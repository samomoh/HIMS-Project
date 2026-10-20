CREATE TABLE IF NOT EXISTS "wards" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(120) NOT NULL UNIQUE,
  "specialty" varchar(120),
  "location" varchar(120),
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "ward_beds" (
  "id" serial PRIMARY KEY NOT NULL,
  "ward_id" integer NOT NULL REFERENCES "wards"("id") ON DELETE CASCADE,
  "bed_number" varchar(30) NOT NULL,
  "status" varchar(20) DEFAULT 'Available' NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ward_beds_ward_number_idx" ON "ward_beds" ("ward_id", "bed_number");

CREATE TABLE IF NOT EXISTS "ward_admissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "admission_number" varchar(40) NOT NULL UNIQUE,
  "patient_id" integer NOT NULL REFERENCES "patients"("id"),
  "source" varchar(60) NOT NULL,
  "source_details" text,
  "diagnosis" text NOT NULL,
  "attending_doctor_id" integer REFERENCES "users"("id"),
  "ward_id" integer NOT NULL REFERENCES "wards"("id"),
  "bed_id" integer REFERENCES "ward_beds"("id"),
  "status" varchar(20) DEFAULT 'Admitted' NOT NULL,
  "admitted_at" timestamp DEFAULT now() NOT NULL,
  "admitted_by" integer REFERENCES "users"("id"),
  "discharged_at" timestamp,
  "discharge_summary" text,
  "final_invoice_id" integer REFERENCES "invoices"("id")
);
CREATE INDEX IF NOT EXISTS "ward_admissions_patient_idx" ON "ward_admissions" ("patient_id", "status");
CREATE INDEX IF NOT EXISTS "ward_admissions_ward_idx" ON "ward_admissions" ("ward_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "ward_admissions_one_active_patient_idx" ON "ward_admissions" ("patient_id") WHERE "status" = 'Admitted';
CREATE UNIQUE INDEX IF NOT EXISTS "ward_admissions_one_active_bed_idx" ON "ward_admissions" ("bed_id") WHERE "status" = 'Admitted' AND "bed_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "ward_admissions_final_invoice_idx" ON "ward_admissions" ("final_invoice_id") WHERE "final_invoice_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "ward_care_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "admission_id" integer NOT NULL REFERENCES "ward_admissions"("id"),
  "author_id" integer REFERENCES "users"("id"),
  "entry_type" varchar(30) NOT NULL,
  "note" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ward_care_admission_time_idx" ON "ward_care_entries" ("admission_id", "created_at");

CREATE TABLE IF NOT EXISTS "ward_transfers" (
  "id" serial PRIMARY KEY NOT NULL,
  "admission_id" integer NOT NULL REFERENCES "ward_admissions"("id"),
  "from_ward_id" integer REFERENCES "wards"("id"),
  "from_bed_id" integer REFERENCES "ward_beds"("id"),
  "to_ward_id" integer NOT NULL REFERENCES "wards"("id"),
  "to_bed_id" integer REFERENCES "ward_beds"("id"),
  "reason" text NOT NULL,
  "transferred_by" integer REFERENCES "users"("id"),
  "transferred_at" timestamp DEFAULT now() NOT NULL
);
