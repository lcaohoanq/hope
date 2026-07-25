CREATE TABLE "workout_music" (
	"workout_id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'deezer' NOT NULL,
	"track_id" text NOT NULL,
	"title" text NOT NULL,
	"artist_name" text NOT NULL,
	"album_title" text,
	"cover_url" text,
	"provider_url" text NOT NULL,
	"duration_seconds" integer,
	CONSTRAINT "workout_music_provider_check" CHECK ("workout_music"."provider" = 'deezer'),
	CONSTRAINT "workout_music_duration_nonnegative_check" CHECK ("workout_music"."duration_seconds" is null or "workout_music"."duration_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "workout_music" ADD CONSTRAINT "workout_music_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_music_track_idx" ON "workout_music" USING btree ("provider","track_id");