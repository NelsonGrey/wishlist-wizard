# Wishlist Wizard - Code Standards & Best Practices

**Version**: 1.1
**Last Updated**: January 2025
**Owner**: Mark Nelson

---

## 📋 Overview

This document defines coding standards, style conventions, and best practices for the Wishlist Wizard project. All developers must follow these standards to maintain code quality, readability, and consistency.

---

## 🎯 Core Principles

1. **Readability**: Code should be clear and self-documenting
2. **Consistency**: Follow the same patterns and conventions everywhere
3. **Performance**: Consider performance implications of code decisions
4. **Security**: Never compromise security for convenience
5. **Maintainability**: Write code that's easy to understand and modify
6. **Testing**: All features should have test coverage
7. **Documentation**: Code, APIs, and complex logic should be documented

---

## 🔤 TypeScript Conventions

### File Organization

**File Structure for Features**:
```
features/
├── wishlist/
│   ├── components/
│   │   ├── WishlistCard.tsx
│   │   ├── WishlistForm.tsx
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useWishlists.ts
│   │   ├── useWishlist.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── wishlistService.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── wishlist.ts
│   │   └── index.ts
│   └── index.ts
```

### Naming Conventions

**Files**:
- Components: PascalCase with .tsx extension
- Hooks: camelCase with hook prefix (useXxx.ts)
- Services: camelCase with Service suffix (xxxService.ts)
- Types/Interfaces: PascalCase (Wishlist.ts)
- Constants: UPPER_SNAKE_CASE

**Examples**:
```typescript
// ✅ Correct
WishlistCard.tsx
useWishlistData.ts
priceTrackingService.ts
Wishlist.ts
API_BASE_URL

// ❌ Wrong
WishlistCard.ts (should be .tsx)
GetWishlistData.ts (hook should use useXxx)
price-tracking-service.ts (services are camelCase)
wishlist.ts (types are PascalCase)
api_base_url (constants are UPPER_SNAKE_CASE)
```

### Type Definitions

**Always Use Types**:
```typescript
// ✅ Correct - Explicit types
interface WishlistCreateRequest {
  title: string;
  description?: string;
  occasion?: Occasion;
}

function createWishlist(data: WishlistCreateRequest): Promise<Wishlist> {
  // implementation
}

// ❌ Wrong - Any types
function createWishlist(data: any): Promise<any> {
  // implementation
}
```

**Avoid `any` Types**:
```typescript
// ✅ Correct - Use unknown for error handling
try {
  await someOperation();
} catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
  console.error(errorMessage);
}

// ❌ Wrong - Using any
try {
  await someOperation();
} catch (err: any) {
  console.error(err?.message);
}
```

**Use Union Types for Flexible Date Handling**:
```typescript
// ✅ Correct - Accept both Date and string
interface SupportTicket {
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ❌ Wrong - Using any
interface SupportTicket {
  createdAt: any;
  updatedAt: any;
}
```

**Prefer Interfaces Over Types for Objects**:
```typescript
// ✅ Correct - Use interface for objects
interface User {
  id: string;
  email: string;
  displayName: string;
}

// ✅ Also fine - Type for unions
type Entity = Wishlist | Item | Collaborator;

// ❌ Avoid - Types for objects unless needed for unions
type User = {
  id: string;
  email: string;
}
```

**Use Union Types for Multiple Values**:
```typescript
// ✅ Correct
type WishlistStatus = 'active' | 'archived' | 'deleted';
type UserRole = 'owner' | 'editor' | 'viewer';

// ❌ Wrong - Using enum when union works
enum WishlistStatus {
  Active = 'active',
  Archived = 'archived',
  Deleted = 'deleted'
}
```

### Function Signatures

