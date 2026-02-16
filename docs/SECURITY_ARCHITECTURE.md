# Wishlist Wizard - Security Architecture

**Version**: 1.0  
**Last Updated**: February 16, 2026  
**Owner**: Mark Nelson

---

## 🔐 Overview

This document outlines the security architecture and practices for Wishlist Wizard. Security is a shared responsibility across all layers of the application: infrastructure, backend, frontend, and client applications.

---

## 🔑 Authentication Architecture

### Multi-Platform Authentication

**Web & Mobile**:
- Firebase Authentication for primary auth
- Supports email/password, Google, Apple, Facebook login
- Firebase SDK manages ID token refresh

**Browser Extension**:
- Uses Firebase Auth with ID tokens
- Secure token storage in extension storage API
- Callable functions validate `request.auth`

### Firebase ID Token Strategy

**ID Token**:
- Issued by Firebase Auth on sign-in
- Automatically refreshed by Firebase SDK
- Contains user ID and custom claims
- Included automatically with callable function requests

**Token Claims**:
```json
{
  "uid": "user_123",
  "email": "user@example.com",
  "email_verified": true,
  "firebase": {
    "sign_in_provider": "password"
  }
}
```

### Password Security

**Requirements**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)

**Storage**:
- Never stored in plaintext
- Hashed using bcrypt with salt rounds = 12
- Salts generated fresh for each password

**Recovery**:
- Forgot password sends time-limited reset link (24 hours)
- Reset token is single-use
- Email verification required for account activation

---

## 🛡️ Authorization & Access Control

### Role-Based Access Control (RBAC)

**User Roles**:

| Role | Scope | Permissions |
|------|-------|------------|
| **Owner** | Wishlist | Full control: edit, delete, add collaborators, invite |
| **Editor** | Wishlist | Can edit items, add items, communicate with collaborators |
| **Commenter** | Wishlist | Can view, comment, potentially reserve items |
| **Viewer** | Wishlist | Read-only access |
| **Admin** | System-wide | Full system access (user management, analytics, moderation) |

**Authorization Checks**:

```typescript
// Example: Check if user can edit wishlist
async function canEditWishlist(userId: string, wishlistId: string): Promise<boolean> {
  const wishlist = await db.wishlists.findById(wishlistId);
  
  // Owner has full access
  if (wishlist.userId === userId) return true;
  
  // Check collaborator role
  const collaborator = wishlist.collaborators[userId];
  return collaborator?.role === 'editor';
}
```

### Resource-Level Permissions

**Wishlist Access**:
1. Owner: Full access
2. Collaborators: Based on role
3. Public link (shareId): Read-only or limited based on privacy settings
4. Admin: Full access

**Item Access**:
1. Item creator or wishlist owner: Full access
2. Wishlist collaborators: Based on wishlist role
3. Public viewed items: Limited information based on privacy settings

---

## 🔒 Data Protection

### Encryption at Rest

**Sensitive Data Encrypted**:
- Email addresses (application-level encryption)
- Payment information (never stored, processed by Stripe)
- Social security numbers (not stored, only verified)
- API keys and tokens (stored in encrypted configuration)

**Encryption Algorithm**: AES-256-GCM

**Key Management**:
- Keys stored in Firebase Secret Manager
- Keys rotated annually
- Each environment has separate keys

### Encryption in Transit

**All Communications**: HTTPS/TLS 1.3+

**Certificate**:
- Issued by Let's Encrypt or similar
- Auto-renewed 30 days before expiration
- SAN (Subject Alternative Name) covers all domains

**Certificate Pinning** (Mobile Apps):
- Pinned certificates for critical endpoints
- 2 pins (current + backup) maintained
- Pins updated in releases before expiration

### Data at Rest Security

**Firestore**:
- Encryption enabled by default
- Google manages encryption keys
- Data encrypted using AES-256

**PostgreSQL**:
- Encryption enabled (AWS RDS)
- Automated backups encrypted
- Encryption keys managed by AWS KMS

---

## 🚫 OWASP Top 10 Mitigation

### 1. Injection (SQL, NoSQL, Command)

**Prevention**:
- Use parameterized queries (Drizzle ORM for PostgreSQL)
- Input validation & sanitization
- Firestore security rules prevent invalid queries
- No command execution from user input

