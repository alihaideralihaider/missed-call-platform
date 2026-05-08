# SaanaOS Agent Extraction Audit

## 1. Executive Summary

SaanaOS should stay the restaurant execution system: menus, cart, checkout, orders, QR links, admin records, messaging rails, payment/billing primitives, and operator views.

Agents should become independent orchestration layers that observe events, read state, make decisions, call actions, and record outcomes. SaanaOS should expose actions, events, and state. It should not continue absorbing hard-coded campaign, recovery, promotion, follow-up, creative, and offer-selection intelligence.

The current codebase already contains several agent-like areas embedded directly in product routes and API handlers. Missed-call recovery, post-checkout growth, modifier/upsell suggestions, Mystery QR offer selection, and promotion orchestration are not greenfield ideas. They are embedded or partially built agents that need extraction and productization. Other areas, such as review requests, payment/deposit follow-up, print routing, and some insights flows, remain future candidates.

Near-term rule: stop adding new decisioning directly inside SaanaOS unless it is a simple execution primitive. New intelligence should be implemented behind an agent boundary.

## 1.1 Current Embedded Agent Status

SaanaOS already contains partially built agent behavior. The goal is not to invent agents from zero. The goal is to stop embedding more decisioning inside SaanaOS, extract existing embedded agents into independent orchestration layers, and package each extracted agent as a complete product: buyer promise, calculator, deal room, demo, API/actions, webhooks, logs/replay, sandbox, machine-readable docs, metering, billing, and learning loop.

| Agent | Current status | Existing implementation | Extraction/productization need |
| --- | --- | --- | --- |
| Missed Call Recovery Agent | Halfway built inside SaanaOS / missed-call-platform. | Twilio voice/IVR flow; SMS order link; Attempts Engine; `attempt_jobs`; `attempt_messages`; `attempt_events`; cron runner; success/expired state handling. | Move retry policy, message selection, suppression, and recovery decisions out. Keep webhook receivers, SMS send action, order link generation, logs, and order records as execution primitives. |
| Post-Checkout Growth / Revenue Agent | Internal validated prototype slices already built. | Painful event: `checkout_completed`; product promise: turn any checkout into the next sale; event intake via webhook/API; agent run: `post_checkout_revenue_run`; actions: `offer_addon`, `send_sms`, `send_webhook`; attempts: immediate offer, reminder, expire; outcome: `add_on_purchased` / `expired`; delivery: webhook + SFTP batch; metering: `agent_run`, `action_execution`, `outcome_recorded`; billing: future usage-based plan; deal room: page explaining offer, flow, examples, FAQs; learning: track conversion by offer/timing/customer segment. | Externalize offer/suppression decisioning and keep SaanaOS/AuthToolkit as event/action/outcome infrastructure. This is not just an API; it needs the full agent product package. |
| Modifier/Upsell Agent | Halfway built inside SaanaOS. | `/api/agent/suggestions/modifier`; `/api/agent/suggestions/apply`; `/api/v1/agent/actions/suggest-modifier`; `/api/v1/agent/actions/apply-modifier`; storefront modifier suggestion hooks if present. | Move suggestion ranking, suppression, social proof, and optimization out. Keep modifier records and cart mutation inside SaanaOS. |
| Mystery QR Offer Agent | Newly embedded Phase 1. | `/r/[slug]/mystery`; localStorage reveal state; approved static offer pool; phone consent copy; 30-day expiration behavior. | Move offer selection, campaign window, reveal state, and consent/reveal decisions into an agent. Keep the public route and UI shell in SaanaOS. |
| Promotion Orchestration Agent | Promotion records/admin are built; orchestration boundary not extracted yet. | Promotions admin; templates; summary; image source selection; AI image generation; promotion rules/targets. | Keep approved offers and CRUD in SaanaOS. Move campaign selection, audience/timing, offer sequencing, suppression, and optimization to an agent. |

## 1.2 Agent Productization Package

An extracted agent should not be just an API. Each agent product should include:

- Painful business event.
- Buyer-facing promise.
- Calculator.
- Deal room.
- Demo/sandbox.
- Event intake.
- Agent run trace.
- Actions/skills.
- Attempts/follow-up.
- Outcomes.
- Delivery back to client via webhook, SFTP, or API.
- Logs/replay/debugging.
- Machine-readable docs, `SKILL.md`, and MCP-ready docs.
- Metering.
- Billing.
- Learning loop.

## 2. Current SaanaOS Core Capabilities

These are normal restaurant software capabilities and should remain inside SaanaOS core.

### Storefront and Ordering

- Public restaurant storefront: `worker/web/app/r/[slug]/page.tsx`
- Catering presentation route: `worker/web/app/r/[slug]/catering/page.tsx`
- Cart page: `worker/web/app/r/[slug]/cart/page.tsx`
- Checkout page: `worker/web/app/r/[slug]/checkout/page.tsx`
- Success page: `worker/web/app/r/[slug]/success/page.tsx`
- Storefront menu component: `worker/web/components/storefront/RestaurantMenuClient.tsx`
- Cart utilities: `worker/web/lib/cart.ts`
- Shared menu loading: `worker/web/lib/storefront/loadRestaurantMenu.ts`

Core responsibility: load restaurant/menu state, let customers build a cart, collect pickup/order details, submit orders, and render order confirmation.

### Menu, Categories, Modifiers, and Assets

