ALTER TABLE "worlds" ADD COLUMN "share_code" text;--> statement-breakpoint
ALTER TABLE "worlds" ADD CONSTRAINT "worlds_share_code_unique" UNIQUE("share_code");