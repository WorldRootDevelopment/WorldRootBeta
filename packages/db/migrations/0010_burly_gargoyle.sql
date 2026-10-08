CREATE TYPE "public"."message_request_state" AS ENUM('none', 'pending', 'declined');--> statement-breakpoint
CREATE TABLE "handle_history" (
	"handle_lower" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge" text NOT NULL,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_pk" PRIMARY KEY("user_id","badge")
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_user_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_user_id_blocked_user_id_pk" PRIMARY KEY("blocker_user_id","blocked_user_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "handle_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "premium_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "request_state" "message_request_state" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "requested_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "handle_history" ADD CONSTRAINT "handle_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "handle_history_user_idx" ON "handle_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_idx" ON "user_blocks" USING btree ("blocked_user_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;