- Admin menu page: `worker/web/app/admin/restaurants/[slug]/menu/page.tsx`
- Menu categories API: `worker/web/app/api/admin/restaurants/[slug]/menu-categories/route.ts`
- Menu item API: `worker/web/app/api/admin/restaurants/[slug]/menu-items/route.ts`
- Menu item modifier API: `worker/web/app/api/admin/restaurants/[slug]/menu-items/[itemId]/modifiers/route.ts`
- Asset APIs: `worker/web/app/api/admin/restaurants/[slug]/assets/route.ts`, `worker/web/app/api/admin/restaurants/[slug]/assets/enhance/route.ts`

Core responsibility: CRUD records, attach/detach reusable modifier groups, store images/assets, expose item/category state. Suggestion logic should move out, but the records and execution surfaces should stay.

### Orders and Status Execution

- Admin orders page: `worker/web/app/admin/restaurants/[slug]/orders/page.tsx`
- Order status API: `worker/web/app/api/admin/restaurants/[slug]/orders/[orderId]/status/route.ts`
- Worker order creation path: `worker/src/index.ts`

Core responsibility: create and store orders, store line items/modifier selections, update order status, show orders to restaurant staff, and execute status-message sends when instructed.

### QR Display and Public Links

- Admin QR cards in `worker/web/app/admin/restaurants/[slug]/menu/page.tsx`
- Main ordering URL: `/r/[slug]`
- Catering URL: `/r/[slug]/catering`
- Mystery QR URL: `/r/[slug]/mystery`

Core responsibility: display/download QR codes and route traffic to public pages. Campaign selection and offer logic should move out.

### Promotions as Records

- Promotions admin page: `worker/web/app/admin/restaurants/[slug]/promotions/page.tsx`
- Promotions collection API: `worker/web/app/api/admin/restaurants/[slug]/promotions/route.ts`
- Promotion detail API: `worker/web/app/api/admin/restaurants/[slug]/promotions/[promotionId]/route.ts`
- Promotion image generation API: `worker/web/app/api/admin/restaurants/[slug]/promotions/generate-image/route.ts`

Core responsibility: store restaurant-approved promotions, rules, targets, images, active dates, and status. Selecting which promotion to show, when, and to whom should move out.

### Messaging, Billing, Usage, and Platform Admin

- SMS provider wrapper: `worker/web/lib/messaging/sendSms.ts`
- Twilio voice routes: `worker/web/app/api/twilio/voice/*`
- Worker voice/order paths: `worker/src/index.ts`
- Billing routes/components: `worker/web/app/api/billing/*`, `worker/web/components/admin/RestaurantBillingActions.tsx`, `worker/web/lib/billing.ts`
- Usage helpers: `worker/web/lib/restaurant-usage.ts`, `worker/src/usage.ts`
- Trust/risk admin and APIs: `worker/web/app/platform/trust/*`, `worker/web/app/api/platform/trust/*`, `worker/web/lib/platform/risk-links.ts`

Core responsibility: execute provider calls, record usage, expose trust/admin state, and keep account/billing data reliable.

## 3. Agent Candidates and Embedded Agents Found

### 3.1 Missed Call Recovery Agent

- **Bucket:** B) Extract as independent agent, with C) API/action surface.
- **Current status:** Embedded/partially built agent inside SaanaOS / missed-call-platform.
- **Business outcome:** Recover missed calls into direct pickup orders.
- **Current code areas:** `worker/src/index.ts`, `worker/web/lib/attempts/universalAttemptsEngine.ts`, `worker/web/app/api/cron/attempts/run/route.ts`, `worker/web/app/api/v1/agent/events/route.ts`.
- **Tables/routes currently involved:** `attempt_jobs`, `attempt_messages`, `attempt_events`, `usage_events`, `food_ordering.orders`, Twilio voice route `/twilio/voice/[slug]`.
- **Why it is agent-like:** The Attempts Engine contains decision timing, follow-up state, expiry, success/failure transitions, and hard-coded recovery copy. Constants such as `ATTEMPT_2_DELAY_MINUTES`, `ATTEMPT_3_DELAY_MINUTES`, and `ATTEMPT_EXPIRY_HOURS` are orchestration policy.
- **Trigger events:** `missed_call_received`, IVR consent, `sms_link_sent`, no order after link, order placed.
- **Required inputs/state:** Restaurant slug, customer phone, consent status, order URL, attempt history, order status, quiet-hour/compliance state.
- **Decisions:** Whether to send an order link, when to follow up, when to stop, whether to suppress, what message copy to use, when to mark recovered or expired.
- **Actions it calls:** `send_order_link`, `create_attempt`, `send_followup`, `record_outcome`, `mark_attempt_succeeded`, `mark_attempt_expired`.
- **What should remain in SaanaOS:** Twilio webhook receiver, SMS provider execution, order link generation, order storage, usage records, attempt/job tables as execution logs if retained.
- **What should move out:** Recovery timing, retry policy, message selection, suppression, recovery outcome decisioning.
- **Suggested future repo/service name:** `missed-call-recovery-agent`.
- **MVP extraction difficulty:** Medium.
- **Revenue potential:** High.
- **Priority:** Now.

### 3.2 Post-Checkout Growth / Revenue Agent

