CREATE TABLE "user_items" (
	"user_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"source" text DEFAULT 'grant' NOT NULL,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_items_user_id_item_key_pk" PRIMARY KEY("user_id","item_key")
);
--> statement-breakpoint
CREATE TABLE "scene_post_images" (
	"post_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "scene_post_images_post_id_media_id_pk" PRIMARY KEY("post_id","media_id"),
	CONSTRAINT "scene_post_images_media_id_unique" UNIQUE("media_id")
);
--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_post_images" ADD CONSTRAINT "scene_post_images_post_id_scene_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."scene_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_post_images" ADD CONSTRAINT "scene_post_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;