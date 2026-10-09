ALTER TABLE "characters" ADD COLUMN "docs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "worlds" ADD COLUMN "docs" jsonb DEFAULT '{}'::jsonb NOT NULL;