- **Bucket:** B) Extract as independent agent.
- **Current status:** Internally validated prototype slices already built.
- **Business outcome:** Turn completed checkout/order events into next revenue actions.
- **Current code areas:** `worker/web/app/api/v1/agent/events/route.ts`, `worker/web/app/api/v1/agent/outcomes/post-checkout/route.ts`, `worker/web/app/api/v1/agent/runs/[runId]/route.ts`, `worker/web/lib/agent-api/v1.ts`, `docs/future-agents/post-checkout-revenue-agent/technical-implementation-plan-v1.md`.
- **Tables/routes currently involved:** `agent_events`, `agent_runs`, `agent_actions`, `usage_events`; `/api/v1/agent/events`; `/api/v1/agent/outcomes/post-checkout`.
- **Why it is agent-like:** The route already contains `buildStaticPostCheckoutOfferDecision(body)`, which decides `create_static_offer` versus `suppress_offer`. It records outcomes and can deliver webhooks.
- **Trigger events:** `checkout_completed`, `order_completed`, `payment_completed`.
- **Required inputs/state:** Order total, items, source system, customer contact/consent, offer catalog, suppression rules, webhook destination.
- **Decisions:** Whether to offer, which offer to use, whether to suppress, when to expire, what outcome to record.
- **Actions it calls:** `create_static_offer`, `suppress_offer`, `record_post_checkout_outcome`, `send_webhook`, `record_usage`.
- **What should remain in SaanaOS:** Order/checkout event production, webhook delivery primitive, trace storage, usage metering, action logs.
- **What should move out:** Offer selection, suppression rules, timing, optimization, future connector-specific logic.
- **Suggested future repo/service name:** `post-checkout-growth-agent`.
- **MVP extraction difficulty:** Medium.
- **Revenue potential:** High.
- **Priority:** Now after the action/event API boundary is formalized.

### 3.3 Mystery QR Offer Agent

- **Bucket:** B) Extract as independent agent.
- **Current status:** Newly embedded Phase 1 agent behavior.
- **Business outcome:** Convert offline QR scans into restaurant-approved offer reveals and return orders.
- **Current code areas:** `worker/web/app/r/[slug]/mystery/page.tsx`, `worker/web/app/r/[slug]/mystery/MysteryOfferClient.tsx`, `worker/web/app/admin/restaurants/[slug]/menu/page.tsx`.
- **Tables/routes currently involved:** No durable DB table in Phase 1; localStorage key `saanaos:mystery-offer-state:[slug]`; public route `/r/[slug]/mystery`.
- **Why it is agent-like:** `MysteryOfferClient.tsx` embeds the offer pool, reveal sequence, consent copy, 30-day window, expiration behavior, and offer-code mapping.
- **Trigger events:** `qr_scanned`, `offer_reveal_requested`, phone submitted, consent submitted, campaign expired.
- **Required inputs/state:** Restaurant slug/name, approved offers, customer phone, restaurant-specific consent, prior reveal state, campaign window.
- **Decisions:** Which approved offer to reveal, whether the offer window is expired, whether to suppress or show order/catering CTAs, which checkout code to display.
- **Actions it calls:** `record_qr_scan`, `record_customer_consent`, `reveal_offer`, `record_outcome`, `apply_promo` later.
- **What should remain in SaanaOS:** Public QR route, restaurant page rendering, QR display/download, order/catering CTAs, promo-code execution primitive.
- **What should move out:** Offer rotation, campaign expiration policy, consent/reveal state, campaign recommendations.
- **Suggested future repo/service name:** `mystery-qr-agent`.
- **MVP extraction difficulty:** Low.
- **Revenue potential:** High.
- **Priority:** Now.

### 3.4 Catering Lead Recovery Agent

- **Bucket:** B) Extract as independent agent.
- **Business outcome:** Recover higher-value catering demand from visits, calls, QR scans, carts, and inquiries.
- **Current code areas:** `worker/web/app/r/[slug]/catering/page.tsx`, `worker/web/lib/storefront/loadRestaurantMenu.ts`, `docs/future-features/saanaos-catering-qr-capture.md`, admin QR links in `worker/web/app/admin/restaurants/[slug]/menu/page.tsx`.
- **Tables/routes currently involved:** `food_ordering.menu_categories`, `food_ordering.menu_items`, existing cart/checkout/order tables.
- **Why it is agent-like:** The current route is only presentation. The next natural features are lead capture, abandoned catering cart recovery, long-window follow-up, deposits, and quote/payment follow-up, all of which are agent behavior.
- **Trigger events:** `catering_page_viewed`, catering QR scan, catering item added, checkout started but not completed, catering inquiry, missed catering call.
- **Required inputs/state:** Catering category/items, customer contact/consent, cart contents, event date/guest count when added later, order value.
- **Decisions:** Whether to follow up, when to follow up, whether to ask for details, whether to suggest deposit/payment, whether to route to staff.
- **Actions it calls:** `send_message`, `create_attempt`, `request_deposit`, `record_outcome`, `create_catering_lead`.
- **What should remain in SaanaOS:** Catering menu route, cart/checkout, order storage, category convention, QR links.
- **What should move out:** Lead recovery timing, catering-specific follow-up, quote/deposit orchestration.
- **Suggested future repo/service name:** `catering-lead-recovery-agent`.
- **MVP extraction difficulty:** Medium.
- **Revenue potential:** High.
- **Priority:** Later, after Mystery QR and missed-call boundaries.

### 3.5 Promotion Orchestration Agent

