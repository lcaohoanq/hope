CREATE TABLE "workout_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_id" text NOT NULL,
	"author_profile_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_comments_body_length_check" CHECK (char_length(btrim("workout_comments"."body")) between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "workout_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_type_check";--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "workout_id" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "comment_id" text;--> statement-breakpoint
ALTER TABLE "workout_comments" ADD CONSTRAINT "workout_comments_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_comments" ADD CONSTRAINT "workout_comments_author_profile_id_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_likes" ADD CONSTRAINT "workout_likes_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_likes" ADD CONSTRAINT "workout_likes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_comments_workout_created_idx" ON "workout_comments" USING btree ("workout_id","created_at","id");--> statement-breakpoint
CREATE INDEX "workout_comments_author_idx" ON "workout_comments" USING btree ("author_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_likes_workout_profile_idx" ON "workout_likes" USING btree ("workout_id","profile_id");--> statement-breakpoint
CREATE INDEX "workout_likes_workout_created_idx" ON "workout_likes" USING btree ("workout_id","created_at");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_workout_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."workout_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_unique_workout_like_idx" ON "notifications" USING btree ("recipient_profile_id","actor_profile_id","workout_id") WHERE "notifications"."type" = 'workout_liked';--> statement-breakpoint
CREATE INDEX "workouts_profile_created_idx" ON "workouts" USING btree ("profile_id","created_at","id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('follow_request', 'new_follower', 'follow_accepted', 'workout_liked', 'workout_commented'));--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
		REVOKE ALL PRIVILEGES ON TABLE public.workout_comments, public.workout_likes FROM anon;
		REVOKE ALL PRIVILEGES ON SEQUENCE public.workout_likes_id_seq FROM anon;
	END IF;
	IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
		REVOKE ALL PRIVILEGES ON TABLE public.workout_comments, public.workout_likes FROM authenticated;
		REVOKE ALL PRIVILEGES ON SEQUENCE public.workout_likes_id_seq FROM authenticated;
	END IF;
END
$$;
