# Environment Security Hardening

This repository enforces environment security controls for lifecycle branches:

- develop -> development
- staging -> staging
- main -> production

## Controls Implemented

1. Non-production Google sign-in gate

- The web app requires a Google sign-in from an allowlisted account in `development` and `staging` (never production or localhost). Same model as `EnvironmentGate` in vehicle-vitals, modulo-squares, sprout and balance-forward.
- Gate is fail-closed: with no allowlist configured at build time, nobody gets in.
- Build variables used by the app: `VITE_ALLOWED_EMAIL_DOMAINS`, `VITE_ALLOWED_EMAILS` (comma-separated).
- This is a UI-level gate: it keeps the public out, but the static bundle is still served. Data protection comes from Firestore/Storage rules and Auth.

2. Production restricted to marketing-only content

- Production hosting redirects app/auth/API routes back to `/`.
- Production router excludes authenticated portal and auth pages.

## GitHub Variables

The allowlist ships in the public bundle by design, so these are repository variables, not secrets:

- `ALLOWED_EMAIL_DOMAINS` (defaults to `nelsongrey.com`)
- `ALLOWED_EMAILS` (optional, exact addresses)

## Files Updated

- `.github/workflows/master-pipeline.yml`
- `scripts/deploy.sh`
- `.firebaserc`
- `firebase.prod.json`
- `packages/web/client-src/App.tsx`
- `packages/web/client-src/AppRouter.tsx`
- `packages/web/client-src/components/security/EnvironmentGate.tsx`
- `packages/web/client-src/env.d.ts`
- `.github/workflows/production-validation.yml`

## Validation Commands

- `npm run requirements:verify`
- `npm run requirements:traceability`
- `npm run metrics:baseline`
- `ruby -e "require 'yaml'; %w[.github/workflows/master-pipeline.yml .github/workflows/production-validation.yml].each{|f| YAML.load_file(f)}; puts 'workflow-yaml-ok'"`