- **Bucket:** B) Extract as independent agent, with A) promotion records kept in SaanaOS.
- **Current status:** Promotion records/admin are built; orchestration boundary is not extracted yet.
- **Business outcome:** Use restaurant-approved offers to drive orders without requiring owners to make campaign decisions.
- **Current code areas:** `worker/web/app/admin/restaurants/[slug]/promotions/page.tsx`, `worker/web/app/api/admin/restaurants/[slug]/promotions/route.ts`, `worker/web/app/api/admin/restaurants/[slug]/promotions/[promotionId]/route.ts`, static promo evaluation in `worker/src/index.ts`.
- **Tables/routes currently involved:** `growth.promotions`, `growth.promotion_rules`, `growth.promotion_targets`, checkout/order submission in `worker/src/index.ts`.
- **Why it is agent-like:** Admin now stores approved offers, but checkout has static hard-coded Phase 1 codes (`MYSTERY10`, `PICKUP5`, `CATERING20`, `FREEDRINK`, `FREESAUCE`, `DIRECT`). Choosing which offer to show, route, expire, or suppress should not live in checkout.
- **Trigger events:** Promotion created, campaign window starts, slow period detected, QR scan, cart started, checkout started.
- **Required inputs/state:** Approved promotions, target type, category/menu item, current cart, campaign window, customer consent, past performance.
- **Decisions:** Which approved promotion to show, whether to suppress, which channel/QR/campaign gets the offer, when to expire.
- **Actions it calls:** `create_promotion`, `select_promotion`, `reveal_offer`, `apply_promo`, `record_promo_outcome`.
- **What should remain in SaanaOS:** Promotion CRUD, rule/target storage, checkout promo-application primitive, order metadata.
- **What should move out:** Campaign selection, optimization, audience decisions, offer sequencing.
- **Suggested future repo/service name:** `promotion-orchestration-agent`.
- **MVP extraction difficulty:** Medium.
- **Revenue potential:** High.
- **Priority:** Now.

### 3.6 Review Request Agent

- **Bucket:** D) Leave as future idea / do not build now.
- **Business outcome:** Ask customers for reviews at the right time.
- **Current code areas:** No complete implementation found; related order status and messaging surfaces exist in `worker/web/app/api/admin/restaurants/[slug]/orders/[orderId]/status/route.ts` and `worker/web/lib/messaging/sendSms.ts`.
- **Why it is agent-like:** Review timing, suppression, channel choice, and copy are decisioning, not restaurant execution.
- **Trigger events:** `order_completed`, `order_ready`, pickup completed.
- **Required inputs/state:** Order status, customer consent, review links, prior review requests.
- **Decisions:** Whether to ask, when to ask, which link/copy to use, whether to suppress.
- **Actions it calls:** `send_message`, `record_review_request`, `record_outcome`.
- **What should remain in SaanaOS:** Order status events, message send primitive, restaurant review link settings.
- **What should move out:** Timing/copy/suppression logic.
- **Suggested future repo/service name:** `review-request-agent`.
- **MVP extraction difficulty:** Low.
- **Revenue potential:** Medium.
- **Priority:** Park until core revenue agents are separated.

### 3.7 Modifier/Upsell Agent

- **Bucket:** B) Extract as independent agent.
- **Current status:** Embedded/partially built agent inside SaanaOS Agent API and storefront flows.
- **Business outcome:** Increase average order value by suggesting relevant modifiers/add-ons.
- **Current code areas:** `worker/web/app/api/agent/suggestions/modifier/route.ts`, `worker/web/app/api/agent/suggestions/apply/route.ts`, `worker/web/app/api/v1/agent/actions/suggest-modifier/route.ts`, `worker/web/app/api/v1/agent/actions/apply-modifier/route.ts`, `worker/web/components/storefront/RestaurantMenuClient.tsx`.
- **Tables/routes currently involved:** `food_ordering.menu_item_modifier_groups`, `food_ordering.modifier_groups`, `food_ordering.modifier_options`, `food_ordering.orders`, `food_ordering.order_items`, `food_ordering.order_item_modifier_selections`, `agent_modifier_suggestions`, `agent_runs`, `agent_actions`.
- **Why it is agent-like:** The modifier suggestion route contains heuristics, suppression rules, performance ranking, social-proof variants, and decision logging.
- **Trigger events:** `item_opened`, `cart_item_added`, `modifier_suggestion_requested`, `checkout_started`.
- **Required inputs/state:** Current item, attached modifier options, cart subtotal, past order data, previous accepted/skipped suggestions.
- **Decisions:** Whether to suggest, which option to suggest, which message variant to use, when to suppress after repeated skips.
- **Actions it calls:** `attach_modifier_suggestion`, `apply_modifier`, `skip_modifier_suggestion`, `record_outcome`.
- **What should remain in SaanaOS:** Modifier groups/options, item-modal UI, cart mutation, order storage.
- **What should move out:** Suggestion ranking, heuristics, suppression, social proof, optimization.
- **Suggested future repo/service name:** `modifier-upsell-agent`.
- **MVP extraction difficulty:** Low to medium.
- **Revenue potential:** Medium to high.
- **Priority:** Now or next after Mystery QR.

### 3.8 Kitchen Print Agent / Order Routing Agent

