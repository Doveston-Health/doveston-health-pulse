-- CreateEnum
CREATE TYPE "XeroSyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "XeroReportType" AS ENUM ('PROFIT_AND_LOSS', 'BALANCE_SHEET', 'AGED_RECEIVABLES', 'AGED_PAYABLES');

-- CreateTable
CREATE TABLE "xero_connections" (
    "id" UUID NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tenant_name" TEXT NOT NULL,
    "tenant_type" TEXT,
    "external_connection_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnected_at" TIMESTAMP(3),
    "last_successful_sync_at" TIMESTAMP(3),
    "last_attempted_sync_at" TIMESTAMP(3),
    "last_sync_status" "XeroSyncStatus",
    "last_sync_error_code" TEXT,
    "last_sync_error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_oauth_tokens" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "encrypted_access_token" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT NOT NULL,
    "access_token_expires_at" TIMESTAMP(3) NOT NULL,
    "refresh_token_updated_at" TIMESTAMP(3) NOT NULL,
    "token_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_organisations" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "legal_name" TEXT,
    "organisation_name" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "country_code" TEXT,
    "financial_year_end_day" INTEGER,
    "financial_year_end_month" INTEGER,
    "organisation_type" TEXT,
    "source_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_contacts" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "contact_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_status" TEXT,
    "is_customer" BOOLEAN NOT NULL DEFAULT false,
    "is_supplier" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "accounts_receivable_tax_type" TEXT,
    "accounts_payable_tax_type" TEXT,
    "source_updated_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_invoices" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "contact_id" UUID,
    "invoice_number" TEXT,
    "reference" TEXT,
    "invoice_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency_code" TEXT NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE,
    "subtotal" DECIMAL(19,4),
    "total_tax" DECIMAL(19,4),
    "total" DECIMAL(19,4) NOT NULL,
    "amount_due" DECIMAL(19,4) NOT NULL,
    "amount_paid" DECIMAL(19,4) NOT NULL,
    "amount_credited" DECIMAL(19,4) NOT NULL,
    "fully_paid_on_date" DATE,
    "source_updated_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_payments" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "payment_id" TEXT NOT NULL,
    "invoice_id" UUID,
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "status" TEXT,
    "payment_type" TEXT,
    "source_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_report_snapshots" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "report_type" "XeroReportType" NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "as_at_date" DATE,
    "basis" TEXT,
    "currency_code" TEXT,
    "metrics" JSONB NOT NULL,
    "payload_version" INTEGER NOT NULL DEFAULT 1,
    "generated_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xero_report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_sync_runs" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "status" "XeroSyncStatus" NOT NULL DEFAULT 'PENDING',
    "stage" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "records_fetched" INTEGER NOT NULL DEFAULT 0,
    "records_persisted" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xero_connections_tenant_id_key" ON "xero_connections"("tenant_id");

-- CreateIndex
CREATE INDEX "xero_connections_is_active_idx" ON "xero_connections"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "xero_oauth_tokens_connection_id_key" ON "xero_oauth_tokens"("connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "xero_organisations_connection_id_key" ON "xero_organisations"("connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "xero_organisations_tenant_id_key" ON "xero_organisations"("tenant_id");

-- CreateIndex
CREATE INDEX "xero_contacts_connection_id_name_idx" ON "xero_contacts"("connection_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "xero_contacts_connection_id_contact_id_key" ON "xero_contacts"("connection_id", "contact_id");

-- CreateIndex
CREATE INDEX "xero_invoices_connection_id_invoice_type_invoice_date_idx" ON "xero_invoices"("connection_id", "invoice_type", "invoice_date");

-- CreateIndex
CREATE INDEX "xero_invoices_connection_id_due_date_amount_due_idx" ON "xero_invoices"("connection_id", "due_date", "amount_due");

-- CreateIndex
CREATE UNIQUE INDEX "xero_invoices_connection_id_invoice_id_key" ON "xero_invoices"("connection_id", "invoice_id");

-- CreateIndex
CREATE INDEX "xero_payments_connection_id_payment_date_idx" ON "xero_payments"("connection_id", "payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "xero_payments_connection_id_payment_id_key" ON "xero_payments"("connection_id", "payment_id");

-- CreateIndex
CREATE INDEX "xero_report_snapshots_connection_id_report_type_synced_at_idx" ON "xero_report_snapshots"("connection_id", "report_type", "synced_at");

-- CreateIndex
CREATE INDEX "xero_sync_runs_connection_id_status_created_at_idx" ON "xero_sync_runs"("connection_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "xero_oauth_tokens" ADD CONSTRAINT "xero_oauth_tokens_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "xero_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_organisations" ADD CONSTRAINT "xero_organisations_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "xero_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_contacts" ADD CONSTRAINT "xero_contacts_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "xero_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_invoices" ADD CONSTRAINT "xero_invoices_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "xero_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_invoices" ADD CONSTRAINT "xero_invoices_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "xero_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_payments" ADD CONSTRAINT "xero_payments_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "xero_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_payments" ADD CONSTRAINT "xero_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "xero_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_report_snapshots" ADD CONSTRAINT "xero_report_snapshots_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "xero_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_sync_runs" ADD CONSTRAINT "xero_sync_runs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "xero_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
