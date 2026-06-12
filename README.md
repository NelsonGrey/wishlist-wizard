# Wishlist Wizard - Wishlist Management Platform

Wishlist Wizard is a comprehensive wishlist management platform that empowers users to create, share, and collaborate on wishlists with advanced social and tracking capabilities. It offers a seamless experience across web, mobile, and browser extension platforms.

## 🌟 Key Features

### Core Functionality
- **Wishlist Creation & Management**: Create and organize multiple wishlists for different occasions and beneficiaries.
- **Multi-Beneficiary Support**: Manage wishlists for yourself and others (children, partners, friends, etc.).
- **Item Management**: Add, edit, remove, and prioritize items in your wishlists.
- **Social Sharing**: Share wishlists with friends and family via direct links or social media.

### Advanced Features
- **Collaborative Wishlists**: Co-create and edit wishlists with friends and family for group gifting.
- **Calendar Integration**: Sync birthdays, holidays, and other occasions with Google Calendar, Outlook, or Apple Calendar.
- **Social Network & Discovery**: Find trusted profiles and coordinate shared planning.
- **Cross-Platform Access**: Use WishKeeper on web, mobile, and through a browser extension.
- **Notification System**: Receive alerts for approaching events or collaborative activities.

### Browser Extension
- **One-Click Adding**: Add items to your wishlists while browsing online stores.
- **Price Comparison**: Compare prices across different retailers.
- **Automatic Product Detection**: Automatically detects product information on supported websites.

### E-Commerce Integration
- **Multi-Platform Support**: Integration with Amazon, eBay, Etsy, Walmart, Target, and Best Buy.
- **Product Data Extraction**: Extract detailed product information from URLs.
- **Roadmap Note**: Price tracking and affiliate monetization are planned for a later rollout phase.

## 🚀 Getting Started

### Development Setup

This project consists of:
- **Web App**: React frontend with TypeScript (`web/`)
- **Backend**: Express.js API (`server/`)
- **Mobile App**: Flutter app for iOS and Android (`packages/mobile/`)
- **Browser Extension**: Chrome/Firefox extension (`packages/browser-extension/`)
- **Shared Libraries**: Common TypeScript code (`packages/shared/`)
- **Firebase Functions**: Serverless backend (`packages/functions/`)

#### Prerequisites
- Node.js v18+ 
- npm or yarn
- Flutter SDK 3.8+
- Xcode (for iOS development)
- Android Studio (for Android development)

#### Quick Start
```bash
# Install dependencies
npm install

# Start development server (serves both frontend and API)
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

#### Synthetic Test Users + Functionality Smoke Test
```bash
# Runs Firebase emulators (auth/firestore/functions), seeds synthetic users,
# and exercises callable wishlist flows (create/update/item CRUD/delete)
npm run test:users:smoke

# If emulators are already running, run only the smoke script
npm run test:users:smoke:live
```

Smoke report output:
- JSON artifact: `artifacts/smoke-users-report.json`
- Includes per-callable pass/fail, HTTP status, duration, and run summary

#### Full Functions Contract Smoke Test
```bash
# Strict mode: preserves environment/config warnings (FCM/Stripe gaps remain warned)
npm run test:functions:smoke:all:strict

# Env-aware mode: treats known dependency/config gaps as expected passes
npm run test:functions:smoke:all:env-aware
```

Notes:
- `test:functions:smoke:all` is the strict baseline and is equivalent to `test:functions:smoke:all:strict`.
- Env-aware mode sets `SMOKE_TREAT_EXPECTED_DEPENDENCY_GAPS_AS_PASS=true` for the emulator run.
- Full report artifact: `artifacts/smoke-all-functions-report.json`.
- In env-aware mode, report metadata includes `treatExpectedDependencyGapsAsPass: true`.

Latest comparison snapshot:

| Mode | Total | Passed | Warned | Failed | Warning scope |
| --- | ---: | ---: | ---: | ---: | --- |
| Strict | 273 | 265 | 8 | 0 | FCM topic/test notification callables (3), Stripe group-gifting callables (2), Stripe HTTP endpoints (2), upstream barcode provider callable dependency (1) |
| Env-aware | 273 | 273 | 0 | 0 | Same 8 expected dependency gaps are treated as pass |

#### Flutter Mobile App
```bash
# Navigate to mobile directory
cd packages/mobile

