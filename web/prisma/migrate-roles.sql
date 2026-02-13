-- Phase 1: Simplified Permissions Migration
-- Remaps 5 legacy roles → 2 new roles (USER / ADMIN)
-- Run AFTER `prisma db push` has added USER and ADMIN to the enum
--
-- IMPORTANT: Run this on staging/preview first, verify, then run on production.
-- This is idempotent — safe to run multiple times.

-- Step 1: Remap admin roles → ADMIN
UPDATE users SET role = 'ADMIN'
WHERE role IN ('MAJORITY_OWNER', 'DIRECTOR_OF_SYSTEMS_INTEGRATIONS');

-- Step 2: Remap all other roles → USER
UPDATE users SET role = 'USER'
WHERE role IN ('DIVISION_LEADER', 'OPERATIONS_MANAGER', 'ACCOUNTING');

-- Verify (run manually to confirm):
-- SELECT role, COUNT(*) FROM users GROUP BY role;
