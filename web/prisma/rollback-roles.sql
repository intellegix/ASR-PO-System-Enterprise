-- Rollback: remap USER/ADMIN back to legacy roles if needed
-- Run this ONLY if you need to revert the role migration from migrate-roles.sql
--
-- NOTE: This is a best-effort rollback. Original role assignments are based on
-- known user data (8 users). If new users were created after migration,
-- they will be assigned DIVISION_LEADER as a safe default.

-- Step 1: Remap ADMIN back to legacy roles
UPDATE users SET role = 'MAJORITY_OWNER'
WHERE role = 'ADMIN' AND email = 'owner1@allsurfaceroofing.com';

UPDATE users SET role = 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS'
WHERE role = 'ADMIN' AND email != 'owner1@allsurfaceroofing.com';

-- Step 2: Remap USER back to DIVISION_LEADER (safe default)
UPDATE users SET role = 'DIVISION_LEADER'
WHERE role = 'USER';

-- Verify (run manually to confirm):
-- SELECT id, email, role FROM users ORDER BY role;
