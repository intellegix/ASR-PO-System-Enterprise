-- Create Intellegix Admin User
-- Username: Intellegix
-- Password: Devops$@2026
-- Role: MAJORITY_OWNER (full admin access)

-- First, let's check if the user already exists and remove if needed
DELETE FROM users WHERE email = 'Intellegix@allsurfaceroofing.com';

-- Insert the new admin user
-- Password hash for 'Devops$@2026' with bcrypt rounds=12
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    role,
    division_id,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Intellegix@allsurfaceroofing.com',
    '$2b$12$t/SL1x2/WbA7.yOweO2CcOMQYMN00nUyYsRIC6hsUBC3oNkzRMGE6',  -- Devops$@2026
    'Intellegix',
    'Admin',
    NULL,
    'MAJORITY_OWNER',
    NULL,  -- System-wide admin, not tied to specific division
    true,
    NOW(),
    NOW()
);

-- Verify the user was created
SELECT
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM users
WHERE email = 'Intellegix@allsurfaceroofing.com';

-- Display login instructions
SELECT
    '====== ADMIN USER CREATED SUCCESSFULLY ======' AS status,
    'Login Credentials:' AS info,
    '  Username: Intellegix (will auto-append @allsurfaceroofing.com)' AS username_option,
    '  Email: Intellegix@allsurfaceroofing.com' AS email_option,
    '  Password: Devops$@2026' AS password,
    '  Role: MAJORITY_OWNER (Full Admin Access)' AS access_level;