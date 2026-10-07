CREATE TABLE "scene_post_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"content_json" jsonb NOT NULL,
	"edited_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scene_post_revisions" ADD CONSTRAINT "scene_post_revisions_post_id_scene_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."scene_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_post_revisions" ADD CONSTRAINT "scene_post_revisions_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_post_revisions_post_idx" ON "scene_post_revisions" USING btree ("post_id","created_at");