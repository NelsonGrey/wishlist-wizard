# Business Requirements Baseline

Version: 1.0
Last updated: 2026-05-06
Owner: Product and Engineering

## Purpose

This document defines normalized business requirements derived from existing product and strategy documents and serves as the business source of truth for traceability.

Primary source documents:
- docs/BUSINESS_REQUIREMENTS.md
- docs/PRODUCT_DESIGN.md
- docs/REQUIREMENTS.md
- docs/DELIVERABLE_COMPONENT_MATRIX.md

## Business Requirements

| ID | Requirement | Persona(s) | Priority | Success Measure |
|---|---|---|---|---|
| BR-001 | Users can securely register, authenticate, recover access, and maintain trusted sessions. | Social Gift-Giver, Creator | P0 | Auth success rate >= 99.5%; password reset completion >= 80%. |
| BR-002 | Users can create, edit, organize, and delete wishlists for self and beneficiaries. | Social Gift-Giver, Occasion Coordinator | P0 | Wishlist CRUD success >= 99%; median create flow < 3 min. |
| BR-003 | Users can add wishlist items from multiple channels (manual, URL, extension extraction). | Social Gift-Giver, Budget-Conscious Shopper | P0 | Item add success >= 98%; extraction fallback success >= 95%. |
| BR-004 | Users can share wishlists with correct privacy controls and access boundaries. | Social Gift-Giver, Occasion Coordinator | P0 | Share link success >= 99%; unauthorized access incidents = 0. |
| BR-005 | Gift buyers can reserve and mark purchases with duplicate prevention and audit trail. | Social Gift-Giver | P0 | Duplicate purchase conflicts reduced by >= 90%; full audit fields present. |
| BR-006 | Groups can collaborate with clear roles and visible activity updates. | Occasion Coordinator | P1 | Collaboration action latency < 2s; role enforcement coverage 100%. |
| BR-007 | Price tracking and threshold alerts help users buy at better prices. | Budget-Conscious Shopper | P1 | Alert precision >= 95%; tracked item coverage >= 90%. |
| BR-008 | Creators can view reliable click-to-conversion analytics and payout readiness. | TikTok Creator | P1 | Funnel reconciliation error < 1%; payout eligibility report generated weekly. |
| BR-009 | Group gifting supports commitments, budget guardrails, and export for coordination. | Occasion Coordinator | P1 | Commitment conflicts < 1%; export schema validity 100%. |
| BR-010 | Users receive timely notifications in-app and by email/push where configured. | All personas | P1 | Notification delivery success >= 98%; unread state consistency >= 99%. |
| BR-011 | Core experiences remain consistent across web, mobile, and extension surfaces. | All personas | P1 | Parity score >= 90% on P0/P1 flows. |
| BR-012 | The platform protects user data through privacy, authorization, and compliance controls. | All personas | P0 | Security incidents = 0 critical; privacy policy enforcement verified in CI. |
| BR-013 | Platform operations are observable, reliable, and recoverable. | Internal Ops | P1 | P95 API latency < 500ms; error budget managed monthly. |
| BR-014 | Releases follow explicit quality gates and requirement verification evidence. | Internal Ops | P0 | 100% release gate completion; no unwaived critical requirement drift. |

## Scope Notes

In scope:
- Functional behavior for personas in docs/PRODUCT_DESIGN.md
- Operational readiness checks tied to docs/REQUIREMENTS.md and docs/requirements-verification.json

Out of scope for this baseline:
- Vendor-specific contract language
- Deep implementation design (covered in technical requirements)

## Acceptance Policy

A business requirement can be marked complete only when all conditions are met:
1. Mapped to one or more technical requirements.
2. Mapped to a project work package with owner and target milestone.
3. Backed by automated and/or auditable manual verification evidence.
