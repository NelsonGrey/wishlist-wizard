# Web Navigation & Layout QA Checklist

Use this checklist before merge/deploy when routes, links, header/footer, or layout behavior change.

## A. Build & static validation
- [ ] Run `npm run build` in `packages/web` and confirm success.
- [ ] Confirm no new TypeScript/ESLint errors in changed route/page files.

## B. Route coverage smoke test
Validate these routes render successfully and do not produce duplicate global shell:
- [ ] `/`
- [ ] `/dashboard`
- [ ] `/dashboard-firebase`
- [ ] `/wishlist/:id` (with valid id)
- [ ] `/shared/:shareId` (with valid share id)
- [ ] `/auth`
- [ ] `/privacy-settings`

## C. Header/footer ownership checks
For each tested route:
- [ ] Exactly one global header is visible.
- [ ] Exactly one global footer is visible.
- [ ] No page-level duplicate header or footer appears after navigation.
- [ ] Scrolling and route transitions do not spawn an extra footer.

## D. Link integrity checks
- [ ] Header links navigate to valid routes.
- [ ] Footer links navigate to valid routes.
- [ ] Primary CTA buttons (hero/features/cards) navigate to existing pages.
- [ ] No production UI link uses `#` as destination.
- [ ] Privacy and terms links resolve to implemented pages/routes.

## E. Shared wishlist behavior checks
On `/shared/:shareId`:
- [ ] Public content loads when allowed.
- [ ] Access-restricted state renders without layout duplication.
- [ ] Not-found state renders cleanly with single global shell.

## F. Browser console checks
- [ ] No `process is not defined` runtime error.
- [ ] No null container/bootstrap errors.
- [ ] No route-not-found errors caused by bad links.

## G. Final signoff
- [ ] Manual route walk-through completed.
- [ ] Checklist reviewer recorded (name/date) in PR notes.
- [ ] Any intentional exceptions are documented in `WEB_NAVIGATION_LAYOUT_SPEC.md`.
