CREATE TABLE "character_images" (
	"character_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "character_images_character_id_media_id_pk" PRIMARY KEY("character_id","media_id")
);
--> statement-breakpoint
ALTER TABLE "character_images" ADD CONSTRAINT "character_images_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "character_images" ADD CONSTRAINT "character_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;