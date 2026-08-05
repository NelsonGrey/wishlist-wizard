# Layout Usage Reference Guide

Quick reference for developers working with the three distinct layouts in Wishlist Wizard.

## Which Layout Should I Use?

### PublicLayout - Marketing Website
Use when creating pages that **educate or promote** to potential users.

**Examples:**
- Landing pages
- Feature explanations
- Company information
- Blog posts
- Legal/policy pages
- Getting started guides

**Key Features:**
- Marketing-focused header with navigation links
- Sign In / Sign Up buttons
- Company footer with resources
- White background, ample whitespace

**Typical User:** Visitor discovering the product

---

### AuthLayout - Authentication Portal
Use when users need to **manage their account** (login, register, password reset).

**Examples:**
- Login page
- Registration page
- Forgot password page
- Reset password page  
- Email verification page

**Key Features:**
- Centered form (max-width 448px)
- Gradient background
- Minimal header with logo and help link
- No navigation distractions
- Footer with legal links

**Typical User:** New or returning user managing account authentication

---

### AppLayout - Authenticated Application
Use when displaying **features and tools** for authenticated users.

**Examples:**
- Dashboard
- Wishlist management
- Recommendations engine
- Price tracking
- Calendar view
- Settings and preferences
- Analytics and insights
- Any authenticated user feature

**Key Features:**
- Rich navigation bar with app features
- User profile dropdown
- Active page indicators
- Notifications
- Mobile responsive menu
- Full-featured sidebar/navigation

**Typical User:** Authenticated user actively using the application

---

## Layout Routing Logic

The `LayoutRouter` component in `AppRouter.tsx` automatically selects layouts based on URL patterns:

### Authentication Pages → AuthLayout
```
/login
/register
/forgot-password
/reset-password
/verify-email
```

### Application Pages → AppLayout
```
/dashboard
/recommendations
/price-tracking
/calendar
/notifications
/user-profile
/privacy-settings
/analytics
/wishlist/*
/shared/*
```

### All Other Pages → PublicLayout
```
/
/extension
/about
/blog
/contact
/terms
/privacy-policy
/cookie-policy
```

---

## Adding a New Page

### Step 1: Create the Page Component
```typescript
// pages/MyNewPage.tsx
import React from 'react';
import { Helmet } from 'react-helmet';

export default function MyNewPage() {
  return (
    <>
      <Helmet>
        <title>My New Page | Wishlist Wizard</title>
        <meta name="description" content="Description..." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-8">
          My New Page
        </h1>
        {/* Page content */}
      </div>
    </>
  );
}
```

### Step 2: Import and Register Route
Open `AppRouter.tsx`:
```typescript
import MyNewPage from './pages/MyNewPage';

// Inside the Switch in LayoutRouter:
<Route path="/my-new-page" component={MyNewPage} />
```

### Step 3: Determine and Register Layout Category
Add the route pattern to the appropriate list in `LayoutRouter`:

**For a Marketing Page:**
```typescript
const publicPages = [
  '/',
  '/extension',
  // ... existing pages
  '/my-new-page'  // ← Add here
];
```

**For an Auth Page:**
```typescript
const authPages = [
  '/login',
  '/register',
  // ... existing pages
  '/my-new-page'  // ← Add here
];
```

**For an App Page:**
```typescript
const appPages = [
  '/dashboard',
  '/recommendations',
  // ... existing pages
  '/my-new-page'  // ← Add here
];
```

### Step 4: Done!
The correct layout is automatically applied based on the route pattern. ✓

---

## Component Structure

### PublicLayout
```
<PublicLayout>
  ├── Header (PublicHeader)
  │   ├── Logo → /
  │   ├── Navigation (Home, How It Works, About, Blog)
  │   └── Sign In / Sign Up buttons
  ├── Main Content
  │   └── Your page component
  └── Footer
      ├── Company Info
      ├── Legal Links
      └── Contact
```

### AuthLayout
```
<AuthLayout>
  ├── Header (AuthHeader)
  │   ├── Logo → /
  │   └── Help/Contact link
  ├── Main Content
  │   └── Your centered form (max-w-md)
  │       └── Page component
  └── Footer
      ├── Legal Links
      └── Contact
```

### AppLayout
```
<AppLayout>
  ├── Header (AppHeader)
  │   ├── Logo → /
  │   ├── Navigation (Home, Recommendations, Price Tracking, Calendar)
  │   ├── Notifications bell
  │   └── User Profile Dropdown
  │       ├── Profile
  │       ├── Settings
  │       └── Logout
  ├── Main Content
  │   └── Your page component
  └── Footer
      ├── Company Info
      ├── Legal Links
      └── Contact
```

