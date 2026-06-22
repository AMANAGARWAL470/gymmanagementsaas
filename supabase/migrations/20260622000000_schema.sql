-- 1. Create Enums
CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_PAYMENT');
CREATE TYPE staff_role AS ENUM ('ADMIN', 'TRAINER', 'RECEPTIONIST');
CREATE TYPE member_status AS ENUM ('ACTIVE', 'INACTIVE', 'FROZEN', 'SUSPENDED');
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'EXPIRED', 'FROZEN');
CREATE TYPE freeze_status AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE invoice_status AS ENUM ('PAID', 'UNPAID', 'OVERDUE', 'VOID');
CREATE TYPE payment_gateway AS ENUM ('STRIPE', 'RAZORPAY', 'MANUAL');
CREATE TYPE payment_status AS ENUM ('SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE checkin_method AS ENUM ('QR', 'RFID', 'BIOMETRIC', 'MANUAL');
CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'TRIAL', 'WON', 'LOST');
CREATE TYPE cms_module_type AS ENUM ('EXERCISE', 'WORKOUT', 'DIET', 'PLAN', 'NOTIFICATION', 'FORM', 'PROMOTION');
CREATE TYPE cms_version_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- 2. Create Global / Tenant Tables
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE CONSTRAINT slug_format_check CHECK (slug ~ '^[a-z0-9-]+$'),
    custom_domain VARCHAR(255) UNIQUE,
    status tenant_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_branding (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    logo_url TEXT,
    app_icon_url TEXT,
    splash_screen_url TEXT,
    member_card_template_url TEXT,
    primary_color_light CHAR(7) NOT NULL DEFAULT '#f59e0b' CONSTRAINT hex_primary_light CHECK (primary_color_light ~ '^#[0-9a-fA-F]{6}$'),
    secondary_color_light CHAR(7) NOT NULL DEFAULT '#0f172a' CONSTRAINT hex_secondary_light CHECK (secondary_color_light ~ '^#[0-9a-fA-F]{6}$'),
    primary_color_dark CHAR(7) NOT NULL DEFAULT '#fbbf24' CONSTRAINT hex_primary_dark CHECK (primary_color_dark ~ '^#[0-9a-fA-F]{6}$'),
    secondary_color_dark CHAR(7) NOT NULL DEFAULT '#1e293b' CONSTRAINT hex_secondary_dark CHECK (secondary_color_dark ~ '^#[0-9a-fA-F]{6}$'),
    font_family VARCHAR(50) NOT NULL DEFAULT 'Inter',
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    locale VARCHAR(10) NOT NULL DEFAULT 'en',
    measurement_system VARCHAR(10) NOT NULL DEFAULT 'METRIC' CONSTRAINT check_measurement CHECK (measurement_system IN ('METRIC', 'IMPERIAL')),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Core Users & Staff Tables
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY, -- References auth.users
    active_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_membership_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CONSTRAINT check_role CHECK (role IN ('OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER', 'MEMBER')),
    CONSTRAINT unique_profile_tenant_role UNIQUE (tenant_id, profile_id, role)
);

CREATE TABLE public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role staff_role NOT NULL DEFAULT 'RECEPTIONIST',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    dob DATE,
    status member_status NOT NULL DEFAULT 'INACTIVE',
    qr_code_token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_tenant_member_email UNIQUE (tenant_id, email, deleted_at)
);

-- 4. Corporate & Family Group Tables
CREATE TABLE public.corporate_sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_name VARCHAR(100) NOT NULL,
    email_domain VARCHAR(100) NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    minimum_members INTEGER NOT NULL DEFAULT 5 CHECK (minimum_members > 0),
    CONSTRAINT unique_tenant_company_domain UNIQUE (tenant_id, email_domain)
);