**Always Specify Return Types**:
```typescript
// ✅ Correct
function calculateTotal(items: WishlistItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

async function fetchWishlists(): Promise<Wishlist[]> {
  const response = await api.get('/wishlists');
  return response.data;
}

// ❌ Wrong - No return type
function calculateTotal(items: WishlistItem[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Avoid Optional Parameters in Middle of Function**:
```typescript
// ✅ Correct - Required params first
function createWishlist(
  title: string,
  userId: string,
  description?: string,
  occasion?: Occasion
): Promise<Wishlist> {
  // implementation
}

// ❌ Wrong - Optional in middle
function createWishlist(
  title: string,
  description?: string,
  userId: string,
  occasion?: Occasion
): Promise<Wishlist> {
  // implementation
}
```

---

## 🎨 React & Component Conventions

### Component Structure

```typescript
// ✅ Correct component structure

import React from 'react';
import { useEffect, useState } from 'react';
import { Wishlist } from '../types/Wishlist';
import { useWishlists } from '../hooks/useWishlists';
import { WishlistCard } from './WishlistCard';
import styles from './WishlistList.module.css';

interface WishlistListProps {
  userId: string;
  onWishlistSelect?: (wishlist: Wishlist) => void;
}

export const WishlistList: React.FC<WishlistListProps> = ({
  userId,
  onWishlistSelect,
}) => {
  const { wishlists, loading, error } = useWishlists(userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className={styles.container}>
      {wishlists.map(wishlist => (
        <WishlistCard
          key={wishlist.id}
          wishlist={wishlist}
          onClick={() => onWishlistSelect?.(wishlist)}
        />
      ))}
    </div>
  );
};
```

### Props Handling

**Always Type Props**:
```typescript
// ✅ Correct
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  children,
  ...props
}) => {
  // implementation
};

// ❌ Wrong
const Button = ({ variant, isLoading, children, ...props }) => {
  // implementation
};
```

### React Hooks

**Use Hooks Consistently**:
```typescript
// ✅ Correct
const MyComponent = () => {
  const [count, setCount] = useState(0);
  const query = useQuery('wishlist', fetchWishlist);
  const navigate = useNavigate();

  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  return <div>{count}</div>;
};

// ❌ Wrong - Hooks in if statements
const MyComponent = () => {
  if (someCondition) {
    const [count, setCount] = useState(0); // WRONG!
  }
```

### Error Boundaries

**Wrap Components with Error Boundaries**:
```typescript
// ✅ Correct - Use error boundaries for critical sections
import ErrorBoundary from '@/components/ErrorBoundary';

const MyComponent = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Component error:', error, errorInfo);
      }}
    >
      <ChildComponent />
    </ErrorBoundary>
  );
};

// ✅ Correct - Global error boundary in app root
const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* routes */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
};
```

### Loading States

**Use Loading Skeletons for Better UX**:
```typescript
// ✅ Correct - Use skeleton components
import { Skeleton, DashboardSkeleton } from '@/components/ui/loading-skeleton';

const Dashboard = () => {
  const { data, isLoading } = useDashboardData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return <div>{/* actual content */}</div>;
};

// ❌ Wrong - Simple loading text
if (isLoading) {
  return <div>Loading...</div>;
}
```

**Custom Hooks Naming**:
```typescript
// ✅ Correct - Starts with 'use'
export const useWishlists = (userId: string) => {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  // implementation
  return { wishlists };
};

// ❌ Wrong - Doesn't start with 'use'
export const fetchWishlists = (userId: string) => {
  // implementation
};
```

---

## 📐 API & Service Layer

### Service Pattern

```typescript
// ✅ Correct service structure

export class WishlistService {
  private baseUrl = '/api/wishlists';

