-- 1. User Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Organization Memberships (Org-Level RBAC)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'cashier', -- 'owner', 'manager', 'cashier', 'inventory'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 3. Store Memberships (Store-Level Assignment)
CREATE TABLE IF NOT EXISTS store_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, user_id)
);

-- 4. RLS Helper Functions
CREATE OR REPLACE FUNCTION is_platform_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND is_super_admin = TRUE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS SETOF UUID AS $$
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_has_store_access(target_store_id UUID)
RETURNS BOOLEAN AS $$
    SELECT is_platform_super_admin() OR EXISTS (
        SELECT 1 FROM store_members sm
        WHERE sm.user_id = auth.uid() AND sm.store_id = target_store_id
    ) OR EXISTS (
        SELECT 1 FROM organization_members om
        JOIN stores s ON s.organization_id = om.organization_id
        WHERE om.user_id = auth.uid() AND s.id = target_store_id AND om.role IN ('owner', 'manager') AND om.is_active = TRUE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
