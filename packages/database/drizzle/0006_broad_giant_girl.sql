ALTER TABLE "broker_commission_assignments" ADD CONSTRAINT "broker_commission_assignment_dates_valid" CHECK (
            "broker_commission_assignments"."effective_to" IS NULL
            OR "broker_commission_assignments"."effective_to" >= "broker_commission_assignments"."effective_from"
        );--> statement-breakpoint
ALTER TABLE "broker_commission_assignments" ADD CONSTRAINT "broker_commission_assignment_priority_positive" CHECK ("broker_commission_assignments"."priority" > 0);--> statement-breakpoint
ALTER TABLE "broker_payout_items" ADD CONSTRAINT "broker_payout_items_amount_valid" CHECK (
        "broker_payout_items"."item_type" = 'adjustment'
        OR "broker_payout_items"."amount" >= 0
    );--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_base_salary_non_negative" CHECK ("broker_payout_statements"."base_salary_amount" >= 0);--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_sales_commission_non_negative" CHECK ("broker_payout_statements"."sales_commission_amount" >= 0);--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_leasing_commission_non_negative" CHECK ("broker_payout_statements"."leasing_commission_amount" >= 0);--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_combined_commission_non_negative" CHECK ("broker_payout_statements"."combined_commission_amount" >= 0);--> statement-breakpoint
ALTER TABLE "broker_payout_statements" ADD CONSTRAINT "broker_payout_gross_non_negative" CHECK ("broker_payout_statements"."gross_compensation_amount" >= 0);--> statement-breakpoint
ALTER TABLE "broker_salary_terms" ADD CONSTRAINT "broker_salary_monthly_non_negative" CHECK ("broker_salary_terms"."monthly_salary" >= 0);--> statement-breakpoint
ALTER TABLE "broker_salary_terms" ADD CONSTRAINT "broker_salary_payment_day_valid" CHECK (
        "broker_salary_terms"."payment_day" >= 1
        AND "broker_salary_terms"."payment_day" <= 31
    );--> statement-breakpoint
ALTER TABLE "broker_salary_terms" ADD CONSTRAINT "broker_salary_effective_dates_valid" CHECK (
        "broker_salary_terms"."effective_to" IS NULL
        OR "broker_salary_terms"."effective_to" >= "broker_salary_terms"."effective_from"
    );--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_qualifying_non_negative" CHECK ("commission_earnings"."qualifying_amount" >= 0);--> statement-breakpoint
ALTER TABLE "commission_earnings" ADD CONSTRAINT "commission_earnings_commission_non_negative" CHECK ("commission_earnings"."calculated_commission" >= 0);--> statement-breakpoint
ALTER TABLE "commission_periods" ADD CONSTRAINT "commission_periods_date_range_valid" CHECK ("commission_periods"."period_end" > "commission_periods"."period_start");--> statement-breakpoint
ALTER TABLE "commission_plan_slabs" ADD CONSTRAINT "commission_slabs_lower_bound_non_negative" CHECK ("commission_plan_slabs"."lower_bound" >= 0);--> statement-breakpoint
ALTER TABLE "commission_plan_slabs" ADD CONSTRAINT "commission_slabs_upper_after_lower" CHECK (
        "commission_plan_slabs"."upper_bound" IS NULL
        OR "commission_plan_slabs"."upper_bound" > "commission_plan_slabs"."lower_bound"
        );--> statement-breakpoint
ALTER TABLE "commission_plan_slabs" ADD CONSTRAINT "commission_slabs_payout_config_valid" CHECK (
        (
            "commission_plan_slabs"."payout_type" = 'percentage'
            AND "commission_plan_slabs"."payout_percentage" IS NOT NULL
            AND "commission_plan_slabs"."payout_percentage" >= 0
            AND "commission_plan_slabs"."fixed_payout_amount" IS NULL
        )
        OR
        (
            "commission_plan_slabs"."payout_type" = 'fixed_amount'
            AND "commission_plan_slabs"."fixed_payout_amount" IS NOT NULL
            AND "commission_plan_slabs"."fixed_payout_amount" >= 0
            AND "commission_plan_slabs"."payout_percentage" IS NULL
        )
        );