  async getWishlists(userId: string): Promise<Wishlist[]> {
    const response = await fetch(`${this.baseUrl}?userId=${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch wishlists: ${response.statusText}`);
    }
    return response.json();
  }

  async createWishlist(data: WishlistCreateRequest): Promise<Wishlist> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create wishlist: ${response.statusText}`);
    }
    return response.json();
  }

  async updateWishlist(
    id: string,
    data: Partial<Wishlist>
  ): Promise<Wishlist> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to update wishlist: ${response.statusText}`);
    }
    return response.json();
  }

  async deleteWishlist(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete wishlist: ${response.statusText}`);
    }
  }
}
```

### Error Handling

```typescript
// ✅ Correct error handling

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): never => {
  if (error instanceof ApiError) {
    console.error(`[${error.code}] ${error.message}`);
    throw error;
  }

  if (error instanceof TypeError) {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
  }

  throw new ApiError(500, 'UNKNOWN_ERROR', 'An unknown error occurred');
};

// Usage
try {
  const wishlists = await wishlistService.getWishlists(userId);
} catch (error) {
  handleApiError(error);
}
```

---

## 🎯 Input Validation

### Use Zod for Schema Validation

```typescript
// ✅ Correct - Use Zod schemas

import { z } from 'zod';

export const WishlistSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  occasion: z
    .object({
      type: z.enum(['birthday', 'holiday', 'wedding', 'other']),
      targetDate: z.coerce.date(),
    })
    .optional(),
});

export type WishlistInput = z.infer<typeof WishlistSchema>;

// In components
const handleCreateWishlist = async (formData: unknown) => {
  try {
    const validData = WishlistSchema.parse(formData);
    await wishlistService.createWishlist(validData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      showValidationErrors(error.errors);
    }
  }
};

// ❌ Wrong - Manual validation
const handleCreateWishlist = (formData: any) => {
  if (!formData.title || formData.title.length === 0) {
    showError('Title is required');
    return;
  }
  if (formData.title.length > 255) {
    showError('Title is too long');
    return;
  }
  // More manual checks...
};
```

---

## 🔐 Security Practices

### Never Expose Sensitive Data

```typescript
// ✅ Correct - Sanitized error messages
try {
  await apiCall();
} catch (error) {
  console.error('Internal error:', error); // Log details
  throw new Error('An error occurred. Please try again.'); // Show user
}

// ❌ Wrong - Exposing sensitive info
try {
  await apiCall();
} catch (error) {
  throw new Error(`API failed: ${error.message}`); // Could expose tokens, IPs, etc.
}
```

### Input Sanitization

```typescript
// ✅ Correct - Sanitize user input
import DOMPurify from 'dompurify';

const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] });
};

// For text content, React escapes automatically
const renderUserComment = (comment: string) => {
  return <div>{comment}</div>; // Safe from XSS
};

// ❌ Wrong - Dangerous
const renderUserComment = (comment: string) => {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />; // XSS risk!
};
```

### Environment Variables

```typescript
// ✅ Correct - Use environment file
// .env.local (git ignored)
NEXT_PUBLIC_API_URL=https://api.wishlist-wizard.com
API_SECRET_KEY=secret_key_here

// In code
const apiUrl = process.env.NEXT_PUBLIC_API_URL!;
const secretKey = process.env.API_SECRET_KEY; // Server-side only

// ❌ Wrong - Hardcoded values
const API_URL = 'https://api.wishlist-wizard.com';
const SECRET = 'hardcoded_secret';
```

---

## 📝 Documentation

### Code Comments

**Use JSDoc for Public APIs**:
```typescript
// ✅ Correct - JSDoc comments

/**
 * Creates a new wishlist for the current user.
 *
 * @param {WishlistCreateRequest} data - Wishlist data to create
 * @returns {Promise<Wishlist>} The created wishlist
 * @throws {ApiError} If creation fails
 *
 * @example
 * const wishlist = await wishlistService.createWishlist({
 *   title: 'My Birthday',
 *   occasion: { type: 'birthday', targetDate: new Date('2024-03-15') }
 * });
 */
export async function createWishlist(
  data: WishlistCreateRequest
): Promise<Wishlist> {
  // implementation
}

// ✅ Explain why, not what
const total = items.filter(item => !item.purchased).length;
// Filter out purchased items because users shouldn't see completed items by default

// ❌ Pointless comments
const total = items.length; // Get items length
items.forEach(item => {
  // Loop through items
  console.log(item);
});
```

### README for Features

Create a README.md in each major feature folder:
```markdown
# Wishlist Feature

## Overview
Manages user wishlists and their items.

## Components
- WishlistList: Display all user wishlists
- WishlistCard: Individual wishlist preview
- WishlistForm: Create/edit wishlist

## Hooks
- useWishlists: Fetch all wishlists
- useWishlist: Fetch single wishlist
- useWishlistMutation: Create/update/delete operations

## Services
- WishlistService: API calls for wishlist operations

## Usage
See examples in `__stories__` folder
```

---

## 🧪 Testing Standards

### Test Organization

```
features/wishlist/__tests__/
├── unit/
│   ├── wishlistService.test.ts
│   ├── useWishlists.test.ts
│   └── WishlistCard.test.tsx
├── integration/
│   └── wishlistFlow.test.ts
└── e2e/
    └── wishlist.e2e.spec.ts
```

### Test Naming

```typescript
// ✅ Correct - Descriptive test names
describe('WishlistService', () => {
  describe('createWishlist', () => {
    it('should create a new wishlist with valid data', async () => {
      // test
    });

    it('should throw error if title is empty', async () => {
      // test
    });

    it('should set shareId for public wishlists', async () => {
      // test
    });
  });
});

// ❌ Wrong - Vague names
describe('wishlist', () => {
  it('works', () => {
    // test
  });

  it('fails', () => {
    // test
  });
});
```

---

## 🎨 Code Style

### Formatting

**Use Prettier** for automatic formatting:
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### Linting

**Use ESLint** with recommended rules:
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'next/core-web-vitals',
  ],
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
```

### Import Organization

```typescript
// ✅ Correct import order

