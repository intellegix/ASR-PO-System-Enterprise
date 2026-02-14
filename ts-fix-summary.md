# TypeScript API Route Fixes - February 13, 2026

## Summary

Successfully fixed **all TypeScript errors in API route files** (27 errors fixed).

### Total Error Count
- **Before**: ~136 TypeScript errors
- **After**: 109 TypeScript errors (27 API route errors fixed)
- **Status**: ✅ All `src/app/api/**/*.ts` files now pass type checking

## Changes Made

### 1. Updated UserRole Type Definition
**File**: `src/lib/auth/permissions.ts`

- Added `MAJORITY_OWNER` to UserRole type (was missing from Prisma enum mapping)
- Added permissions for MAJORITY_OWNER role (full access like DIRECTOR_OF_SYSTEMS_INTEGRATIONS)
- Updated all permission check functions to include MAJORITY_OWNER

### 2. Fixed user_role → UserRole Casting (19 files)
Added `UserRole` import and cast `user.role as UserRole` in all hasPermission() calls:

- audit-trail/filters/route.ts
- audit-trail/route.ts
- clients/route.ts
- dashboards/cross-division/route.ts
- dashboards/division/[divisionId]/route.ts
- dashboards/kpis/route.ts
- dashboards/pending-approvals/route.ts
- divisions/route.ts
- health/route.ts
- invoices/customer/route.ts
- invoices/vendor/route.ts
- projects/route.ts
- properties/route.ts
- reports/approval-bottleneck/route.ts
- reports/budget-vs-actual/route.ts
- reports/dashboard/route.ts
- reports/gl-analysis/route.ts
- reports/po-summary/route.ts
- reports/project-details/route.ts
- reports/vendor-analysis/route.ts
- vendors/route.ts

### 3. Fixed Prisma Enum Casting
**File**: `po/[id]/actions/route.ts`
- Cast `auditAction` string to `approval_action` enum type

### 4. Fixed JSON Type for Prisma
**File**: `po/[id]/scan-receipt/route.ts`
- Cast `receipt_ocr_data` to `InputJsonValue` type for Prisma

### 5. Fixed Line Items Array Type
**File**: `po/route.ts`
- Cast `processedLineItems` to `po_line_itemsCreateWithoutPo_headersInput[]`

### 6. Fixed whereClause Dynamic Property Access
**File**: `audit-trail/route.ts`
- Changed `whereClause.timestamp = {}` to use typed intermediate object
**File**: `reports/gl-analysis/route.ts`
- Cast `whereClause.po_headers` to `Record<string, unknown>` for dynamic property access

### 7. Fixed Export Service Data Types
**File**: `reports/gl-analysis/route.ts`
- Changed data parameter from `Array.from(...)` to direct object cast as `Record<string, unknown>`

**File**: `sync/clark-reps/route.ts`
- Cast log data to `unknown as Record<string, unknown>`

### 8. Fixed Next.js 15 Params Type (8 files)
Updated `withRateLimit` wrapper to support Next.js 15's `Promise<{ id: string }>` params:

- clients/[id]/route.ts
- invoice-archive/[id]/route.ts
- po/[id]/actions/route.ts
- po/[id]/pdf/route.ts
- po/[id]/route.ts
- po/[id]/scan-receipt/route.ts
- properties/[id]/route.ts
- dashboards/division/[divisionId]/route.ts

### 9. Updated Middleware Type Signature
**File**: `src/lib/validation/middleware.ts`
- Made `withRateLimit` generic to support both old and new Next.js param patterns

## Automation Scripts Created

Two Python scripts were created to automate fixes:

1. **fix-ts-errors.py**: Added UserRole imports and casts for hasPermission() calls
2. **fix-params-types.py**: Added type casts for withRateLimit wrappers with params

## Verification

```bash
cd web
npx tsc --noEmit 2>&1 | grep "src/app/api"
# Result: No errors
```

## Remaining Errors

109 TypeScript errors remain, but **none are in API route files**. These are in:
- Frontend components
- Type definitions
- Other non-API files

## Key Patterns Used

### Pattern 1: UserRole Casting
```typescript
import { hasPermission, type UserRole } from '@/lib/auth/permissions';

if (!hasPermission(user.role as UserRole, 'po:create')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Pattern 2: Prisma Enum Casting
```typescript
action: auditAction as import('@prisma/client').approval_action
```

### Pattern 3: Next.js 15 Params Handler
```typescript
const getHandler = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params; // Note the await!
  // ...
};

export const GET = withRateLimit(100, 60 * 1000)(
  getHandler as (request: NextRequest, context?: { params: Promise<{ id: string }> }) => Promise<NextResponse>
);
```

### Pattern 4: Dynamic whereClause Properties
```typescript
const whereClause: Record<string, unknown> = {};
if (divisionFilter) {
  (whereClause.po_headers as Record<string, unknown>).division_id = divisionFilter;
}
```

## Files Modified

Total: **30 files**
- 1 permissions file (UserRole type)
- 1 middleware file (generic wrapper)
- 21 API route files (UserRole casts)
- 7 API route files (params type casts)

## CI Impact

With these fixes, the CI pipeline's type-check step can now be made **blocking** for API routes:
- Remove `continue-on-error: true` for tsc step
- Or add a separate API-only check that's blocking

## Next Steps

To achieve 0 TypeScript errors:
1. Fix remaining 109 errors in frontend components
2. Update component prop types
3. Fix Zustand/React Query type issues
4. Remove any remaining `any` types
