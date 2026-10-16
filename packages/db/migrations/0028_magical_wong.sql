CREATE TABLE "community_channels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"community_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"topic" text,
	"category" text,
	"position" integer DEFAULT 0 NOT NULL,
	"read_role_ids" jsonb,
	"post_role_ids" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_channels_conversation_id_unique" UNIQUE("conversation_id"),
	CONSTRAINT "community_channels_name" UNIQUE("community_id","name")
);
--> statement-breakpoint
ALTER TABLE "community_channels" ADD CONSTRAINT "community_channels_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_channels" ADD CONSTRAINT "community_channels_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_channels_order_idx" ON "community_channels" USING btree ("community_id","position");