ALTER TABLE "profiles" ADD COLUMN "theme_from" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "theme_to" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "theme_angle" integer DEFAULT 135 NOT NULL;