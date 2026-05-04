# Post-Checkout Revenue Calculator Spec

Status:
Future buyer-education asset. Not built yet.

## Purpose

The Post-Checkout Revenue Calculator helps buyers estimate possible incremental revenue from post-checkout add-on offers without promising guaranteed results.

Buyer-facing promise:
“Estimate how much revenue you may be leaving after checkout.”

## Who It Is For

- Ecommerce stores
- Restaurants with direct ordering
- Service businesses with paid bookings
- Donation/fundraising platforms
- Agencies evaluating client opportunity
- Custom checkout platforms

## Calculator Inputs

### Required Inputs

#### monthly_checkouts

Plain English label:
Monthly checkouts

Description:
The number of completed checkouts, orders, bookings, payments, or donations per month.

Example value:
`1000`

Validation rule:
Must be a positive whole number.

Default value:
`1000`

#### average_order_value

Plain English label:
Average order value

Description:
The average value of each completed checkout before any post-checkout offer.

Example value:
`42.50`

Validation rule:
Must be a positive number.

Default value:
`50`

#### eligible_order_percentage

Plain English label:
Percent of orders eligible for an offer

Description:
The percentage of completed checkouts where a relevant, compliant post-checkout offer could be shown.

Example value:
`0.60` for 60%

Validation rule:
Must be a decimal between `0` and `1`.

Default value:
`0.50`

#### average_addon_price

Plain English label:
Average add-on price

Description:
The expected price of the add-on, upgrade, bundle, subscription, tip, or donation upgrade.

Example value:
`9.99`

Validation rule:
Must be a positive number.

Default value:
`10`

#### estimated_acceptance_rate

Plain English label:
Estimated offer acceptance rate

Description:
The percentage of eligible customers expected to accept the post-checkout offer.

Example value:
`0.08` for 8%

Validation rule:
Must be a decimal between `0` and `1`. Recommended UI range should stay conservative, such as 1% to 30%.

Default value:
`0.05`

### Optional Inputs

#### current_post_checkout_revenue

Plain English label:
Current post-checkout revenue

Description:
Existing monthly revenue from add-ons or post-checkout offers, if the business already has a flow.

Example value:
`500`

Validation rule:
Must be `0` or a positive number.

Default value:
`0`

#### average_margin_percentage

Plain English label:
Average margin percentage

Description:
Estimated gross margin on the add-on revenue.

Example value:
`0.45` for 45%

Validation rule:
Must be a decimal between `0` and `1`.

Default value:
None.

#### repeat_purchase_lift

Plain English label:
Expected repeat-purchase lift

Description:
Optional estimate of additional repeat-purchase impact. This should be shown carefully and not included in core revenue unless explicitly enabled.

Example value:
`0.03` for 3%

Validation rule:
Must be a decimal between `0` and `1`.

Default value:
None.

#### agency_client_count

Plain English label:
Number of client accounts

Description:
For agencies, the number of clients where this post-checkout opportunity might apply.

Example value:
`12`

Validation rule:
Must be a positive whole number if provided.

Default value:
None.

#### platform_name

Plain English label:
Current checkout platform

Description:
The platform or custom system currently handling checkout.

Example value:
`Custom checkout`, `Shopify`, `Stripe Checkout`

Validation rule:
Free-text or controlled list. Do not require a live connector claim.

Default value:
None.

#### vertical

Plain English label:
Business type

Description:
The business category used for education, examples, and segmentation.

Example value:
`restaurant`, `ecommerce`, `service`, `donation`

Validation rule:
Controlled list plus optional “other”.

Default value:
None.

## Core Formulas

Use percentages as decimals internally.

Example:
20% = `0.20`

Eligible opportunities:

```text
monthly_checkouts * eligible_order_percentage
```

Estimated add-on purchases:

```text
eligible_opportunities * estimated_acceptance_rate
```

Estimated incremental monthly revenue:

```text
estimated_addon_purchases * average_addon_price
```

Estimated incremental annual revenue:

```text
estimated_incremental_monthly_revenue * 12
```

Estimated gross profit:

```text
estimated_incremental_monthly_revenue * average_margin_percentage
```

Agency portfolio opportunity:

```text
estimated_incremental_monthly_revenue * agency_client_count
```

## Output Cards

- Eligible monthly opportunities
- Estimated add-on purchases
- Estimated incremental monthly revenue
- Estimated incremental annual revenue
- Estimated gross profit if margin provided
- Agency portfolio opportunity if `agency_client_count` provided

## Conservative / Expected / Aggressive Scenarios

Use acceptance-rate multipliers:
- Conservative: `estimated_acceptance_rate * 0.5`
- Expected: `estimated_acceptance_rate`
- Aggressive: `estimated_acceptance_rate * 1.5`

Cap aggressive acceptance rate at a reasonable maximum such as `0.30` for 30%.

Each scenario should recalculate:
- Estimated add-on purchases
- Estimated incremental monthly revenue
- Estimated incremental annual revenue
- Estimated gross profit if margin is provided
- Agency portfolio opportunity if agency client count is provided

## Disclaimers

- Calculator is an estimate.
- Results depend on offer quality, timing, consent, customer intent, vertical, price, and fulfillment.
- This does not guarantee revenue.
- Post-Checkout Revenue Agent is future/not live yet.
- Do not use calculator as financial advice.

## Lead Capture Strategy

After showing results, ask:
- Business type
- Platform used
- Monthly checkout range
- Biggest post-checkout opportunity
- Email
- Optional phone

CTA options:
- “Get the post-checkout revenue playbook”
- “Request early access to ReplyToRevenue”

## Deal-Room Use

The calculator fits into the buyer journey like this:

```text
Content -> Calculator -> Deal Room -> Early Access / Setup Conversation
```

The calculator should educate the buyer, quantify the opportunity, and route qualified interest into a deal room or early-access conversation.

## Data Privacy

- Do not require sensitive payment data.
- Do not ask for card numbers.
- Do not ask for customer PII in calculator.
- Store only aggregate calculator inputs if saved.
- Use calculator inputs to improve messaging and buyer education.

## Future Analytics

Track:
- `vertical`
- `platform_name`
- Monthly checkouts range
- Average order value range
- Estimated opportunity
- CTA clicked
- Lead submitted
- Questions asked

## Relationship To Platform Standards

- [Post-Checkout Revenue Agent Deal Room Outline](./deal-room-outline.md)
- [Post-Checkout Revenue Agent Productization Loop](./productization-loop.md)
- [Agent Productization Loop](../../developer-platform/agent-productization-loop.md)
- [Universal Agent Metering Standard](../../developer-platform/agent-api/agent-metering-standard.md)
- [Billing Architecture v1](../../developer-platform/billing/billing-architecture-v1.md)
