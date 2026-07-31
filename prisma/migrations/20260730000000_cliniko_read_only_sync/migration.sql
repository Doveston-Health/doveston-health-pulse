CREATE TABLE "cliniko_businesses" (
  "id" UUID NOT NULL, "cliniko_id" TEXT NOT NULL, "name" TEXT NOT NULL, "time_zone" TEXT,
  "archived_at" TIMESTAMP(3), "source_created_at" TIMESTAMP(3), "source_updated_at" TIMESTAMP(3),
  "last_synced_at" TIMESTAMP(3) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "cliniko_businesses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cliniko_businesses_cliniko_id_key" ON "cliniko_businesses"("cliniko_id");
CREATE TABLE "cliniko_practitioners" (
  "id" UUID NOT NULL, "cliniko_id" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true,
  "first_name" TEXT NOT NULL, "last_name" TEXT NOT NULL, "display_name" TEXT NOT NULL,
  "title" TEXT, "designation" TEXT, "label" TEXT, "show_in_online_bookings" BOOLEAN,
  "source_created_at" TIMESTAMP(3), "source_updated_at" TIMESTAMP(3), "last_synced_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cliniko_practitioners_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cliniko_practitioners_cliniko_id_key" ON "cliniko_practitioners"("cliniko_id");
CREATE INDEX "cliniko_practitioners_active_idx" ON "cliniko_practitioners"("active");
CREATE TABLE "cliniko_patients" (
  "id" UUID NOT NULL, "cliniko_id" TEXT NOT NULL, "first_name" TEXT NOT NULL, "last_name" TEXT NOT NULL,
  "email" TEXT, "mobile_phone" TEXT, "home_phone" TEXT, "accepted_privacy_policy" BOOLEAN,
  "archived_at" TIMESTAMP(3), "source_created_at" TIMESTAMP(3), "source_updated_at" TIMESTAMP(3),
  "last_synced_at" TIMESTAMP(3) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "cliniko_patients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cliniko_patients_cliniko_id_key" ON "cliniko_patients"("cliniko_id");
CREATE INDEX "cliniko_patients_last_name_first_name_idx" ON "cliniko_patients"("last_name", "first_name");
CREATE TABLE "cliniko_bookings" (
  "id" UUID NOT NULL, "cliniko_id" TEXT NOT NULL, "booking_type" TEXT, "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL, "cancelled_at" TIMESTAMP(3), "archived_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3), "practitioner_id" UUID, "business_id" UUID,
  "appointment_type_cliniko_id" TEXT, "appointment_type_name" TEXT, "source_created_at" TIMESTAMP(3),
  "source_updated_at" TIMESTAMP(3), "last_synced_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cliniko_bookings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cliniko_bookings_cliniko_id_key" ON "cliniko_bookings"("cliniko_id");
CREATE INDEX "cliniko_bookings_starts_at_idx" ON "cliniko_bookings"("starts_at");
CREATE INDEX "cliniko_bookings_practitioner_id_starts_at_idx" ON "cliniko_bookings"("practitioner_id", "starts_at");
CREATE INDEX "cliniko_bookings_business_id_starts_at_idx" ON "cliniko_bookings"("business_id", "starts_at");
CREATE TABLE "cliniko_booking_patients" (
  "booking_id" UUID NOT NULL, "patient_id" UUID NOT NULL,
  CONSTRAINT "cliniko_booking_patients_pkey" PRIMARY KEY ("booking_id", "patient_id")
);
CREATE INDEX "cliniko_booking_patients_patient_id_idx" ON "cliniko_booking_patients"("patient_id");
ALTER TABLE "cliniko_bookings" ADD CONSTRAINT "cliniko_bookings_practitioner_id_fkey" FOREIGN KEY ("practitioner_id") REFERENCES "cliniko_practitioners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cliniko_bookings" ADD CONSTRAINT "cliniko_bookings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "cliniko_businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cliniko_booking_patients" ADD CONSTRAINT "cliniko_booking_patients_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "cliniko_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cliniko_booking_patients" ADD CONSTRAINT "cliniko_booking_patients_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "cliniko_patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
