CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"group_key" text NOT NULL,
	"subject" text NOT NULL,
	"actors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"preview" text,
	"href" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "notifications_group_idx" ON "notifications" USING btree ("user_id","group_key");