# Install Flutter dependencies
flutter pub get

# Run on iOS simulator
flutter run -d ios

# Run on Android emulator
flutter run -d android

# Build for release
flutter build ios --release
flutter build apk --release
```

### Account Creation
1. Visit the Wishlist Wizard website
2. Click "Sign Up" in the top-right corner  
3. Fill in your details and create an account
4. Verify your email address

### Creating Your First Wishlist
1. Click "Create Wishlist" on your dashboard
2. Name your wishlist and set an occasion (optional)
3. Add items by clicking "Add Item"
4. For each item, you can add:
   - Name
   - Description
   - Price
   - Link
   - Priority
   - Image (optional)

### Adding Beneficiaries
1. Navigate to "Beneficiaries" in the sidebar
2. Click "Add Beneficiary"
3. Fill in their details including:
   - Name
   - Relationship
   - Birthday (optional)
   - Preferences (optional)

### Browser Extension Installation
1. Visit your browser's extension store
2. Search for "Wishlist Wizard"
3. Click "Add to Browser"
4. Sign in with your Wishlist Wizard account

## 💫 Advanced Usage

### Calendar Integration
1. Navigate to "Calendar" in the sidebar
2. Click on the "Connections" tab
3. Select which calendar service you want to connect (Google, Outlook, Apple)
4. Follow the authentication steps
5. Choose which events to sync (birthdays, wishlist deadlines, etc.)
6. Your Wishlist Wizard events will now appear in your external calendar

### Collaborative Wishlists
1. Open an existing wishlist or create a new one
2. Click "Collaborators" at the top-right
3. Enter the email addresses of people you want to invite
4. Select their permission level (view, edit, admin)
5. They'll receive an invitation to collaborate

### E-Commerce Platform Integration
1. Navigate to "Settings" > "E-Commerce"
2. Select the platforms you want to enable
3. The system will now fetch product data from these platforms
4. Product metadata and links are normalized for consistent wishlist management

## 🛠️ Technical Details

### Architecture
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + TypeScript + Drizzle ORM  
- **Database**: PostgreSQL (via DATABASE_URL)
- **Mobile**: Flutter 3.8+ with Provider state management
- **Styling**: Tailwind CSS (web), Material Design (mobile)

### System Requirements
- **Browser Support**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Support**: iOS 13+ and Android 8.0+ (Flutter app)
- **Internet Connection**: Required for collaboration and calendar syncing

### Environment Setup
Required environment variables (add to `.env`):
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
VITE_GA_MEASUREMENT_ID=G-...
```

### API Integration
Wishlist Wizard integrates with the following external APIs:
- **E-commerce APIs**: Amazon, eBay, Etsy, Walmart, Target, Best Buy
- **Calendar APIs**: Google Calendar, Microsoft Outlook, Apple Calendar
- **Payment Processing**: For group gifting contributions
- **Social Media**: For advanced sharing capabilities
- **OpenAI**: For AI-powered recommendations
- **Firebase** (Optional): Analytics, Cloud Messaging (push notifications), future real-time features

### 🔥 Firebase Integration (Primary Infrastructure)
**Wishlist Wizard leverages Firebase as the primary infrastructure platform** for authentication, data storage, serverless functions, hosting, and analytics.

#### Required Firebase Setup:
1. **Firebase Project Configuration**: Already configured with project ID `wishlist-wizard`
```dotenv
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-web-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_FIREBASE_AUTO_INIT=false
```

2. **Firebase Services Enabled**:
   - ✅ **Firestore Database**: Primary data storage with security rules
   - ✅ **Firebase Functions**: Serverless API and background operations  
   - ✅ **Firebase Hosting**: Web app deployment with CDN
   - ✅ **Firebase Authentication**: User management (planned migration)
   - ✅ **Cloud Messaging**: Push notifications
   - ✅ **Firebase Analytics**: User behavior tracking
   - ✅ **Firebase Storage**: Media and file uploads
   - ✅ **Cloud Scheduler**: Scheduled background workflows

3. **Development with Firebase Emulators**:
```bash
npx firebase emulators:start --project wishlist-wizard --only auth,firestore,functions
npx firebase deploy --project wishlist-wizard
```