// 1. External packages
import React from 'react';
import { useEffect } from 'react';
import { z } from 'zod';

// 2. Absolute imports from same project
import { Wishlist } from '@/types';
import { useWishlist } from '@/hooks';

// 3. Relative imports
import { WishlistCard } from './WishlistCard';
import styles from './WishlistList.module.css';

// Then the component
export const WishlistList = () => {
  // ...
};
```

---

## 🚫 Common Anti-patterns

### Avoid

```typescript
// ❌ Unnecessary destructuring
const { wishlists } = await getWishlists();
return wishlists.map(w => w);

// ✅ Direct return
return await getWishlists();

// ❌ Unnecessary if-else
if (isLoading) return <div>Loading...</div>;
else return <div>Content</div>;

// ✅ Use guard clause
if (isLoading) return <div>Loading...</div>;
return <div>Content</div>;

// ❌ Unnecessary arrow function
<button onClick={() => navigate('/home')}>Home</button>

// ✅ Pass function directly
<button onClick={() => navigate('/home')}>Home</button>
// (Actually fine in this case, but avoid unnecessary wrappers)

// ❌ Don't mix async/await with .then()
const data = await promise.then(r => r.data);

// ✅ Use async/await consistently
const response = await promise;
const data = response.data;
```

---

## ✅ Pre-commit Checklist

Before committing code:
- [ ] Code follows style guide (ESLint/Prettier pass)
- [ ] All tests pass (`npm test`)
- [ ] No console.log() statements left
- [ ] No hardcoded secrets or API keys
- [ ] TypeScript compiles without errors
- [ ] Comments explain 'why', not 'what'
- [ ] Functions have return types
- [ ] Props are typed
- [ ] Error handling implemented
- [ ] Accessibility (a11y) considered

---

## 📚 Related Documentation

- [Testing Strategy](TESTING_STRATEGY.md)
- [Development Workflow](DEVELOPMENT_WORKFLOW.md)
- [System Architecture](SYSTEM_ARCHITECTURE.md)

