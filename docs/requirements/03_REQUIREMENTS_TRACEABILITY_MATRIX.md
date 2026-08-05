# Requirements Traceability Matrix

Version: 1.0
Last updated: 2026-05-06
Owner: Product and Engineering

## Purpose

This matrix connects business outcomes to technical implementation and execution plan deliverables.

## BR to TR to Work Package Mapping

| BR ID | Business Requirement | Technical Requirement IDs | Work Package IDs | Verification Signals |
|---|---|---|---|---|
| BR-001 | Secure account lifecycle | TR-001, TR-002 | WP-01 | npm run test:users:smoke; npm run test:functions:smoke:all |
| BR-002 | Wishlist CRUD and beneficiary support | TR-003 | WP-01 | npm run test:users:smoke |
| BR-003 | Multi-channel item ingestion | TR-004 | WP-01, WP-03 | npm run test:e2e:tier1; extension unit tests |
| BR-004 | Share and privacy controls | TR-005, TR-017 | WP-02 | npm run test:e2e:smoke; requirements verification report |
| BR-005 | Reservation, purchase, duplicate prevention | TR-006 | WP-02 | npm run test:functions:smoke:all |
| BR-006 | Collaboration and role visibility | TR-007 | WP-04 | collaborator role smoke checks; notification tests |
| BR-007 | Price tracking and threshold alerts | TR-008, TR-011 | WP-03 | smoke all functions; price tracking tests |
| BR-008 | Creator analytics and payout readiness | TR-009 | WP-05 | analytics integration tests |
| BR-009 | Group commitments with budget and export | TR-010 | WP-04 | group summary contract smoke checks |
| BR-010 | Multi-channel notifications | TR-011 | WP-03, WP-04 | notification service tests; mobile deeplink tests |
| BR-011 | Cross-platform parity | TR-012 | WP-06 | tier1 e2e + mobile tests + extension tests |
| BR-012 | Privacy, authorization, compliance | TR-002, TR-017 | WP-02, WP-07 | security checks + requirements validation |
| BR-013 | Reliability and observability | TR-013, TR-018 | WP-07 | smoke reports + health checks |
| BR-014 | Release governance and evidence | TR-014, TR-015, TR-016 | WP-08 | npm run requirements:verify; npm run requirements:traceability |

## Coverage Rules

1. Every BR must map to at least one TR.
2. Every TR must map to at least one work package in project planning.
3. P0 BRs must include at least one automated verification signal.
4. Traceability data should be mirrored in docs/requirements/traceability-matrix.json for machine validation.
