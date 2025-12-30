
# AI Coding Agent Instructions for Wishlist Wizard

Be concise and make minimal, well-scoped changes. This repo is a monorepo with a React web app, Express API, browser extension, and shared types/schema. Follow these patterns and workflows for productive edits:

## Node.js & npm Requirements
- Use Node.js v18+ (no .nvmrc present; add one if needed for CI consistency)
- If you encounter install errors, check for missing peer dependencies or platform-specific issues. Use `npm install --legacy-peer-deps` if needed.
- If you see "ERR_REQUIRE_ESM" or import/export errors, ensure your Node version supports ES modules and matches `
