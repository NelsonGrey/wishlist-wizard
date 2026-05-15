# Wishlist Wizard — Subscription Strategy & Pricing Plan

**Version**: 1.0  
**Date**: May 15, 2026  
**Status**: 🟡 PROPOSED — Pending Business Approval  
**Owner**: Mark Nelson

---

## Executive Summary

The advertising-only model is structurally insufficient for users who create numerous wishlists, track many items, or rely on price alerts. This document defines a tiered subscription model grounded in the real cost structure of the platform, competitive market positioning, and the distinct value delivered at each usage level.

**The central insight**: price tracking is the primary cost driver (scraping runs cost $0.02–$0.10 per check × 4x monthly). A free user tracking 5 items costs ~$0.40–$2.00/month—ads can plausibly cover this. A power user tracking 100+ items costs $8–$40+/month, which ad revenue cannot offset regardless of impression volume.

**Recommendation**: Maintain a generous free ad-supported tier, and introduce three paid tiers triggered by usage thresholds that represent genuine cost and value inflection points.

---

## 1. The Advertising Sufficiency Problem

### Ad Revenue Reality

| Metric | Value |
|--------|-------|
| Typical display ad CPM (cost per 1,000 impressions) | $0.50 – $2.00 |
| Active sessions per user per month | ~8–12 sessions |
| Pages per session | ~4–6 |
| Monthly impressions per MAU | ~48 impressions |
| Ad revenue per free user per month | **$0.02 – $0.10** |

A free user generates roughly **$0.24 – $1.20 per year** in ad revenue.

### Infrastructure Cost Per User

| Feature | Cost Basis | Cost Estimate |
|---------|-----------|---------------|
| Firestore reads/writes | $0.06 per 100K ops | ~$0.01/user/month at typical usage |
| Firebase Functions | $0.40/million invocations | ~$0.02/user/month |
| Price tracking (per item/month) | 4 scrapes × $0.02–$0.10 each | **$0.08 – $0.40/item/month** |
| Push notifications (FCM) | Free | $0.00 |
| Email (SendGrid) | ~$0.0003/email | ~$0.10/user/month (active) |
| Storage (images/media) | $0.026/GB | ~$0.01/user/month |
| AI recommendations (OpenAI) | $0.002/1K tokens | ~$0.05–$0.20/recommendation |

### Break-Even Analysis by Usage Level

| User Type | Wishlists | Items Price-Tracked | Infra Cost/Month | Ad Revenue/Month | Net |
|-----------|-----------|---------------------|-------------------|-------------------|-----|
| Casual | 1–2 | 3–5 | $0.25 – $1.25 | $0.05 – $0.10 | ❌ Subsidized by affiliate revenue |
| Regular | 3–5 | 10–20 | $0.85 – $4.00 | $0.05 – $0.10 | ❌ Affiliate revenue required |
| Heavy | 6–15 | 30–60 | $2.50 – $12.00 | $0.05 – $0.10 | 🔴 **Structurally losing money** |
| Power/Creator | 20+ | 100+ | $8.00 – $40.00+ | $0.05 – $0.10 | 🔴 **Heavily loss-making** |

**Conclusion**: Affiliate commissions cover casual users. But heavy users and creators who generate the most wishlists—and therefore the most platform value—are also the most expensive to serve. Without subscription revenue from them, growth in power users destroys margin.

### Affiliate Revenue Offsets

Affiliate commissions do partially offset costs. However:
- A user with 3 wishlists drives ~3–5 purchases/year × $60 AOV × 5% commission = **$9–$15/year**
- A heavy user with 20 wishlists drives ~20–30 purchases/year × $60 × 5% = **$60–$90/year** in affiliate revenue but costs **$96–$480/year** in price tracking alone

Beyond approximately 15–20 actively-tracked items, affiliate revenue can no longer cover infrastructure costs. This is the primary subscription trigger threshold.

---

## 2. Market Positioning & Competitive Benchmarks

### Competitive Landscape