CREATE TABLE public.membership_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    primary_member_id UUID NOT NULL REFERENCES public.members(id),
    corporate_sponsor_id UUID REFERENCES public.corporate_sponsors(id),
    group_type VARCHAR(15) NOT NULL CHECK (group_type IN ('FAMILY', 'CORPORATE')),
    max_sub_accounts INTEGER NOT NULL DEFAULT 4 CHECK (max_sub_accounts >= 0)
);

CREATE TABLE public.membership_group_members (
    group_id UUID REFERENCES public.membership_groups(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, member_id)
);

-- 5. Membership Plan Tables
CREATE TABLE public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    max_freezes INTEGER NOT NULL DEFAULT 0 CHECK (max_freezes >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.member_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CONSTRAINT end_date_after_start CHECK (end_date >= start_date),
    status membership_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.freezes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.member_memberships(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CONSTRAINT freeze_end_after_start CHECK (end_date >= start_date),
    reason TEXT,
    status freeze_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Billing, Payments & Ledger Tables
CREATE TABLE public.tenant_tax_configurations (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    tax_name VARCHAR(50) NOT NULL,
    rate_percentage NUMERIC(5, 2) NOT NULL CHECK (rate_percentage >= 0),
    country_code CHAR(2) NOT NULL,
    state_code CHAR(2),
    is_inclusive BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    gateway payment_gateway NOT NULL,
    customer_token VARCHAR(255) NOT NULL,
    payment_method_token VARCHAR(255),
    brand VARCHAR(30),
    last_four CHAR(4),
    expires_at DATE
);

CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id),
    membership_id UUID REFERENCES public.member_memberships(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    status invoice_status NOT NULL DEFAULT 'UNPAID',
    due_date DATE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT unique_tenant_invoice_number UNIQUE (tenant_id, invoice_number)
);

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    transaction_id VARCHAR(255) UNIQUE,
    gateway payment_gateway NOT NULL DEFAULT 'MANUAL',
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    status payment_status NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    balance_due NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Operations & Attendance Tables
CREATE TABLE public.gate_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE'))
);

CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    check_out TIMESTAMP WITH TIME ZONE,
    method checkin_method NOT NULL DEFAULT 'QR',
    checked_in_by_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.gate_devices(id) ON DELETE SET NULL
);

CREATE TABLE public.attendance_offline_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    card_token VARCHAR(255) NOT NULL,
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'COMPLETED', 'FAILED'))
);

CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    status lead_status NOT NULL DEFAULT 'NEW',
    source VARCHAR(100),
    assigned_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    next_follow_up TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Exercise & Workout Tables
CREATE TABLE public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- Global if NULL
    name VARCHAR(100) NOT NULL,
    target_muscle VARCHAR(50) NOT NULL,
    equipment VARCHAR(50),
    instructions TEXT,
    video_url TEXT
);

CREATE TABLE public.workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE public.workout_template_exercises (
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    sequence_order INTEGER NOT NULL,
    prescription_sets JSONB NOT NULL,
    PRIMARY KEY (template_id, exercise_id, sequence_order)
);

CREATE TABLE public.workout_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    duration_weeks INTEGER NOT NULL CHECK (duration_weeks > 0)
);

CREATE TABLE public.workout_program_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL,
    day_number INTEGER NOT NULL,
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE RESTRICT
);

CREATE TABLE public.member_program_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.workout_programs(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'))
);

CREATE TABLE public.workout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.member_program_assignments(id) ON DELETE SET NULL,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
    logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    duration_minutes INTEGER
);

CREATE TABLE public.workout_set_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
    set_index INTEGER NOT NULL,
    target_reps INTEGER,
    target_weight NUMERIC(6, 2),
    logged_reps INTEGER NOT NULL,
    logged_weight NUMERIC(6, 2) NOT NULL,
    rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
    completed BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.member_personal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    set_log_id UUID NOT NULL REFERENCES public.workout_set_logs(id) ON DELETE CASCADE,
    max_weight NUMERIC(6, 2) NOT NULL,
    estimated_one_rep_max NUMERIC(6, 2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Nutrition & Diets Tables
CREATE TABLE public.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- Global if NULL
    name VARCHAR(100) NOT NULL,
    portion_g NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
    calories NUMERIC(6, 2) NOT NULL CHECK (calories >= 0),
    protein_g NUMERIC(5, 2) NOT NULL CHECK (protein_g >= 0),
    carbs_g NUMERIC(5, 2) NOT NULL CHECK (carbs_g >= 0),
    fat_g NUMERIC(5, 2) NOT NULL CHECK (fat_g >= 0)
);

