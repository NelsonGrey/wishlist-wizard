# Browser Extension Store Submission Runbook

## Quick Start

```bash
# Build all browsers
cd packages/browser-extension
npm run build:all

# Test locally (see Testing section)
# Create store assets (screenshots, descriptions)
# Submit to stores (see exact steps below)
```

## Submission Checklist

- [ ] All 4 browsers built and tested
- [ ] Privacy policy written
- [ ] Extension screenshots created (all sizes)
- [ ] Store descriptions written (all stores)
- [ ] Support email/URL configured
- [ ] Icons/images prepared per store requirements
- [ ] Ready to submit to all stores simultaneously

---

## 1. Chrome Web Store

### Requirements

| Item | Requirement | Notes |
|------|------------|-------|
| Icon | 128x128 PNG | Transparent background recommended |
| Screenshots | 1280x800 or 640x400 | Min 2, Max 10 |
| Short description | 12 characters | Limited |
| Full description | 10-100 words | User-facing |
| Version | Semantic versioning | v1.0.0 format |
| Category | Productivity | Or appropriate category |
| Language | Select all | Default: English |
| Privacy policy | Link or content | Required for data collection |
| Support URL | https://... | Recommended |

### Step-by-Step

**1. Prepare Extension Package**

```bash
cd packages/browser-extension/dist/chrome
zip -r ../../wishlist-wizard-chrome-v1.0.0.zip .
cd ../../..
```

**2. Create Developer Account**

1. Go to https://chrome.google.com/webstore/developer/dashboard
2. Pay $5 developer registration fee (one-time)
3. Verify email
4. Create developer account

**3. Create Store Listing**

1. Click **"Create new item"** → **"Create"**
2. Upload ZIP file: `wishlist-wizard-chrome-v1.0.0.zip`
3. Wait for extraction and validation (~30 seconds)

**4. Fill Store Information**

| Field | Value | Example |
|-------|-------|---------|
| **Extension name** | Wishlist Wizard | Keep it simple |
| **Short description** | 12 character max | "Save wishlists" |
| **Detailed description** | Max 100 words | Feature summary |
| **Homepage URL** | https://wishlist-wizard-dev.web.app | Your website |
| **Support email** | support@wishlist-wizard.app | Support contact |
| **Support website** | https://wishlist-wizard-dev.web.app/support | Help page |
| **Category** | Productivity | Or Shopping |
| **Language** | English (United States) | Default |
| **Locale** | All regions | Default |

**Sample Description:**

```
Wishlist Wizard instantly captures products and prices from 
your favorite shopping sites—Amazon, Target, Walmart, eBay, 
and more. One click to save items to your personal wishlist. 
Perfect for gift planning, price tracking, and sharing lists 
with friends and family.

Features:
- One-click product capture
- Price tracking alerts
- Shareable wishlists
- Gift planning tools
```

**5. Add Graphics**

1. **Tile icon** (128x128 PNG)
   - Clear, distinctive
   - Works at small sizes
   - Transparent background

2. **Screenshots** (1280x800 PNGs)
   - Screenshot 1: Popup showing product capture
   - Screenshot 2: Wishlist in web app
   - Screenshot 3: Sharing feature
   - Up to 10 total

**6. Privacy & Permissions**

1. Declare data collection:
   ```
   ☐ User's browsing activity
   ☐ User's shopping cart
   ☐ Cookies/tracking info
   ☑ User preferences
   ☑ Wishlist data (stored on device)
   ```

2. Add privacy policy link:
   ```
   https://your-domain.com/privacy
   ```

3. Declare data usage:
   ```
   Data is used to:
   - Capture product information
   - Store user wishlists
   - Sync across devices (with Wishlist Wizard account)
   
   Data is NOT:
   - Sold to third parties
   - Used for advertising
   - Shared without consent
   ```

**7. Submit for Review**

1. Click **"Submit for review"**
2. Agreement checkboxes:
   - ☑ I created this extension
   - ☑ Complies with policies
   - ☑ Not deceptive
3. Click **"Submit"**

**Status Updates:**

- ✉️ Email within 1-3 days
- 🔗 Track: https://chrome.google.com/webstore/devconsole
- ❌ Likely rejections: Unclear permissions, missing privacy policy
- **Rejection response: 24 hours** to reply and resubmit

---

## 2. Firefox Add-ons Store

### Requirements

| Item | Requirement | Notes |
|------|------------|-------|
| Icon | 256x256 PNG | Required; recommend 512x512 too |
| Screenshots | Multiple sizes | 1920x1080, 1365x768, 640x480 |
| Description | 10-100 words | Clear and honest |
| License | Select one | e.g., GPL-3.0 |
| Sensitive data | Declare | Notify about data handling |
| Support URL | https://... | Optional but recommended |
| Source code | Link or attached | Not required but appreciated |