| Product | Category | Price | Key Limits |
|---------|----------|-------|------------|
| Amazon Wish List | Wishlist | Free | Amazon-only items; Amazon keeps all affiliate revenue |
| Giftster | Wishlist | Free (premium ~$3/mo) | Limited sharing; no price tracking |
| MyRegistry | Gift Registry | Free / $39.99/yr | Wedding/event focus; limited items |
| Zola | Wedding Registry | Free | Event-specific; limited to registry model |
| Linktree Pro | Creator Links | $9/mo | No wishlist; link-only with analytics |
| Beacons | Creator Platform | $10/mo | Creator-focused; broader than wishlist |
| Notion Personal | Productivity | $8/mo | Not wishlist-specific |
| AllWishes | Wishlist | Free (undisclosed premium) | Small user base |

### Key Differentiators Justifying Premium Pricing

1. **Multi-platform** (Web + iOS + Browser Extension) — no competitor matches this
2. **Active price tracking across 40+ retailers** — Amazon Wish List only tracks Amazon
3. **Creator affiliate revenue sharing** — unique; Linktree/Beacons don't share commissions
4. **Group gifting coordination** — rare; most wishlist apps lack real-time coordination
5. **Calendar integration** — unique to Wishlist Wizard
6. **Cross-retailer comparison** at item level — unique

### Pricing Positioning