---

## CSS Patterns

All pages follow consistent CSS patterns for uniformity:

### Page Container
```typescript
<div className="container mx-auto px-4 py-8">
  {/* Page content */}
</div>
```

### Page Headings
```typescript
<h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent mb-8">
  Page Title
</h1>
```

### Forms (in Auth Pages)
AuthLayout provides centered form styling. Just add your form content:
```typescript
<form className="space-y-4">
  <input className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
  {/* Form fields */}
</form>
```

### Feature Cards
```typescript
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="font-bold mb-2">Feature Name</h3>
    <p className="text-gray-600">Feature description</p>
  </div>
  {/* More cards */}
</div>
```

---

## Navigation Between Layouts

Users naturally flow through all three layouts:

### User Journey Example
1. **Visitor lands on `/`** (PublicLayout)
   - Sees marketing message and Sign Up button
   
2. **Clicks "Sign Up"** → navigates to `/register` (AuthLayout)
   - Fills registration form
   - Creates account
   
3. **Auth service redirects to `/dashboard`** (AppLayout)
   - User logged in
   - Sees full feature set
   - Can navigate between app pages

4. **Logout** → returns to **PublicLayout**
   - User sees Sign In button again

---

## Common Tasks

### Linking to Different Sections
```typescript
import { Link } from 'wouter';

// Link within same layout
<Link href="/recommendations">View Recommendations</Link>

// Link to auth page
<Link href="/login">Sign In</Link>

// Link to home (public)
<Link href="/">Home</Link>

// Link from auth to app (after login, auth redirects)
// After authentication, redirect with:
// window.location.href = '/dashboard';
// or use auth service redirect
```

### Adding New Navigation Items
If the layout needs new navigation items, edit the appropriate layout file:
- **PublicLayout.tsx** - for marketing navigation
- **AppLayout.tsx** - for app features
- **AuthLayout.tsx** - for auth help links

### Styling for Mobile
All layouts use Tailwind's responsive utilities (`md:`, `lg:`, etc.):
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

---

## Testing Layouts

### Manual Testing Checklist
- [ ] Public pages show with PublicLayout (logo, nav, sign in buttons, footer)
- [ ] Auth pages show with AuthLayout (centered form, gradient background)
- [ ] App pages show with AppLayout (dashboard nav, user dropdown, notifications)
- [ ] Clicking logo from any page goes to home (/)
- [ ] Responsive: test on mobile (< 768px), tablet, desktop

### Quick Layout Test URLs
```
# Public Layout
http://localhost:5173/
http://localhost:5173/about
http://localhost:5173/blog

# Auth Layout  
http://localhost:5173/login
http://localhost:5173/register

# App Layout
http://localhost:5173/dashboard
http://localhost:5173/recommendations
```

---

## Troubleshooting

### Page shows wrong layout
1. Check that route is added to AppRouter
2. Verify route pattern exists in LayoutRouter's appropriate list
3. Patterns are matched sequentially - be specific with paths
4. Example: `/dashboard` before `/dashboard-firebase`

### Header/Footer looks wrong
1. Confirm you're on the correct page type
2. Check that layout import is correct
3. Verify you're using the right `<Link>` component (wouter)
4. Check for CSS conflicts in component

### Navigation doesn't work
1. Use `<Link href="/path">` not `<a href="/path">`
2. Don't include domain in href
3. Use relative paths: `/page` not `./page`

---

## Layout Feature Matrix

| Feature | Public | Auth | App |
|---------|--------|------|-----|
| Marketing content | ✓ | ✗ | ✗ |
| Sign In/Sign Up buttons | ✓ | ✗ | ✗ |
| Centered form | ✗ | ✓ | ✗ |
| Full navigation | ✗ | ✗ | ✓ |
| User dropdown | ✗ | ✗ | ✓ |
| Notifications | ✗ | ✗ | ✓ |
| Footer | ✓ | ✓ | ✓ |
| Gradient background | ✗ | ✓ | ✗ |

---

## Resources

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Detailed architecture explanation
- [AppRouter.tsx](../packages/web/client-src/AppRouter.tsx) - Routing logic and layout selection
- [PublicLayout.tsx](../packages/web/client-src/components/layout/PublicLayout.tsx) - Marketing layout
- [AuthLayout.tsx](../packages/web/client-src/components/layout/AuthLayout.tsx) - Auth layout
- [AppLayout.tsx](../packages/web/client-src/components/layout/AppLayout.tsx) - App layout
