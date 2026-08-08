# Wishlist Wizard - Infrastructure & DevOps Guide

**Version**: 1.0  
**Last Updated**: February 16, 2026  
**Owner**: Mark Nelson

---

## 📋 Overview

This document outlines the infrastructure setup, deployment strategies, monitoring, and DevOps practices for Wishlist Wizard.

---

## 🏗️ Infrastructure Architecture

### Cloud Platform: Google Cloud Platform (GCP)

**Primary Services**:
- **Firebase**: All application services (Hosting, Functions, Firestore, Auth)
- **Cloud Run**: Optional for containerized workloads
- **Cloud Storage**: User uploads and backups
- **Cloud SQL**: PostgreSQL database (supplementary)
- **Cloud Monitoring**: Observability and alerting

### Multi-Environment Architecture

```
Development Environment
  Firebase Project: wishlist-wizard-dev
  URL:              https://wishlist-wizard-dev.web.app
  Branch:           develop
  Deploy path:      firebase-hosting-dev.yml only (Hosting only;
                     does NOT trigger master-pipeline.yml / Functions)

Staging Environment
  Firebase Project: wishlist-wizard-staging
  URL:              https://wishlist-wizard-staging.web.app
  Branch:           staging
  Deploy path:      firebase-hosting-staging.yml (Hosting) +
                     master-pipeline.yml (Functions, Android internal
                     track, iOS TestFlight "Staging" group)

Production Environment
  Firebase Project: wishlist-wizard-prod
  URL:              https://wishlist-wizard.com / wishlist-wizard-prod.web.app
  Branch:           main
  Deploy path:      firebase-hosting-merge.yml (Hosting) +
                     master-pipeline.yml (Functions, Android internal
                     track, iOS TestFlight "Beta Testers" group)
```

---

## 🚀 Deployment Strategy

### Automatic Deployments

All automatic deployment runs on **GitHub-hosted runners** through GitHub Actions — there are no self-hosted runners in this repository. The real workflow files (in `.github/workflows/`) are:

| File | Trigger | What it does |
|------|---------|---------------|
| `master-pipeline.yml` | `push` to `staging`/`main` (path-filtered), `pull_request`, `workflow_dispatch` | Build/test/quality-gate, then deploys Firebase Functions + Hosting, Android (Play Store internal track), iOS (TestFlight); Chrome extension publish only on the `build_and_deploy` dispatch action |
| `firebase-hosting-dev.yml` | `push` to `develop` | Deploys web app to Firebase Hosting on the dev project (this is `develop`'s only automatic deploy — it does **not** run `master-pipeline.yml`) |
| `firebase-hosting-staging.yml` | `push` to `staging` | Deploys web app to Firebase Hosting on the staging project |
| `firebase-hosting-merge.yml` | `push` to `main` | Deploys web app to Firebase Hosting on the production project |
| `firebase-deploy-local.yml` | `workflow_call` (reusable) | Checks out the functions companion repo and deploys Firebase Functions |
| `release-readiness-gate.yml` | `workflow_dispatch` (manual) | Pre-launch readiness gate, run deliberately before a production release |

`master-pipeline.yml` maps branches to environments: `refs/heads/main` → `production`, `refs/heads/staging` → `staging`. `develop` is deliberately excluded from that workflow's push trigger, so it never drives a Functions deploy automatically — only the lighter-weight Hosting-only deploy above.

**Important**: `packages/functions/` is gitignored in this repo. The real function source lives in the private companion repo `NelsonGrey/wishlist-wizard-functions`. Any job that builds/tests/deploys functions (in `master-pipeline.yml`'s `test` and `build-web` jobs, `firebase-deploy-local.yml`, and `release-readiness-gate.yml`) checks out that companion repo into `packages/functions/` first, using the `FUNCTIONS_REPO_PAT` secret, before running `npm ci`.

See `docs/CICD_SETUP_GUIDE.md` for the complete workflow list and gate set.

### Manual Deployment

**Using Firebase CLI**:
```bash
# Deploy to staging
firebase deploy --project wishlist-wizard-staging

# Deploy specific services
firebase deploy --only hosting --project wishlist-wizard-staging
firebase deploy --only functions --project wishlist-wizard-staging

# Deploy to production
firebase deploy --project wishlist-wizard-prod
```

For a local Functions deploy, clone the companion repo into `packages/functions/` first (see `docs/DEPLOYMENT.md`) — there is no `./scripts/deploy.sh` wrapper script in this repository.

---

## 🗄️ Database Management

### PostgreSQL Setup (GCP Cloud SQL)

**Instance Configuration**:
- **Machine Type**: db-custom-2-8192 (2 vCPU, 8GB RAM)
- **Storage**: 100GB SSD with automatic backups
- **Failover**: Automatic failover replica in different zone
- **SSL**: Required for all connections

**Connection**:
```bash
# Using Cloud SQL Proxy
cloud_sql_proxy -instances=wishlist-wizard-prod:us-central1:postgres=tcp:5432 &

# Connect via psql
psql "host=localhost user=postgres dbname=wishlist_wizard_prod"
```

### Firestore Configuration

**Database Setup**:
- **Location**: us-central1
- **Backup**: Daily automated backups, 30-day retention
- **Indexes**: Auto-indexed for common queries
- **Consistency**: Strong consistency for critical operations

**Backup & Recovery**:
```bash
# Create backup
gcloud firestore backups create \
  --location=us-central1 \
  --retention-days=30

# List backups
gcloud firestore backups list

# Restore from backup
gcloud firestore restore <BACKUP_ID>
```

### Database Migrations

**Using Drizzle ORM**:
```bash
# Generate migration
npm run db:migrate:generate -- --name add_user_preferences

# Apply migration
npm run db:migrate:apply

# Preview migration
npm run db:migrate:preview
```

**Migration file structure**:
```sql
-- migrations/001_initial_schema.sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_wishlists_user_id ON wishlists(user_id);
```

---

## 💾 Backup & Disaster Recovery

### Backup Strategy

**Frequency**:
- **Firestore**: Daily automated backups
- **PostgreSQL**: Continuous transaction logs + daily snapshots
- **Cloud Storage**: Daily incremental backups

**Retention**:
- **Short-term**: 30 days
- **Medium-term**: 90 days
- **Long-term**: 1 year (quarterly snapshots)

### Disaster Recovery Plan

**RTO** (Recovery Time Objective): 1 hour
**RPO** (Recovery Point Objective): 15 minutes

**Recovery Steps**:

1. **Detect Incident**:
   - Monitor alerts trigger
   - Team notified via Slack
   - Incident channel created

2. **Assess Damage**:
   - Check which services affected
   - Determine data loss scope
   - Identify root cause

3. **Recover**:
   ```bash
   # Restore from backup
   gcloud firestore restore <BACKUP_ID>
   
   # Or restore PostgreSQL
   gcloud sql backups restore <BACKUP_ID> \
     --backup-instance=postgres-prod
   ```

4. **Verify**:
   - Run health checks
   - Test critical features
   - Monitor metrics

5. **Communicate**:
   - Update status page
   - Notify affected users
   - Post-incident review

---

## 📊 Monitoring & Observability

### Key Metrics

**Application Metrics**:
- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Request throughput (RPS)
- Database query performance
- Function execution time

**Infrastructure Metrics**:
- CPU utilization
- Memory usage
- Disk space
- Network bandwidth
- Firestore read/write capacity

**Business Metrics**:
- Active users
- Wishlist creation rate
- Feature adoption
- User retention
- Error budget

### Monitoring Stack

**Tools**:
- **Cloud Monitoring**: GCP native monitoring
- **Cloud Logging**: Centralized log aggregation
- **Datadog** (optional): APM and infrastructure monitoring
- **Sentry** (optional): Error tracking and alerting

### Setting Up Alerts

**Example Alert for High Error Rate**:
```yaml
# Using GCP Cloud Monitoring
displayName: High API Error Rate
conditions:
  - displayName: Error rate > 5%
    conditionThreshold:
      filter: |
        metric.type="logging.googleapis.com/user/api_errors"
        resource.type="cloud_function"
      comparison: COMPARISON_GT
      thresholdValue: 0.05
      duration: 300s
notificationChannels:
  - projects/[PROJECT_ID]/notificationChannels/[CHANNEL_ID]
```

### Logging Best Practices

**Log Levels**:
```typescript
logger.debug('Detailed info for developers');        // Development only
logger.info('Application flow milestones');          // Normal flow
logger.warn('Potentially problematic situations');   // Must investigate
logger.error('Errors that don\\'t stop execution');   // Must fix
logger.fatal('Critical errors, app may be down');    // Immediate action
```

**Structured Logging**:
```json
{
  "timestamp": "2024-01-16T12:00:00Z",
  "severity": "ERROR",
  "component": "wishlist_service",
  "action": "create_wishlist",
  "userId": "user_123",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Wishlist title is required",
    "details": { "field": "title" }
  },
  "context": {
    "requestId": "req_xyz789",
    "duration_ms": 45
  }
}
```

---

## 🔒 Security & Compliance

### Network Security

**Firewall Rules**:
- Production databases: Internal access only
- APIs: HTTPS only, no HTTP
- CDN: CloudFlare for DDoS protection
- Rate limiting: Firebase built-in + custom rules

**VPC Setup**:
```
┌─────────────────────┐
│   Cloud Armor       │ DDoS protection
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Cloud CDN         │ Caching, compression
└──────────┬──────────┘
           │
┌──────────▼──────────────────────────┐
│   VPC Network                        │
├──────────────────────────────────────┤
│ ┌────────┐  ┌────────┐  ┌────────┐  │
│ │ Cloud  │  │ Cloud  │  │ Cloud  │  │
│ │ Run    │  │Functions│ SQL    │  │
│ └────────┘  └────────┘  └────────┘  │
└──────────────────────────────────────┘
```

### Secret Management

**Using Google Secret Manager**:
```bash
# Create secret
echo -n "secret_value" | gcloud secrets create api-key \
  --data-file=-

# Use in Cloud Functions
const secret = await client.accessSecretVersion({
  name: 'projects/PROJECT_ID/secrets/api-key/versions/latest',
});

# Rotate secret
gcloud secrets versions add api-key --data-file=new_secret.txt
```

### Compliance

**Data Protection**:
- ✅ GDPR compliant (data export, deletion)
- ✅ CCPA compliant (privacy controls)
- ✅ SOC 2 Type II (in progress)
- ✅ Encrypted at rest (AES-256)
- ✅ Encrypted in transit (TLS 1.3)

---

## 🔄 CI/CD Pipeline

### Pipeline Stages

```
┌─────┐
│Push │
└──┬──┘
   │
   ▼
┌─────────┐
│Checkout │
└──┬──────┘
   │
   ▼
┌──────────────┐
│Install Deps  │
└──┬───────────┘
   │
   ├─▶ ┌─────────────┐
   │   │Lint & Type  │─◀─┐
   │   │Check        │   │
   │   └──┬──────────┘   │
   │      │              ├─▶ FAIL ─▶ Notify
   ▼      │              │          Developer
┌──────────┐              │
│Unit Tests├──────────────┤
└──┬───────┘              │
   │      ┌────────────┐  │
   └─────▶│Integration │  │
          │Tests       ├──┤
          └──┬─────────┘  │
             │            │
             ▼            │
          ┌─────────┐     │
          │E2E Tests├─────┘
          └──┬──────┘
             │
             ▼
          ┌──────────────┐
          │Build Artifacts│
          └──┬───────────┘
             │
             ├─▶ [Staging] Deploy
             │
             └─▶ [Production] Wait for Approval
                            │
                            ▼
                   ┌──────────────┐
                   │Deploy to Prod│
                   └──────────────┘
```

### CI/CD Configuration

There is no `.github/workflows/ci.yml` in this repository, and no `postgres` service container in any workflow (the app has no Postgres dependency). The real gate set that runs on pushes/PRs is:

1. **Secret Scan** (`secret-scan.yml`) — gitleaks scan on `push`/`pull_request` to `main`/`staging`/`develop`
2. **CodeQL** (`codeql.yml`) — static analysis on `push`/`pull_request` plus a weekly schedule
3. **Master CI/CD Pipeline** (`master-pipeline.yml`) — lint/type-check/test/build via its `test` and `quality-gate` jobs, on `pull_request` (all three branches) and `push` (`staging`/`main`)
4. **CI Gate Auto-Approve** (`ci-gate-approve.yml`) — auto-approves the PR once `master-pipeline.yml` succeeds for its head SHA
5. **Production Validation** (`production-validation.yml`) — runs automatically after a production deploy inside `master-pipeline.yml`
6. **Release Readiness Gate** (`release-readiness-gate.yml`) — manual pre-launch gate, `workflow_dispatch` only

Deployment (not just test/build) happens inside `master-pipeline.yml` itself rather than a separate `deploy-staging`/`deploy-production` job file — see the workflow table above for the branch → environment mapping and the App Check/Functions companion-repo prerequisites.

App Check enforcement (reCAPTCHA v3, wired via `VITE_FIREBASE_APPCHECK_SITE_KEY`) is live on all three web Hosting deploy paths and on iOS; Android has App Check code in place but is unverified pending a test device. Password policy is not something CI enforces or configures — the app reads Firebase Auth's live password policy at runtime via `validatePassword()` (`packages/web/client-src/lib/firebase.ts`) rather than hard-coding rules in application code.

---

## 📈 Scaling & Performance

### Scaling Strategy

**Horizontal Scaling**:
- Cloud Functions: Auto-scales to 10,000 concurrent executions
- Firestore: Unlimited concurrent connections
- Cloud Run: Auto-scales based on CPU/memory

**Vertical Scaling**:
- Cloud SQL: Can upgrade machine type
- Increase read replicas for read-heavy workloads
- Add caching (Redis) for frequently accessed data

### Performance Optimization

**Frontend**:
- Code splitting
- Lazy loading components
- Image optimization
- Caching with Service Workers

**Database**:
- Index frequently queried fields
- Avoid N+1 queries
- Batch operations where possible
- Regular vacuum and analyze

**API**:
- Implement pagination
- Use compression (gzip)
- Cache responses with CDN
- Implement request queuing

---

## 🛡️ Disaster Recovery Checklist

### Weekly
- [ ] Monitor alerting system functioning
- [ ] Review error logs for patterns
- [ ] Check backup job completion

### Monthly
- [ ] Test recovery from backup
- [ ] Review security logs
- [ ] Load test staging environment

### Quarterly
- [ ] Full disaster recovery drill
- [ ] Update incident response runbook
- [ ] Capacity planning review
- [ ] Security audit

---

## 📞 Runbooks

### Service Down - API Unresponsive

1. **Immediate**:
   - Check Cloud Functions logs
   - Check Cloud Run dashboard
   - Verify database connectivity

2. **Troubleshoot**:
   ```bash
   # Check Cloud Functions status
   gcloud functions list

   # View function logs
   gcloud functions logs read api-function --limit 50

   # Check database
   gcloud sql describe postgres-prod
   ```

3. **Remediate**:
   - Redeploy functions
   - Check recent deployments for issues
   - Roll back if recent change caused it

---

### Database Down - Cannot Connect

1. **Verify Issue**:
   ```bash
   gcloud sql describe postgres-prod |grep -i status
   ```

2. **Failover**:
   ```bash
   gcloud sql promote-replica \
     --backup-configuration-name postgres-replica
   ```

3. **Restore**:
   ```bash
   gcloud sql backups restore <BACKUP_ID> \
     --backup-instance=postgres-prod
   ```

---

## 📚 Related Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [Security Architecture](SECURITY_ARCHITECTURE.md)
- [Troubleshooting Guide](TROUBLESHOOTING_GUIDE.md)
- [Development Workflow](DEVELOPMENT_WORKFLOW.md)

