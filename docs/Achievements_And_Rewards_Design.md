# Achievements & Rewards Design

**Updated**: 2026-07-22
**Status**: Design only — not yet implemented
**Owner**: Mark Nelson
**Supersedes**: the mock `ACHIEVEMENTS` array in `packages/web/client-src/lib/achievements.ts` and the fake `profile.stats` shown on `UserProfile.tsx`. See [[project_achievements_program_todo]] for the prior deferral decision this design fulfills.

## Definitions

**Achievement** — a named, discrete accomplishment tied to a specific condition. Either binary (earned/not earned) or a tiered track crossed by a numeric threshold. An achievement is a rule, not a payoff.

**Reward** — the payoff granted when an achievement (or a tier of one) is earned: a badge, a flair, a profile trophy. Every reward traces back to an achievement trigger; not every achievement needs a tangible reward beyond recognition.

Keeping the two separate matters for implementation: achievement definitions are static data (id, condition, threshold), and reward-granting is a separate system that reacts to an "achievement unlocked" event. This mirrors the structure used for the same design problem on Modulo Squares — the split holds up well across genres.

## Why this differs in shape from a game's achievement system

Modulo Squares is a skill game with a leaderboard, so its natural three-way split is Foundation (setup) / Mastery (skill, tiered) / Competitive (relative to other players). Wishlist Wizard has no skill loop and — confirmed by codebase audit — **no leaderboard, ranking, or player-vs-player comparison feature anywhere in the app**, and none is planned. Forcing a "Competitive" category onto a gifting app would be a theme mismatch: nobody wants to be told they're the 4th-best wishlist-maker.

What Wishlist Wizard does have that a game doesn't: real *other people* on the other end of most actions — a gift you bought, a wishlist someone shared with you, a group gift you chipped into. That's the natural third category here — not competitive, but **relational**. It reframes "how does this player compare to others" (Modulo Squares) into "how has this user shown up for others" (Wishlist Wizard).

## Category structure

