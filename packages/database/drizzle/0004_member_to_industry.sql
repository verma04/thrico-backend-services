CREATE TABLE IF NOT EXISTS "memberToIndustry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"industry_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now()
);
