# Frontend Agent Memory

## TypeScript Error Patterns

### `.reduce()` and `.map()` with `Record<string, unknown>`

**Problem**: When previous lint fixes changed `.reduce()` accumulators or `.map()` callbacks from `any` to `{}` or `unknown`, accessing nested properties causes TS errors like `Property 'X' does not exist on type '{}'`.

**Solution Pattern**:

1. **For nested object access**: Extract nested objects first with explicit typing:
```typescript
// BEFORE (causes errors)
.map((item: Record<string, unknown>) => ({
  name: item.user?.name ?? '',  // Error: Property 'user' does not exist on type '{}'
}))

// AFTER (works)
.map((item: Record<string, unknown>) => {
  const user = item.user as Record<string, unknown> | undefined;
  return {
    name: (user?.name ?? '') as string,
  };
})
```

2. **For arrays that need `.map()` on nested properties**: Cast the property to array type:
```typescript
// BEFORE
alerts: (risk.riskReasons || []).map((r: unknown) => ({  // Error: .map() doesn't exist on {}
  message: r as string,
}))

// AFTER
alerts: ((risk.riskReasons || []) as unknown[]).map((r: unknown) => ({
  message: r as string,
}))
```

3. **For numeric operations**: Extract and cast numeric values before using in arithmetic:
```typescript
// BEFORE
const cpi = budget.currentActual > 0 && budget.originalBudget > 0
  ? (budget.originalBudget * percentComplete) / budget.currentActual : 1;
// Error: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type

// AFTER
const currentActual = (budget.currentActual ?? 0) as number;
const originalBudget = (budget.originalBudget ?? 0) as number;
const cpi = currentActual > 0 && originalBudget > 0
  ? (originalBudget * percentComplete) / currentActual : 1;
```

4. **For `.reduce()` with complex accumulators**: Use explicit `Record<string, T>` or define interface:
```typescript
// BEFORE
const categoryMap = new Map<string, { amount: number; accounts: {} }>();

// AFTER
const categoryMap = new Map<string, { amount: number; accounts: Record<string, unknown>[] }>();
```

### Files Fixed (Feb 2026)
- `src/app/(pages)/reports/approval-bottleneck/page.tsx` — 17 errors (nested object access in `.map()`)
- `src/app/(pages)/reports/budget-vs-actual/page.tsx` — 60+ errors (nested objects + arithmetic operations)
- `src/app/(pages)/reports/gl-analysis/page.tsx` — 20+ errors (Map operations + `.forEach()` with nested objects)
- `src/app/(pages)/reports/project-details/page.tsx` — 4 errors (nested arrays in `.map()`)
- `src/app/(pages)/reports/vendor-analysis/page.tsx` — 30+ errors (deeply nested objects with `?.` chains)

**Key Insight**: Always extract nested objects from `Record<string, unknown>` into typed variables BEFORE accessing their properties in arithmetic, comparisons, or method calls. Cast the result to the expected type.
