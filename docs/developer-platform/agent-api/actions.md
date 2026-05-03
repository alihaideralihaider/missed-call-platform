# Agent Actions

Actions request a specific execution path. Agents can suggest actions, but existing source systems must validate and execute them safely.

All action endpoints should be server-to-server and require authentication.

## POST /v1/agent/actions/suggest-modifier

Purpose: return at most one safe modifier add-on suggestion for an item.

Request:

```json
{
  "business": {
    "id": "biz_123"
  },
  "location": {
    "id": "loc_456"
  },
  "customer": {
    "phone": "+15555550123"
  },
  "source_system": "saanaos",
  "source_slug": "demo-restaurant",
  "item": {
    "id": "item_123"
  },
  "cart": {
    "id": "cart_123",
    "subtotal": 24.5
  }
}
```

Response:

```json
{
  "suggestion": {
    "id": "sug_123",
    "item": {
      "id": "item_123"
    },
    "modifier_group": {
      "id": "grp_123",
      "name": "Add-ons"
    },
    "modifier_option": {
      "id": "opt_123",
      "name": "Extra Cheese"
    },
    "price_delta": 1.5,
    "message": "Popular add-on: Extra Cheese (+$1.50)",
    "reason": "This add-on has performed well for similar orders."
  },
  "request_id": "req_123"
}
```

Notes and guardrails:

- Return only one suggestion.
- Never invent options or prices.
- Validate that the option is attached to the item.
- Do not suggest required modifier choices as optional upsells.
- Respect source system modifier rules.

## POST /v1/agent/actions/apply-modifier

Purpose: record whether a suggestion was accepted or skipped, and return a validated modifier selection when accepted.

Request:

```json
{
  "suggestion_id": "sug_123",
  "cart": {
    "id": "cart_123"
  },
  "action": "accept"
}
```

Response:

```json
{
  "status": "accepted",
  "modifier_selection": {
    "group_id": "grp_123",
    "group_name": "Add-ons",
    "option_id": "opt_123",
    "option_name": "Extra Cheese",
    "price": 1.5
  },
  "request_id": "req_124"
}
```

Notes and guardrails:

- Validate the suggestion still matches an attached active option.
- Do not bypass source system min/max/required rules.
- Do not recalculate pricing from untrusted client payloads.

## POST /v1/agent/actions/send-message

Purpose: send or schedule a customer message through an approved provider.

Request:

```json
{
  "business": {
    "id": "biz_123"
  },
  "customer": {
    "phone": "+15555550123"
  },
  "channel": "sms",
  "message": {
    "body": "Here is your order link: https://example.com/order"
  },
  "consent": {
    "status": "valid",
    "source": "ivr_press_1"
  }
}
```

Response:

```json
{
  "status": "sent",
  "message_id": "msg_123",
  "provider": "twilio",
  "request_id": "req_125"
}
```

Notes and guardrails:

- Deny by default when consent is missing, stale, unclear, or channel-mismatched.
- Support suppression results instead of throwing for expected policy blocks.
- Include STOP/opt-out handling where required.

## POST /v1/agent/actions/create-order-link

Purpose: create a source-system order link for a customer.

Request:

```json
{
  "business": {
    "id": "biz_123"
  },
  "location": {
    "id": "loc_456"
  },
  "customer": {
    "phone": "+15555550123"
  },
  "source_system": "saanaos",
  "source_slug": "demo-restaurant"
}
```

Response:

```json
{
  "order_link": "https://example.com/r/demo-restaurant",
  "expires_at": "2026-05-03T13:00:00Z",
  "request_id": "req_126"
}
```

Notes and guardrails:

- Link generation should belong to the source system.
- The agent should not infer menu or checkout URLs without source validation.

## POST /v1/agent/actions/create-payment-link

Purpose: create a payment link for an eligible offer, add-on, repeat order, invoice, or checkout.

Request:

```json
{
  "business": {
    "id": "biz_123"
  },
  "customer": {
    "email": "customer@example.com"
  },
  "amount": 12.99,
  "currency": "USD",
  "description": "Add dessert to your order"
}
```

Response:

```json
{
  "payment_link": "https://pay.example.com/link_123",
  "expires_at": "2026-05-03T13:00:00Z",
  "request_id": "req_127"
}
```

Notes and guardrails:

- Validate business eligibility before creating links.
- Do not create payment links for unavailable items or invalid offers.
- Do not trust client-side amounts without server validation.

## POST /v1/agent/actions/repeat-order

Purpose: create or suggest a repeat order from previous customer history.

Request:

```json
{
  "business": {
    "id": "biz_123"
  },
  "customer": {
    "phone": "+15555550123"
  },
  "source_system": "saanaos",
  "source_slug": "demo-restaurant"
}
```

Response:

```json
{
  "repeat_order": {
    "status": "ready",
    "items": [
      {
        "item_id": "item_123",
        "name": "Chicken Sandwich",
        "quantity": 1
      }
    ],
    "checkout_link": "https://example.com/checkout/repeat_123"
  },
  "request_id": "req_128"
}
```

Notes and guardrails:

- Validate current availability and pricing.
- Do not silently substitute unavailable items.
- Ask for confirmation before charging or placing an order.

