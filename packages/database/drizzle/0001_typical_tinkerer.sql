CREATE TABLE IF NOT EXISTS "match_win_combinations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"key" varchar(50) NOT NULL,
	"symbol1_id" uuid,
	"symbol2_id" uuid,
	"symbol3_id" uuid,
	"type" "prize_type" DEFAULT 'NOTHING' NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"probability" numeric(5, 2) DEFAULT '0' NOT NULL,
	"max_wins" integer,
	"reward_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_win_combinations_config_id_key_unique" UNIQUE("config_id","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "match_win_symbols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"key" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"icon" varchar(100),
	"color" varchar(20),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_win_symbols_config_id_key_unique" UNIQUE("config_id","key")
);
--> statement-breakpoint
ALTER TABLE "match_win_plays" ADD COLUMN "combination_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_win_plays" ADD CONSTRAINT "match_win_plays_combination_id_match_win_combinations_id_fk" FOREIGN KEY ("combination_id") REFERENCES "match_win_combinations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "match_win_config" DROP COLUMN IF EXISTS "settings";--> statement-breakpoint
ALTER TABLE "match_win_plays" DROP COLUMN IF EXISTS "prize_key";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_win_combinations" ADD CONSTRAINT "match_win_combinations_config_id_match_win_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "match_win_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_win_combinations" ADD CONSTRAINT "match_win_combinations_symbol1_id_match_win_symbols_id_fk" FOREIGN KEY ("symbol1_id") REFERENCES "match_win_symbols"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_win_combinations" ADD CONSTRAINT "match_win_combinations_symbol2_id_match_win_symbols_id_fk" FOREIGN KEY ("symbol2_id") REFERENCES "match_win_symbols"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_win_combinations" ADD CONSTRAINT "match_win_combinations_symbol3_id_match_win_symbols_id_fk" FOREIGN KEY ("symbol3_id") REFERENCES "match_win_symbols"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_win_combinations" ADD CONSTRAINT "match_win_combinations_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "rewards"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "match_win_symbols" ADD CONSTRAINT "match_win_symbols_config_id_match_win_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "match_win_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
