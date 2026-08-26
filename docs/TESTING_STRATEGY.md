# Wishlist Wizard - Testing Strategy & Guidelines

**Version**: 1.2
**Last Updated**: 2026-08-12
**Owner**: Mark Nelson

---

## 📋 Overview

This document outlines the testing strategy, best practices, and guidelines for the Wishlist Wizard project. Testing is crucial for ensuring code quality, preventing regressions, and maintaining reliability across all platforms.

### Testing Goals

1. **Quality**: Catch bugs before they reach production
2. **Confidence**: Enable safe refactoring and feature development
3. **Documentation**: Tests serve as executable documentation
4. **Regression Prevention**: Prevent previously fixed bugs from recurring
5. **Performance**: Catch performance regressions early

### Recent Testing Updates (January 2025)

**New Components Requiring Tests**:
- iOS Password Reset Flow (ForgotPasswordScreen, resetPassword service)
- iOS Price Tracking UI (PriceTrackingScreen, custom chart painter)
- iOS Social Sharing (SocialShareService, platform-specific handlers)
- iOS Error Boundaries (ErrorBoundary widget)
- iOS Loading Skeletons (LoadingSkeleton widgets)
- Website Error Boundaries (enhanced ErrorBoundary component)
- Website Loading Skeletons (comprehensive skeleton components)

**Type Safety Improvements**:
- Eliminated `any` types across admin and component files
- Replaced with proper TypeScript types (unknown for errors, Date | string for dates)
- Improved error handling patterns with type guards

---

## 🎯 Testing Pyramid

```
        △
       /|\
      / | \  E2E Tests (10%)
     /  |  \ UI, user journeys, critical paths
    /─────────\
   /   |   \  Integration Tests (30%)
  / │   |   \ │ Features, APIs, workflows
 /─────────────\
/     |       \ Unit Tests (60%)
─────────────── Logic, utilities, components
```

### Coverage Goals

| Layer | Target | Tools |
|-------|--------|-------|
| **Unit** | 80%+ | Vitest, React Testing Library |
| **Integration** | 60%+ | firebase-functions-test, Firebase Emulator, Vitest |
| **E2E** | 40%+ | Playwright (optional) |
| **Total** | 70%+ | Coverage reports |

---

## 🧪 Unit Testing

### Backend Unit Tests

**Technology**: Vitest + firebase-functions-test  
**File Pattern**: `*.test.ts`

**Example Service Test**:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserWishlists } from '../../src/api/wishlists';
import firebaseFunctionsTest from 'firebase-functions-test';

describe('getUserWishlists', () => {
  const testEnv = firebaseFunctionsTest();
  const wrapped = testEnv.wrap(getUserWishlists);

  it('should require authentication', async () => {
    await expect(wrapped({})).rejects.toThrow(/unauthenticated/i);
  });
});
```

### Frontend Component Unit Tests

**Technology**: Vitest + React Testing Library  
**File Pattern**: `*.test.tsx`

**Example Component Test**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WishlistCard } from '../WishlistCard';
import { Wishlist } from '../types';

describe('WishlistCard', () => {
  const mockWishlist: Wishlist = {
    id: 'wishlist_123',
    name: 'Birthday Party',
    description: 'Things I want',
    itemCount: 12,
    createdAt: new Date(),
  };

  it('should render wishlist title and item count', () => {
    render(<WishlistCard wishlist={mockWishlist} />);

    expect(screen.getByText('Birthday Party')).toBeInTheDocument();
    expect(screen.getByText(/12 items/i)).toBeInTheDocument();
  });

  it('should call onClick handler when card is clicked', () => {
    const handleClick = vi.fn();
    render(
      <WishlistCard wishlist={mockWishlist} onClick={handleClick} />
    );

    fireEvent.click(screen.getByRole('button', { name: /birthday party/i }));

    expect(handleClick).toHaveBeenCalledWith(mockWishlist);
  });

  it('should display loading skeleton when isLoading is true', () => {
    const { rerender } = render(
      <WishlistCard wishlist={mockWishlist} isLoading={false} />
    );

    expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument();

    rerender(<WishlistCard wishlist={mockWishlist} isLoading={true} />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
```

