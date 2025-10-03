# REQUIREMENTS.md

## Project: Wishlist Wizard

This document summarizes the current state of all major deliverables and features for the Wishlist Wizard platform, based on the codebase and documentation as of October 3, 2025.

---

## 1. Core Functionality

| Feature                        | Status      | Notes |
|------------------------------- |------------ |-------|
| User Registration/Login        | Complete    | Session & JWT auth, email verification, password reset supported |
| Wishlist Creation/Management   | Complete    | Create, update, delete, share, multi-beneficiary support |
| Item Management                | Complete    | Add, edit, remove, reserve, purchase, prioritize items |
| Social Sharing                 | Complete    | Share via link, collaborative wishlists, shareId implemented |
| Multi-Beneficiary Support      | Complete    | Beneficiaries table, API, UI support |

## 2. Advanced Features

| Feature                        | Status      | Notes |
|------------------------------- |------------ |-------|
| Price Tracking                 | Complete    | Price history, alerts, batch updates, significant drop detection |
| Collaborative Wishlists        | Complete    | Add/remove collaborators, roles, notifications |
| Calendar Integration           | Partial     | API, DB, and service layer for Google/Outlook/Apple; UI integration in progress |
| Notification System            | Complete    | In-app and email notifications, unread count, mark as read |
| AR Visualization               | Partial     | Service layer and DB present; UI and 3D model upload/preview in progress |
| AI Recommendations             | Complete    | OpenAI-powered, per-user and per-beneficiary, fallback logic |
| Group Gifting                  | Complete    | Gift coordination, contributions, status tracking |

## 3. Cross-Platform & Extension

| Feature                        | Status      | Notes |
|------------------------------- |------------ |-------|
| Web Frontend                   | Complete    | React + Vite, all major flows implemented |
| Mobile App                     | In Progress | React Native skeleton, README, some planned features |
| Browser Extension              | Complete    | Add items, auto-detect, manual override, share, notes |
| E-Commerce Integration         | Complete    | Amazon, eBay, Etsy, Walmart, Target, Best Buy; product extraction, affiliate links |

## 4. Technical/Infrastructure

| Feature                        | Status      | Notes |
|------------------------------- |------------ |-------|
| Database Schema                | Complete    | Drizzle ORM, covers all entities and relations |
| API Endpoints                  | Complete    | RESTful, covers all features, see `server/routes.ts` |
| Environment Variables          | Complete    | All required keys documented, .env expected |
| Firebase Integration           | Partial     | Client SDK scaffold added (analytics/messaging optional) |
| Testing                        | Partial     | Vitest setup, backend and frontend test folders, coverage incomplete |
| DevOps/Build                   | Complete    | Vite, esbuild, npm scripts, Replit deploy |

## 5. Security & Privacy

| Feature                        | Status      | Notes |
|------------------------------- |------------ |-------|
| Input Validation               | Complete    | Zod schemas, server-side validation |
| Auth Security                  | Complete    | JWT/session, password hashing, 2FA fields present |
| Privacy Controls               | Partial     | Privacy settings table, some API, UI incomplete |
| Data Encryption                | Partial     | At-rest encryption not fully implemented |

## 6. Documentation & Support

| Feature                        | Status      | Notes |
|------------------------------- |------------ |-------|
| User Documentation             | Complete    | README, extension/mobile docs, in-app help |
| Developer Documentation        | Complete    | DEVELOPER.md, copilot-instructions, code comments |
| Support Channels               | Complete    | Email, Help Center, FAQ |

---

## Summary of Major Gaps
- **Calendar Integration**: API and backend logic are present, but full UI and OAuth flows may not be fully wired up.
- **AR Visualization**: Service and DB exist, but user-facing AR upload/preview and mobile AR are not fully implemented.
- **Mobile App**: Project structure and README exist, but most features are not yet implemented.
- **Privacy Controls**: DB and partial API, but UI and enforcement are incomplete.
- **Testing**: Some tests exist, but coverage is not comprehensive.
- **Data Encryption**: Some fields are protected, but full at-rest encryption is not implemented.
- **Firebase**: Added client initialization scaffold; backend server features (auth integration, FCM token registration) not yet implemented.

---

## How to Contribute
- See `DEVELOPER.md` for tech stack, project structure, and workflow.
- Use `npm run dev` for local development, `npm run db:push` for schema changes.
- Add new features via feature branches and submit PRs.

---

*This requirements file is auto-generated from the current codebase and documentation. For questions or updates, contact the development team.*