CREATE TABLE public.diet_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_calories NUMERIC(6, 2) NOT NULL CHECK (target_calories > 0),
    target_protein_g NUMERIC(5, 2) NOT NULL,
    target_carbs_g NUMERIC(5, 2) NOT NULL,
    target_fat_g NUMERIC(5, 2) NOT NULL
);

CREATE TABLE public.diet_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.diet_templates(id) ON DELETE CASCADE,
    meal_name VARCHAR(50) NOT NULL,
    sequence_order INTEGER NOT NULL
);

CREATE TABLE public.diet_meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_id UUID NOT NULL REFERENCES public.diet_meals(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
    portion_g NUMERIC(6, 2) NOT NULL CHECK (portion_g > 0)
);

CREATE TABLE public.member_diet_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.diet_templates(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.diet_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    water_ml INTEGER NOT NULL DEFAULT 0 CHECK (water_ml >= 0),
    CONSTRAINT unique_member_diet_date UNIQUE (member_id, logged_date)
);

CREATE TABLE public.diet_meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id UUID NOT NULL REFERENCES public.diet_logs(id) ON DELETE CASCADE,
    meal_id UUID NOT NULL REFERENCES public.diet_meals(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL DEFAULT false
);

-- 10. Automation & Notification Templates Tables
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    locale VARCHAR(10) NOT NULL,
    channel VARCHAR(15) NOT NULL CHECK (channel IN ('WHATSAPP', 'SMS', 'EMAIL', 'PUSH')),
    subject_template VARCHAR(255),
    body_template TEXT NOT NULL,
    CONSTRAINT unique_tenant_slug_locale_channel UNIQUE (tenant_id, slug, locale, channel)
);

CREATE TABLE public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.automation_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    field VARCHAR(100) NOT NULL,
    operator VARCHAR(20) NOT NULL CHECK (operator IN ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'IN_ARRAY')),
    value VARCHAR(255) NOT NULL
);

CREATE TABLE public.automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('SEND_WHATSAPP', 'SEND_EMAIL', 'ADD_TAG', 'SUSPEND_MEMBER')),
    payload_template JSONB NOT NULL,
    execution_delay_seconds INTEGER DEFAULT 0 CHECK (execution_delay_seconds >= 0)
);

CREATE TABLE public.automation_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status VARCHAR(15) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    error_message TEXT
);

-- 11. CMS Content & Versioning Tables
CREATE TABLE public.cms_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    module_type cms_module_type NOT NULL,
    active_version_id UUID,
    is_archived BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.cms_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metadata_id UUID NOT NULL REFERENCES public.cms_metadata(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    status cms_version_status NOT NULL DEFAULT 'DRAFT',
    content_data JSONB NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_metadata ADD CONSTRAINT fk_active_version FOREIGN KEY (active_version_id) REFERENCES public.cms_versions(id) ON DELETE SET NULL;

-- 12. System Audit Logs & Analytics Reports
CREATE TABLE public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    actor_id UUID,
    action VARCHAR(20) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.financial_snapshots (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_mrr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    churn_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_liabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    PRIMARY KEY (tenant_id, snapshot_date)
);

CREATE TABLE public.ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('MEMBER_CHURN', 'REVENUE_FORECAST', 'OCCUPANCY')),
    target_id UUID,
    prediction_value JSONB NOT NULL,
    confidence_score NUMERIC(4,3) CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
