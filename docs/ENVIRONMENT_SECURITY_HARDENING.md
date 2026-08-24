# Environment Security Hardening

This repository enforces environment security controls for lifecycle branches:

- develop -> development
- staging -> staging
- main -> production

## Controls Implemented

1. Non-production password protection

- The web app now requires a password in non-production environments.
- Gate is fail-closed: if no password is configured at build time, access remains locked.
- Build variable used by the app: `VITE_NON_PROD_SITE_PASSWORD`.

2. Production restricted to marketing-only content

- Production hosting redirects app/auth/API routes back to `/`.
- Production router excludes authenticated portal and auth pages.

## Required GitHub Secrets

Configure these repository secrets before deploying non-production branches:

- `NON_PROD_SITE_PASSWORD_DEVELOPMENT`
- `NON_PROD_SITE_PASSWORD_STAGING`

## Files Updated

- `.github/workflows/master-pipeline.yml`
- `scripts/deploy.sh`
- `.firebaserc`
- `firebase.prod.json`
- `packages/web/client-src/App.tsx`
- `packages/web/client-src/AppRouter.tsx`
- `packages/web/client-src/components/security/EnvironmentPasswordGate.tsx`
- `packages/web/client-src/env.d.ts`
- `.github/workflows/production-validation.yml`

## Validation Commands

- `npm run requirements:verify`
- `npm run requirements:traceability`
- `npm run metrics:baseline`
- `ruby -e "require 'yaml'; %w[.github/workflows/master-pipeline.yml .github/workflows/production-validation.yml].each{|f| YAML.load_file(f)}; puts 'workflow-yaml-ok'"`
