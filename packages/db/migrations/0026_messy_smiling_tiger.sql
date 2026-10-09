ALTER TABLE "communities" ADD COLUMN "chronicle" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "player_roles" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "scenes" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
-- Scenes finished before this column existed take the time of their last post, so they appear in the Chronicle in a sensible order.
UPDATE "scenes" SET "completed_at" = "last_post_at" WHERE "status" = 'completed' AND "completed_at" IS NULL;
