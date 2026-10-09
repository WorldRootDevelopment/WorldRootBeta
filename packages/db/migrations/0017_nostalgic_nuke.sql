CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
CREATE TABLE "friendships" (
	"requester_user_id" uuid NOT NULL,
	"addressee_user_id" uuid NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "friendships_requester_user_id_addressee_user_id_pk" PRIMARY KEY("requester_user_id","addressee_user_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "banner_media_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "accent_hue" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_user_id_users_id_fk" FOREIGN KEY ("addressee_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friendships_addressee_idx" ON "friendships" USING btree ("addressee_user_id","status");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_banner_media_id_media_id_fk" FOREIGN KEY ("banner_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;