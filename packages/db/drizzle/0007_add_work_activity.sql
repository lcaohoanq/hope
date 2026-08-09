INSERT INTO "activity_types" ("id", "slug", "label", "weight", "sort_order", "is_active")
VALUES ('activity-type-work', 'work', '{"en":"Work","vi":"Công việc"}'::jsonb, 2, 2, true)
ON CONFLICT ("slug") DO UPDATE
SET "label" = EXCLUDED."label",
	"sort_order" = EXCLUDED."sort_order",
	"is_active" = true,
	"updated_at" = now();
--> statement-breakpoint
UPDATE "activity_types"
SET "sort_order" = 3, "updated_at" = now()
WHERE "slug" = 'other' AND "sort_order" < 3;
