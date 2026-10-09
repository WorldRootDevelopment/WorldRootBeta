CREATE TABLE "lfrp_listings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"kind" text NOT NULL,
	"pace" text NOT NULL,
	"rating" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lfrp_listings" ADD CONSTRAINT "lfrp_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lfrp_listings_user_idx" ON "lfrp_listings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lfrp_listings_expires_idx" ON "lfrp_listings" USING btree ("expires_at");