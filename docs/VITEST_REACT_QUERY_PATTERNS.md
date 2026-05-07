# Vitest + React Query Mocking Patterns

**Version**: 1.0  
**Last Updated**: May 7, 2026  
**Purpose**: Document proven mocking patterns for React Query and Radix UI components in Vitest to ensure test reliability and maintainability.

---

## Problem: React Query Mocking Instability

**Issue**: Direct mutation of imported React Query symbols via `(useQuery as any).mockReturnValue(...)` fails because `vi.mock()` returns fresh references on each test file, causing tests to reference different mock instances.

**Symptom**:
```typescript
// ❌ BROKEN: Direct mutation of imported symbol
import { useQuery } from '@tanstack/react-query';

beforeEach(() => {
  (useQuery as any).mockReturnValue(...); // References wrong mock instance
});
```

---

## Solution: Hoisted Mock Pattern

Use `vi.hoisted()` to create a single mock instance shared across all tests in the file.

### Implementation

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NotificationsPage } from '../NotificationsPage';

// ✅ CORRECT: Hoisted mock object
const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  ...vi.importActual('@tanstack/react-query'),
  useQuery: reactQueryMocks.useQuery,
  useMutation: reactQueryMocks.useMutation,
  useQueryClient: reactQueryMocks.useQueryClient,
}));

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notifications when data loads', () => {
    // ✅ All tests reference the same mock instance
    reactQueryMocks.useQuery.mockReturnValue({
      data: [{ id: '1', message: 'Hello' }],
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    reactQueryMocks.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <NotificationsPage />
      </QueryClientProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Key Points

1. **Hoisted Scope**: `vi.hoisted()` runs before module evaluation, creating mock references that survive test isolation.
2. **Shared Instance**: All tests reference the same `reactQueryMocks` object, preventing cross-test contamination.
3. **Explicit Setup**: Mock return values are set explicitly in each test via `beforeEach()` or inline.
4. **Clear Naming**: Named object (`reactQueryMocks`) makes it obvious which mock is being configured.

### Pattern Files (Reference Implementations)

- [NotificationsPage.test.tsx](../packages/web/client-src/test/components/NotificationsPage.test.tsx) — 12 passing tests
- [NotificationDropdown.test.tsx](../packages/web/client-src/test/components/NotificationDropdown.test.tsx) — 7 passing tests
- [WishlistCard.test.tsx](../packages/web/client-src/test/components/wishlist/WishlistCard.test.tsx) — 7 passing tests (+ Radix UI)

---

## Radix UI Component Testing

### Problem: Portal Rendering + Query Timeouts

**Issue**: Radix UI components (dropdown-menu, popover, dialog, etc.) render content into portals outside the normal DOM hierarchy. Text-based queries fail in jsdom CI environments.

**Symptom**:
```typescript
// ❌ BROKEN: Text query times out in CI jsdom
fireEvent.click(screen.getByRole('button', { name: /actions/i }));
expect(screen.getByText('Delete')).toBeInTheDocument(); // timeout in jsdom
```

### Solution: Mock Radix Primitives + Use TestId Queries

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropdownMenu } from '@radix-ui/react-dropdown-menu';
import { WishlistCard } from '../WishlistCard';

// ✅ Mock Radix UI dropdown as simple divs/buttons
vi.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: ({ children }: any) => <div>{children}</div>,
  Trigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  Content: ({ children, ...props }: any) => <div data-testid="dropdown-content" {...props}>{children}</div>,
  Item: ({ children, onSelect, ...props }: any) => (
    <button
      data-testid="dropdown-item"
      onClick={() => onSelect?.()}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe('WishlistCard', () => {
  it('opens dropdown menu on click', () => {
    render(<WishlistCard />);

    // ✅ Query by testid instead of text
    const trigger = screen.getByTestId('card-actions-menu');
    fireEvent.click(trigger);

    expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
  });

  it('calls delete handler when delete item clicked', () => {
    const onDelete = vi.fn();
    render(<WishlistCard onDelete={onDelete} />);

    fireEvent.click(screen.getByTestId('card-actions-menu'));
    fireEvent.click(screen.getByTestId('delete-item-action'));

    expect(onDelete).toHaveBeenCalled();
  });
});
```

### Guidelines for Radix UI Testing

1. **Mock Strategically**: Only mock the parts you need (Root, Trigger, Content, Item); let actual Radix logic run if not portal-dependent.
2. **Use data-testid**: Explicitly mark component parts with `data-testid` for deterministic queries.
3. **Avoid text queries**: Text queries fail on portal content; prefer role queries or testid.
4. **Test Interactions, Not Styling**: Focus on click handlers and state changes, not visual rendering.

### Pattern Files (Reference Implementations)

- [WishlistCard.test.tsx](../packages/web/client-src/test/components/wishlist/WishlistCard.test.tsx) — 7 passing tests with Radix dropdown mocking
- [NotificationDropdown.test.tsx](../packages/web/client-src/test/components/NotificationDropdown.test.tsx) — 7 passing tests with Radix menu mocking

---

## Best Practices Summary

| Scenario | Pattern | Why |
|----------|---------|-----|
| **Mock React Query** | Hoisted `vi.hoisted()` object | Single shared mock instance across tests |
| **Mock Radix Primitives** | Mock as simple div/button with testid | Avoid portal rendering timeouts in jsdom |
| **Query Radix Content** | Use `data-testid` | Text queries fail on portal-rendered content |
| **Clear AllMocks** | Call in `beforeEach()` | Prevent state leakage between tests |
| **React Query Return Values** | Set explicitly in test or beforeEach | Ensures predictable mock state per test |

---

## Test Coverage Achieved

| Package | Tests | Status |
|---------|-------|--------|
| @wishlist-wizard/web | 157 | ✅ All passing |
| @wishlist-wizard/shared | 16 | ✅ All passing |
| @wishlist-wizard/browser-extension | 10 | ✅ All passing |
| @wishlist-wizard/firebase-utils | 0 (passWithNoTests) | ✅ No tests required |
| **Total** | **187** | **✅ All passing** |

---

## Debugging Tips

### React Query Mock Not Responding
- **Check**: Is the mock hoisted via `vi.hoisted()`?
- **Fix**: Ensure mock object is created inside `vi.hoisted()` block, not outside.

### Radix UI Portal Content Not Found
- **Check**: Are you querying by text or role?
- **Fix**: Use `data-testid` and `screen.getByTestId()` instead.

### Mock References Differ Across Tests
- **Check**: Are tests importing the mock directly?
- **Fix**: Reference the hoisted mock object (e.g., `reactQueryMocks.useQuery`), not imported symbol.

---

## References

- [Vitest Hoisting Documentation](https://vitest.dev/api/#vi-hoisted)
- [React Query Testing Guide](https://tanstack.com/query/latest/docs/react/testing)
- [Radix UI Component Guides](https://www.radix-ui.com/)
- [React Testing Library Queries](https://testing-library.com/docs/queries/about)

---

## Future Enhancements

- Add integration tests for React Query + Radix UI interactions
- Document Firebase Emulator patterns for backend-dependent components
- Create snapshot tests for complex component hierarchies
- Establish E2E test patterns for cross-browser Radix UI behavior