**Implementation**:
```typescript
// ✅ Correct - Parameterized
const user = await db.query(
  'SELECT * FROM users WHERE email = ?',
  [email]
);

// ❌ Wrong - String concatenation
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

### 2. Broken Authentication

**Prevention**:
- Strong password requirements
- Firebase Auth ID token management (SDK refresh)
- Logout clears local auth state
- Multi-factor authentication (planned)

### 3. Sensitive Data Exposure

**Prevention**:
- HTTPS/TLS for all communications
- PII never logged
- Password never transmitted in plaintext
- Sensitive errors don't expose details to clients
- API keys never exposed in client code

### 4. XML External Entities (XXE)

**Prevention**:
- Disable XML external entity processing
- Input validation on XML/SVG uploads
- Use safe XML parsers

### 5. Broken Access Control

**Prevention**:
- Authorization checks on every endpoint
- Role-based access control
- Resource ownership verification
- API rate limiting per user
- Audit logging of sensitive operations

**Verification Checklist**:
- [ ] User ID from token matches resource owner
- [ ] Collaborators have permission
- [ ] Public resources check privacy settings
- [ ] Admin operations logged

### 6. Security Misconfiguration

**Prevention**:
- Security headers on all responses
- CORS properly configured (whitelist domains)
- Security.txt file disclosed
- No unnecessary services exposed
- Regular security audits

**Security Headers**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; ...
```

### 7. Cross-Site Scripting (XSS)

**Prevention**:
- React escapes content by default
- Content Security Policy (CSP) headers
- Input sanitization for rich text
- DOMPurify for user-generated content
- Output encoding

**CSP Policy**:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.wishlist-wizard.com;
```

### 8. Insecure Deserialization

**Prevention**:
- Type validation on JSON requests
- Zod schemas for request validation
- Never deserialize untrusted data
- Use safe JSON parsing

**Example**:
```typescript
import { z } from 'zod';

const WishlistCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  occasion: z.object({
    type: z.enum(['birthday', 'holiday', ...]),
    targetDate: z.date(),
  }).optional(),
});

