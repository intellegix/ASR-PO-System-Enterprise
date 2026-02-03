#!/usr/bin/env python3
"""
Script to add dynamic exports to all API routes missing them
"""

import os
import re

# Routes that need dynamic export fixes
routes = [
    "./audit-trail/filters/route.ts",
    "./audit-trail/route.ts",
    "./dashboards/division/[divisionId]/route.ts",
    "./dashboards/kpis/route.ts",
    "./dashboards/pending-approvals/route.ts",
    "./divisions/route.ts",
    "./gl-accounts/route.ts",
    "./health/route.ts",
    "./invoice-archive/route.ts",
    "./invoice-archive/[id]/route.ts",
    "./po/pending/route.ts",
    "./po/route.ts",
    "./po/[id]/actions/route.ts",
    "./po/[id]/pdf/route.ts",
    "./po/[id]/route.ts",
    "./projects/route.ts",
    "./quickbooks/auth/callback/route.ts",
    "./quickbooks/auth/route.ts",
    "./quickbooks/connect/route.ts",
    "./quickbooks/status/route.ts",
    "./vendors/route.ts",
    "./work-orders/route.ts"
]

base_path = "web/src/app/api"

def add_dynamic_export(file_path):
    """Add dynamic export to a route file if it doesn't exist"""

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if dynamic export already exists
    if 'export const dynamic' in content:
        print(f"SKIP: {file_path} - already has dynamic export")
        return False

    # Find the end of imports
    import_pattern = r'^import.*?;\s*$'
    lines = content.split('\n')

    last_import_line = -1
    for i, line in enumerate(lines):
        if re.match(import_pattern, line.strip()):
            last_import_line = i

    if last_import_line == -1:
        print(f"ERROR: {file_path} - no imports found, skipping")
        return False

    # Insert dynamic export after imports
    insert_line = last_import_line + 1

    # Add blank line if needed
    if insert_line < len(lines) and lines[insert_line].strip() != '':
        lines.insert(insert_line, '')
        insert_line += 1

    # Add dynamic export
    lines.insert(insert_line, '// Force dynamic rendering for API route')
    lines.insert(insert_line + 1, "export const dynamic = 'force-dynamic';")
    lines.insert(insert_line + 2, '')

    # Write back to file
    new_content = '\n'.join(lines)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"FIXED: {file_path} - added dynamic export")
    return True

def main():
    print("Adding dynamic exports to API routes...")

    fixed_count = 0

    for route in routes:
        full_path = os.path.join(base_path, route[2:])  # Remove ./

        if not os.path.exists(full_path):
            print(f"ERROR: {full_path} - file not found")
            continue

        if add_dynamic_export(full_path):
            fixed_count += 1

    print(f"\nFixed {fixed_count} routes with dynamic exports!")

if __name__ == "__main__":
    main()