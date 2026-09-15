-- Fix security definer and permissions on master admin trigger
CREATE OR REPLACE FUNCTION set_master_admin_super_flag()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    user_email TEXT;
BEGIN
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
    IF lower(user_email) = 'williammasum@gmail.com' THEN
        NEW.is_super_admin = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions if necessary
GRANT EXECUTE ON FUNCTION set_master_admin_super_flag() TO postgres, authenticated, service_role, anon;

-- Explicitly ensure williammasum is super admin
UPDATE user_profiles
SET is_super_admin = TRUE
WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = 'williammasum@gmail.com');
