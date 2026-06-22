-- 1. Create Timestamp Trigger Functions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to core tables
CREATE TRIGGER update_tenants_timestamp BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_branding_timestamp BEFORE UPDATE ON public.tenant_branding
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_staff_timestamp BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_members_timestamp BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_plans_timestamp BEFORE UPDATE ON public.membership_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_memberships_timestamp BEFORE UPDATE ON public.member_memberships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_freezes_timestamp BEFORE UPDATE ON public.freezes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_invoices_timestamp BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Create HIPAA Compliant Audit Logging Trigger
CREATE OR REPLACE FUNCTION public.audit_health_record_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        tenant_id,
        actor_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    )
    VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        auth.uid(),
        TG_OP,
        'member_health_records',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_health_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.member_health_records
FOR EACH ROW EXECUTE FUNCTION public.audit_health_record_change();

-- 3. Create Automated 1RM Progression Trigger
CREATE OR REPLACE FUNCTION public.calculate_one_rep_max()
RETURNS TRIGGER AS $$
DECLARE
    calculated_1rm NUMERIC(6, 2);
    member_uuid UUID;
    existing_record_id UUID;
    existing_1rm NUMERIC(6, 2);
BEGIN
    -- 1. Calculate Estimated 1RM via Epley equation
    IF NEW.logged_reps = 1 THEN
        calculated_1rm := NEW.logged_weight;
    ELSE
        calculated_1rm := NEW.logged_weight * (1.0 + (NEW.logged_reps::numeric / 30.0));
    END IF;

    -- Get member_id from workout_logs
    SELECT member_id INTO member_uuid FROM public.workout_logs WHERE id = NEW.log_id LIMIT 1;

    -- 2. Query existing personal records
    SELECT id, estimated_one_rep_max INTO existing_record_id, existing_1rm 
    FROM public.member_personal_records 
    WHERE member_id = member_uuid AND exercise_id = NEW.exercise_id 
    LIMIT 1;

    -- 3. Upsert if no previous record exists or if new 1RM is a personal best
    IF existing_record_id IS NULL THEN
        INSERT INTO public.member_personal_records (member_id, exercise_id, set_log_id, max_weight, estimated_one_rep_max)
        VALUES (member_uuid, NEW.exercise_id, NEW.id, NEW.logged_weight, calculated_1rm);
    ELSIF calculated_1rm > existing_1rm THEN
        UPDATE public.member_personal_records 
        SET set_log_id = NEW.id,
            max_weight = GREATEST(max_weight, NEW.logged_weight),
            estimated_one_rep_max = calculated_1rm,
            recorded_at = now()
        WHERE id = existing_record_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER workout_set_1rm_trigger
AFTER INSERT OR UPDATE ON public.workout_set_logs
FOR EACH ROW EXECUTE FUNCTION public.calculate_one_rep_max();
