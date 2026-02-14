# ESLint Fixes Summary - lib/ and components/ Files

## Files Fixed

### 1. src/lib/types.ts
- Changed `ApiResponse<T = any>` → `ApiResponse<T = unknown>`

### 2. src/lib/validation/middleware.ts
- Changed `err: any` → removed explicit type (inferred from ZodError.issues)
- Changed all `catch (error)` → `catch (_error: unknown)`
- Changed `withValidation<TBody = any, TQuery = any, TParams = any>` → `withValidation<TBody = unknown, TQuery = unknown, TParams = unknown>`
- Changed `context?: any` → `context?: Record<string, unknown>` in `withRateLimit`

### 3. src/lib/api-client.ts
- Changed `apiRequest<T = any>` → `apiRequest<T = unknown>`
- Changed `data?: any` → `data?: unknown` in all api methods
- Changed all method generics from `<T = any>` → `<T = unknown>`

### 4. src/lib/cache/dashboard-cache.ts
- Changed `CacheEntry<any>` → `CacheEntry<unknown>`
- Changed all `Record<string, any>` → `Record<string, unknown>`
- Changed all method parameters using `any` to `unknown`

### 5. src/components/po/ReceiptScanner.tsx
- Changed `catch {` → `catch (_error: unknown) {`
- Added `{/* eslint-disable-next-line @next/next/no-img-element */}` before `<img>` tag

### 6. src/contexts/AuthContext.tsx
- Changed `sessionToUser(session: any)` → proper typed interface
- Changed `catch (error)` → `catch (error: unknown)`

### 7. src/lib/cache/redis-production-adapter.ts
- Changed `constructor(config?: any)` → `constructor(_config?: Record<string, unknown>)`
- Changed `on(event: string, handler: (error?: any) => void)` → `on(event: string, handler: (error?: Error) => void)`
- Changed all `Record<string, any>` → `Record<string, unknown>`
- Changed all `fetcher: () => Promise<any>` → `fetcher: () => Promise<unknown>`

### 8. src/lib/db-sqlite.ts
- Added `// eslint-disable-next-line @typescript-eslint/no-require-imports` above `const bcrypt = require('bcrypt')`
- Changed `catch (error)` → `catch (error: unknown)`

### 9. src/lib/error/error-handler.ts
- Changed all `Record<string, any>` → `Record<string, unknown>` in interfaces
- Changed `handleUnhandledRejection(event: PromiseRejectionEvent | any)` → `event: PromiseRejectionEvent | unknown`
- Changed `(window as any).Sentry` → properly typed window interface
- Changed `withErrorHandling = <T extends any[], R>` → `<T extends unknown[], R>`
- Changed `withRetry = <T extends any[], R>` → `<T extends unknown[], R>`

## Patterns Applied

1. **Replace `any` with `unknown`**: All generic types, parameters, and catch blocks
2. **Prefix unused variables with `_`**: All catch blocks with unused error variables
3. **Type narrowing**: Used specific interfaces where possible
4. **ESLint disable comments**: Only for intentional cases (require() for CommonJS, img tag for receipt preview)

## Files NOT Fixed (Out of Scope)

The following files were NOT modified as they are outside the lib/ and components/ directories:
- Scripts directory files (scripts/*.ts, *.js)
- Root config files (jest.config.js, setup-env.js, etc.)
- Coverage directory files
- Page component files (src/app/**/page.tsx) - only lib/ and components/ were in scope

## Verification

All changes preserve existing logic and behavior. Only type annotations and lint-specific fixes were applied.
- No logic changes
- No behavior changes
- No new dependencies
- No breaking changes
