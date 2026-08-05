# Demonstration Branch Setup

This repository includes a dedicated demo seeding workflow for Firebase Auth + Firestore so a demonstration branch can be used for promotional and QA scenarios with realistic sample data.

## Branch

Use branch `demonstration` (created from `develop`) to keep demo configuration and data workflows isolated.

## Included Demo Dataset

Seed file:
- `packages/functions/scripts/firebase-demo-seed-data.json`

Entities seeded:
- Auth users (`demo.owner`, `demo.collab`, `demo.viewer`)
- Firestore user profiles (`users`)
- Wishlists (`wishlists`)
- Wishlist items (`wishlistItems`)
- Collaborators (`collaborators`)
- Notifications (`notifications`)

The seeding process is idempotent for demo records and marks seeded records with `source: demo-seed`.

## Commands

Run against local emulators (recommended for validation):

```bash
npm run seed:demo:emulator
```

Run against a real Firebase project (explicit opt-in required):

```bash
DEMO_SEED_ALLOW_PRODUCTION=true GCLOUD_PROJECT=<your-project-id> npm run seed:demo:project
```

Alternative force mode:

```bash
GCLOUD_PROJECT=<your-project-id> npm run seed:demo:project -- --force
```

## Safety Guard

`packages/functions/scripts/firebase-demo-seed.cjs` refuses to run against non-emulator targets unless one of these is set:
- `DEMO_SEED_ALLOW_PRODUCTION=true`
- `--force`

This prevents accidental writes to production projects.

## Demo Login Credentials

All seeded demo users use:
- Password: `DemoPass123!`

Seeded users:
- `demo.owner@wishlist-wizard.test`
- `demo.collab@wishlist-wizard.test`
- `demo.viewer@wishlist-wizard.test`

## Notes

- Keep this dataset for demonstration and QA only.
- Do not run the project seeding command against production unless explicitly intended.
- Update `firebase-demo-seed-data.json` when marketing/demo narrative changes.
