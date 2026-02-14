#!/usr/bin/env python3
"""Fix TypeScript errors in API routes - add UserRole import and cast user.role"""

import os
import re
from pathlib import Path

WEB_DIR = Path(r"C:\Users\AustinKidwell\ASR Dropbox\Austin Kidwell\08_Financial_PayrollOperations\P.O System\web")
API_DIR = WEB_DIR / "src" / "app" / "api"

# Files that need fixes based on TS error output
ERROR_FILES = [
    "dashboards/division/[divisionId]/route.ts",
    "dashboards/kpis/route.ts",
    "dashboards/pending-approvals/route.ts",
    "divisions/route.ts",
    "health/route.ts",
    "invoices/customer/route.ts",
    "invoices/vendor/route.ts",
    "po/[id]/actions/route.ts",
    "projects/route.ts",
    "properties/route.ts",
    "reports/approval-bottleneck/route.ts",
    "reports/budget-vs-actual/route.ts",
    "reports/dashboard/route.ts",
    "reports/gl-analysis/route.ts",
    "reports/po-summary/route.ts",
    "reports/project-details/route.ts",
    "reports/vendor-analysis/route.ts",
    "sync/clark-reps/route.ts",
    "vendors/route.ts",
]

def add_userrole_import(content: str) -> str:
    """Add UserRole to hasPermission import if not already there"""
    # Check if UserRole is already imported
    if "type UserRole" in content:
        return content

    # Find the hasPermission import line
    pattern = r"import { hasPermission } from '@/lib/auth/permissions';"
    replacement = "import { hasPermission, type UserRole } from '@/lib/auth/permissions';"

    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)

    return content

def fix_haspermission_calls(content: str) -> str:
    """Cast user.role as UserRole in hasPermission calls"""
    # Pattern: hasPermission(user.role, ...)
    # Replace with: hasPermission(user.role as UserRole, ...)
    pattern = r'hasPermission\(user\.role,'
    replacement = r'hasPermission(user.role as UserRole,'

    content = re.sub(pattern, replacement, content)

    # Also fix userRole variable if used
    pattern2 = r'hasPermission\(userRole,'
    # Check if userRole needs casting (not already cast)
    if re.search(pattern2, content) and 'as UserRole,' not in content:
        # Only cast if userRole comes from Prisma (has user_role type)
        if 'userRole = user.role' in content:
            content = re.sub(pattern2, r'hasPermission(userRole as UserRole,', content)

    return content

def fix_role_string_casts(content: str) -> str:
    """Fix string → UserRole assignments where needed"""
    # Pattern: hasPermission(session.user.role, ...)
    pattern = r'hasPermission\(session\.user\.role,'
    replacement = r'hasPermission(session.user.role as UserRole,'
    content = re.sub(pattern, replacement, content)

    # Pattern: hasPermission('SOME_ROLE', ...) or hasPermission(role string literal)
    # These need casting from user_role enum
    pattern2 = r'hasPermission\(user\.role as string,'
    replacement2 = r'hasPermission(user.role as UserRole,'
    content = re.sub(pattern2, replacement2, content)

    return content

def process_file(file_path: Path):
    """Process a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Apply fixes
        content = add_userrole_import(content)
        content = fix_haspermission_calls(content)
        content = fix_role_string_casts(content)

        # Only write if changed
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] Fixed: {file_path.relative_to(API_DIR)}")
            return True
        else:
            print(f"  Skipped (no changes): {file_path.relative_to(API_DIR)}")
            return False

    except Exception as e:
        print(f"[ERROR] Error processing {file_path}: {e}")
        return False

def main():
    print("Fixing TypeScript errors in API routes...")
    print(f"API directory: {API_DIR}\n")

    fixed_count = 0
    for rel_path in ERROR_FILES:
        file_path = API_DIR / rel_path
        if file_path.exists():
            if process_file(file_path):
                fixed_count += 1
        else:
            print(f"[WARN] File not found: {rel_path}")

    print(f"\nDone! Fixed {fixed_count} files.")

if __name__ == "__main__":
    main()
