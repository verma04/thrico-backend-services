CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"module" text NOT NULL,
	"action" text NOT NULL,
	"resource_id" text,
	"target_user_id" uuid,
	"previous_state" jsonb,
	"new_state" jsonb,
	"reason" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
