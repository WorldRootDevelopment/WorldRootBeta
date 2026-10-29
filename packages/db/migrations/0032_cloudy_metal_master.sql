ALTER TABLE "users" ADD COLUMN "premium_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "redeem_codes" ADD COLUMN "grants_months" integer;