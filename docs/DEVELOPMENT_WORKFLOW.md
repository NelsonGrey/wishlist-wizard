# Wishlist Wizard - Development Workflow & Collaboration

**Version**: 1.0  
**Last Updated**: February 16, 2026  
**Owner**: Mark Nelson

---

## 📋 Overview

This document outlines the development workflow, collaboration practices, and processes for contributing to Wishlist Wizard.

---

## 🌿 Git Workflow

### Branch Naming Convention

**Format**: `{type}/{issue-number}/{description}`

**Types**:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring without feature changes
- `docs/` - Documentation only
- `test/` - Test improvements
- `perf/` - Performance improvements
- `ci/` - CI/CD changes
- `chore/` - Maintenance, dependency updates

**Examples**:
```
feature/123/add-price-drop-notifications
fix/456/correct-wishlist-sharing-bug
refactor/789/optimize-database-queries
docs/101/update-api-documentation
test/202/add-e2e-tests-for-checkout
perf/303/lazy-load-wishlist-images
ci/404/add-coverage-threshold-checks
```

### Branch Strategy

**Main Branches**:
- `develop` - Default branch, integration branch for features
- `main` - Production-ready code, merges from release branches

**Supporting Branches**:
- Feature branches - From `develop`, PR to `develop`
- Release branches - From `develop` for preparing releases
- Hotfix branches - From `main` for critical production fixes

**Workflow Diagram**:
```
main
  ↑
  ├─── release/v1.2.0 (prepare release)
  │       ↑
  │       └─ merge to main (release)
  │       └─ merge back to develop
  │
  ├─── hotfix/critical-bug (critical production fix)
  │       ↑
  │       └─ merge to main & develop
  │
develop (default, integration branch)
  ↑
  ├─── feature/123/new-feature (new feature)
  │       ↑
  │       └─ PR to develop
  │
  ├─── fix/456/bug-fix (bug fix)
  │       ↑
  │       └─ PR to develop
  │
  └─── refactor/789/code-quality (code quality)
          ↑
          └─ PR to develop
```

---

## 🔄 Pull Request Process

### Before Creating a PR

1. **Update your branch**:
   ```bash
   git fetch origin
   git rebase origin/develop
   ```

2. **Run tests locally**:
   ```bash
   npm test
   npm run lint
  npm run check
   ```

3. **Build locally**:
   ```bash
   npm run build
   ```

4. **Check for console errors**:
   - No `console.log()` statements
   - No warnings in console
   - No broken imports

### Creating a PR

**Title Format**: `[TYPE] Brief description of what changed`

**Repository PR Template**:
- Use `.github/pull_request_template.md` for every PR.
- Updating `docs/DELIVERABLE_COMPONENT_MATRIX.md` is required for any change that affects website, mobile apps, or browser extension deliverables.
- If an affected component remains non-✅, include a waiver (risk, owner, remediation deadline) in the PR.

**Title Examples**:
```
[FEATURE] Add price drop notifications
[FIX] Correct wishlist sharing permissions
[REFACTOR] Optimize database queries
[DOCS] Update API documentation
[TEST] Add E2E tests for checkout flow
```

**PR Description Template**:
```markdown
## Description
Brief summary of what this PR accomplishes.

## Type of Change
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Related Issues
Fixes #123
Related to #456

## Testing
Describe how you tested the changes:
- [ ] Manual testing in development
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Browser compatibility tested

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests passed locally with my changes
- [ ] Any dependent changes have been merged and published
- [ ] I have checked that my code doesn't introduce security risks
```

### Code Review Process

**Timeline**:
- Small PRs (< 200 lines): Review within 4 hours
- Medium PRs (200-500 lines): Review within 1 business day
- Large PRs (> 500 lines): Request split into multiple PRs

**Review Responsibilities**:

Reviewers check for:
- ✅ Code quality and style
- ✅ Test coverage and correctness
- ✅ Security implications
- ✅ Performance impact
- ✅ Documentation accuracy
- ✅ Breaking changes

Authors address:
- ✅ Comments with explanations or fixes
- ✅ Request changes when feedback is critical
- ✅ Resolve conversations only after changes

**Approval Criteria**:
- ✅ 2 approvals required for production code (main/develop)
- ✅ All CI checks pass (lint, tests, build)
- ✅ No merge conflicts
- ✅ Branches up to date with base branch

### Merging

**Before Merge**:
1. Ensure all CI checks pass
2. Ensure all requested changes are addressed
3. Ensure branch is up to date: `git rebase origin/develop`
4. Request final review if significant changes made

**Merge Method**: **Squash and Merge** (for cleaner history)
```bash
git merge --squash origin/feature/123/description
```

**After Merge**:
1. Delete feature branch
2. Update local branches:
   ```bash
   git fetch origin
   git pull origin develop
   ```

**Merge Commit Message Format**:
```
[FEATURE] Add price drop notifications (#123)

* Implement price tracking for wishlist items
* Add notification system for price drops
* Update database schema for price history
* Add E2E tests for notification flow

Closes #123
```

---

