## Quick instructions for AI coding agents

Be concise and make minimal, well-scoped changes. This repo contains a monorepo-style web app + Express API + browser extension. Below are the patterns and workflows you should follow when editing or adding code.

1. Architecture snapshot
   - Frontend: `client/` — React + TypeScript, Vite, routing with `wouter`, data via `@tanstack/react-query`.
   - Backend: `server/` — Express + TypeScript. Routes registered in `server/routes.ts` and `registerRoutes` (see `server/index.ts`).
   - Shared: `shared/` — database schema and types (`shared/schema.ts`) used by both server and client.
   - Browser extension: `client/public/extension/` — content/background/popup scripts and `manifest.json`.

2. Important files and examples (refer to these when editing):
   - server startup & middleware: `server/index.ts` (serves client + API, ALWAYS serves on port 5000 in code)
   - API registration and examples: `server/routes.ts` (many REST endpoints defined here)
   - DB schema: `shared/schema.ts` (Drizzle ORM schemas; update and run migrations if you change it)
   - Dev entry: `client/src/main.tsx` and `client/src/App.tsx` (routing and query client)
   - Vite config / aliases: `vite.config.ts` and `vitest.config.ts` (`@` -> `client/src`, `@shared` -> `shared`)

3. Developer workflows & exact commands
   - Install: `npm install`
   - Dev (backend + frontend): `npm run dev` (runs `NODE_ENV=development tsx server/index.ts`). The server sets up Vite only in development.
   - Build (prod): `npm run build` — runs `vite build` then bundles the server with esbuild to `dist/`.
   - Start (prod): `npm run start` — runs `NODE_ENV=production node dist/index.js`.
   - Typecheck: `npm run check` (runs `tsc`).
   - Apply schema changes: `npm run db:push` (drizzle-kit).

4. Conventions and patterns to follow
   - Port and serving: server code expects to serve the client and API together; dev uses Vite middleware, production serves static `dist/public`. Don't change the hard-coded port without coordination (5000).
   - Validation: request validation typically uses Zod schemas imported from `shared/schema.ts` (e.g., `insertWishlistItemSchema`). Prefer reusing existing schemas.
   - Dynamic imports: many heavy services are lazily imported (e.g., `await import('./services/priceTrackingService')`) — keep this pattern for expensive/optional services.
   - Auth: session-based middleware lives in `server/session.ts`; extension and API JWT flows are in `server/extension-auth.ts` and `server/extension.ts`. Use `isAuthenticated` middleware where required.
   - Storage layer: access DB/abstractions through `server/storage.ts` / `server/storage.db.ts`. Prefer using storage helpers rather than raw queries when available.
   - Logging: request logging wraps `res.json` in `server/index.ts` — avoid noisy full-object logs; keep responses trimmed.

5. Tests
   - Test runner: Vitest (config in `vitest.config.ts`). Frontend setup file at `client/src/test/setup.ts`.
   - Put frontend tests under `client/src/...` and backend tests under `server/tests/` or `tests/`.

6. Browser extension notes
   - Extension files are in `client/public/extension/`. Backend endpoints used by the extension are under `/api/extension/*` in `server/routes.ts`.
   - There are two auth modes for extension endpoints: legacy session and JWT — see `server/extension-auth.ts` and `server/extension.ts` for examples.

7. Environment variables (required for local work)
   - `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `OPENAI_API_KEY`, `SENDGRID_API_KEY`, calendar/provider keys, and GA key `VITE_GA_MEASUREMENT_ID`.
   - Assume missing env vars will cause features to degrade (do not hardcode secrets into code).

8. When adding routes or changing schema
   - Add new API handlers in `server/routes.ts` (or sub-route files in `server/routes/`) and ensure they are registered by `registerRoutes`.
   - If you change `shared/schema.ts`, update Drizzle migrations and run `npm run db:push` before pushing the change.

9. Small examples to copy from
   - Zod validation + storage usage: see `server/routes.ts` POST `/api/items` (uses `insertWishlistItemSchema` and `storage.createWishlistItem`).
   - Price history route: GET `/api/items/:id/price-history` demonstrates lazy service import and error handling patterns.

10. Do / Don't (quick)
   - Do reuse path aliases (`@`, `@shared`) and existing Zod schemas.
   - Do run `npm run check` and `npm run dev` to validate changes locally.
   - Don't change port or build output layout without updating `server/index.ts` and `vite.config.ts`.
   - Don't check in secrets or large generated assets.

If anything here is missing or unclear, tell me which area you'd like expanded (tests, extension, build, DB migrations) and I'll update this file.
