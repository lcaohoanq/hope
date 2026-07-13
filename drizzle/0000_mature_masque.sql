CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text,
	"username" text NOT NULL,
	"plan" text DEFAULT 'standard' NOT NULL,
	"display_name" text NOT NULL,
	"birth_year" integer NOT NULL,
	"avatar_seed" text NOT NULL,
	"avatar_url" text,
	"avatar_public_id" text,
	"bio" jsonb NOT NULL,
	"location" jsonb,
	"pronouns" jsonb,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"social_links" jsonb,
	"website" text,
	"settings" jsonb NOT NULL,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "profiles_username_unique" UNIQUE("username"),
	CONSTRAINT "profiles_avatar_public_id_unique" UNIQUE("avatar_public_id")
);
--> statement-breakpoint
CREATE TABLE "workout_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" text NOT NULL,
	"position" integer NOT NULL,
	"public_id" text NOT NULL,
	"secure_url" text NOT NULL,
	"format" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	CONSTRAINT "workout_images_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_images" ADD CONSTRAINT "workout_images_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_normalized_idx" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_images_position_idx" ON "workout_images" USING btree ("workout_id","position");--> statement-breakpoint
CREATE INDEX "workouts_profile_date_idx" ON "workouts" USING btree ("profile_id","date");
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workouts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "workout_images" ENABLE ROW LEVEL SECURITY;
