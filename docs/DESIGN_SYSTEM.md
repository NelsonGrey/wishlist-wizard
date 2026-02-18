# Wishlist Wizard Design System

## Brand Identity

### Logo
- **Primary Logo**: Green and white design located at `/icons/icon-wishlist-wizard.svg`
- **Web Logo**: Copied to `/packages/web/public/logo.svg` for web use
- **Display**: 8x8 (32px) with 2.5px margin in layouts
- **Hover Effect**: Scale transform (1.05) with smooth transition

### Color Palette

#### Primary Colors
```
Emerald 700: #047857  → Main brand color (darker, richer)
Emerald 800: #065f46  → Darkest shade for emphasis
Green 700:   #15803d  → Accent pairing
Green 800:   #166534  → Secondary dark
Teal 700:    #0f766e  → Gradient accent
```

#### Light Backgrounds
```
Emerald 50:  #ecfdf5  → Subtle background tint
Emerald 100: #d1fae5  → Hover states, cards
Green 50:    #f0fdf4  → Alternate background
Green 100:   #dcfce7  → Light accents
```

#### Gradients
```
Primary Gradient:    from-emerald-700 to-green-700
Dark Gradient:       from-emerald-800 to-green-800
Text Gradient:       from-emerald-800 to-green-800 (with bg-clip-text)
Hero Background:     from-emerald-700 via-green-700 to-teal-700
Light Background:    from-emerald-50/30 via-white to-green-50/30
Auth Background:     from-emerald-50 via-white to-green-50
```

## Typography

### Headings
- **H1 (Hero)**: `text-5xl md:text-6xl font-extrabold` with gradient
- **H1 (Pages)**: `text-4xl font-bold` with gradient text
- **H2**: `text-2xl font-bold` or `text-xl font-semibold`
- **Font Weight**: `font-bold` (700) or `font-extrabold` (800) for headings

### Body Text
- **Primary**: `text-gray-700` for readable body copy
- **Secondary**: `text-gray-600` for supporting text
- **Muted**: `text-gray-500` for metadata

### Gradient Text Pattern
```tsx
className="bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent"
```

## Layout Components

### PublicLayout (Marketing)
**Purpose**: Attract and inform potential users

**Header**:
- Background: `bg-white/95 backdrop-blur-sm` (glassmorphism)
- Border: `border-emerald-100`
- Shadow: `shadow-sm`
- Logo: Clickable to `/` (home)
- Navigation: Emerald hover states (`hover:text-emerald-700`)
- CTA Buttons: Gradient emerald background with shadows

**Background**: 
```tsx
bg-gradient-to-br from-emerald-50/30 via-white to-green-50/30
```

**Sign Up Button**:
```tsx
bg-gradient-to-r from-emerald-700 to-green-700 
hover:from-emerald-800 hover:to-green-800
shadow-md hover:shadow-lg
```

### AppLayout (Authenticated Portal)
**Purpose**: Feature-rich workspace for users

**Header**:
- Background: `bg-white` with `border-emerald-100`
- Logo: Clickable to `/dashboard`
- Active Nav State: `bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800`
- Inactive: `text-gray-700 hover:bg-emerald-50 hover:text-emerald-700`

**Background**: `bg-gray-50` (subtle gray for content areas)

### AuthLayout (Authentication)
**Purpose**: Clean, focused authentication flows

**Header**: Same glassmorphism style as PublicLayout

**Background**: 
```tsx
bg-gradient-to-br from-emerald-50 via-white to-green-50
```

**Help Link**: `text-emerald-700 hover:text-emerald-800`

## Components

### Buttons

#### Primary CTA (Gradient)
```tsx
className="px-8 py-4 bg-gradient-to-r from-emerald-700 to-green-700 
           text-white hover:from-emerald-800 hover:to-green-800 
           rounded-xl font-semibold shadow-xl hover:shadow-2xl 
           hover:scale-105 transition-all"
```

#### Secondary CTA (Ghost/Outline)
```tsx
className="px-8 py-4 bg-emerald-800/30 backdrop-blur-sm text-white 
           rounded-xl font-semibold hover:bg-emerald-800/40 
           transition-all border-2 border-white/30 hover:border-white/50"
```

#### Sign In Button (Subtle)
```tsx
className="px-5 py-2 text-gray-700 hover:text-emerald-800 
           hover:bg-emerald-50 rounded-lg font-medium transition-all"
```

### Cards

#### Icon Badge (Feature Icons)
```tsx
<div className="bg-emerald-100 w-12 h-12 flex items-center justify-center 
               rounded-full mb-4">
  <svg className="w-6 h-6 text-emerald-800" />
</div>
```

#### Checkmark List Icons
```tsx
<div className="bg-emerald-100 p-1 rounded-full">
  <svg className="w-4 h-4 text-emerald-800" fill="currentColor" />
</div>
```

### Hero Section

**Background**:
```tsx
className="relative bg-gradient-to-br from-emerald-700 via-green-700 to-teal-700 
           text-white py-24 overflow-hidden"
```

**Decorative Pattern Overlay**:
```tsx
<div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,...')] 
               opacity-40"></div>
```

