CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_profile_id" text NOT NULL,
	"actor_profile_id" text,
	"type" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_follows" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_profile_id" text NOT NULL,
	"following_profile_id" text NOT NULL,
	"status" text NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "profile_follows_not_self_check" CHECK ("profile_follows"."follower_profile_id" <> "profile_follows"."following_profile_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "is_public" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_profile_id_profiles_id_fk" FOREIGN KEY ("recipient_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_follows" ADD CONSTRAINT "profile_follows_follower_profile_id_profiles_id_fk" FOREIGN KEY ("follower_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_follows" ADD CONSTRAINT "profile_follows_following_profile_id_profiles_id_fk" FOREIGN KEY ("following_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_profile_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_read_idx" ON "notifications" USING btree ("recipient_profile_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_follows_pair_idx" ON "profile_follows" USING btree ("follower_profile_id","following_profile_id");--> statement-breakpoint
CREATE INDEX "profile_follows_follower_status_idx" ON "profile_follows" USING btree ("follower_profile_id","status");--> statement-breakpoint
CREATE INDEX "profile_follows_following_status_idx" ON "profile_follows" USING btree ("following_profile_id","status");--> statement-breakpoint
ALTER TABLE "profile_follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
