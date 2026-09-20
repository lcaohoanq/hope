CREATE TABLE "wfh_allowances" (
	"profile_id" text NOT NULL,
	"year" integer NOT NULL,
	"total_days" integer DEFAULT 45 NOT NULL,
	CONSTRAINT "wfh_quota_range" CHECK ("wfh_allowances"."total_days" between 0 and 366)
);
--> statement-breakpoint
CREATE TABLE "wfh_records" (
	"profile_id" text NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wfh_record_status" CHECK ("wfh_records"."status" in ('WFH', 'OFFICE'))
);
--> statement-breakpoint
CREATE TABLE "wfh_reminder_deliveries" (
	"profile_id" text NOT NULL,
	"date" date NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wfh_settings" (
	"profile_id" text PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"reminder_enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "wfh_employment_dates" CHECK ("wfh_settings"."end_date" is null or "wfh_settings"."end_date" >= "wfh_settings"."start_date")
);
--> statement-breakpoint
ALTER TABLE "wfh_allowances" ADD CONSTRAINT "wfh_allowances_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wfh_records" ADD CONSTRAINT "wfh_records_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wfh_reminder_deliveries" ADD CONSTRAINT "wfh_reminder_deliveries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wfh_settings" ADD CONSTRAINT "wfh_settings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wfh_allowance_owner_year" ON "wfh_allowances" USING btree ("profile_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "wfh_record_owner_date" ON "wfh_records" USING btree ("profile_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "wfh_reminder_owner_date" ON "wfh_reminder_deliveries" USING btree ("profile_id","date");