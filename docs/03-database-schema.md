# 03. Database Schema Design & RLS Specifications

This document defines the complete production-grade database schema design for the Multi-Tenant Gym Operating System on **Supabase (PostgreSQL)**. It covers enums, tables, relations, constraints, Row-Level Security (RLS) policies, materialized views, triggers, and indices.

---

## 1. Database Enums

```sql
-- Global and tenant-specific state definitions
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
```

---

## 2. Table Schemas, Constraints, and Soft Deletes

All tables (except global SaaS tables) include a `tenant_id` column. Soft deletes are implemented using a `deleted_at` timestamp.

### I. Global Schema Tables

#### `tenants`
```sql
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE CONSTRAINT slug_format_check CHECK (slug ~ '^[a-z0-9-]+$'),
    custom_domain VARCHAR(255) UNIQUE,
    status tenant_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

#### `tenant_branding`
```sql
CREATE TABLE public.tenant_branding (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color CHAR(7) NOT NULL DEFAULT '#f59e0b' CONSTRAINT hex_primary CHECK (primary_color ~ '^#[0-9a-fA-F]{6}$'),
    secondary_color CHAR(7) NOT NULL DEFAULT '#0f172a' CONSTRAINT hex_secondary CHECK (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
    font_family VARCHAR(50) NOT NULL DEFAULT 'Inter',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### II. Tenant-Scoped Tables (Soft Deletes & RLS Enabled)

#### `staff`
```sql
CREATE TABLE public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    auth_user_id UUID NOT NULL UNIQUE, -- References auth.users
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role staff_role NOT NULL DEFAULT 'RECEPTIONIST',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);
```

#### `members`
```sql
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    auth_user_id UUID UNIQUE, -- Nullable, references auth.users if they download the app
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
    
    -- Ensure active emails are unique within a single tenant
    CONSTRAINT unique_tenant_member_email UNIQUE (tenant_id, email, deleted_at)
);
```

#### `membership_plans`
```sql
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
```

#### `member_memberships`
```sql
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
```

#### `freezes`
```sql
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
```

#### `invoices`
```sql
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
```

#### `payments`
```sql
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
```

#### `attendance`
```sql
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    check_out TIMESTAMP WITH TIME ZONE,
    method checkin_method NOT NULL DEFAULT 'QR'
);
```

#### `member_health_records` (HIPAA-Protected Table)
```sql
CREATE TABLE public.member_health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
    encrypted_medical_notes TEXT, -- Asymmetrically encrypted application logs
    bio_metrics JSONB NOT NULL DEFAULT '{}'::jsonb, -- Weight metrics tracking
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### III. System Auditing Table (Write-Only)

```sql
CREATE TABLE public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    actor_id UUID, -- auth.users ID
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE, SELECT
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

---

## 3. Row-Level Security (RLS) Policies

Every table has Row-Level Security active. JWT claims resolve authentication contexts.

```sql
-- Activate RLS on all tables
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freezes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
```

### RLS Policies Definition Code

#### Staff Policies
- **Admin / Staff Read**: Staff members can view profiles if they belong to the same tenant.
- **Member Access**: Members cannot read staff lists.
```sql
CREATE POLICY staff_select_policy ON public.staff FOR SELECT
USING (
  tenant_id = ((auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid)
  AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'TRAINER', 'RECEPTIONIST')
);
```

#### Member Policies
- **Select**: Staff can view all members. Members can only read their own profile row.
```sql
CREATE POLICY members_select_policy ON public.members FOR SELECT
USING (
  tenant_id = ((auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid)
  AND (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'TRAINER', 'RECEPTIONIST')
    OR auth_user_id = auth.uid()
  )
);
```

#### Invoices Policies
- **Staff Access**: Write & Read within tenant boundaries.
- **Member Access**: Read-only access for invoices matching their user profile.
```sql
CREATE POLICY invoices_select_policy ON public.invoices FOR SELECT
USING (
  tenant_id = ((auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid)
  AND (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('ADMIN', 'RECEPTIONIST')
    OR member_id = (SELECT id FROM public.members WHERE auth_user_id = auth.uid())
  )
);
```

#### Health Records Policies (HIPAA Compliant isolation)
- **Strict Check**: Only designated trainers, admins, or the members themselves can view/edit health records.
```sql
CREATE POLICY health_strict_policy ON public.member_health_records FOR ALL
USING (
  tenant_id = ((auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid)
  AND (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
    OR member_id = (SELECT id FROM public.members WHERE auth_user_id = auth.uid())
    OR (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'TRAINER' 
      AND member_id IN (
        SELECT member_id FROM public.trainer_assignments 
        WHERE trainer_auth_id = auth.uid()
      )
    )
  )
);
```

---

## 4. Materialized Views (Analytics Cache)

To generate fast daily analytics dashboards without computing raw counts on the fly:

```sql
CREATE MATERIALIZED VIEW public.daily_revenue_summary AS
SELECT 
    tenant_id,
    date_trunc('day', created_at)::date AS transaction_date,
    gateway,
    SUM(amount) AS total_amount,
    COUNT(id) AS transaction_count
FROM 
    public.payments
WHERE 
    status = 'SUCCESS'
GROUP BY 
    tenant_id, 
    transaction_date, 
    gateway;

-- Index for fast tenant filtering on dashboards
CREATE UNIQUE INDEX idx_daily_revenue_tenant_date 
ON public.daily_revenue_summary (tenant_id, transaction_date);
```

---

## 5. Database Triggers & Auditing

### I. Automated `updated_at` Timestamp Trigger
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_members_timestamp
BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### II. Automated Audit Log Trigger for Medical Records (HIPAA Audit Trail)
```sql
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
```

---

## 6. Database Indexing Strategy

To maintain sub-100ms querying speeds as membership numbers scale:

```sql
-- 1. Multi-Tenant scope indexes
CREATE INDEX idx_members_tenant ON public.members(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_tenant ON public.membership_plans(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id);

-- 2. Soft-delete check exclusions
CREATE INDEX idx_members_active_email ON public.members(tenant_id, email) 
WHERE deleted_at IS NULL;

-- 3. Dynamic QR Check-in verification index
CREATE UNIQUE INDEX idx_members_active_qr ON public.members(tenant_id, qr_code_token) 
WHERE deleted_at IS NULL;

-- 4. Attendance logging performance
CREATE INDEX idx_attendance_member_checkin ON public.attendance(tenant_id, member_id, check_in DESC);

-- 5. Invoice due alerts and payment dunnings
CREATE INDEX idx_invoices_due_status ON public.invoices(tenant_id, due_date, status) 
WHERE status = 'UNPAID';
```
