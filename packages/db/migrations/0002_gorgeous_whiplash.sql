CREATE TYPE "public"."content_rating" AS ENUM('everyone', 'teen', 'mature', 'adult');--> statement-breakpoint
CREATE TYPE "public"."scene_post_kind" AS ENUM('ic', 'ooc', 'system');--> statement-breakpoint
CREATE TYPE "public"."scene_status" AS ENUM('active', 'on_hold', 'completed', 'archived');--> statement-breakpoint
CREATE TABLE "scene_characters" (
	"scene_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"added_by_user_id" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scene_characters_scene_id_character_id_pk" PRIMARY KEY("scene_id","character_id")
);
--> statement-breakpoint
CREATE TABLE "scene_drafts" (
	"scene_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"character_id" uuid,
	"content_json" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scene_drafts_scene_id_user_id_pk" PRIMARY KEY("scene_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "scene_participants" (
	"scene_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"invited_by_user_id" uuid,
	"last_read_seq" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scene_participants_scene_id_user_id_pk" PRIMARY KEY("scene_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "scene_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"scene_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"kind" "scene_post_kind" NOT NULL,
	"author_user_id" uuid,
	"character_id" uuid,
	"character_name" text,
	"content_json" jsonb NOT NULL,
	"content_html" text NOT NULL,
	"content_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"removed_by_user_id" uuid,
	CONSTRAINT "scene_posts_scene_seq" UNIQUE("scene_id","seq")
);
--> statement-breakpoint
CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"community_id" uuid,
	"location_id" uuid,
	"created_by_user_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"rating" "content_rating" DEFAULT 'everyone' NOT NULL,
	"status" "scene_status" DEFAULT 'active' NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL,
	"ic_post_count" integer DEFAULT 0 NOT NULL,
	"last_ic_seq" integer DEFAULT 0 NOT NULL,
	"last_ic_author_user_id" uuid,
	"last_post_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_characters" ADD CONSTRAINT "scene_characters_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_drafts" ADD CONSTRAINT "scene_drafts_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_drafts" ADD CONSTRAINT "scene_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_drafts" ADD CONSTRAINT "scene_drafts_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_participants" ADD CONSTRAINT "scene_participants_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_participants" ADD CONSTRAINT "scene_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_participants" ADD CONSTRAINT "scene_participants_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_posts" ADD CONSTRAINT "scene_posts_scene_id_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "public"."scenes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_posts" ADD CONSTRAINT "scene_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_posts" ADD CONSTRAINT "scene_posts_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scene_posts" ADD CONSTRAINT "scene_posts_removed_by_user_id_users_id_fk" FOREIGN KEY ("removed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scene_participants_user_idx" ON "scene_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scene_posts_kind_idx" ON "scene_posts" USING btree ("scene_id","kind","seq");--> statement-breakpoint
CREATE INDEX "scenes_location_idx" ON "scenes" USING btree ("location_id","status","last_post_at");--> statement-breakpoint
CREATE INDEX "scenes_community_idx" ON "scenes" USING btree ("community_id");