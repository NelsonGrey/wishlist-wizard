
# AI Coding Agent Instructions for Wishlist Wizard

Be concise and make minimal, well-scoped changes. This repo is a monorepo with a React web app, a Flutter mobile app, a Firebase Functions backend (router-based API — see `docs/API_REFERENCE.md`), a browser extension, and shared types/schema. There is no Express server or Postgres/Drizzle schema; that architecture was removed in the 2025-10-16 Firebase-first migration. Follow these patterns and workflows for productive edits:

## Node.js & npm Requirements
- Use Node.js v20+ (matches the Firebase Functions runtime; no `.nvmrc` present, add one if needed for CI consistency)
- If you encounter install errors, check for missing peer dependencies or platform-specific issues. Use `npm install --legacy-peer-deps` if needed.
- If you see "ERR_REQUIRE_ESM" or import/export errors, ensure your Node version supports ES modules and matches `