- **Bucket:** D) Future idea now; C) action surface needed.
- **Business outcome:** Reliably route orders to kitchen printers or staff systems.
- **Current code areas:** No full printer implementation found. Order creation and status state exist in `worker/src/index.ts` and admin orders routes.
- **Why it is agent-like:** Print formatting, routing, retry, fallback, and failure escalation are orchestration decisions.
- **Trigger events:** `order_created`, `order_confirmed`, print failed.
- **Required inputs/state:** Restaurant printer settings, order details, printer health, retry history.
- **Decisions:** Which printer/format to use, whether to retry, when to alert staff.
- **Actions it calls:** `print_order`, `retry_print`, `mark_print_failed`, `send_admin_alert`.
- **What should remain in SaanaOS:** Order storage, printer configuration, print execution hook.
- **What should move out:** Retry/routing/failure policy.
- **Suggested future repo/service name:** `order-routing-agent`.
- **MVP extraction difficulty:** High.
- **Revenue potential:** Medium.
- **Priority:** Park.

### 3.9 Trust/Risk Agent

- **Bucket:** B) Extract risk decisioning; A) keep trust/admin records.
- **Business outcome:** Detect risky platform, restaurant, or customer behavior without burying fraud rules in admin pages.
- **Current code areas:** `worker/web/app/platform/trust/*`, `worker/web/app/api/platform/trust/*`, `worker/web/lib/platform/risk-links.ts`, `worker/web/lib/platform/activity.ts`, `worker/web/lib/platform/ip-geo.ts`.
- **Why it is agent-like:** Risk scoring, suspicious-pattern detection, and recommended action are decision logic.
- **Trigger events:** Restaurant onboarding, admin login/activity, unusual IP/device patterns, payment/order anomalies.
- **Required inputs/state:** Account activity, IP/geography, restaurant onboarding data, billing status, order/promo activity.
- **Decisions:** Flag risk, request review, restrict action, recommend manual check.
- **Actions it calls:** `record_risk_event`, `flag_account`, `request_review`, `record_outcome`.
- **What should remain in SaanaOS:** Raw activity capture, admin trust pages, account status primitives.
- **What should move out:** Risk scoring and recommended interventions.
- **Suggested future repo/service name:** `trust-risk-agent`.
- **MVP extraction difficulty:** Medium.
- **Revenue potential:** Medium.
- **Priority:** Later.

### 3.10 Promotion Creative Agent

- **Bucket:** B) Extract as independent agent; A) keep asset storage.
- **Business outcome:** Help restaurants create better campaign images while preserving approved offer records.
- **Current code areas:** `worker/web/app/api/admin/restaurants/[slug]/promotions/generate-image/route.ts`, `worker/web/app/api/admin/restaurants/[slug]/assets/enhance/route.ts`, `worker/web/app/admin/restaurants/[slug]/promotions/page.tsx`.
- **Tables/routes currently involved:** Supabase Storage bucket `restaurant-assets`; menu item assets in `food_ordering.menu_item_assets`; promotion image URL stored on promotion records.
- **Why it is agent-like:** Prompt construction, asset choice, and creative strategy are decisioning. The route already builds prompts and blocks text/logo/QR-code artifacts.
- **Trigger events:** Promotion created, target selected, campaign creative requested.
- **Required inputs/state:** Restaurant name, promotion summary, target item/category, existing assets, style constraints.
- **Decisions:** Choose existing asset or generate, construct prompt, decide whether output is usable.
- **Actions it calls:** `generate_promo_image`, `select_existing_asset`, `store_asset`, `record_outcome`.
- **What should remain in SaanaOS:** Asset upload/storage, image URL persistence, admin image picker.
- **What should move out:** Prompt strategy, creative testing, asset recommendation.
- **Suggested future repo/service name:** `promotion-creative-agent`.
- **MVP extraction difficulty:** Low.
- **Revenue potential:** Medium.
- **Priority:** Later.

### 3.11 Insights Agent

- **Bucket:** B) Extract as independent agent.
- **Business outcome:** Turn restaurant activity into plain-English recommendations.
- **Current code areas:** `worker/web/app/admin/restaurants/[slug]/insights/page.tsx`, sales/analytics APIs under `worker/web/app/api/admin/restaurants/[slug]/sales/*`, usage helpers.
- **Why it is agent-like:** Summaries, anomaly detection, and recommendations are decisioning.
- **Trigger events:** Daily/weekly rollup, promotion ended, QR campaign expired, missed-call recovery outcome, sales change.
- **Required inputs/state:** Orders, sales, promo usage, QR scans, attempt outcomes, usage events.
- **Decisions:** What worked, what failed, what next action to recommend.
- **Actions it calls:** `summarize_insights`, `recommend_action`, `record_outcome`.
- **What should remain in SaanaOS:** Raw reports, charts, data access.
- **What should move out:** Narrative summaries and recommendations.
- **Suggested future repo/service name:** `restaurant-insights-agent`.
- **MVP extraction difficulty:** Medium.
- **Revenue potential:** Medium.
- **Priority:** Later.

### 3.12 Payment/Deposit Follow-Up Agent

- **Bucket:** D) Future idea / do not build now.
- **Business outcome:** Recover unpaid catering deposits or order payments.
- **Current code areas:** Checkout/order/payment primitives exist, but no complete deposit workflow was found.
- **Why it is agent-like:** Follow-up timing, deposit reminders, and payment recovery decisions are orchestration.
- **Trigger events:** Unpaid order, catering quote, invoice/deposit pending, payment failed.
- **Required inputs/state:** Order/quote amount, customer contact/consent, payment link, due date, prior attempts.
- **Decisions:** Whether to remind, when, which payment link, when to escalate/expire.
- **Actions it calls:** `create_payment_link`, `send_payment_followup`, `record_payment_outcome`.
- **What should remain in SaanaOS:** Payment/order records and payment-link execution.
- **What should move out:** Recovery timing and reminder policy.
- **Suggested future repo/service name:** `payment-followup-agent`.
- **MVP extraction difficulty:** High.
- **Revenue potential:** Medium to high.
- **Priority:** Park.

