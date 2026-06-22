-- 1. Enable RLS on All Tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freezes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_tax_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_offline_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_diet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

-- 2. Create JWT Resolver Helper Functions
CREATE OR REPLACE FUNCTION public.get_jwt_tenant_id() 
RETURNS UUID AS $$
  SELECT NULLIF(auth.jwt() -> 'user_metadata' ->> 'tenant_id', '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_jwt_role() 
RETURNS VARCHAR AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 3. Base Tenants and Branding Policies
CREATE POLICY tenants_select_policy ON public.tenants FOR SELECT
USING (true); -- Global lookups allowed for subdomains resolving

CREATE POLICY branding_select_policy ON public.tenant_branding FOR SELECT
USING (true); -- Public loading on onboarding widgets

CREATE POLICY branding_modify_policy ON public.tenant_branding FOR ALL
USING (tenant_id = public.get_jwt_tenant_id() AND public.get_jwt_role() IN ('ADMIN', 'OWNER'));

-- 4. User Profiles and Roles Policies
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT
USING (active_tenant_id = public.get_jwt_tenant_id());

CREATE POLICY profiles_self_update ON public.profiles FOR ALL
USING (id = auth.uid());

CREATE POLICY tenant_roles_access ON public.tenant_membership_roles FOR ALL
USING (tenant_id = public.get_jwt_tenant_id());

-- 5. Staff and Members RLS Policies
CREATE POLICY staff_tenant_isolation ON public.staff FOR ALL
USING (tenant_id = public.get_jwt_tenant_id());

CREATE POLICY members_select_rule ON public.members FOR SELECT
USING (
  tenant_id = public.get_jwt_tenant_id() AND (
    public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'TRAINER', 'RECEPTIONIST')
    OR auth_user_id = auth.uid()
  )
);

CREATE POLICY members_write_rule ON public.members FOR ALL
USING (
  tenant_id = public.get_jwt_tenant_id() AND 
  public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST')
);

-- 6. Membership Plans and Active Assignments Policies
CREATE POLICY plans_select_rule ON public.membership_plans FOR SELECT
USING (tenant_id = public.get_jwt_tenant_id());

CREATE POLICY plans_write_rule ON public.membership_plans FOR ALL
USING (
  tenant_id = public.get_jwt_tenant_id() AND 
  public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER')
);

CREATE POLICY memberships_select_rule ON public.member_memberships FOR SELECT
USING (
  tenant_id = public.get_jwt_tenant_id() AND (
    public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST')
    OR member_id = (SELECT id FROM public.members WHERE auth_user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY memberships_write_rule ON public.member_memberships FOR ALL
USING (
  tenant_id = public.get_jwt_tenant_id() AND 
  public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST')
);

-- 7. Operations & Attendance Policies
CREATE POLICY attendance_select_rule ON public.attendance FOR SELECT
USING (
  tenant_id = public.get_jwt_tenant_id() AND (
    public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER')
    OR member_id = (SELECT id FROM public.members WHERE auth_user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY attendance_write_rule ON public.attendance FOR ALL
USING (
  tenant_id = public.get_jwt_tenant_id() AND 
  public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST')
);

-- 8. HIPAA Health Records Policies
CREATE POLICY health_records_strict_rule ON public.member_health_records FOR ALL
USING (
  tenant_id = public.get_jwt_tenant_id() AND (
    public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER')
    OR member_id = (SELECT id FROM public.members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR (
      public.get_jwt_role() = 'TRAINER' AND member_id IN (
        -- Only assigned trainers can view this member's health assessments
        SELECT member_id FROM public.member_program_assignments WHERE status = 'ACTIVE'
      )
    )
  )
);

-- 9. Finance and Invoices Policies
CREATE POLICY invoices_select_rule ON public.invoices FOR SELECT
USING (
  tenant_id = public.get_jwt_tenant_id() AND (
    public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST')
    OR member_id = (SELECT id FROM public.members WHERE auth_user_id = auth.uid() LIMIT 1)
  )
);

CREATE POLICY invoices_write_rule ON public.invoices FOR ALL
USING (
  tenant_id = public.get_jwt_tenant_id() AND 
  public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST')
);

-- 10. CMS & Versioning Policies
CREATE POLICY cms_metadata_select ON public.cms_metadata FOR SELECT
USING (tenant_id = public.get_jwt_tenant_id());

CREATE POLICY cms_metadata_modify ON public.cms_metadata FOR ALL
USING (
  tenant_id = public.get_jwt_tenant_id() AND 
  public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER')
);

CREATE POLICY cms_versions_select ON public.cms_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cms_metadata m 
    WHERE m.id = metadata_id AND m.tenant_id = public.get_jwt_tenant_id()
  )
);

CREATE POLICY cms_versions_modify ON public.cms_versions FOR ALL
USING (
  public.get_jwt_role() IN ('ADMIN', 'OWNER', 'MANAGER', 'TRAINER') AND
  EXISTS (
    SELECT 1 FROM public.cms_metadata m 
    WHERE m.id = metadata_id AND m.tenant_id = public.get_jwt_tenant_id()
  )
);