### Step-by-Step

**1. Prepare Extension Package**

```bash
cd packages/browser-extension/dist/firefox
zip -r ../../wishlist-wizard-firefox-v1.0.0.zip .
cd ../../..
```

**2. Create Developer Account**

1. Go to https://addons.mozilla.org/en-US/developers
2. Sign up or click **"Register"**
3. Create Mozilla account
4. Verify email
5. Complete developer profile
   - Real name (or pseudonym)
   - Email
   - Bio (optional)

**3. Submit Add-on**

1. Dashboard → **"Submit Your First Add-on"**
2. Choose **"Upload New Add-on"**
3. Select **"On-Site Hosting"** (recommended, vs. Approval for Posting)
4. Upload ZIP: `wishlist-wizard-firefox-v1.0.0.zip`
5. Wait for automated validation (~1 minute)

**4. Fill Listing Information**

1. **Add-on name**: Wishlist Wizard
2. **Summary** (max 250 chars):
   ```
   Capture products from shopping sites and save to your 
   personal wishlist. One-click saving from Amazon, Target, 
   Walmart, eBay, and 13+ more sites.
   ```

3. **Description** (max 1000 chars):
   ```
   Wishlist Wizard makes gift planning and price tracking easy.
   
   ✓ One-click product capture from major shopping sites
   ✓ Personal wishlist with price history
   ✓ Share wishlists with friends and family
   ✓ Price drop alerts (coming soon)
   ✓ Group wishlists for events
   
   Supported sites:
   Amazon, Target, Walmart, eBay, Best Buy, Etsy, Wayfair,
   Overstock, Home Depot, Lowes, Macy's, Nordstrom, Kohl's,
   Costco, Sam's Club, and more.
   ```

4. **Category**: Shopping
5. **License**: GNU General Public License v3.0 (or your choice)
6. **Compatibility**:
   - Firefox 115+ (adjust as needed)
   - Desktop & Mobile ✓

**5. Add Graphics**

1. **Icon/Logo** (256x256 minimum, suggest 512x512):
   - Square format
   - Distinctive at all sizes
   - No text needed (shown at small sizes)

2. **Screenshots** (select display size):
   ```
   Desktop (1920x1080) - shown on desktop listing:
     - Popup interface showing product captured
     - (Any additional detail screenshots)
   
   Mobile (320x480) - shown on Firefox Mobile:
     - Responsive popup UI
   ```

   Mozilla accepts screenshots in multiple settings that display
   across device types.

3. **Previews** (optional):
   - Preview image for store banner (4:1 aspect ratio)

**6. Declare Sensitive Data Permissions**

Since extension accesses active tab and shopping site data:

```
☑ Permission: activeTab
  Why: Capture product info from current shopping page

☑ Permission: storage
  Why: Save wishlist data locally

☑ Permission: notifications
  Why: Notify user of price drops/events

⚠️ Data Privacy:
   - Extension stores data locally by default
   - Optional cloud sync requires user account
   - No data sold to advertisers
   - No tracking of browsing behavior
   - See privacy policy for details
```

**7. Review & Submit**

1. Self-review checklist:
   - ☑ Functionality is clear
   - ☑ No misleading claims
   - ☑ Privacy policy linked
   - ☑ Support contact available
   - ☑ No external dependencies (if possible)
   - ☑ Follows Mozilla [Add-on Policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)

2. Click **"Submit"**

3. Choose review track:
   - **Full Review** (7-14 days): For any extension
   - **Preliminary Review** (1-3 days): Available after history

**Status Updates:**

- 📧 Email updates as review progresses
- 🔗 Track: https://addons.mozilla.org/en-US/developers/addon/your-addon/edit
- ✓ Once approved, appears live automatically
- ❌ Rejections usually relate to policy violations (explain in app)
- **Appeal process: 5 days** to respond to concerns

---

## 3. Microsoft Edge Add-ons Store

### Requirements

| Item | Requirement | Notes |
|------|------------|-------|
| Icon | 128x128 PNG | Standard icon format |
| Screenshots | 1280x800 or 640x400 | Min 2, Max 10 |
| Description | < 100 words | User-facing |
| Privacy URL | https://... | Required for data collection |
| Support URL | https://... | Recommended |
| Short name | ≤ 50 chars | Appears in store |

### Step-by-Step

**1. Prepare Extension Package**

