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
┌──────────────────────────────────────────────────────┐
│                    Staging Environment                │
├──────────────────────────────────────────────────────┤
│ Firebase Project: wishlist-wizard-staging             │
│ Database: wishlist_wizard_staging                     │
│ URL: https://staging.wishlist-wizard.com              │
│ Branch: develop                                        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                   Production Environment              │
├──────────────────────────────────────────────────────┤
│ Firebase Project: wishlist-wizard-prod                │
│ Database: wishlist_wizard_prod                        │
│ URL: https://wishlist-wizard.com                      │
│ Branch: main                                          │
│ Backup: Daily automated backups                       │
│ Redundancy: Multi-region with failover                │
└──────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Strategy

### Automatic Deployments

**Development/Staging** (On push to develop):
```yaml
# .github/workflows/deploy-staging.yml
on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - run: npm install
      - run: npm run build
      - run: npm run test

      - name: Deploy to Firebase Staging
        run: firebase deploy --project wishlist-wizard-staging
```

**Production** (On push to main or via release):
```yaml
# .github/workflows/deploy-production.yml
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - run: npm install
      - run: npm run build
      - run: npm run test
      - run: npm run test:e2e

      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Deploy to Firebase Production
        run: |
          firebase deploy \
            --project wishlist-wizard-prod \
            --token ${{ secrets.FIREBASE_TOKEN }}
```

### Manual Deployment

**Using Firebase CLI**:
```bash
# Deploy to staging
firebase deploy --project wishlist-wizard-staging

# Deploy specific services
firebase deploy:hosting --project wishlist-wizard-staging
firebase deploy:functions --project wishlist-wizard-staging

# Deploy to production
firebase deploy --project wishlist-wizard-prod
```

**Using deployment script**:
```bash
./scripts/deploy.sh staging    # Deploy to staging
./scripts/deploy.sh production # Deploy to production
./scripts/deploy.sh rollback   # Rollback to previous version
```

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

**.github/workflows/ci.yml**:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm install

      - run: npm run lint
      - run: npm run type-check
      - run: npm run test -- --coverage

      - uses: codecov/codecov-action@v3
        if: always()

      - run: npm run build

      - name: Run E2E Tests
        run: npm run test:e2e
        if: github.event_name == 'push'

  deploy-staging:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'

    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build

      - name: Deploy to Firebase Staging
        run: |
          firebase deploy \
            --project wishlist-wizard-staging \
            --token ${{ secrets.FIREBASE_TOKEN }}

  deploy-production:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build

      - name: Deploy to Firebase Production
        run: |
          firebase deploy \
            --project wishlist-wizard-prod \
            --token ${{ secrets.FIREBASE_TOKEN }}

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1.24.0
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Production deployment successful",
              "attachments": [
                {
                  "color": "good",
                  "fields": [
                    {
                      "title": "Commit",
                      "value": "${{ github.sha }}",
                      "short": true
                    }
                  ]
                }
              ]
            }
```

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

