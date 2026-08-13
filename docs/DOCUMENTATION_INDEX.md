# Wishlist Wizard - Documentation Index

**Version**: 1.2  
**Last Updated**: August 12, 2026  
**Owner**: Mark Nelson

---

## 📚 Documentation Overview

Complete documentation for the Wishlist Wizard project, including architecture, design, and operational guides.

---

## 🎯 Quick Navigation

### For New Developers

Start here to get up and running:

1. [DEVELOPER.md](DEVELOPER.md) - Tech stack overview and project structure
2. [DEPLOYMENT.md](DEPLOYMENT.md) - Environment setup and deployment procedures
3. [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) - Git workflow and PR process
4. [CODE_STANDARDS.md](CODE_STANDARDS.md) - Coding conventions and best practices
5. [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) - Solutions for common issues

### For System Design & Architecture

Understanding the system:

1. [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) - High-level system design
2. [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Data modeling and schema design
3. [API_REFERENCE.md](API_REFERENCE.md) - Firebase callable API documentation
4. [FIREBASE_STRATEGY.md](FIREBASE_STRATEGY.md) - Firebase integration details

### For Building Features

Feature development guide:

1. [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing approach and guidelines
2. [CODE_STANDARDS.md](CODE_STANDARDS.md) - Code quality standards
3. [WEB_NAVIGATION_LAYOUT_SPEC.md](WEB_NAVIGATION_LAYOUT_SPEC.md) - Web layout ownership and routing consistency
4. [WEB_NAVIGATION_QA_CHECKLIST.md](WEB_NAVIGATION_QA_CHECKLIST.md) - Navigation/link/header/footer regression checklist

### For Operations & DevOps

Infrastructure and deployment:

1. [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md) - Cloud setup and deployment
2. [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
3. [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) - Security measures and best practices
4. [ENVIRONMENT_SECURITY_HARDENING.md](ENVIRONMENT_SECURITY_HARDENING.md) - Environment protection and deployment hardening controls

### For Project Management

Project overview and planning:

1. [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) - Feature requirements
2. [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md) - UI/UX design specifications
3. [ROLLOUT_PLAN.md](ROLLOUT_PLAN.md) - Phase-by-phase promoted feature strategy
4. [REQUIREMENTS.md](REQUIREMENTS.md) - Implementation status
5. [DELIVERABLE_COMPONENT_MATRIX.md](DELIVERABLE_COMPONENT_MATRIX.md) - Component-level completion tracker for website/mobile/extension
6. [RELEASE_SUMMARY.md](RELEASE_SUMMARY.md) - Latest incremental release notes and shipped scope

---

## 📖 Complete Documentation List

### Architecture & Design

| Document | Purpose | Audience |
|----------|---------|----------|
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | High-level system design, component architecture, data flows | Architects, Leads |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Data modeling, Firestore collections, PostgreSQL tables, relationships | Backend Devs, DBAs |

### API & Integration

| Document | Purpose | Audience |
|----------|---------|----------|
| [API_REFERENCE.md](API_REFERENCE.md) | Firebase API documentation (router-first, with a small legacy-callable appendix) | Integration Devs, QA |
| [FIREBASE_STRATEGY.md](FIREBASE_STRATEGY.md) | Firebase services integration | Backend Devs |
| [AFFILIATE_IMPLEMENTATION.md](AFFILIATE_IMPLEMENTATION.md) | Affiliate program integration (commission ledger, Stripe Connect payouts) | Product, Backend |
| [Achievements_And_Rewards_Design.md](Achievements_And_Rewards_Design.md) | Achievements & rewards design + as-built v1 implementation notes | Product, Backend |
| [CALENDAR_OAUTH_PROVIDER_SETUP.md](CALENDAR_OAUTH_PROVIDER_SETUP.md) | Google/Microsoft/Facebook OAuth app registration for calendar sync (manual, external, not yet done in any environment) | Product, Backend, Owner |

### Development

| Document | Purpose | Audience |
|----------|---------|----------|
| [DEVELOPER.md](DEVELOPER.md) | Tech stack and project structure | All Developers |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Environment setup and deployment procedures | All Developers |
| [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) | Git workflow, PR process, collaboration | All Developers |
| [CODE_STANDARDS.md](CODE_STANDARDS.md) | Code style, conventions, best practices | All Developers |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Testing approach, guidelines, examples | QA, Code Reviewers |

### Quality & Reliability

| Document | Purpose | Audience |
|----------|---------|----------|
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Testing pyramid, test organization, examples | QA, Developers |
| [WEB_NAVIGATION_LAYOUT_SPEC.md](WEB_NAVIGATION_LAYOUT_SPEC.md) | Layout ownership rules and route/link consistency standards | Frontend Devs, QA |
| [WEB_NAVIGATION_QA_CHECKLIST.md](WEB_NAVIGATION_QA_CHECKLIST.md) | Manual validation checklist for navigation and shell regressions | QA, Reviewers |
| [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) | Security design, authentication, encryption | Security, Architects |
| [CODE_STANDARDS.md](CODE_STANDARDS.md) | Code quality, style guide | All Developers |

### Operations & DevOps

| Document | Purpose | Audience |
|----------|---------|----------|
| [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md) | Cloud setup, deployment strategy, monitoring | DevOps, SRE |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment procedures and rollbacks | DevOps, Release Mgr |
| [CICD_SETUP_GUIDE.md](CICD_SETUP_GUIDE.md) | CI/CD pipeline configuration | DevOps |
| [ENVIRONMENT_SECURITY_HARDENING.md](ENVIRONMENT_SECURITY_HARDENING.md) | Environment hardening and non-production access controls | DevOps, Security |
| [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) | Common issues and solutions | All Developers |
| [WISHLIST_WIZARD_GO_LIVE.md](WISHLIST_WIZARD_GO_LIVE.md) | Go-live runbook, incl. marketing-tools-service (GA4/GTM/Search Console) setup | DevOps, Release Mgr |

### Project & Product

| Document | Purpose | Audience |
|----------|---------|----------|
| [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) | Project vision and requirements | Product, PM |
| [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md) | UI/UX design, features, user flows | Designers, PM |
| [ROLLOUT_PLAN.md](ROLLOUT_PLAN.md) | Authoritative phase rollout and promotion policy | Product, PM, Engineering Leads |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Feature status and implementation details | All |
| [DELIVERABLE_COMPONENT_MATRIX.md](DELIVERABLE_COMPONENT_MATRIX.md) | Execution tracker for component completion by deliverable | Product, Engineering Leads, PM |
| [RELEASE_SUMMARY.md](RELEASE_SUMMARY.md) | Incremental releases, shipped features, and delivery notes | Product, Engineering Leads, PM |

### Platform-Specific

| Document | Purpose | Audience |
|----------|---------|----------|
| [packages/mobile/IOS_DISTRIBUTION_SETUP.md](packages/mobile/IOS_DISTRIBUTION_SETUP.md) | iOS code-signing/Fastlane setup | iOS Devs |
| [packages/mobile/ANDROID_DISTRIBUTION_SETUP.md](packages/mobile/ANDROID_DISTRIBUTION_SETUP.md) | Android keystore/Play Console release pipeline | Android Devs |
| [BROWSER_EXTENSION_ENHANCEMENTS.md](BROWSER_EXTENSION_ENHANCEMENTS.md) | Extension features and development | Extension Devs |

---

## 🔑 Key Topics Index

### Authentication & Security
- [Security Architecture](SECURITY_ARCHITECTURE.md) - Auth flows, token management, encryption
- [API Reference](API_REFERENCE.md) - Auth endpoints

### Database & Data
- [Database Schema](DATABASE_SCHEMA.md) - Collections, relationships

### API Development
- [API Reference](API_REFERENCE.md) - Complete endpoint documentation
- [System Architecture](SYSTEM_ARCHITECTURE.md) - API design patterns

### Frontend Development
- [Code Standards](CODE_STANDARDS.md) - React, TypeScript standards

### Backend Development
- [System Architecture](SYSTEM_ARCHITECTURE.md) - Service layer design
- [Database Schema](DATABASE_SCHEMA.md) - Data modeling

### Testing
- [Testing Strategy](TESTING_STRATEGY.md) - Unit, integration, E2E testing
- [Code Standards](CODE_STANDARDS.md) - Code quality metrics

### Deployment
- [Infrastructure Guide](INFRASTRUCTURE_GUIDE.md) - Cloud setup and scaling
- [Deployment](DEPLOYMENT.md) - Release procedures

### Mobile Development
- [iOS Distribution Setup](packages/mobile/IOS_DISTRIBUTION_SETUP.md) - iOS code-signing/Fastlane
- [Android Distribution Setup](packages/mobile/ANDROID_DISTRIBUTION_SETUP.md) - Android keystore/Play Console
- [Developer Guide](DEVELOPER.md) - Flutter app setup

### Browser Extension
- [Browser Extension Enhancements](BROWSER_EXTENSION_ENHANCEMENTS.md) - Extension features
- [Developer Guide](DEVELOPER.md) - Extension architecture

---

## 📊 Documentation Statistics

- **Total Documents**: ~60 comprehensive guides (reduced from 123 in the 2026-08-12 cleanup — see Version History)
- **Total Pages**: 200+ pages of detailed documentation
- **Code Examples**: 100+ working examples
- **Diagrams**: 20+ architecture diagrams
- **Coverage**:
  - Architecture: ✅ Complete
  - API: ✅ Complete
  - Database: ✅ Complete
  - Security: ✅ Complete
  - Development: ✅ Complete
  - Testing: ✅ Complete
  - Deployment: ✅ Complete
  - Troubleshooting: ✅ Complete

---

## 🎯 Common Use Cases

### Scenario: I'm a new developer joining the team

1. Read [DEVELOPER.md](DEVELOPER.md) - Tech stack overview (15 min)
2. Follow [DEPLOYMENT.md](DEPLOYMENT.md) - Setup development environment (30 min)
3. Review [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) - Git/PR process (15 min)
4. Study [CODE_STANDARDS.md](CODE_STANDARDS.md) - Code conventions (30 min)
5. Explore [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) - Understand design (45 min)

**Total Time**: ~2 hours to get productive

---

### Scenario: I need to add a new API endpoint

1. Review [API_REFERENCE.md](API_REFERENCE.md) - Understand API patterns (20 min)
2. Check [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Understand data model (15 min)
3. Follow [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) - Create feature branch (5 min)
4. Implement endpoint following [CODE_STANDARDS.md](CODE_STANDARDS.md) (varies)
5. Add tests following [TESTING_STRATEGY.md](TESTING_STRATEGY.md) (varies)
6. Create PR with [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) process (5 min)

---

### Scenario: I need to fix a production bug

1. Check [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) - Find solutions (15 min)
2. Create hotfix branch from [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) (5 min)
3. Fix bug and add test (varies)
4. Follow [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md) deployment steps (10 min)

---

### Scenario: I need to optimize database performance

1. Review [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Understand current schema (20 min)
2. Check [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md) - Monitoring and metrics (15 min)
3. Implement optimization (varies)
4. Test and monitor per [TESTING_STRATEGY.md](TESTING_STRATEGY.md) (varies)

---

### Scenario: I need to deploy to production

1. Follow [DEVELOPMENT_WORKFLOW.md](DEVELOPMENT_WORKFLOW.md) - Release branch process (15 min)
2. Check [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures (5 min)
3. Monitor using [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md) - Monitoring section (ongoing)

---

## 🔍 Search Tips

### Find documentation about...

**Database queries**: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)

**Authentication**: [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md), [API_REFERENCE.md](API_REFERENCE.md)

**Deployment**: [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md), [DEPLOYMENT.md](DEPLOYMENT.md)

**Code standards**: [CODE_STANDARDS.md](CODE_STANDARDS.md)

**Testing**: [TESTING_STRATEGY.md](TESTING_STRATEGY.md)

**Errors**: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)

**Firebase**: [FIREBASE_STRATEGY.md](FIREBASE_STRATEGY.md)

**iOS/Android**: [packages/mobile/IOS_DISTRIBUTION_SETUP.md](packages/mobile/IOS_DISTRIBUTION_SETUP.md), [packages/mobile/ANDROID_DISTRIBUTION_SETUP.md](packages/mobile/ANDROID_DISTRIBUTION_SETUP.md), [DEVELOPER.md](DEVELOPER.md)

---

## 📝 Contributing to Documentation

### How to Update Documentation

1. **Identify missing or outdated docs**:
   - Check GitHub issues for documentation requests
   - Review PRs with doc updates needed
   - Collect feedback from team

2. **Create or update document**:
   ```bash
   # Create new doc
   touch docs/NEW_GUIDE.md

   # Or update existing
   vim docs/EXISTING_GUIDE.md
   ```

3. **Update this index** if adding new documents:
   - Add to appropriate section
   - Add to topic index
   - Update statistics

4. **Create PR**:
   - Title: `[DOCS] Brief description`
   - Link related issues
   - Request review from team leads

---

## 🎓 Learning Resources

### For Different Roles

**Backend Developers**:
1. [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) - System design
2. [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Data modeling
3. [API_REFERENCE.md](API_REFERENCE.md) - API specifications

**Frontend Developers**:
1. [CODE_STANDARDS.md](CODE_STANDARDS.md) - Frontend standards
2. [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) - System overview

**DevOps/SRE**:
1. [INFRASTRUCTURE_GUIDE.md](INFRASTRUCTURE_GUIDE.md) - Cloud setup
2. [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment procedures
3. [CICD_SETUP_GUIDE.md](CICD_SETUP_GUIDE.md) - CI/CD pipelines

**QA/Testing**:
1. [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Test approach
2. [API_REFERENCE.md](API_REFERENCE.md) - API specifications
3. [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) - Common issues

**Product/Project Management**:
1. [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) - Project overview
2. [PRODUCT_DESIGN.md](PRODUCT_DESIGN.md) - Feature specs
3. [REQUIREMENTS.md](REQUIREMENTS.md) - Feature status

---

## 📞 Support & Questions

### Getting Help

1. **Search documentation** - Most questions answered in existing docs
2. **Check Troubleshooting** - [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)
3. **GitHub Issues** - Ask in repository issues
4. **Team Slack** - Reach out to team members
5. **Code Review** - Get feedback during PR review

---

## ✅ Documentation Quality Checklist

Ensure documentation is complete and accurate:

- [ ] Table of contents for long documents
- [ ] Code examples with explanations
- [ ] Links to related documentation
- [ ] Diagrams for complex concepts
- [ ] Updated version and last modified date
- [ ] Audience clearly identified
- [ ] Step-by-step instructions where applicable
- [ ] Troubleshooting section
- [ ] Links to external resources

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 16, 2026 | Initial comprehensive documentation |
| 1.1 | Aug 8, 2026 | Doc alignment pass: corrected drift across ~19 core docs against actual shipped code (affiliate/creator payout backend, achievements v1, the `api` HTTP router migration, the `packages/functions` companion-repo extraction, real CI/CD workflow set, mobile IAP/AdMob, password policy, account deletion, 1280px/CRUD UI standards). Full rewrites: REQUIREMENTS.md, API_REFERENCE.md, CICD_SETUP_GUIDE.md. The large one-off dated session-summary/status docs elsewhere in `docs/` were intentionally left untouched as historical record. |
| 1.2 | Aug 12, 2026 | Full cleanup pass on the backlog left untouched in 1.1: deleted 64 files (point-in-time status/session snapshots; the fully-retired self-hosted-CI-runner, keychain-popup, and "zero-touch devops" clusters; a generic iOS-certificate template cluster superseded by a real project-specific doc; assorted redundant browser-extension docs), relocated `packages/browser-extension/FIREFOX_TESTING.md` under `docs/`, stripped dead Postgres/Drizzle/SendGrid/OpenAI references from 10 still-live docs, and added `packages/mobile/ANDROID_DISTRIBUTION_SETUP.md` (a real gap — the Android release pipeline had zero documentation despite iOS having a current one). ~65 files remaining, down from 123. |

---

**Last Updated**: August 12, 2026  
**Maintained By**: Mark Nelson  
**Status**: 🟢 Complete & Current