### 3.13 Order Status Agent

- **Bucket:** B) Extract status messaging decisioning; A) keep order status execution.
- **Business outcome:** Reduce calls and confusion by sending useful status updates.
- **Current code areas:** `worker/web/app/api/admin/restaurants/[slug]/orders/[orderId]/status/route.ts`, `worker/web/lib/messaging/sendSms.ts`.
- **Why it is agent-like:** `buildStatusMessage()` hard-codes message copy for confirmed/ready/cancelled. Future delayed-pickup and proactive updates are decisioning.
- **Trigger events:** Order accepted, order ready, order delayed, order cancelled.
- **Required inputs/state:** Order status, customer opt-in, pickup time, kitchen delay, message history.
- **Decisions:** Whether to send, what to say, when to suppress.
- **Actions it calls:** `send_order_status_message`, `record_message_log`, `record_outcome`.
- **What should remain in SaanaOS:** Status update primitive, order status record, SMS send execution.
- **What should move out:** Message timing, delay detection, copy selection.
- **Suggested future repo/service name:** `order-status-agent`.
- **MVP extraction difficulty:** Low.
- **Revenue potential:** Medium.
- **Priority:** Later.

### 3.14 Consent Management Agent

- **Bucket:** C) Convert to API/action surface first; B) extract policy later.
- **Business outcome:** Maintain restaurant-specific consent across checkout, IVR, QR, STOP/HELP, and future campaigns.
- **Current code areas:** `worker/web/app/api/consent/sms-status/route.ts`, Twilio voice routes under `worker/web/app/api/twilio/voice/*`, checkout opt-in flow, Mystery QR localStorage consent copy in `worker/web/app/r/[slug]/mystery/MysteryOfferClient.tsx`.
- **Tables/routes currently involved:** `sms_consents`, customer/contact records, Twilio status webhooks where present.
- **Why it is agent-like:** Consent policy and channel eligibility are cross-product decisions. However, the first need is a reliable consent action/state surface.
- **Trigger events:** `consent_granted`, `consent_revoked`, QR opt-in, checkout opt-in, IVR opt-in, STOP/HELP.
- **Required inputs/state:** Restaurant, customer phone/email, consent source, consent text, timestamp, channel, opt-out status.
- **Decisions:** Whether a channel is allowed, whether promotional versus transactional messaging is permitted, whether to suppress.
- **Actions it calls:** `record_customer_consent`, `record_opt_out`, `check_channel_permission`, `suppress_message`.
- **What should remain in SaanaOS:** Consent records and provider webhook ingestion.
- **What should move out:** Cross-campaign eligibility policy and suppression rules.
- **Suggested future repo/service name:** `consent-management-agent`.
- **MVP extraction difficulty:** Medium.
- **Revenue potential:** High as enabling infrastructure.
- **Priority:** Now as API/action surface; agent later.

### 3.15 QR Campaign Agent

- **Bucket:** B) Extract as independent agent.
- **Business outcome:** Turn static printed QR assets into managed campaigns with routing, expiry, and recommended rotations.
- **Current code areas:** Admin QR section in `worker/web/app/admin/restaurants/[slug]/menu/page.tsx`, Mystery route in `worker/web/app/r/[slug]/mystery/*`, buyer pages such as `worker/web/app/mystery-qr-revenue-calculator/page.tsx` and `worker/web/app/restaurant-calculators/page.tsx`.
- **Why it is agent-like:** QR routing is currently simple, but campaign expiration, counter-card rotation, scan learning, and offer selection are orchestration.
- **Trigger events:** `qr_scanned`, campaign starts, campaign expires, offer revealed, promo applied.
- **Required inputs/state:** QR type, campaign window, restaurant-approved offers, scan counts, location/material type if tracked.
- **Decisions:** Route to menu/catering/mystery, expire campaign, suggest new QR card, choose offer strategy.
- **Actions it calls:** `record_qr_scan`, `route_qr`, `reveal_offer`, `record_outcome`, `suggest_campaign_rotation`.
- **What should remain in SaanaOS:** QR code display/download and public route rendering.
- **What should move out:** Campaign policy, scan learning, rotation recommendations.
- **Suggested future repo/service name:** `qr-campaign-agent`.
- **MVP extraction difficulty:** Low to medium.
- **Revenue potential:** High.
- **Priority:** Now after Mystery QR extraction.

## 4. Recommended Extraction Map

