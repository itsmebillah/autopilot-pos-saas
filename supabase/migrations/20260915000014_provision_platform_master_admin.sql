-- Migration: Provision Platform Master Admin & Auto-SuperAdmin Trigger
-- Ensures williammasum@gmail.com is granted is_super_admin = TRUE upon creation/update

CREATE OR REPLACE FUNCTION set_master_admin_super_flag()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = NEW.id AND lower(email) = 'williammasum@gmail.com'
    ) THEN
        NEW.is_super_admin = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_master_admin_super_flag ON user_profiles;
CREATE TRIGGER trg_master_admin_super_flag
BEFORE INSERT OR UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION set_master_admin_super_flag();

-- Backfill existing user profile if williammasum@gmail.com already exists in auth.users
UPDATE user_profiles
SET is_super_admin = TRUE
WHERE id IN (
    SELECT id FROM auth.users WHERE lower(email) = 'williammasum@gmail.com'
);
