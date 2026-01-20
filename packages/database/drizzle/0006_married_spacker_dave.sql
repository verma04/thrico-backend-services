CREATE TABLE IF NOT EXISTS "offerAuditLogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offerId" uuid NOT NULL,
	"logStatus" "logStatus",
	"performedBy" uuid NOT NULL,
	"reason" text,
	"previousState" jsonb,
	"newState" jsonb,
	"created_at" timestamp DEFAULT now(),
	"entity" uuid NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