| Agent | Keep in SaanaOS | Move to Agent | Required APIs | Priority |
| --- | --- | --- | --- | --- |
| Missed Call Recovery Agent | Twilio receiver, SMS execution, order link, order storage, usage logs | Retry timing, recovery copy, suppression, outcome decisioning | events, send-message, create-attempt, record-outcome | Now |
| Post-Checkout Growth / Revenue Agent | Checkout/order event production, trace/action logs, webhook execution | Offer selection, suppression, expiration, connector decisions | events, create-promotion/reveal-offer, send-webhook, record-outcome | Now |
| Mystery QR Offer Agent | `/r/[slug]/mystery` shell, QR display/download, order/catering CTAs | Offer rotation, 30-day window policy, consent/reveal state | record-qr-scan, record-consent, reveal-offer, record-outcome | Now |
| Catering Lead Recovery Agent | Catering route, cart/checkout, order storage, category convention | Abandoned catering recovery, long-window follow-up, deposit request decisions | catering events, create-attempt, send-message, request-deposit | Later |
| Promotion Orchestration Agent | Promotion CRUD, rule/target records, checkout apply primitive | Campaign selection, audience/timing, suppression, optimization | create-promotion, select-promotion, apply-promo, record-outcome | Now |
| Review Request Agent | Order status events, review link settings, message primitive | Review timing, copy, suppression | send-message, record-review-request, record-outcome | Park |
| Modifier/Upsell Agent | Modifier records, cart mutation, item modal | Suggestion ranking, suppression, social proof | suggest-modifier, apply-modifier, record-outcome | Now |
| Order Routing Agent | Order storage, printer settings, print hook | Print route/format/retry policy | print-order, retry-print, record-outcome | Park |
| Trust/Risk Agent | Activity capture, trust admin pages, account status | Risk scoring and interventions | record-risk-event, flag-account, request-review | Later |
| Promotion Creative Agent | Asset storage, image picker, promotion image URL | Prompt strategy, asset recommendation, creative variants | generate-creative, store-asset, record-outcome | Later |
| Insights Agent | Raw reports, sales/order/usage data | Summaries and next-action recommendations | summarize-insights, recommend-action | Later |
| Payment/Deposit Follow-Up Agent | Payment/order primitives | Deposit/payment recovery timing | create-payment-link, send-followup, record-outcome | Park |
| Order Status Agent | Status update primitive, order status records | Timing/copy/suppression | send-order-status-message, record-outcome | Later |
| Consent Management Agent | Consent record store, provider webhooks | Eligibility/suppression policy | record-consent, revoke-consent, check-permission | Now as API |
| QR Campaign Agent | QR rendering/download, public routes | Campaign routing, expiry, rotation recommendations | record-qr-scan, route-qr, reveal-offer | Now/later |

## 5. API/Action Surface Needed

SaanaOS should expose normalized events, state reads, and narrow actions. Agents should call these instead of embedding code inside SaanaOS routes.

### Event Intake

- `POST /api/v1/events`
  - Accept normalized restaurant events with idempotency.
  - Current related route: `worker/web/app/api/v1/agent/events/route.ts`.
  - Should support events such as missed calls, cart activity, checkout/order completion, QR scans, promo application, consent changes, and print jobs.

### State Reads

- `GET /api/v1/state/restaurants/{restaurantIdOrSlug}`
- `GET /api/v1/state/restaurants/{restaurantIdOrSlug}/menu`
- `GET /api/v1/state/restaurants/{restaurantIdOrSlug}/orders/{orderId}`
- `GET /api/v1/state/restaurants/{restaurantIdOrSlug}/customers/{customerIdOrPhone}`
- `GET /api/v1/state/restaurants/{restaurantIdOrSlug}/promotions`
- `GET /api/v1/state/restaurants/{restaurantIdOrSlug}/attempts`
- `GET /api/v1/state/restaurants/{restaurantIdOrSlug}/consents`

These should expose read-only restaurant execution state without letting agents reach directly into product-specific internals.

### Actions

- `POST /api/v1/actions/create-promotion`
- `POST /api/v1/actions/reveal-offer`
- `POST /api/v1/actions/apply-promo`
- `POST /api/v1/actions/send-message`
- `POST /api/v1/actions/create-attempt`
- `POST /api/v1/actions/send-followup`
- `POST /api/v1/actions/print-order`
- `POST /api/v1/actions/generate-creative`
- `POST /api/v1/actions/attach-modifier-suggestion`
- `POST /api/v1/actions/apply-modifier`
- `POST /api/v1/actions/record-qr-scan`
- `POST /api/v1/actions/record-customer-consent`
- `POST /api/v1/actions/record-outcome`

Existing action precedents:

- `worker/web/app/api/v1/agent/actions/suggest-modifier/route.ts`
- `worker/web/app/api/v1/agent/actions/apply-modifier/route.ts`
- `worker/web/app/api/v1/agent/outcomes/post-checkout/route.ts`
- `worker/web/lib/agent-api/v1.ts`

### Execution Contract

Every action should be:

- Idempotent.
- Traceable through `agent_runs` and `agent_actions`.
- Metered through `usage_events`.
- Permissioned to a restaurant/account.
- Narrow enough that agents can orchestrate without owning SaanaOS internals.

## 6. Event Backbone Needed

Normalize these events before extracting more agents:

- `missed_call_received`
- `sms_link_sent`
- `order_link_clicked`
- `cart_started`
- `checkout_started`
- `order_created`
- `order_completed`
- `order_status_changed`
- `qr_scanned`
- `mystery_offer_revealed`
- `promo_applied`
- `promo_redeemed`
- `promotion_created`
- `promotion_window_started`
- `catering_page_viewed`
- `modifier_suggestion_requested`
- `modifier_suggestion_accepted`
- `modifier_suggestion_skipped`
- `print_job_created`
- `print_job_failed`
- `review_requested`
- `payment_pending`
- `consent_granted`
- `consent_revoked`
- `webhook_delivery_succeeded`
- `webhook_delivery_failed`

Current partial backbone exists in:

- Agent events: `worker/web/app/api/v1/agent/events/route.ts`
- Agent runs/actions: `worker/web/lib/agent-api/v1.ts`
- Usage records: `worker/web/lib/metering/usageEvents.ts`, `worker/src/usage.ts`
- Attempts logs: `worker/web/lib/attempts/universalAttemptsEngine.ts`