## 💻 Local Development Setup

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/mnelson3/wishlist-wizard.git
cd wishlist-wizard

# 2. Install dependencies
npm install

# 3. Set up environment files
cp .env.example .env.local
# Edit .env.local with your local settings

# 4. Start development server
npm run dev

# 5. Open browser
open http://localhost:3000
```

### Environment Configuration

**Development (.env.local)**:
```env
# Vite (client) env vars
VITE_API_URL=http://localhost:5173
VITE_FIREBASE_API_KEY=your_dev_key
VITE_FIREBASE_AUTH_DOMAIN=wishlist-wizard-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=wishlist-wizard-dev
VITE_FIREBASE_STORAGE_BUCKET=wishlist-wizard-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:0000000000000000
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_VAPID_KEY=your_vapid_key
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Server-side (if using Firebase Admin locally)
FIREBASE_ADMIN_SDK_PATH=./firebase-dev.json
NODE_ENV=development
DEBUG=true

# External APIs (optional for local development)
SENDGRID_API_KEY=
OPENAI_API_KEY=
```

**Testing (.env.test)**:
```env
NODE_ENV=test
```

### Development Commands

```bash
# Start web app
npm run dev

# Start Firebase Functions emulator
npm run serve --workspace=functions

# Lint code
npm run lint

# Format code (web workspace)
npm run format --workspace=@wishlist-wizard/web

# Type check
npm run check

# Build for production
npm run build

# Start production server (if configured)
npm run start
```

---

## 🔨 Development Environment

### Required Tools

- **Node.js**: 20.0.0 or higher
- **npm**: 9.0.0 or higher
- **Git**: 2.30.0 or higher
- **Docker** (optional, for containerized development)
- **Visual Studio Code** (recommended)

### VS Code Extensions

**Required**:
- ESLint - `dbaeumer.vscode-eslint`
- Prettier - `esbenp.prettier-vscode`
- Thunder Client or REST Client - for API testing

**Recommended**:
- Tailwind CSS IntelliSense - `bradlc.vscode-tailwindcss`
- PostCSS Language Support - `csstools.postcss`
- Thunder Client - `rangav.vscode-thunder-client`
- Vitest - `vitest` (built into scripts)
- Firebase Explorer - `toba.vsfire`

### VS Code Settings

**.vscode/settings.json**:
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": "explicit"
    }
  },
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.firebase": true
  }
}
```

---

## 🧪 Running Tests

### Tests

```bash
# Run tests in all workspaces (if present)
npm test

# Run web tests only
npm run test --workspace=@wishlist-wizard/web

# Run firebase-utils tests only
npm run test --workspace=@shared/firebase-utils
```

---

## 📦 Monorepo Package Management

### Workspace Structure

```
packages/
├── web/              # Web app (React)
├── mobile/           # Mobile app (Flutter)
├── browser-extension/  # Browser extension
├── shared/           # Shared TypeScript code
├── functions/        # Firebase Functions
└── firebase-utils/   # Firebase utilities
```

### Package Scripts

**Workspace Commands** (run from root):
```bash
# Run command in all packages
npm run build --workspaces

# Run command in specific workspace
npm run test --workspace=@wishlist-wizard/web

# Install dependencies for all packages
npm install

# Add new dependency to specific package
npm install lodash --workspace=@wishlist-wizard/shared

# Remove dependency from specific package
npm remove lodash --workspace=@wishlist-wizard/web
```

### Shared Code Usage

**Importing from shared package**:
```typescript
// From any package
import { Wishlist, WishlistSchema } from '@wishlist-wizard/shared';

// Types are automatically exported
import type { User, NotificationEvent } from '@wishlist-wizard/shared';

// Validation schemas
import { WishlistCreateSchema } from '@wishlist-wizard/shared';
```

---

## 🚀 Deployment Workflow

### Staging Deployment

**Automatic**:
- Merges to `develop` automatically deploy to staging
- URL: `https://staging.wishlist-wizard.com`

**Manual**:
```bash
npm run deploy
```

**Verify Staging**:
1. Check CI/CD pipeline: https://github.com/mnelson3/wishlist-wizard/actions
2. Test features on staging environment
3. Check logs: `npm run logs:staging`

### Production Deployment

**Via Release Branch**:
```bash
# Create release branch from develop
git checkout -b release/v1.2.0 develop

# Update version numbers and changelog
npm version minor  # or patch, major

# Create PR to main
git push origin release/v1.2.0
# Create PR: release/v1.2.0 → main

# After PR review and approval
# Merge to main (triggers production deployment)

# Merge back to develop
git checkout develop
git merge main
git push origin develop
```

**Production URL**: `https://wishlist-wizard.com`

### Hotfix Deployment

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-bug main

# Fix the issue and commit
git commit -am "Fix critical bug"

# Create PR to main
git push origin hotfix/critical-bug
# Create PR: hotfix/critical-bug → main