```bash
# Edge uses same Manifest V3 as Chrome
cp -r packages/browser-extension/dist/chrome packages/browser-extension/dist/edge
cd packages/browser-extension/dist/edge
zip -r ../../wishlist-wizard-edge-v1.0.0.zip .
cd ../../..
```

**2. Create Partner Center Account**

1. Go to https://partner.microsoft.com/en-us/dashboard/microsoftedge
2. Create Microsoft account (if needed)
3. Enroll in Edge Insider Program
4. Verify identity
5. Complete developer profile

**3. Create Extension Submission**

1. **Partners Dashboard** → **"New Package"**
2. Upload ZIP: `wishlist-wizard-edge-v1.0.0.zip`
3. Confirm manifest validation (should pass - same as Chrome)
4. Enter package details

**4. Fill Store Information**

| Field | Value |
|-------|-------|
| **Product name** | Wishlist Wizard |
| **Short name** | Wishlist Wizard (≤50 chars) |
| **Short description** | Capture products from shopping sites, save to wishlist |
| **Long description** | [Same as Chrome] |
| **Release notes** | Initial release with support for 17 shopping sites |
| **Category** | Shopping |
| **Languages** | English (United States) |
| **Privacy policy URL** | https://your-domain.com/privacy |
| **Support URL** | https://your-domain.com/support |
| **Legal notices** | [Your company/terms] |

**5. Add Images**

1. **Extension icon** (128x128 PNG)
   - Same as Chrome store
   - Clear, distinctive

2. **Screenshots** (1280x800 PNGs):
   - Popup showing product capture
   - Wishlist view in web app
   - Sharing feature

3. **Feature graphic** (1400x560 PNG, optional):
   - Promotional graphic showing extension in action

**6. Listings (Language Support)**

1. English (United States) - Required
2. Can add other languages if supported

**7. Certification**

Declare compliance:
- ☑ Does not violate Edge Add-ons Policies
- ☑ Provides honest description
- ☑ No deceptive practices
- ☑ Privacy policy disclosed
- ☑ No harmful content

**8. Submit for Review**

1. Review all information
2. Confirm images and content
3. Click **"Publish"** or **"Submit for review"**
4. Acknowledge:
   - ☑ This is my original work
   - ☑ Complies with Microsoft policies
   - ☑ No trademark violations

**Status Updates:**

- 📧 Email within 1-3 days
- 🔗 Track: https://partner.microsoft.com/en-us/dashboard/microsoftedge
- ✓ Once certified, appears in Edge Store automatically
- ❌ Common issues: Privacy policy missing, misleading claims
- **Response time: 24 hours** for rejections

---

## 4. Safari App Store

### Requirements & Architecture

**Important:** Safari extensions must be distributed as part of a native iOS/macOS app.

You cannot submit a "standalone" Safari extension. Instead:

1. Create a lightweight native app with extension
2. Submit app + extension as bundle
3. App can be minimal (just settings + extension management)

### Step-by-Step

**1. Prepare Safari Extension**

```bash
npm run build:safari
ls dist/safari/
# manifest.json, popup.html, background.js, popup.css, popup.js, ...
```

**2. Create Xcode Project**

```bash
# In separate directory
cd ~/Development
xcode-select --install  # Ensure Xcode command line tools

# Create new project
mkdir WishlistWizardSafari && cd WishlistWizardSafari
```

Using Xcode GUI:
1. File → New → Project
2. Select "iOS App" or "macOS App"
3. Product Name: "Wishlist Wizard"
4. Org Identifier: "com.yourcompany.wishlist-wizard"
5. Supports: iOS 15+ (minimum 15.0 for Safari extensions)
6. Language: Swift
7. Create Project

**3. Create Safari Extension Target**

1. File → New → Target
2. Select "Safari Web Extension"
3. Product Name: "WishlistWizardExtension"
4. Choose same team/organization
5. Finish

**4. Copy Extension Files**

```bash
# Copy built extension files to Xcode target resources
cp -r ../../../packages/browser-extension/dist/safari/* \
  WishlistWizardSafari/WishlistWizardExtension/Resources/
```

**5. Configure Extension (Info.plist)**