// Validate before processing
const validData = WishlistCreateSchema.parse(requestBody);
```

### 9. Using Components with Known Vulnerabilities

**Prevention**:
- Regular dependency updates
- npm audit to check vulnerabilities
- Dependabot alerts enabled
- Security patches applied immediately
- Pin major versions, allow patch updates

**CI/CD Check**:
```bash
npm audit --audit-level=moderate
# Fails build if moderate or higher severity found
```

### 10. Insufficient Logging & Monitoring

**Prevention**:
- Comprehensive logging of security events
- Real-time alerts for suspicious activity
- Audit trail for all data modifications
- Monthly security reviews
- Incident response plan

---

## 🚨 Security Event Logging

### Logged Events

**Authentication Events**:
- Successful login
- Failed login attempts (3+ triggers alert)
- Password changes
- Token refresh
- Logout

**Authorization Events**:
- Unauthorized access attempts
- Role changes
- Collaborator additions/removals
- Permission changes

**Data Events**:
- Sensitive data access
- Data modifications by collaborators
- Bulk data exports
- Account deletion
- Wishlist sharing

**System Events**:
- Admin actions
- Configuration changes
- API errors
- Rate limiting triggers

**Log Format**:
```json
{
  "timestamp": "2024-01-16T12:00:00Z",
  "eventType": "LOGIN_SUCCESS",
  "userId": "user_123",
  "ipAddress": "203.0.113.45",
  "userAgent": "Mozilla/5.0...",
  "details": {
    "method": "email",
    "loginProvider": "firebase"
  },
  "severity": "INFO"
}
```

### Log Retention

- **Normal logs**: 30 days
- **Security logs**: 90 days
- **Audit logs**: 2 years
- **Error logs**: 90 days

---

## 🔍 API Security

### CORS Configuration

**Allowed Origins**:
```javascript
const corsOptions = {
  origin: [
    'https://wishlist-wizard.com',
    'https://www.wishlist-wizard.com',
    'https://app.wishlist-wizard.com',
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
```

### Rate Limiting

**Strategies by Endpoint**:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Public endpoints | 100 | 1 minute per IP |
| Authentication | 5 | 15 minutes per email |
| API (authenticated) | 1000 | 1 minute per user |
| Webhook | 100 | 1 minute per source |

**Rate Limit Response**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 45
  },
  "statusCode": 429
}
```

### Input Validation

**Whitelist Approach**:
- Define expected input types and ranges
- Reject anything not matching schema
- Use Zod for runtime validation

**File Upload Security**:
- Whitelist allowed MIME types
- Validate file size (max 10MB)
- Scan files for malware (VirusTotal API)
- Store in secure cloud storage
- Generate unique names (prevent directory traversal)

---

## 🛡️ API Key Management

### Server-Side API Keys

**Storage**:
- Never commit to version control
- Use `.env.local` (gitignored)
- Encrypt in Firebase Secret Manager for production
- Rotate keys quarterly

**Protected Keys**:
- Firebase API key (restricted to specific IPs)
- SendGrid API key
- OpenAI API key
- Third-party API keys

**Example .env.local**:
```
FIREBASE_API_KEY=AIza...
FIREBASE_PROJECT_ID=wishlist-wizard
SENDGRID_API_KEY=SG.xxx...
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
```

### Client-Side API Keys

**Firebase Web API Key**:
- Restricted in Firebase Console
- Can only authenticate, can't admin operations
- Domain-restricted (web only)
- IP-restricted for additional security

---

## 🔐 Third-Party Security

### OAuth Integration

**Supported Providers**:
- Google
- Apple
- Facebook (optional)

**Security**:
- OAuth 2.0 with PKCE for web
- State parameter validated
- Nonce parameter for ID tokens
- Tokens immediately exchanged for user session
- Never store provider tokens

### External API Integration

**Security Practices**:
- HTTPS/TLS only
- API keys stored securely
- Rate limiting to prevent abuse
- Timeout limits (30s default)
- Retry logic with exponential backoff
- Request signing (if available)

---

## 📱 Mobile Security

### iOS Security

**Certificate Pinning**:
```swift
let serverTrustPolicy = ServerTrustPolicy.pinCertificates(
  certificates: [cert],
  validateCertificateChain: true,
  validateHost: true
)
```

**Keychain Storage**:
```swift
// Store tokens securely
KeychainService.save(
  key: "accessToken",
  value: token
)
```

**App Transport Security**:
- HTTPS only (ATS enabled)
- Minimum TLS 1.2
- Forward secrecy required

### Android Security

**Android Keystore**:
```kotlin
val keyStore = KeyStore.getInstance("AndroidKeyStore")
keyStore.load(null)
val secretKey = keyStore.getKey("api_token_key", null) as SecretKey
```

**EncryptedSharedPreferences**:
- Encrypted by default
- AES-256-GCM encryption

---

## 🚫 Security Incident Response

### Incident Classification

**Critical (P1)**:
- Data breach (user PII exposed)
- Service outage
- Security vulnerability exploited
- Massive DDoS attack

**High (P2)**:
- Potential vulnerability discovered
- Unauthorized access detected
- Policy violation

**Medium (P3)**:
- Security misconfiguration
- Weak password detected

### Response Timeline

1. **Detection** (Immediate): Automated alerts + monitoring
2. **Investigation** (< 1 hour): Determine scope and impact
3. **Containment** (< 4 hours): Stop the incident
4. **Notification** (< 24 hours): Notify affected users if required
5. **Remediation** (< 48 hours): Fix root cause
6. **Communication** (< 72 hours): Incident report published
7. **Retrospective** (1 week): Lessons learned, process improvements

---

## 🔒 Compliance

### GDPR Compliance

**Requirements**:
- Right to access: Data export functionality
- Right to deletion: Account deletion removes all data
- Right to portability: Export user data
- Consent management: Explicit consent for processing
- Privacy policy: Clear and accessible

**Data Processing**:
- Data Processing Agreements (DPA) with cloud providers
- Privacy Impact Assessment (PIA) completed
- Data retention policies enforced
- Data minimization principle followed

### CCPA Compliance

**Requirements**:
- California users to know what data is collected
- Right to delete: Delete account and data
- Right to opt-out: Of sale of personal information
- Non-discrimination: No penalty for exercising rights

---

## 📊 Security Monitoring

### Key Metrics

- Failed login attempts (alert if > 10/hour per IP)
- Unauthorized access attempts (alert on any)
- API error rates (alert if > 5%)
- Token expiration mismatches (alert on anomalies)
- Large data exports (alert on > 10MB)

### Tools

- Firebase Security Insights
- Cloud Logging & Monitoring
- Datadog APM (for performance & security)
- OWASP ZAP (for vulnerability scanning)
- Burp Suite (for security testing)

---

## ✅ Security Checklist

Before each release:
- [ ] Security audit completed
- [ ] Dependency vulnerabilities: 0 critical, 0 high
- [ ] OWASP Top 10 review passed
- [ ] Rate limiting verified
- [ ] Authorization checks on all endpoints
- [ ] PII not logged or exposed
- [ ] Security headers configured
- [ ] CORS properly restricted
- [ ] API keys rotated (if not recently)
- [ ] Encryption keys verified
- [ ] Incident response plan reviewed
- [ ] Security documentation updated

---

## 📚 Related Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [API Reference](API_REFERENCE.md)
- [Database Schema](DATABASE_SCHEMA.md)