# After approval, merge to main
# Then merge back to develop
git checkout develop
git merge main
git push origin develop
```

---

## 📊 Code Review Guidelines

### For Reviewers

**Read and Understand**:
1. Read the PR description and related issues
2. Understand the context and requirements
3. Read all code changes
4. Check related tests

**Assess Security**:
- [ ] No hardcoded secrets
- [ ] Proper authentication/authorization
- [ ] Input validation and sanitization
- [ ] No SQL injection or XSS vulnerabilities
- [ ] Secure error handling

**Check Quality**:
- [ ] Code follows standards
- [ ] Clear variable and function names
- [ ] Sufficient test coverage
- [ ] Performance impact assessed
- [ ] Documentation updated

**Provide Feedback**:
- Use "Approve" for ready to merge
- Use "Request changes" for blocking issues
- Use "Comment" for suggestions and questions
- Be respectful and constructive

### For Authors

**Responding to Review**:
1. Thank reviewers for feedback
2. Address all comments (even if disagree)
3. Request re-review after changes
4. Don't mark conversations as "resolved" automatically

**Never Force Push** after code review started:
```bash
# ❌ Wrong - Rewriting history after review
git push --force

# ✅ Correct - Add new commits for fixes
git commit -am "Address feedback from review"
git push origin feature/branch
```

---

## 🐛 Debugging Guide

### Frontend Debugging

**Browser DevTools**:
```typescript
// Use debugger statement
function complexFunction() {
  debugger;  // Execution pauses here
  // ... rest of function
}

// Or use breakpoints in DevTools
```

**React DevTools**:
- Install React Developer Tools extension
- Inspect component tree
- Check props and state
- Profile performance

**VS Code Debugging**:
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js Debug",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Backend Debugging

**Using Node Inspector**:
```bash
# Start with inspector
node --inspect=0.0.0.0:9229 server.js

# Then open in VS Code or chrome://inspect
```

**Logging**:
```typescript
import debug from 'debug';

const log = debug('wishlist:service:wishlist');

log('Creating wishlist:', data);  // Shows only with DEBUG=wishlist:* env var
```

### Database Debugging

```bash
# Connect to dev database
psql postgresql://localhost/wishlist_wizard_dev

# List tables
\dt

# Query data
SELECT * FROM wishlists LIMIT 5;

# Exit
\q
```

---

## 📚 Documentation Standards

### When to Document

**Must Document**:
- Public APIs and functions
- Complex algorithms or logic
- Architectural decisions (ADRs)
- Setup and installation procedures
- Configuration options

**Should Document**:
- Non-obvious code sections
- Workarounds for known issues
- Performance-sensitive code
- Security-related code

**Don't Over-document**:
- Self-explanatory code
- Standard patterns
- Framework boilerplate

### Documentation Format

**Code Comments**:
```typescript
/**
 * Calculates the total value of items in a wishlist.
 * 
 * @param {WishlistItem[]} items - Array of wish list items
 * @returns {number} Total value of all items
 */
export function calculateTotalValue(items: WishlistItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Architecture Decision Records (ADRs)**:
```markdown
# ADR 001: Use Firebase for Real-Time Database

## Status
Accepted

## Context
We need a real-time database for collaborative wishlist editing.

## Decision
We chose Firebase Firestore because:
1. Real-time synchronization out of the box
2. Serverless architecture aligns with goals
3. Good SDK support for all platforms
4. Cost-effective for our scale

## Consequences
- Bound to Google Cloud ecosystem
- Different query model than SQL
- Learning curve for team
```

---

## ⏰ Development Timeline

### Daily Standup

**When**: 10:00 AM UTC  
**Duration**: 15 minutes  
**Format**: Async Slack updates

**Template**:
```
Yesterday:
- Finished feature X
- Reviewed PR #123

Today:
- Working on feature Y
- Code review for PR #456

Blockers:
- Need clarification on requirement Z
```

### Weekly Planning

**When**: Monday 10:00 AM UTC  
**Duration**: 30 minutes

**Agenda**:
1. Sprint goals review
2. Issue prioritization
3. Resource allocation
4. Risk identification

---

## ✅ Definition of Done

A task is considered "done" when:

- [ ] Code written and tested locally
- [ ] Unit tests pass (80%+ coverage)
- [ ] Integration tests pass
- [ ] PR created with clear description
- [ ] Code reviewed and approved by 2+ reviewers
- [ ] All CI checks pass
- [ ] Documentation updated
- [ ] Feature tested on staging environment
- [ ] Performance impact assessed
- [ ] Security review completed
- [ ] Merged to develop branch

---

## 🔗 Useful Links

- [GitHub Repository](https://github.com/mnelson3/wishlist-wizard)
- [Issue Tracker](https://github.com/mnelson3/wishlist-wizard/issues)
- [Project Board](https://github.com/mnelson3/wishlist-wizard/projects)
- [CI/CD Status](https://github.com/mnelson3/wishlist-wizard/actions)
- [Code Coverage](https://codecov.io/gh/mnelson3/wishlist-wizard)

---

## 📚 Related Documentation

- [Code Standards](CODE_STANDARDS.md)
- [Testing Strategy](TESTING_STRATEGY.md)
- [System Architecture](SYSTEM_ARCHITECTURE.md)