### Hook Testing

**Example Hook Test**:
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWishlists } from '../hooks/useWishlists';

describe('useWishlists', () => {
  it('should fetch wishlists on mount', async () => {
    const { result } = renderHook(() => useWishlists('user_123'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.wishlists).toHaveLength(3);
  });

  it('should handle fetch errors', async () => {
    vi.mock('../services/wishlistService', () => ({
      getWishlists: vi.fn().mockRejectedValueOnce(
        new Error('API Error')
      ),
    }));

    const { result } = renderHook(() => useWishlists('user_123'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('API Error');
    });
  });

  it('should refetch wishlists when refetch is called', async () => {
    const { result } = renderHook(() => useWishlists('user_123'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);
  });
});
```

---

## 🔗 Integration Testing

### Firebase Functions Integration Tests

**Technology**: firebase-functions-test + Firebase Emulator  
**File Pattern**: `*.integration.test.ts`

**Example Callable Test**:
```typescript
import { describe, it, expect } from 'vitest';
import firebaseFunctionsTest from 'firebase-functions-test';
import { createWishlist } from '../../src/api/wishlists';

const testEnv = firebaseFunctionsTest();
const wrapped = testEnv.wrap(createWishlist);

describe('createWishlist', () => {
  it('should reject unauthenticated calls', async () => {
    await expect(wrapped({ name: 'Birthday' })).rejects.toThrow(/unauthenticated/i);
  });
});
```

### Feature Integration Tests

**Example Feature Test**:
```typescript
import { describe, it, expect } from 'vitest';
import firebaseFunctionsTest from 'firebase-functions-test';
import { createWishlist, addWishlistItem } from '../../src/api/wishlists';

const testEnv = firebaseFunctionsTest();
const createWishlistWrapped = testEnv.wrap(createWishlist);
const addWishlistItemWrapped = testEnv.wrap(addWishlistItem);

describe('Wishlist item flow', () => {
  it('should reject unauthenticated calls', async () => {
    await expect(createWishlistWrapped({ name: 'Birthday' }))
      .rejects.toThrow(/unauthenticated/i);
    await expect(addWishlistItemWrapped({ wishlistId: 'x', title: 'Item' }))
      .rejects.toThrow(/unauthenticated/i);
  });
});
```

---

## 🌐 E2E Testing

### Browser Testing Strategy

**Technology**: Playwright (optional)  
**File Pattern**: `*.e2e.spec.ts`

**Example E2E Test**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Wishlist Creation & Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should create and edit a wishlist', async ({ page }) => {
    // Create
    await page.click('[data-testid="create-wishlist-button"]');
    await page.fill('[data-testid="title-input"]', 'Summer Vacation');
    await page.fill('[data-testid="description-input"]', 'Things for my trip');
    await page.click('[data-testid="create-button"]');

    // Verify creation
    await expect(
      page.locator('[data-testid="wishlist-title"]', {
        hasText: 'Summer Vacation',
      })
    ).toBeVisible();

    // Edit
    await page.click('[data-testid="edit-button"]');
    await page.fill('[data-testid="title-input"]', 'Summer 2024 Vacation');
    await page.click('[data-testid="save-button"]');

    // Verify edit
    await expect(
      page.locator('[data-testid="wishlist-title"]', {
        hasText: 'Summer 2024 Vacation',
      })
    ).toBeVisible();
  });

  test('should share wishlist publicly', async ({ page, browser }) => {
    // Find wishlist
    await page.click('[data-testid="wishlist-card"]:nth-child(1)');

    // Get share link
    await page.click('[data-testid="share-button"]');
    const shareLink = await page.inputValue('[data-testid="share-link-input"]');

    // Open in new context (as public user)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    await newPage.goto(shareLink);

    // Verify shared wishlist is visible
    await expect(
      newPage.locator('[data-testid="wishlist-title"]')
    ).toBeVisible();
    await expect(newPage.locator('[data-testid="items-list"]')).toBeVisible();

    await newContext.close();
  });

  test('should handle mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('[data-testid="menu-button"]');
    await expect(
      page.locator('[data-testid="create-wishlist-button"]')
    ).toBeVisible();

    await page.click('[data-testid="create-wishlist-button"]');
    // Rest of test...
  });
});
```

### Cross-Platform Testing

**Mobile Testing**:
```typescript
import { test } from '@playwright/test';

test.describe('Mobile App Flow', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should add item from browser extension', async ({ page }) => {
    // Simulate browser extension environment
    await page.goto('https://amazon.com/dp/B000FAKE');

    // Trigger extension
    await page.evaluate(() => {
      window.postMessage({
        type: 'EXTENSION_INIT',
        payload: { productUrl: window.location.href },
      }, '*');
    });

    // Verify wishlist appears
    await expect(page.locator('[data-testid="wishlist-selector"]')).toBeVisible();
  });
});
```

---

## 🏗️ Testing Setup & Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Environment Setup

```typescript
// test/setup.ts
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

---

## 📊 Coverage Requirements

### By Feature

```
Core Features (100% coverage required):
- Authentication
- Basic CRUD operations
- Authorization checks

High Priority Features (80%+):
- Price tracking
- Notifications
- Sharing

Standard Features (70%+):
- UI components
- Forms
- Dashboards

Low Priority (60%+):
- Analytics
- Reporting pages
```

### Coverage Commands

```bash
# Run tests with coverage
npm run test:coverage

# Generate detailed HTML report
npm run test:coverage -- --html

# Check coverage thresholds
npm run test:coverage -- --threshold=80
```

---

## 🔄 Testing Best Practices

### Do's

✅ **Do**:
- Write descriptive test names that explain intent
- Test behavior, not implementation
- Use meaningful assertions
- Create test data factories for complex objects
- Test error cases as thoroughly as happy paths
- Keep tests isolated and independent
- Mock external dependencies
- Use constants, not magic numbers
- Clean up after tests

### Don'ts

❌ **Don't**:
- Test implementation details
- Use `setTimeout` for synchronization (use `waitFor`)
- Test multiple things in one test
- Create interdependent tests
- Use flaky selectors (prefer `data-testid`)
- Commit tests to skip (.skip)
- Ignore test failures
- Test frameworks, only your code

---

## 🚀 CI/CD Testing

### Test Stages

```yaml
# GitHub Actions example
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'

    # Stage 1: Lint & Type Check
    - run: npm run lint
    - run: npm run type-check

    # Stage 2: Unit Tests
    - run: npm run test:unit -- --coverage

    # Stage 3: Integration Tests
    - run: npm run test:integration

    # Stage 4: E2E Tests
    - run: npm run test:e2e

    # Stage 5: Coverage Report
    - uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json
```

---

## 📚 Test Documentation Templates

### Test Naming Convention

```typescript
describe('[Component/Function Name]', () => {
  describe('[Method/Behavior]', () => {
    it('should [expected outcome] when [condition]', () => {
      // test
    });
  });
});
```

### Example

```typescript
describe('WishlistService.createWishlist', () => {
  describe('with valid input', () => {
    it('should create wishlist and return it', async () => {});
    it('should generate unique shareId for public wishlists', async () => {});
    it('should set current timestamp for createdAt', async () => {});
  });

  describe('with invalid input', () => {
    it('should throw validation error if title is empty', async () => {});
    it('should throw error if occasion targetDate is in past', async () => {});
  });
});
```

---

## ✅ Pre-Release Testing Checklist

- [ ] All unit tests pass with 80%+ coverage
- [ ] All integration tests pass
- [ ] E2E tests pass on Chrome, Firefox, Safari
- [ ] Mobile viewport tests pass
- [ ] No flaky tests
- [ ] Performance tests pass (< 3s page load)
- [ ] Accessibility audit passed
- [ ] Manual testing on staging environment
- [ ] Security scanning completed
- [ ] Load testing completed

---

## 📚 Related Documentation

- [Code Standards](CODE_STANDARDS.md)
- [Development Workflow](DEVELOPMENT_WORKFLOW.md)
- [System Architecture](SYSTEM_ARCHITECTURE.md)