| Category | Question it answers | Repeatable | Modulo Squares analogue |
|---|---|---|---|
| Foundation | Is the account properly set up? | No (one-time) | Foundation |
| Depth of Usage | Is the user getting real value out of the app, and how deeply? | Yes (tiered) | Mastery |
| Generosity & Community | How has the user shown up for other people? | Yes (tiered) | Competitive, reframed |
| Creator | Has this creator built a working monetization presence? | Yes (tiered) | — (no analogue; unique to WW's affiliate/payout system) |

## Tier ladder (brand callback)

Modulo Squares' top tier ("Modulo") doubles as a brand callback. Wishlist Wizard's own theme is magic/wizardry, so the ladder callback is the app's own name at the top tier, same trick:

| Tier | Name |
|---|---|
| 1 | Apprentice |
| 2 | Adept |
| 3 | Sorcerer |
| 4 | Archmage |
| 5 | Wizard |

## Foundation achievements (setup/onboarding)

One-time, flat, non-tiered. Each fires once, on first occurrence. **Restricted to signals that are real and completable today** — the codebase audit found several setup-adjacent UI elements (avatar upload, theme/currency prefs, 2FA, default-privacy editing) that render but don't persist. Achievements must not be gated on actions a user cannot actually finish.

| Achievement | Trigger | Backing data |
|---|---|---|
| Welcome Aboard | Account created | `createUserProfile` write, real |
| Verified | Email verified | Firebase Auth `emailVerified`, real but currently has no UI prompt — this achievement doubles as the reason to add one |
| First Wish | First wishlist created | `usage.wishlistsOwned` ≥ 1, real |
| Dialed In | Push notifications enabled | `useNotificationPreferences`, real |
| Connected | Browser extension used at least once | first `extensionAnalytics` doc for the uid, real |
| Leveled Up | Any paid tier subscription active | `billingStatus().tier` ≠ free, real |
| Ad-Free | Reached a tier with ads disabled (Plus+) | `adsEnabled === false`, real |

Deliberately **excluded** despite having a plausible Modulo Squares equivalent: "linked a social sign-in provider" (no OAuth providers are wired — email/password only) and "set a profile photo" (the Change Photo button has no handler; not completable).

## Depth of Usage achievements (repeated engagement)

Tiered tracks, repeatable, same five-tier ladder as above. Thresholds are set to roughly track the free/starter/plus tier caps in `packages/shared/src/subscription.ts`, so crossing an achievement tier often lands near a natural upgrade point — a soft, achievement-driven nudge rather than a paywall nag. Numbers below are a draft, same caveat as Modulo Squares' doc: tune after real usage data comes in.

**Wishlist Builder** — wishlists created (lifetime, not current-active count — see Implementation notes)
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| 1 | 3 | 10 | 25 | 75+ |

**Tracker** — active price alerts
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| 1 | 5 | 15 | 40 | 75+ |

**Extension Power User** — items added via the browser extension (lifetime)
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| 1 | 10 | 50 | 150 | 500+ |

**Bargain Hunter** — cumulative dollars saved via tracked price drops
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| $10 | $50 | $150 | $500 | $1,500+ |

**Group Organizer** — group gifts created/organized
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| 1 | 3 | 10 | 25 | 50+ |

## Generosity & Community achievements (relational)

Earned through actions that involve other people — buying, sharing, receiving, contributing. This is the category that gives the app's social surface (shared wishlist links, gift reservation, group gifting) a payoff beyond the transaction itself.

**Gift Giver** — items purchased for someone else via `purchaseWishlistItem`
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| 1 | 5 | 15 | 40 | 100+ |

**Well-Loved** — items on the user's own wishlists that others reserved or purchased for them (received, not given — the "someone showed up for me" counterpart to Gift Giver)
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| 1 | 5 | 15 | 40 | 100+ |

**Sharer** — wishlists made public or shared via link
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| 1 | 3 | 10 | 25 | 50+ |

**Chip In** — contributions made to others' group gifts
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| 1 | 3 | 10 | 25 | 50+ |

**Dependency**: none of "invited a collaborator" / "collaborated on N wishlists" is reachable today — the audit found the server-side collaborator role model (owner/editor/commenter/viewer) is real, but no client UI exists to actually invite a collaborator, and two seemingly-inconsistent collaborator storage patterns coexist server-side. A "Collaborator" track belongs in this category once that gap closes, not before.

## Creator achievements (monetization track)

Wishlist Wizard has no follower/audience metric for creators — the real creator system (audited: `commissionLedger`, `payoutBatches`, `creatorPayoutAccounts`, affiliate tracking-tag assignment) is entirely about affiliate-link attribution and commission payout, not social reach. This track should reflect that, not import a "1,000 followers"-style achievement that has nothing to attach to.

One-time (Foundation-style, scoped to creator+ tier users):

| Achievement | Trigger |
|---|---|
| Storefront Open | Affiliate tracking tag activated |
| Connected | Stripe Connect payout account enabled (`payoutsEnabled`) |
| First Commission | First entry lands in `commissionLedger` |
| First Payout | First entry in `creatorPayoutHistory` |

Tiered (repeatable), same five-tier ladder:

**Commission Earned** — lifetime approved+paid commission total
| Apprentice | Adept | Sorcerer | Archmage | Wizard |
|---|---|---|---|---|
| $25 | $100 | $500 | $2,000 | $10,000+ |

## Rewards

Same philosophy as Modulo Squares and for a related reason, just aimed at a different failure mode: that design kept rewards cosmetic to protect a *fair leaderboard*; this app has no leaderboard to protect, but it does have a **subscription business model** that several achievement thresholds are deliberately keyed close to (see Depth of Usage). A reward that grants any real tier feature for free — an extra wishlist slot, an extra price alert, group gifting unlocked early — would undercut the upgrade nudge the thresholds are designed to create. So: **cosmetic/status only, no mechanical unlocks, ever.**

Candidate reward types:
- A badge/flair shown next to the user's display name on shared wishlist pages (`/shared/:shareId`) and any public wishlist link preview — this is the app's actual social surface, the equivalent of Modulo Squares' leaderboard-row flair.
- A **"Trophy Case"** section on `UserProfile.tsx`, directly replacing the current fake "Stats & Achievements" tab and its zeroed-out mock `profile.stats`.
- A distinct badge for reaching **Wizard** tier in any track — the brand-callback tier, same trick as Modulo Squares' "Modulo" badge.
- Wishlist cover/theme cosmetics unlocked at higher tiers, if wishlist visual customization exists or is added (verify against current wishlist card styling before committing to this one).

## Implementation notes

Ground-truth audit of `packages/web` and `packages/functions` (2026-07-22) found the following buckets:

**Ship now, zero new backend work** — real, already-aggregated, already fetched by the client:
- Foundation: Welcome Aboard, First Wish, Dialed In, Leveled Up, Ad-Free (all readable from `useSubscriptionStatus()` / Firebase Auth state already in the client).
- Depth of Usage: Tracker (`usage.priceAlertsActive`).

**Ship soon, small new aggregation, no schema changes** — data exists, just needs a query or counter added:
- Foundation: Verified (surface `emailVerified`, which has no UI today), Connected (check for any `extensionAnalytics` doc for the uid).
- Depth of Usage: Extension Power User (`getExtensionAnalytics`'s `totalItems` is already computed server-side).
- Generosity & Community: Gift Giver and Well-Loved (query `wishlistItems` by `purchasedByUserId` / by wishlist-owner-received; not aggregated today but the underlying fields are real and correct), Group Organizer, Chip In (query `groupGifts` / `groupGiftContributions`), Sharer (count wishlists with `isPublic` or a populated `shareId`).
- Creator: all four one-time achievements and Commission Earned — `commissionLedgerDashboardSummary` and `creatorPayoutHistory` already return exactly this shape.

**Needs a real design decision before building**:
- **Wishlist Builder must be lifetime, not current-active.** `usage.wishlistsOwned` is a live tier-limit counter that decrements on delete — using it directly would let an achievement regress, which should never happen. Needs either a separate monotonic lifetime counter or an explicit decision to accept current-count semantics for v1 (not recommended).
- **Bargain Hunter is conditional on data that may not be populated in production.** `priceHistory` is only written when a SerpAPI key is configured and the scheduled refresh actually runs; the audit could not confirm this is live in the current environment. Verify `priceHistory` has real documents in prod before committing to shipping this track — otherwise it's a permanently-zero achievement, which is worse than not having it.
- **Collaborator-based achievements are blocked**, per the dependency note above — no invite UI exists yet.

**Must not be attempted as currently coded** — replacing, not extending:
- `lib/achievements.ts`'s existing 5 mock achievements. Of the current five, only "Wishlist Wizard" (10+ wishlists) maps to something real (once made lifetime-correct, see above). "Social Butterfly" (friends) and "Review Enthusiast" (reviews) have **no backing feature at all** in this app — no friends graph, no reviews feature — and should be dropped rather than reinterpreted. "Gifting Guru" and "Savings Expert" map to real concepts (Gift Giver, Bargain Hunter above) but need the new aggregation work described above, not their current hardcoded `earned` booleans.
- `UserProfile.tsx`'s "Friends & Connections" tab UI is fully built visually but wired to nothing (`CONNECTIONS` is a hardcoded empty array, Add Friend has no handler) — do not build a social/friends achievement category on top of it. If a friends graph gets built later, Generosity & Community is the natural place to extend into it, not before.

Per the existing direction in [[project_achievements_program_todo]], `lib/achievements.ts` stays the single source of truth referenced by both `UserProfile.tsx`'s Trophy Case and `AchievementsGuide.tsx` (`/app/achievements`) — this design replaces its contents and adds real criteria fields (currently the type has no criteria/threshold field at all, just a static `earned` boolean).

## Open decisions

1. Exact numeric thresholds above are a draft, same as Modulo Squares' doc — tune once there's real usage distribution to look at, not before.
2. Whether Depth of Usage thresholds should deliberately track subscription tier caps (as drafted, to create a soft upgrade nudge) or be set independently of the pricing table. If independent, some of the specific numbers above should move.
3. Whether to build the lifetime wishlist-created counter now (new Firestore field, small write-path change) or ship Depth of Usage without Wishlist Builder in v1.
4. Whether to verify `priceHistory` population in production before or after building Bargain Hunter — recommend before, it's a one-query check against the live `priceHistory` collection.
5. Scope for initial ship: recommend a v1 slice of Foundation (all 7, all real today) + Tracker + Extension Power User + Gift Giver + Well-Loved + Sharer, deferring Bargain Hunter (pending the SerpAPI check), Wishlist Builder (pending the lifetime-counter decision), Collaborator-anything, and the full Creator track (small user population, can follow in a fast-follow) to a second pass.
