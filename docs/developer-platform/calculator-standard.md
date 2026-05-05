# Calculator Standard

Every calculator must help the buyer understand a painful business problem, estimate the opportunity, and move toward the right next action without overpromising results.

## Core Pattern

```text
Pain -> Inputs -> Estimate -> Scenarios -> Disclaimer -> CTA -> Learning Signals
```

- Pain: name the costly business moment the buyer already understands.
- Inputs: ask for only the numbers needed to estimate the opportunity.
- Estimate: show a simple, explainable output based on documented formulas.
- Scenarios: show conservative, expected, and aggressive ranges without pretending the outcome is guaranteed.
- Disclaimer: make the assumptions and limits clear.
- CTA: move the buyer to the next appropriate action.
- Learning Signals: define what the calculator can teach the product, sales, and marketing teams later.

## Required Sections

### A. Buyer-Facing Promise

Every calculator needs one clear sentence that explains the value in buyer language.

Examples:

- "Estimate how much revenue your restaurant may be losing from missed calls."
- "Estimate how much revenue you may be leaving after checkout."

### B. Who It Is For

Define the target buyer and use case.

The page should make clear whether the calculator is for restaurants, agencies, ecommerce stores, service businesses, developers, infrastructure buyers, or another specific audience.

### C. Inputs

Document inputs before implementation.

Each input should include:

- Required or optional status
- Plain-English label
- Description
- Default value
- Validation rule
- Example value

### D. Formulas

Formulas should be simple enough to explain.

Use conservative assumptions and document formulas in the spec before implementation. If a buyer cannot understand the formula, the output is harder to trust.

### E. Output Cards

Show the most important numbers first.

Avoid too many outputs. Use plain language such as "Recovered revenue" or "Eligible monthly opportunities" instead of internal platform language.

### F. Scenario Cards

Every calculator should include:

- Conservative
- Expected
- Aggressive

Aggressive assumptions must be capped. Scenario labels must clearly communicate that results are estimates.

### G. Disclaimers

Every calculator must state:

- This is an estimate.
- Results are not guaranteed.
- Outcomes depend on buyer behavior, data quality, timing, consent, fulfillment, and market conditions.
- Calculator output should not be presented as financial advice.

### H. CTA

Each calculator must lead to one clear next action.

Examples:

- Request setup
- Request early access
- View pricing
- View product page
- Get the playbook

### I. Links

Each calculator should link back to:

- Product or SEO page
- Pricing or early access
- Relevant proof or technical page when useful

### J. Learning Signals

Define what should be learned later.

Examples:

- Input ranges
- Buyer type
- Vertical
- Estimated opportunity
- CTA clicks
- Questions asked
- Form submissions if later captured

## What Calculators Must Not Do

- Do not guarantee revenue.
- Do not ask for sensitive payment data.
- Do not ask for customer PII unless necessary.
- Do not collect data without disclosure.
- Do not overcomplicate inputs.
- Do not hide assumptions.
- Do not imply a future product is live.
- Do not replace legal, compliance, tax, or financial advice.

## Current Calculators

### SaanaOS Missed Call Revenue Calculator

- URL: `/missed-call-revenue-calculator`
- Status: live
- Purpose: estimate missed-call direct-order opportunity

### ReplyToRevenue Post-Checkout Revenue Calculator

- URL: `/post-checkout-revenue/calculator/`
- Status: live as buyer-education asset, product is future/not public live
- Purpose: estimate possible post-checkout add-on revenue

## Future Calculator Backlog

### SaanaOS

- Aggregator Fee Savings Calculator
- Direct Ordering Profit Calculator
- SMS Consent Readiness Checker

### ReplyToRevenue

- Review Request Value Calculator
- Referral Revenue Calculator
- Repeat Order Recovery Calculator
- Payment Follow-Up Recovery Calculator

### Kepler / Service Businesses

- Lead Response Time Calculator
- After-Hours Lead Loss Calculator
- Service Plan Recurrence Revenue Calculator
- Technician Utilization Calculator

### AuthToolkit Infrastructure

- Agent Usage Cost Estimator
- Webhook Volume Estimator
- SFTP Batch Volume Estimator
- API Event Metering Calculator

## Build Order Guidance

- Build calculators closest to live products first.
- Prefer calculators that support existing sales pages.
- Do not build calculators without a CTA path.
- Do not build calculators before the product promise is clear.

## Relationship to Agent Productization Loop

Calculators belong in the Deal Room / Buyer Enablement step and feed the Learning Loop.

They help buyers understand value before a sales conversation, and they help the platform learn which assumptions, verticals, and opportunity ranges matter most.

Related docs:

- [Agent Productization Loop](./agent-productization-loop.md)
- [Post-Checkout Revenue Calculator Spec](../future-agents/post-checkout-revenue-agent/calculator-spec.md)
- [Post-Checkout Revenue Agent Deal Room Outline](../future-agents/post-checkout-revenue-agent/deal-room-outline.md)
