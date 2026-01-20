ALTER TABLE "gamification_rank" RENAME TO "gamification_ranks";--> statement-breakpoint
ALTER TABLE "gamification_users" DROP CONSTRAINT "gamification_users_current_rank_id_gamification_rank_id_fk";
--> statement-breakpoint
ALTER TABLE "gamification_user_rank_history" DROP CONSTRAINT "gamification_user_rank_history_from_rank_id_gamification_rank_id_fk";
--> statement-breakpoint
ALTER TABLE "gamification_user_rank_history" DROP CONSTRAINT "gamification_user_rank_history_to_rank_id_gamification_rank_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_users" ADD CONSTRAINT "gamification_users_current_rank_id_gamification_ranks_id_fk" FOREIGN KEY ("current_rank_id") REFERENCES "gamification_ranks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_rank_history" ADD CONSTRAINT "gamification_user_rank_history_from_rank_id_gamification_ranks_id_fk" FOREIGN KEY ("from_rank_id") REFERENCES "gamification_ranks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gamification_user_rank_history" ADD CONSTRAINT "gamification_user_rank_history_to_rank_id_gamification_ranks_id_fk" FOREIGN KEY ("to_rank_id") REFERENCES "gamification_ranks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