## 7. Stop-Building-In-SaanaOS List

Stop adding these deeper into SaanaOS runtime:

- Hard-coded promotion intelligence in checkout/order paths such as static promo-code decisioning in `worker/src/index.ts`.
- Advanced campaign optimization inside admin pages.
- Autonomous offer decisioning inside `worker/web/app/r/[slug]/mystery/MysteryOfferClient.tsx`.
- More static Post-Checkout offer logic inside `worker/web/app/api/v1/agent/events/route.ts`.
- Complex retry logic outside the Attempts/agent layer.
- Customer reactivation logic inside storefront/admin routes.
- Review timing logic inside order status APIs.
- AI creative strategy logic inside promotion admin routes.
- Modifier upsell ranking and suppression inside `worker/web/app/api/agent/suggestions/modifier/route.ts`.
- Catering recovery or deposit follow-up inside the catering storefront route.
- QR campaign expiry/rotation intelligence inside admin QR cards.
- Unique one-time code systems until promotion/event/action boundaries are stable.
- POS integrations, print fulfillment marketplaces, and complex campaign analytics until core agent boundaries exist.

Allowed inside SaanaOS:

- CRUD records.
- Execution primitives.
- State views.
- Provider/webhook adapters.
- Idempotent action endpoints.
- Metering and trace logs.

## 8. Near-Term Recommendation

1. Freeze new intelligence-heavy SaanaOS features.

   Continue fixing bugs and improving execution surfaces, but stop adding new offer selection, follow-up optimization, campaign logic, and creative strategy inside SaanaOS routes/components.

2. Formalize the SaanaOS/AuthToolkit action/event API layer.

   Expand the existing Agent API foundation around normalized events, state reads, narrow actions, traceable `agent_runs`/`agent_actions`, and non-billable `usage_events` while behavior is validated.

3. Treat currently embedded agents as extraction projects, not new builds.

   Missed-call recovery, Post-Checkout Growth / Revenue, Modifier/Upsell, Mystery QR Offer, and Promotion Orchestration already have partial behavior in SaanaOS / missed-call-platform. The work is to extract, harden, and productize them behind a clean event/action boundary.

4. Recommended extraction order:

   - **Mystery QR Offer Agent first** because it is isolated and low blast radius.
   - **Modifier/Upsell Agent second** because agent APIs already exist.
   - **Missed Call Recovery Agent third** because it is high-value but coupled to Twilio, Attempts, and SMS.
   - **Post-Checkout Growth / Revenue Agent fourth** as the externally productized agent package.
   - **Promotion Orchestration Agent after the promotion/action boundary stabilizes.**

## 9. Suggested Repo/Service Layout

- `saanaos`
  - Restaurant execution system.
  - Owns menus, cart, checkout, orders, admin views, QR rendering, payment/order primitives, provider adapters, action endpoints, event logs, and usage/metering.

- `recoverystack-agents`
  - Shared agent orchestration layer.
  - Owns event routing, run orchestration, policy execution, retries, suppression, agent traces, and common agent SDK/runtime patterns.

- `authtoolkit`
  - API/action/auth/webhook infrastructure.
  - Owns auth, API keys, webhooks, idempotency, public developer docs, Postman/OpenAPI assets, and reusable action infrastructure.

- `missed-call-recovery-agent`
  - Standalone recovery agent.
  - Observes missed-call and order events.
  - Calls SaanaOS actions to send messages, create attempts, and record outcomes.

- `post-checkout-growth-agent`
  - Standalone post-checkout revenue agent.
  - Observes checkout/order completion events.
  - Selects approved next actions and records outcomes.

- `mystery-qr-agent`
  - Standalone QR offer reveal agent.
  - Observes QR scan/reveal/consent events.
  - Selects approved offers, enforces campaign windows, and records reveal outcomes.

- `modifier-upsell-agent`
  - Standalone item/cart upsell agent.
  - Observes item/cart events.
  - Suggests approved modifier/add-on actions through SaanaOS.

- `promotion-orchestration-agent`
  - Standalone campaign agent.
  - Reads restaurant-approved promotions.
  - Chooses which campaign/offer to show, suppress, expire, or recommend.

- `restaurant-insights-agent`
  - Standalone analysis agent.
  - Reads events and outcomes.
  - Produces weekly summaries and next-action recommendations.

## Bucket Summary

- **A) Keep inside SaanaOS core:** menu CRUD, categories, modifiers as records, cart, checkout, order storage, admin order view, restaurant settings, QR display/download, promotion CRUD as records, billing/usage primitives, provider execution hooks.
- **B) Extract as independent agent:** missed-call recovery, post-checkout growth, Mystery QR offer selection, catering lead recovery, promotion orchestration, modifier/upsell suggestions, review request timing, trust/risk scoring, promotion creative strategy, insights, order status messaging policy, QR campaign orchestration.
- **C) Convert to API/action surface:** create promotion, reveal offer, apply promo, send message, create attempt, send follow-up, print order, generate creative, attach/apply modifier suggestion, record QR scan, record consent, record outcome.
- **D) Leave as future idea / do not build now:** full coupon engine, unique one-time codes, POS integrations, full print fulfillment marketplace, complex campaign analytics, AI auto-discounting without restaurant approval, payment/deposit recovery until payment primitives are ready.
