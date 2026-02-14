#!/usr/bin/env python3
"""Fix withRateLimit wrapper type errors for routes with params"""

import re
from pathlib import Path

WEB_DIR = Path(r"C:\Users\AustinKidwell\ASR Dropbox\Austin Kidwell\08_Financial_PayrollOperations\P.O System\web")

# Files that need params type fixes (from TS error output)
PARAM_FILES = [
    "src/app/api/invoice-archive/[id]/route.ts",
    "src/app/api/po/[id]/actions/route.ts",
    "src/app/api/po/[id]/pdf/route.ts",
    "src/app/api/po/[id]/route.ts",
    "src/app/api/po/[id]/scan-receipt/route.ts",
    "src/app/api/properties/[id]/route.ts",
]

# Special case: dashboards/division/[divisionId] uses divisionId not id
DIVISION_FILE = "src/app/api/dashboards/division/[divisionId]/route.ts"

def fix_route_file(file_path: Path, param_name: str = "id") -> bool:
    """Fix withRateLimit wrapper type for a route file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content

        # Pattern: export const GET = withRateLimit(...)(handler);
        # Replace with: export const GET = withRateLimit(...)(handler as (...) => ...);

        # Find all export const HTTP_METHOD = withRateLimit(...)(handler); patterns
        pattern = r'(export const (GET|POST|PUT|DELETE|PATCH) = withRateLimit\([^)]+\)\()(\w+)(\);)'

        def replacer(match):
            prefix = match.group(1)  # "export const GET = withRateLimit(...)(
            handler_name = match.group(3)  # "getHandler", "postHandler", etc.
            suffix = match.group(4)  # ");"

            # Add type cast
            cast = f' as (request: NextRequest, context?: {{ params: Promise<{{ {param_name}: string }}> }}) => Promise<NextResponse>'
            return f'{prefix}{handler_name}{cast}{suffix}'

        content = re.sub(pattern, replacer, content)

        # Only write if changed
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"[OK] Fixed: {file_path.relative_to(WEB_DIR)}")
            return True
        else:
            print(f"  Skipped (no changes): {file_path.relative_to(WEB_DIR)}")
            return False

    except Exception as e:
        print(f"[ERROR] Error processing {file_path}: {e}")
        return False

def main():
    print("Fixing withRateLimit type errors for params routes...\n")

    fixed_count = 0

    # Fix regular [id] routes
    for rel_path in PARAM_FILES:
        file_path = WEB_DIR / rel_path
        if file_path.exists():
            if fix_route_file(file_path, "id"):
                fixed_count += 1
        else:
            print(f"[WARN] File not found: {rel_path}")

    # Fix [divisionId] route
    div_file = WEB_DIR / DIVISION_FILE
    if div_file.exists():
        if fix_route_file(div_file, "divisionId"):
            fixed_count += 1
    else:
        print(f"[WARN] File not found: {DIVISION_FILE}")

    print(f"\nDone! Fixed {fixed_count} files.")

if __name__ == "__main__":
    main()