4. **Firebase-Native Features**:
   - **Scheduled Processing**: Implemented as Firebase Functions with Cloud Scheduler
   - **Real-time Updates**: Firestore real-time subscriptions
   - **Push Notifications**: FCM for web and mobile
   - **Serverless Architecture**: Firebase Functions v2 for all API operations
   - **Secure Authentication**: Firebase Auth with custom claims

See `FIREBASE_STRATEGY.md` for comprehensive Firebase integration details.

## 🚀 Zero-Touch DevOps Automation

Wishlist Wizard includes a complete **zero-touch DevOps automation suite** that eliminates manual credential management and provides automated CI/CD, monitoring, and deployment capabilities.

### 🎯 Automation Features
- **Automated Token Management**: GitHub, Firebase, Docker registry, and API tokens rotate automatically
- **Multi-Environment Management**: Development, staging, and production environments with isolated secrets
- **Intelligent Monitoring**: 24/7 health checks with auto-healing and smart alerting
- **Zero-Touch Deployments**: Push to main branch → automatic deployment across all platforms
- **Self-Healing Systems**: Automatic service restarts, certificate renewal, and issue resolution
- **Multi-Channel Alerts**: Email, Slack, and log-based notifications
- **Automated Backups**: Daily backups with disaster recovery capabilities

### 🚀 Quick Automation Start
```bash
# Complete automated setup
./automate.sh setup

# Start 24/7 monitoring with auto-healing
./automate.sh monitor start

# Deploy everything automatically
./automate.sh deploy full production

# Rotate all tokens automatically
./automate.sh tokens rotate
```

### 📊 Automated CI/CD Pipeline
- **Quality Checks**: TypeScript compilation, tests, security audit
- **Multi-Platform Builds**: Web, API, mobile, and extension builds
- **Automated Deployment**: Push to `main` triggers full deployment
- **Artifact Management**: Build artifacts stored for rollback capability

### 🔐 Security Features
- **Automated Token Rotation**: GitHub, Firebase, API secrets rotate automatically
- **Environment Isolation**: Secrets isolated per environment
- **GitHub Secrets Sync**: Automatic synchronization of secrets
- **Audit Logging**: Comprehensive logging for all operations

See `ZERO_TOUCH_DEVOPS_IMPLEMENTATION_GUIDE.md` and `AUTOMATION_README.md` for complete automation details.

## 🚀 Automated Deployment

Wishlist Wizard includes a comprehensive CI/CD pipeline that automatically builds, tests, and deploys all components:

### Deployment Targets
- **🌐 Web App**: Firebase Hosting (`https://wishlist-wizard.web.app`)
- **🚂 API Server**: Firebase Functions (`https://api.wishlist-wizard.web.app`)
- **📱 Mobile PWA**: Firebase Hosting (`https://wishlist-wizard.web.app`)
- **🔌 Chrome Extension**: Chrome Web Store (manual submission)

### Automated Pipeline
- **Quality Checks**: TypeScript compilation, tests, security audit
- **Multi-Platform Builds**: Web, API, mobile, and extension builds
- **Automated Deployment**: Push to `main` triggers full deployment
- **Artifact Management**: Build artifacts stored for rollback capability

### Manual Deployment
```bash
# Deploy all components
npm run deploy

# Deploy individual components  
npm run deploy:web     # Deploy to Firebase Hosting
npm run deploy:api     # Deploy to Firebase Functions
npm run deploy:mobile  # Deploy to Firebase Hosting

# Create extension package
npm run package:extension
```

See `AUTOMATED_DEPLOYMENT.md` for complete setup and configuration details.

### Data Privacy
- All personal data is encrypted and stored securely
- Wishlists can be set to private, shared with specific people, or public
- You can delete your account and all associated data at any time

## 🤝 Getting Help

- **Support**: Email support@wishlistwizard.com
- **Documentation**: https://docs.wishlistwizard.com
- **FAQ**: Available in the Help section of the app

## 🔮 Upcoming Features

- Phase 2 intelligence rollout (price tracking, affiliate integrations, AI recommendations)
- Creator economy tooling and advanced monetization dashboards
- Phase 3 ecosystem expansion (AR, white-label, conversational AI)
- Extended mobile and collaboration enhancements

---

© 2024 Wishlist Wizard. All rights reserved.
# Test commit to trigger iOS build with CocoaPods fix
