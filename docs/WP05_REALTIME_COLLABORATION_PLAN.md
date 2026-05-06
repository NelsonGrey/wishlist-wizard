# WP-05 Real-Time Collaboration Plan

Version: 1.0
Last updated: 2026-05-06
Owner: Backend + Web

## Objective

Start WP-05 by delivering a real-time collaboration activity contract and verification path so collaborative updates become measurable and release-gated.

## Scope (Kickoff Slice)

1. Activity stream contract
- Define canonical collaboration event payload fields for live updates.
- Include event type, actor, wishlist context, timestamp, and optional metadata.

2. In-app live update behavior
- Verify dashboard collaboration panel behavior for real-time events.
- Ensure event ordering and relative-time rendering are stable.

3. Evidence and release gating
- Add/extend smoke and route-level tests for collaboration stream behavior.
- Attach artifact evidence in CI where applicable.

## Acceptance Criteria

- A documented collaboration event contract exists and is referenced by implementation.
- At least one automated backend verification and one web verification cover collaboration live activity behavior.
- No regression in existing requirements/traceability gates.

## Execution Checklist

- [ ] Define collaboration activity event contract in shared types/docs.
- [ ] Add backend emitter/adapter coverage for collaboration events.
- [ ] Add web test coverage for live activity updates beyond static render.
- [ ] Run and capture:
  - [ ] `npm run requirements:verify`
  - [ ] `npm run requirements:traceability`
  - [ ] targeted web test suite for collaboration updates
- [ ] Update progress docs with evidence links.

## Risks and Controls

- Risk: Event schema drift between backend and web.
- Control: Centralize payload shape in shared module and test fixtures.

- Risk: Flaky timing-based UI tests.
- Control: Use deterministic timestamps and mocked notification streams.

## Immediate Next Action

Implement the collaboration activity event contract in shared types and wire one end-to-end validation path (backend fixture -> web rendering test).