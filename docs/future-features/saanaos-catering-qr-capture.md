# SaanaOS Catering + QR Capture Expansion

## Status

Future / near-term SaanaOS expansion. Not implemented yet.

## Objective

Extend SaanaOS beyond missed-call recovery into high-value order capture channels without building a separate product.

Focus:

- Catering Menu Integration
- QR Code Ordering Integration

These features increase average order value, capture offline demand, strengthen the SEO/sales narrative, and should require minimal architectural change.

## Core Principle

Do not build a separate catering platform.

Catering should be a presentation/routing layer on top of the existing menu, checkout, SMS, and attempts systems.

**This is a presentation + routing layer, not a backend rewrite.**

## Product Thesis

One missed catering call can pay for SaanaOS for the entire year.

Catering orders can be much higher value than regular pickup orders, so SaanaOS should help restaurants capture catering intent through missed calls, QR codes, storefront traffic, cards, flyers, and direct links.

## Catering Menu Integration

### Core Concept

- Catering is a layer on top of the existing menu system.
- Catering should be compatible with current ordering and SMS flows.
- Catering should reuse current checkout/backend where possible.

### MVP Option A: Category-Based

The restaurant creates a menu category named `Catering`.

Example items:

- Tray of Chicken Biryani
- Family Combo
- Party Platter
- Sandwich Platter

This requires minimal backend change and may be enough for earliest testing.

### Recommended Option B: Catering Link

Add optional `Enable Catering Mode`.

Generate:

```text
/r/[slug]/catering
```

This route should show only catering-tagged/category items and use the same checkout/backend.

Light UX copy:

- "Schedule your catering order"
- "Minimum order notice may apply"
- "For large orders, the restaurant may confirm details before preparation"

## Missed Call Recovery Use Case

Current SMS:

```text
Sorry we missed your call. You can place your order here: [link]
```

Future catering-aware SMS:

```text
If this is for catering, you can place your catering order here: [catering link]
```

Do not change current missed-call SMS in MVP unless safely scoped. Catering-aware SMS can be Phase 2.

## QR Code Ordering Integration

### Core Idea

Turn physical traffic into direct digital orders without requiring apps, aggregators, or staff interaction.

### QR Code Types

#### A. Catering QR Code

Links to:

```text
/r/[slug]/catering
```

Use cases:

- Window decal
- Counter signage
- Catering business cards
- Flyers/postcards
- Bag inserts
- Table tents

#### B. General Ordering QR Code

Links to:

```text
/r/[slug]
```

Use cases:

- Window decal
- Table tents
- Counter signage
- Receipts
- Flyers

## Admin QR Generator Concept

Future admin feature:

Generate QR code for:

- Main menu
- Catering menu

Admin should allow download as:

- PNG
- Printable format later

Do not overbuild design tools in MVP. First version can just provide generated QR image/download links.

## Positioning / Messaging

Window decal:

```text
Catering Available — Scan to Order
```

Core positioning:

```text
Turn your storefront window into a catering order channel.
```

Sales copy:

```text
Capture walk-by catering demand without sending customers to marketplaces.
```

## Pricing Strategy

- Include Catering + QR features in Pro and Pro Plus plans for now.
- Offer free initially to increase adoption and perceived value.
- No separate pricing until usage/value is proven.

Do not modify actual pricing from this document.

## SEO + Growth Layer

Future pages:

- `/missed-catering-order-recovery`
- `/catering-order-loss-calculator`
- `/restaurant-catering-qr-code-ordering`

Messaging angle:

- Missed catering calls are high-value losses.
- QR codes turn offline interest into direct orders.
- Direct catering orders avoid aggregator fees where applicable.

## Architecture Alignment

Reuse:

- Existing restaurants/slugs
- Existing menu system
- Existing checkout
- Existing SMS engine
- Existing attempts engine
- Existing admin structure

Avoid:

- Separate catering platform
- Duplicate checkout
- Duplicate menu system
- Complex event/catering logistics in MVP

## Phase 1 MVP Scope

Phase 1 should include:

- Support catering category/tag detection
- Create `/r/[slug]/catering` route
- Show only catering items
- Add basic admin flag or convention for catering category
- Generate QR URLs for:
  - main menu
  - catering menu if enabled
- Add admin copy/download links if QR generation is simple
- No special SMS behavior yet
- No catering-specific attempts logic yet
- No scheduling engine yet
- No complex lead form yet

## Phase 1 Implementation Notes

Implemented Phase 1 as a presentation and routing layer.

- Added `/r/[slug]/catering`.
- The catering route uses the existing menu/category model and shows active items from a category named `Catering`.
- Cart, checkout, modifier selection, order validation, SMS, and attempts behavior remain unchanged.
- Added admin copy links for:
  - main ordering link: `/r/[slug]`
  - catering ordering link: `/r/[slug]/catering`
- QR image generation is still future work.
- Catering-specific SMS copy is still future work.
- Catering scheduling fields, event date, guest count, and catering-specific lead capture are still future work.

## Phase 2 Scope

Phase 2 can include:

- Catering-specific SMS link
- Catering lead fields:
  - event date
  - guest count
  - notes
  - pickup time/date
- Longer attempt window for catering recovery
- Catering calculator
- SEO landing page
- Printable QR/decal assets
- Optional admin analytics for QR scans/orders

## What Not To Build Now

- No separate catering backend
- No full catering marketplace
- No complex scheduling engine
- No delivery logistics
- No custom design editor for QR assets
- No POS integration dependency
- No new payment flow unless required later

## Success Metrics

Track later:

- Catering page visits
- Catering orders
- Catering average order value
- QR scans
- QR-driven orders
- Missed-call to catering order conversion
- Revenue from catering category
- Admin adoption of QR downloads

## Relationship To Current SaanaOS System

This expansion should stay aligned with:

- Missed Call Recovery
- Restaurant Calculators
- Attempts Engine
- Pricing
- Direct ordering

Related docs:

- [Attempts Engine Overview](../attempts-engine/overview.md)
- [Agent Productization Loop](../developer-platform/agent-productization-loop.md)
- [Calculator Standard](../developer-platform/calculator-standard.md)

## Implementation Philosophy

### DO

- Keep it simple.
- Reuse existing flows.
- Add toggles/conventions, not new systems.
- Build the smallest useful routing layer first.

### DO NOT

- Build a separate catering product.
- Over-engineer scheduling/logistics.
- Add unnecessary admin complexity.
- Break existing storefront/checkout behavior.

## Next Implementation Prompt Placeholder

Next Codex implementation prompt should target Phase 1 only:

- Inspect current menu/category data model.
- Inspect storefront route structure.
- Implement `/r/[slug]/catering` using existing menu/category data.
- Add minimal admin support only if current structure makes it safe.
- Preserve all existing menu/checkout behavior.