Wishlist Wizard sits between "simple free wishlist" apps (Giftster, MyRegistry) and "creator monetization" platforms (Linktree, Beacons). The subscription price must be:
- **Higher than** basic wishlist apps (we deliver more value)
- **Lower than** full creator tools (we're not a general creator suite)
- **Justified by** price tracking savings (a $30 price drop more than pays for a year's subscription)

---

## 3. Subscription Tiers

### Tier Overview

| | **Free** | **Starter** | **Plus** | **Creator Pro** | **Business** |
|---|---|---|---|---|---|
| **Price** | $0 (ad-supported) | $3.99/mo · $39/yr | $7.99/mo · $79/yr | $14.99/mo · $149/yr | $29.99/mo · $299/yr |
| **Wishlists** | 3 active | 10 | Unlimited | Unlimited | Unlimited |
| **Items/wishlist** | 25 | 75 | 200 | Unlimited | Unlimited |
| **Price-tracked items** | 5 | 25 | 75 | Unlimited | Unlimited |
| **Collaborators/wishlist** | 5 | 15 | 50 | Unlimited | Unlimited |
| **Ads** | ✅ Displayed | ✅ Displayed | ❌ None | ❌ None | ❌ None |
| **Price history** | 3 months | 1 year | 2 years | Full history | Full history |
| **Affiliate commission share** | None (platform keeps) | None | None | 20% of user-generated commissions | 30% of user-generated commissions |
| **Calendar integration** | ❌ | 1 calendar | All calendars | All calendars | All calendars |
| **Group gifting** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Analytics** | ❌ | Basic (views) | Standard (views, shares, clicks) | Full creator analytics | Full + team analytics |
| **Creator dashboard** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Data export** | ❌ | ❌ | CSV | CSV + JSON | CSV + JSON + API |
| **Custom profile URL** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Priority support** | ❌ | Email | Priority email | Priority + chat | Dedicated |
| **API access** | ❌ | ❌ | ❌ | 1K calls/month | 25K calls/month |
| **Team members** | 1 | 1 | 1 | 1 | Up to 5 |

---

### Tier 1: Free (Ad-Supported)

**Target user**: Casual gift-recipient who shares a wishlist occasionally (birthday, holidays)  
**Estimated % of user base**: 80%

**Why these limits work**:
- **3 wishlists**: The median casual user maintains one birthday list, one holiday list, and one general "things I want" list. Going beyond 3 signals recurring, intentional use that creates real server costs.
- **25 items/wishlist**: Enough to represent a meaningful wish list for any occasion without generating heavy storage or tracking load.
- **5 price-tracked items**: ~$0.40–$2.00/month infrastructure cost. At 48 monthly ad impressions × $1.50 CPM, this generates $0.07/month. The difference is covered by affiliate commissions (the platform keeps 100% of affiliate revenue from free users' purchases).

**Advertising strategy for free tier**:
- Non-intrusive banner ads in the wishlist sidebar (desktop) and between item cards (mobile)
- No ads displayed on publicly-shared wishlists viewed by others (protects sharing experience, grows viral reach)
- Sponsored "gift idea" recommendations (native advertising from brands)
- Ads are never displayed on the extension popup (user experience too fragile)

**Free tier is genuinely useful** — not crippled. Users can receive gifts, share one wishlist with friends, and track 5 price drops. The goal is for free users to share wishlists that bring in new users, not to frustrate them into paying.

---

### Tier 2: Starter ($3.99/month · $39/year)

**Target user**: Engaged gift-giver managing multiple events per year (3–4 occasions, has a family)  
**Estimated % of user base**: 10–12%  
**Primary trigger**: User hits 3-wishlist or 5-price-track limit

**Why upgrade from Free**:
- Planning 4–5 annual occasions: birthday × 2 kids + holiday + anniversary + personal = 5+ wishlists needed
- Tracks 15–25 items → without upgrade, 20 items would be untracked
- Maintains ads while still unlocking higher wishlist and tracking limits at a lower entry price
- A single price drop notification (e.g., $40 saving on a holiday gift) pays for the entire yearly subscription

**Value justification**: At $39/year, if Wishlist Wizard alerts the user to a single $40+ price drop that they act on, the product has paid for itself.

**Affiliate commission**: Platform keeps 100% — user isn't running a creator business, they're saving money.

---

### Tier 3: Plus ($7.99/month · $79/year)

**Target user**: Occasion coordinator, serious gift hobbyist, engaged social sharer  
**Estimated % of user base**: 5–7%  
**Primary trigger**: User needs group gifting, or manages more than 10 wishlists

**Why upgrade from Starter**:
- Coordinating a wedding, baby shower, or large family holiday requires group gifting features
- Managing 10+ active wishlists (wedding + 2-3 kids' birthdays + holiday + anniversary + parents' lists + personal + work gift exchange = easily 10+)
- Tracks 75 items → meaningful price monitoring for a serious collector or deal-hunter
- 50 collaborators per wishlist → suitable for event coordination with extended family/friend groups
- Analytics shows them which shared wishlists get the most traction

**Group gifting unlocked**: Multiple family members can see who's buying what, pledge amounts, and track group contributions. This prevents the $300 duplicate gift problem at weddings.

**Value justification**: Coordination value for a single wedding or large birthday event easily worth $79/year. Price drops across 75 tracked items can save hundreds of dollars.

---

### Tier 4: Creator Pro ($14.99/month · $149/year)

**Target user**: Content creator, influencer, or power user monetizing recommendations  
**Estimated % of user base**: 2–3%  
**Primary trigger**: User wants affiliate revenue sharing or creator dashboard

**Why upgrade from Plus**:
- Creator dashboard: clicks, conversions, commissions per wishlist
- **Affiliate commission share** (20% of platform-earned commissions on their wishlists)
  - Example: Creator's wishlists drive $5,000 in retail purchases × 5% avg commission = $250 platform commission × 20% share = **$50/month back to creator**
  - This alone can pay for the subscription — and creators who are earning will upgrade
- Unlimited items and wishlists: creators may have 30–50 themed wishlists ("Best Gifts Under $50", "Home Office Essentials", "Fitness Gear 2026")
- Unlimited price tracking: monitoring every item in every list
- Full analytics: platform breakdown, referral source, weekly trends
- Custom profile URL: `wishlistwizard.com/creator/[username]` for brand building
- Early feature access: beta features before general release

**Revenue share math for creator**:
- A micro-influencer (50K followers) with 10 wishlists
- Drives 100 purchases/month × $60 AOV = $6,000 GMV
- Platform earns 5% commission = $300
- Creator earns 20% of that = **$60/month**
- At $149/year ($12.42/month), creator nets **$47.58/month profit** from commission share alone
- For any creator driving >$750/month in purchases, the Creator Pro tier is cash-flow positive

**Affiliate revenue share is a retention mechanism**: Once creators are earning commission through the platform, churn becomes nearly zero.

---

### Tier 5: Business ($29.99/month · $299/year)

**Target user**: Wedding planners, corporate gifting coordinators, brand-employed gift curators, small agencies  
**Estimated % of user base**: 0.5–1%  
**Primary trigger**: Multiple team members needed, or API integration required

**Why upgrade from Creator Pro**:
- **Team accounts**: Up to 5 members share one account (agency, wedding planning firm, brand team)
- **30% affiliate commission share**: Higher share for high-volume generators
- **25K API calls/month**: Integrate Wishlist Wizard into own website or workflow
- **Dedicated support**: SLA-backed response times
- Use case: A wedding planning firm that manages 50+ registries/year, each needing coordination, analytics, and group gifting

---

### Tier 6: Enterprise (Custom Pricing)

**Target user**: Brands, large retailers, influencer agencies, B2B integrations  
**Estimated % of user base**: <0.1%, but high ARPA

**Features**:
- Unlimited everything
- Custom affiliate commission arrangements (negotiated directly)
- White-label option (remove WW branding, custom domain)
- Unlimited API access
- Dedicated account manager
- Custom SLA
- Data feeds and reporting integrations
- Volume pricing for creator networks

**Revenue estimate**: 5–10 enterprise clients at $30K–$100K/year = $150K–$1M ARR

---

## 4. Usage Thresholds — The "Upgrade Prompt" Triggers

Users should be prompted to upgrade (not blocked abruptly) when they approach limits. The experience must be respectful of the fact that the user is actively engaged.

### Threshold Escalation Design

```
Soft Warning (at 80% of limit):
  "You've used 4 of 5 price-tracked items. 
   Upgrade to Starter for 25 tracked items — starting at $3.99/mo"

Hard Limit (at 100% of limit):
  "You've reached your price tracking limit.
   Upgrade to continue tracking new items.
   Your existing 5 tracked items continue unaffected."
```

**Critical design rule**: Never delete or disable features the user is already using when they hit a limit. Prevent adding new items beyond the limit, but never retroactively revoke access to existing ones. This protects trust and prevents churn from frustration.

### Threshold Table

| Trigger | Free Limit | Upgrade Prompted To |
|---------|-----------|---------------------|
| 3rd active wishlist created | 3 wishlists | Starter |
| 5th price-tracked item | 5 items | Starter |
| Trying to add collaborator #6 | 5 collaborators | Starter |
| Adding 26th item to a wishlist | 25 items | Starter |
| Trying to enable group gifting | Unavailable | Plus |
| Creating 11th wishlist | 10 wishlists | Plus |
| Trying to access creator dashboard | Unavailable | Creator Pro |
| Wanting to access own affiliate commissions | Unavailable | Creator Pro |
| Needing team/multi-user access | Unavailable | Business |
| Wanting API access | Unavailable | Creator Pro or Business |

---

## 5. Advertising Model Refinement

For free tier to remain sustainable and non-alienating:

### Ad Placement Rules

| Location | Ad Type | Shown to Free? | Shown to Paid? |
|---------|---------|----------------|----------------|
| Wishlist sidebar (owner view) | Banner/sponsored gift suggestion | ✅ Yes | ❌ No |
| Item list (every 8 items) | Native card ("Sponsored") | ✅ Yes | ❌ No |
| Notification center | Sponsored notification | ✅ Occasionally | ❌ No |
| Shared wishlist (visitor view) | ❌ Never | ❌ Never | ❌ Never |
| Browser extension popup | ❌ Never | ❌ Never | ❌ Never |
| Mobile app (scrolling feed) | Banner between sections | ✅ Yes | ❌ No |

**Key principle**: Never display ads on shared wishlists that others are viewing. The viral growth mechanism (sharing) must have a pristine experience for recipients regardless of the owner's tier. Recipients seeing ads would reflect badly on the wishlist creator and kill sharing motivation.

### Ad Revenue Expectations

| MAU on Free Tier | Monthly Impressions | CPM | Monthly Ad Revenue |
|-----------------|--------------------|----|-------------------|
| 100K | 4.8M | $1.50 | $7,200 |
| 500K | 24M | $1.50 | $36,000 |
| 1M | 48M | $1.50 | $72,000 |

Ad revenue at scale is meaningful but **secondary** to affiliate and subscription revenue. Its primary function is to make the free tier economically viable for casual users — not to be the platform's primary revenue source.

---

## 6. Affiliate Revenue Sharing Model

### Philosophy

Users who generate affiliate commissions are partners in the platform's revenue. Sharing a portion incentivizes upgrades and reduces churn. The higher the tier, the more they share — rewarding investment.

### Commission Share by Tier

| Tier | User Share | Platform Share | Notes |
|------|-----------|----------------|-------|
| Free | 0% | 100% | Platform subsidizes free user service via affiliate |
| Starter | 0% | 100% | User isn't a creator; full subsidy |
| Plus | 0% | 100% | Group coordinator; affiliate is incidental |
| Creator Pro | 20% | 80% | Core creator value proposition |
| Business | 30% | 70% | High-volume generator, higher share warranted |
| Enterprise | Negotiated | Negotiated | Custom per arrangement |

### Affiliate Revenue Example — Creator Pro User

| Metric | Value |
|--------|-------|
| Monthly wishlist views | 50,000 |
| Click-through rate | 8% |
| Monthly clicks | 4,000 |
| Purchase conversion rate | 4% |
| Monthly purchases driven | 160 |
| Average order value | $65 |
| Monthly GMV generated | $10,400 |
| Avg commission rate | 5% |
| Platform commission earned | $520 |
| Creator's 20% share | **$104/month** |
| Creator Pro subscription cost | $12.42/month |
| **Net benefit to creator** | **+$91.58/month** |

This creates a self-reinforcing incentive: creators who are earning upgrade and stay. Creators who churn lose their commission income.

---

## 7. Revenue Projections (Revised)

### Conservative Scenario (Year 1, 200K MAU)

| Tier | % of MAU | Users | ARPU/Year | Revenue |
|------|----------|-------|-----------|---------|
| Free (ad-supported) | 80% | 160K | $1.50 (ads) | $240K |
| Free (affiliate offset) | 80% | 160K | ~$9 (affiliate commissions on purchases) | $1.44M |
| Starter | 10% | 20K | $39 | $780K |
| Plus | 6% | 12K | $79 | $948K |
| Creator Pro | 3% | 6K | $149 | $894K |
| Business | 1% | 2K | $299 | $598K |
| **Total** | | **200K** | | **$4.9M** |

### Growth Scenario (Year 3, 1M MAU)

| Tier | Users | ARPU/Year | Revenue |
|------|-------|-----------|---------|
| Free | 750K | $10.50 (ads + affiliate) | $7.875M |
| Starter | 100K | $39 | $3.9M |
| Plus | 80K | $79 | $6.32M |
| Creator Pro | 50K | $149 | $7.45M |
| Business | 15K | $299 | $4.485M |
| Enterprise | 20 clients | $50K | $1M |
| **Total** | **995K** | | **$31M** |

---

## 8. Implementation Requirements

### Feature Gating by Tier

The existing `feature-matrix.ts` in `@wishlist-wizard/shared` should be extended to include tier-based availability alongside platform availability. New field: `tier: 'free' | 'starter' | 'plus' | 'creator' | 'business'`.

### Metered Features Requiring Backend Enforcement

The following limits must be enforced server-side (not just client-side):

| Feature | Enforcement Point |
|---------|------------------|
| Wishlist count | `/api/wishlists` POST — check user's active wishlist count |
| Items per wishlist | `/api/items` POST — check item count for target wishlist |
| Price-tracked items | `/api/price-alerts` POST — check active tracking count |
| Collaborators | `/api/wishlists/:id/collaborators` POST — check collaborator count |
| Group gifting | `/api/wishlists/:id/group` POST — check tier eligibility |
| Creator dashboard | `/api/affiliate/stats` GET — check tier eligibility |
| API calls | Rate limiting middleware — check monthly call count |

### User Subscription Management

Required infrastructure additions:
- `userSubscriptions` table: `userId`, `tier`, `status`, `billingCycle`, `currentPeriodStart`, `currentPeriodEnd`, `stripeCustomerId`, `stripeSubscriptionId`
- Stripe integration for billing (recurring subscriptions, annual discount)
- Subscription middleware to inject `user.tier` into request context
- Downgrade handling: soft-limit enforcement (existing over-limit content remains, new additions blocked)
- Trial period: 14-day free trial of Plus on signup (drives conversion)

### Upgrade Flow UX

- In-app upgrade prompts at limit touchpoints (soft at 80%, firm at 100%)
- Comparison table modal when prompted
- One-click annual upgrade (best value messaging)
- Email nurture sequence at usage milestones (Day 7: "You've created 2 wishlists", Day 14: "5 price drops found for you")
- Pause subscription instead of cancel (reduces churn)

---

## 9. Pricing Sensitivity & A/B Testing Plan

Before committing to final prices, validate these assumptions:

| Test | Hypothesis | Metric | Duration |
|------|-----------|--------|---------|
| Free limit: 3 vs 5 wishlists | More restrictive limit drives more upgrades without killing growth | Upgrade rate, signup rate | 4 weeks |
| Starter: $2.99 vs $3.99 vs $4.99 | $3.99 is the psychological sweet spot | Conversion rate at soft limit | 6 weeks |
| Annual discount: 18% vs 33% | 33% off annual dramatically shifts to annual billing (better LTV) | Annual vs monthly split | 4 weeks |
| Creator commission share: 15% vs 20% vs 25% | 20% maximizes revenue while driving upgrade | Creator upgrade rate | 8 weeks |
| Trial: 7 days vs 14 days | 14 days leads to higher trial-to-paid conversion | Conversion rate | 8 weeks |

---

## 10. Summary: When Should a User Pay?

A user should be expected to subscribe when:

1. **They create more than 3 wishlists** — this indicates recurring, intentional use that creates server load beyond what casual affiliate revenue covers

2. **They want to track more than 5 items for price drops** — price scraping is the primary cost driver; beyond 5 items, ad revenue structurally cannot cover infrastructure

3. **They coordinate with more than 5 collaborators** — group coordination features carry coordination service costs and complexity

4. **They plan events that involve group gifting** — this is a premium workflow that requires real-time coordination infrastructure

5. **They want to earn affiliate commission share** — creators who drive commercial value deserve a share, and that share should come with a subscription commitment that ensures they're serious platform participants

6. **They want analytics, creator tools, or API access** — these are clearly value-additive professional features with no analog in the free tier

The advertising-supported tier exists to serve the large majority of casual users well, grow the user base through viral sharing, and generate affiliate revenue from their purchases. It is not designed to serve power users at a loss.

---

## Appendix: Competitor Subscription Comparison

| Feature | WW Free | WW Starter ($39/yr) | WW Plus ($79/yr) | WW Creator Pro ($149/yr) | Amazon Wish List | Linktree Pro ($108/yr) |
|---------|---------|----|----|----|----|---|
| Wishlist count | 3 | 10 | Unlimited | Unlimited | Unlimited | N/A (links) |
| Price tracking | 5 items | 25 items | 75 items | Unlimited | Amazon only (free) | ❌ |
| Ads | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Group gifting | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Creator revenue share | ❌ | ❌ | ❌ | 20% | ❌ | ❌ |
| Multi-retailer | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Browser extension | ✅ | ✅ | ✅ | ✅ | ✅ (Amazon only) | ❌ |
| Calendar integration | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Analytics | ❌ | Views only | Standard | Full | ❌ | Basic |

Wishlist Wizard's Starter tier at $39/year beats Amazon Wish List on every feature except Amazon-exclusive benefits, at a lower price than Linktree Pro. The value proposition is clear.