**Typography**:
- Headline: `text-5xl md:text-6xl font-extrabold leading-tight`
- Accent Line: `text-emerald-100`
- Subhead: `text-xl md:text-2xl text-emerald-50 leading-relaxed`

**Hero Card**:
- Border: `border-2 border-emerald-200`
- Header: `bg-gradient-to-r from-emerald-700 to-green-700`
- Hover: `hover:scale-105 transition-transform`

## Interactive States

### Hover Effects
- **Logo**: `hover:scale-105 transition-transform duration-200`
- **Nav Links**: `hover:text-emerald-700 transition-colors`
- **Buttons**: `hover:shadow-lg transition-all`
- **Cards**: `hover:scale-105 transition-transform`

### Active States
- **Navigation**: Emerald gradient background with subtle shadow
- **Links**: `text-emerald-700 font-medium`

### Transitions
```tsx
transition-all         // For multi-property changes
transition-colors      // For color changes only
transition-transform   // For scale/translate
transition-opacity     // For fade effects

duration-200          // Fast interactions (default)
```

## Spacing & Layout

### Container
```tsx
className="container mx-auto px-4 py-8"
```

### Sections
```tsx
className="py-24"  // Hero sections
className="py-16"  // Major sections
className="py-8"   // Standard sections
```

### Gaps
```tsx
gap-4    // Buttons, small elements
gap-6    // Cards in grid
gap-8    // Major layout sections
gap-12   // Hero two-column layout
```

## Borders & Shadows

### Borders
```tsx
border-emerald-100     // Subtle borders
border-emerald-200     // More prominent borders
border-2               // Thicker emphasis borders
```

### Border Radius
```tsx
rounded-lg     // Standard cards (8px)
rounded-xl     // Buttons, larger cards (12px)
rounded-2xl    // Hero cards (16px)
rounded-full   // Icon badges, pills
```

### Shadows
```tsx
shadow-sm      // Subtle header shadow
shadow-md      // Button resting state
shadow-lg      // Button hover state
shadow-xl      // Cards, prominent elements
shadow-2xl     // Hero cards, maximum emphasis
```

## Glassmorphism

Used in headers for modern, polished look:
```tsx
bg-white/95 backdrop-blur-sm
```

## Dark Mode Support
Currently not implemented. Colors chosen for light mode only.

Future consideration: Use `dark:` variants with emerald palette adjusted for dark backgrounds.

## Accessibility

### Color Contrast
- Text on white: `text-gray-700` (AAA compliant)
- Text on emerald: Use white text for sufficient contrast
- Links: `text-emerald-700` meets AA standards on white

### Focus States
Currently relying on browser defaults. Consider adding:
```tsx
focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
```

## Usage Guidelines

### Do's ✅
- Use emerald gradients for primary CTAs and headings
- Apply hover effects to interactive elements
- Use white space generously with subtle green tints
- Maintain consistent spacing and typography hierarchy
- Use shadows to create depth and emphasis

### Don'ts ❌
- Don't mix purple/indigo with the new green palette
- Don't use flat buttons without hover states
- Don't overuse gradients (reserve for key elements)
- Don't use emerald text on emerald backgrounds
- Don't ignore the established spacing scale

## Component Inventory

### Updated Components
✅ PublicLayout (header, navigation, background)
✅ AppLayout (header, navigation, active states)
✅ AuthLayout (header, background)
✅ Hero (background, typography, CTAs, card)
✅ ExtensionPage (headings, icons, CTAs)
✅ About (headings, icons)
✅ Blog (headings, tags, CTAs, links)
✅ Recommendations (headings, icons)

### Pending Updates
⏳ Contact page
⏳ Footer (consider emerald accents)
⏳ Features component
⏳ Legal pages (Terms, Privacy, Cookie)
⏳ Dashboard pages
⏳ Form inputs and buttons (unified green theme)

## Code Patterns

### Gradient Heading
```tsx
<h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 
               bg-clip-text text-transparent mb-4">
  Your Heading
</h1>
```

### Primary CTA Link
```tsx
<Link href="/path">
  <button className="px-8 py-4 bg-gradient-to-r from-emerald-700 to-green-700 
                     text-white hover:from-emerald-800 hover:to-green-800 
                     rounded-xl font-semibold shadow-xl hover:shadow-2xl 
                     hover:scale-105 transition-all">
    Call to Action
  </button>
</Link>
```

### Feature Card with Icon
```tsx
<div className="bg-white p-6 rounded-xl shadow-lg">
  <div className="bg-emerald-100 w-12 h-12 flex items-center justify-center 
                 rounded-full mb-4">
    <Icon className="w-6 h-6 text-emerald-800" />
  </div>
  <h3 className="font-bold text-lg mb-2">Feature Title</h3>
  <p className="text-gray-600">Description text</p>
</div>
```

## Brand Voice

The emerald green palette conveys:
- **Fresh**: Modern, clean, vibrant energy
- **Growth**: Progress, improvement, development
- **Trust**: Natural, balanced, reliable
- **Optimism**: Positive, uplifting, encouraging

Perfect alignment with Wishlist Wizard's mission to help users organize and achieve their shopping goals.

---

**Last Updated**: February 18, 2026  
**Version**: 2.1 (Darker Emerald Refinement)
