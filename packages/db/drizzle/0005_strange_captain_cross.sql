CREATE TABLE "activity_types" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" jsonb NOT NULL,
	"weight" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_types_slug_unique" UNIQUE("slug"),
	CONSTRAINT "activity_types_weight_positive_check" CHECK ("activity_types"."weight" > 0),
	CONSTRAINT "activity_types_slug_format_check" CHECK ("activity_types"."slug" ~ '^[a-z][a-z0-9_-]*$')
);
--> statement-breakpoint
CREATE INDEX "activity_types_active_sort_idx" ON "activity_types" USING btree ("is_active","sort_order","slug");--> statement-breakpoint
INSERT INTO "activity_types" ("id", "slug", "label", "weight", "sort_order", "is_active")
VALUES
	('activity-type-workout', 'workout', '{"en":"Workout","vi":"Tập luyện"}'::jsonb, 3, 0, true),
	('activity-type-study', 'study', '{"en":"Study","vi":"Học tập"}'::jsonb, 2, 1, true),
	('activity-type-other', 'other', '{"en":"Other","vi":"Hoạt động khác"}'::jsonb, 1, 2, true)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "workouts" SET "type" = lower(trim("type"));--> statement-breakpoint
UPDATE "workouts" SET "type" = 'other' WHERE "type" NOT IN ('workout', 'study', 'other');--> statement-breakpoint
UPDATE "workouts" AS w
SET "points" = at."weight"
FROM "activity_types" AS at
WHERE w."type" = at."slug";--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_type_activity_types_slug_fk" FOREIGN KEY ("type") REFERENCES "public"."activity_types"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workouts_profile_date_points_idx" ON "workouts" USING btree ("profile_id","date","points");