The auto-generated `Info.plist` should have:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.Safari.web-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).SafariWebExtensionHandler</string>
</dict>
```

**6. Update Extension Manifest (manifest.json)**

Add Safari-specific configuration:

```json
{
  "manifest_version": 3,
  "name": "Wishlist Wizard",
  "version": "1.0.0",
  "minimum_chrome_version": "120",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "*://amazon.com/*",
        "*://amazon.ca/*",
        "*://target.com/*"
      ],
      "js": ["enhanced-product-extractor.js", "content.js"],
      "run_at": "document_end"
    }
  ]
}
```

**7. Create App UI**

Add a simple settings/management view in Swift:

```swift
// WishlistWizardSafari/ContentView.swift
import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "heart.fill")
                .font(.system(size: 64))
                .foregroundColor(.red)
            
            Text("Wishlist Wizard")
                .font(.title)
                .fontWeight(.bold)
            
            Text("Your personal shopping assistant")
                .font(.subheadline)
                .foregroundColor(.gray)
            
            VStack(alignment: .leading, spacing: 12) {
                Label("One-click product capture", systemImage: "checkmark.circle")
                Label("Save to personal wishlist", systemImage: "checkmark.circle")
                Label("Share wishlists with friends", systemImage: "checkmark.circle")
                Label("Track prices and discounts", systemImage: "checkmark.circle")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(10)
            
            VStack(spacing: 8) {
                Text("To use the extension:")
                    .fontWeight(.semibold)
                
                Text("1. Open Safari settings")
                    .font(.caption)
                
                Text("2. Go to Extensions")
                    .font(.caption)
                
                Text("3. Find Wishlist Wizard")
                    .font(.caption)
                
                Text("4. Allow on visited websites")
                    .font(.caption)
            }
            .font(.caption)
            .padding()
            .background(Color(.systemYellow).opacity(0.1))
            .cornerRadius(10)
            
            Spacer()
            
            Link("Visit Our Website", 
                 destination: URL(string: "https://wishlist-wizard-dev.web.app")!)
                .buttonStyle(.bordered)
                .tint(.red)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
```

**8. Build & Test**

```bash
# Select simulator
xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Build for simulator
xcodebuild -scheme WishlistWizardSafari \
  -destination 'platform=iOS Simulator,name=iPhone 15'

# Or: Product → Build (Cmd+B) in Xcode
```

**Test in Safari:**

1. Run iOS app in simulator
2. Open Safari
3. Settings → Extensions
4. Allow Wishlist Wizard

**9. Prepare Assets for App Store**

Collect required App Store screenshots:

```
App Store Listing Images:
- App icon (1024x1024 PNG)
- iPhone 6.5" screenshots (1242x2688 PNG) - min 2, max 10
- iPad Pro 12.9" screenshots (2048x2732 PNG) - min 2, max 10
- Watch screenshots (if watchOS support)
```

Screenshot should show:
1. Extension capture feature
2. Wishlist view
3. Sharing feature

**10. Create Test Flight Build**

```bash
# Archive for build
Product → Archive (in Xcode)

# Or command line:
xcodebuild archive \
  -scheme WishlistWizardSafari \
  -archivePath ~/Desktop/WishlistWizard.xcarchive

# Then upload to TestFlight from Xcode organizer
```

**11. Submit to App Store**

1. Open Xcode Organizer (Window → Organizer)
2. Select your archive
3. Choose "Distribute App"
4. Select "App Store Connect"
5. Follow wizard:
   - Select team
   - Configure signing
   - Choose provisioning profiles
   - Review manifest
6. Submit!

Xcode will upload build to App Store Connect.

**12. Complete App Store Connect Form**

In App Store Connect (https://appstoreconnect.apple.com):

1. **App Information**
   - Name: Wishlist Wizard
   - Subtitle: Save products from 17+ shopping sites
   - Description: [Full feature description]
   - Keywords: wishlist, shopping, price tracking, gift registry
   - Support URL: https://your-domain.com/support
   - Privacy Policy: https://your-domain.com/privacy
   - Category: Shopping or Productivity

2. **App Screenshots**
   - Upload min 2 screenshots per device type
   - 1242x2688 for iPhone, 2048x2732 for iPad
   - Show extension in action

3. **Pricing & Availability**
   - Price tier: Free
   - Availability: Select regions
   - First release date: Your choice

4. **Version Information**
   - Version Number: 1.0.0
   - Build: Select your TestFlight build
   - What's New: First release with Safari extension support

5. **App Review Information**
   - Sign-in required: No (unless you have accounts)
   - Contact info: Your email
   - Demo account: N/A
   - Test notes: Extension auto-loads, click icon to open popup

6. **Ratings & Restrictions**
   - Alcohol, tobacco, gambling, etc: None
   - Medical claims: None
   - Gambling: No

7. **Content & Age**
   - Content rating: Review and select appropriate ratings
   - Likely: 4+ or 12+ (shopping app, no content concerns)

**13. Submit for Review**

1. Review all sections (✓ must be checked)
2. Click "Submit for Review"
3. Accept agreement
4. Confirm submission

**Status Updates:**

- 📧 Daily email updates on review progress (usually)
- 🔗 Track: https://appstoreconnect.apple.com
- ⏳ Review time: 1-2 days (faster than before)
- ❌ Common rejections: 
  - Privacy policy unclear
  - Minimal app UI (make sure enough content)
  - Extension bugs in review process
- **Response: 24-48 hours** to reply to reviewer

---

## Coordinating Simultaneous Submission

For best results, submit to all 4 stores roughly simultaneously:

### Timeline

**Day 1: Preparation**
```
□ Finalize all graphics (icons, screenshots)
□ Write store descriptions (localize if needed)
□ Create privacy policy document
□ Create support page
□ Build all 4 versions: npm run build:all
□ Test each locally (load unpacked)
```

**Day 2: Chrome Store (fastest review)**
```
□ Submit to Chrome Web Store
  - Typically reviewed within 1 hour to 3 days
  - This gives you a published version while others review
```

**Day 2: Firefox Add-ons (moderate review)**
```
□ Submit to Mozilla Add-ons
  - Choose "Full Review" track
  - Typically 1-7 days depending on complexity
```

**Day 2: Edge Store (parallel)**
```
□ Submit to Microsoft Edge Store
  - Usually reviewed within 1-3 days
  - Very similar process to Chrome
```

**Day 3-4: Safari (async, takes longest)**
```
□ Create Xcode project & app UI
□ Submit to App Store via App Store Connect
  - Review: 1-2 days (often same-day or next-day now)
```

### Monitoring Reviews

Create a spreadsheet to track:

```
Store       | Submit Date | Status   | Review Started | Approved? | Public Link
Chrome      | 2024-XX-XX  | Pending  | 2024-XX-XX     | ⏳ 1/3 days | -
Firefox     | 2024-XX-XX  | Pending  | 2024-XX-XX     | ⏳ 2/7 days | -
Edge        | 2024-XX-XX  | Pending  | 2024-XX-XX     | ⏳ 1/3 days | -
Safari      | 2024-XX-XX  | Pending  | 2024-XX-XX     | ⏳ 1/2 days | -
```

Daily checklist:
- [ ] Check Chrome Web Store status
- [ ] Check Mozilla Add-ons queue position
- [ ] Check Edge Partner Center
- [ ] Check App Store Connect review status
- [ ] Respond to any rejection feedback (within 24 hours)

---

## Common Rejection Reasons & Fixes

| Reason | Fix | Time |
|--------|-----|------|
| Missing privacy policy | Add link to privacy.md | 5 min |
| Unclear permissions | Explain each permission clearly | 10 min |
| Misleading description | Be honest, remove superlatives | 5 min |
| Permissions too broad | Limit hosts to actual sites only | 15 min |
| Content policy violation | Review store policies before submitting | N/A |
| Manifest errors | Validate locally first | 15 min |
| Icon too small/blurry | Use high-res source (512x512+) | 10 min |
| No support contact | Add support email/URL | 5 min |

**Resubmission strategy:**
1. Address feedback within 24 hours
2. Include response in resubmission notes
3. Request expedited review if available

---

## Post-Launch Checklist

Once all 4 stores have approved:

```
□ Update website with download links
□ Create "Install" page with store buttons
□ Set up app analytics tracking
□ Monitor user reviews & ratings  
□ Create feedback form for users
□ Plan v1.1 release (bug fixes, new features)
□ Set up automated update checks
```

---

## Download Links (Once Live)

```
🔗 Chrome Web Store:
   https://chrome.google.com/webstore/detail/[EXTENSION_ID]

🔗 Firefox Add-ons:
   https://addons.mozilla.org/en-US/firefox/addon/wishlist-wizard/

🔗 Microsoft Edge:
   https://microsoftedge.microsoft.com/addons/detail/[EXTENSION_ID]

🔗 Apple App Store:
   https://apps.apple.com/app/wishlist-wizard/id[APP_ID]
```

---

## Questions?

See:
- [BROWSER_EXTENSION_CROSS_BROWSER_BUILD.md](./BROWSER_EXTENSION_CROSS_BROWSER_BUILD.md) - Build system overview
- [BROWSER_EXTENSION_ENHANCEMENTS.md](./BROWSER_EXTENSION_ENHANCEMENTS.md) - Feature roadmap
- Chrome: https://developer.chrome.com/docs/webstore
- Firefox: https://extensionworkshop.com
- Edge: https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/
- Safari: https://developer.apple.com/safari/web-extensions/

Good luck! 🚀
