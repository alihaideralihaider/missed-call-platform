# Post-Checkout Webhook API Draft v0.1

Status: Future public API draft. Not live yet.

This document captures an early API-first draft for future Post-Checkout followups, webhook callbacks, consent tracking, analytics callbacks, and coupon/shortlink creation. It is documentation only and does not describe a currently live public API surface.

Current SaanaOS implementation uses existing platform routes and internal slices:

- `POST /api/v1/agent/events` for `checkout_completed` intake.
- `GET /api/v1/agent/runs/{runId}` for trace lookup.
- `POST /api/v1/agent/outcomes/post-checkout` for outcome recording.
- Optional webhook delivery is provided per outcome request through `delivery.webhook_url`.

The future `/v1/events`, `/v1/webhooks`, and `/v1/coupons` routes below are not implemented yet. Webhook registration, bearer API authentication, coupon creation, shortlinks, checkout redemption, SMS sending, and public connector claims remain future work.

## Current Platform Mapping

The draft API should be treated as a future external developer surface that may later sit in front of the current Agent API primitives.

| Draft concept | Current platform status |
| --- | --- |
| `POST /v1/events` | Future public wrapper. Current live intake is `POST /api/v1/agent/events` with `event_type: checkout_completed`. |
| `order_completed`, `pickup_completed`, `order_no_show`, `refund_processed` | Future event names. Current Post-Checkout slice accepts `checkout_completed`. |
| `POST /v1/webhooks` | Future webhook registration. Current webhook delivery is optional per outcome request. |
| `POST /v1/coupons` | Future coupon/shortlink API. Coupon redemption is not implemented. |
| Bearer API keys | Future public API authentication. |
| Consent tracking | Future persistent consent model. Mystery QR Phase 1 currently uses localStorage only and sends no SMS. |

## Design Constraints

- Do not claim this API is live until implemented and validated.
- Do not claim Shopify, Stripe, Toast, Clover, WooCommerce, Square, PayPal, or other connectors are live.
- Do not use email as an outcome file delivery method.
- Use UTC timestamps for event, consent, delivery, and analytics records.
- Keep billing downstream of metering validation.
- Keep coupon creation separate from checkout redemption until redemption is explicitly implemented.

## Draft OpenAPI

```yaml
openapi: 3.0.3
info:
  title: Post-Checkout Webhook API
  version: 0.1.0
  description: API-first post-checkout followups (reviews, coupons) with consent tracking and analytics callbacks.
servers:
  - url: https://api.postcheckout.example
security:
  - ApiKeyAuth: []
components:
  securitySchemes:
    ApiKeyAuth:
      type: http
      scheme: bearer
  schemas:
    Customer:
      type: object
      properties:
        phone: { type: string, example: "+15555550123" }
        email: { type: string, format: email, example: "x@x.com" }
        consent:
          type: boolean
          description: Explicit marketing consent at source; set true only if captured with clear opt-in.
        consent_source:
          type: string
          description: Where consent was gathered (e.g., "checkout_opt_in", "ivr_keypress", "whatsapp_optin")
        consent_ts:
          type: string
          format: date-time
    Order:
      type: object
      required: [id, total]
      properties:
        id: { type: string, example: "ord-321" }
        total: { type: number, format: float, example: 24.50 }
        currency: { type: string, example: "USD" }
    EventIngest:
      type: object
      required: [idempotency_key, event_type, source, customer]
      properties:
        idempotency_key: { type: string, example: "evt-123" }
        event_type:
          type: string
          enum: [order_completed, pickup_completed, order_no_show, refund_processed]
        source: { type: string, example: "shopify" }
        source_id: { type: string, example: "store-abc" }
        customer: { $ref: "#/components/schemas/Customer" }
        order: { $ref: "#/components/schemas/Order" }
        metadata:
          type: object
          additionalProperties: true
    EventIngestResponse:
      type: object
      properties:
        event_id: { type: string, example: "ev_abc123" }
        accepted: { type: boolean, example: true }
        status: { type: string, example: "queued" }
    WebhookRegister:
      type: object
      required: [url, events]
      properties:
        url: { type: string, example: "https://merchant.example/webhook" }
        events:
          type: array
          items:
            type: string
            enum: [delivery_report, consent_changed, analytics]
        secret:
          type: string
          description: HMAC shared secret used for x-signature.
    WebhookRegisterResponse:
      type: object
      properties:
        webhook_id: { type: string, example: "wh_123" }
        url: { type: string }
        events: { type: array, items: { type: string } }
    CouponCreate:
      type: object
      required: [store_id, discount]
      properties:
        store_id: { type: string, example: "store-abc" }
        discount:
          type: object
          required: [type, value]
          properties:
            type: { type: string, enum: [percent, amount] }
            value: { type: number, example: 10 }
        expires_in: { type: integer, example: 86400, description: "Seconds to expiry" }
        max_redemptions: { type: integer, example: 1 }
        note: { type: string }
    CouponCreateResponse:
      type: object
      properties:
        coupon_id: { type: string, example: "cpn_123" }
        shortlink: { type: string, example: "https://pchk.to/abc123" }
        expires_at: { type: string, format: date-time }
        max_redemptions: { type: integer }
paths:
  /v1/events:
    post:
      summary: Ingest a post-checkout event
      operationId: ingestEvent
      security: [ { ApiKeyAuth: [] } ]
      parameters:
        - in: header
          name: Idempotency-Key
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/EventIngest" }
            example:
              idempotency_key: "evt-123"
              event_type: "order_completed"
              source: "shopify"
              source_id: "store-abc"
              customer:
                phone: "+1..."
                email: "x@x.com"
                consent: true
                consent_source: "checkout_opt_in"
                consent_ts: "2026-05-06T12:00:00Z"
              order:
                id: "ord-321"
                total: 24.50
                currency: "USD"
      responses:
        "200":
          description: Accepted
          content:
            application/json:
              schema: { $ref: "#/components/schemas/EventIngestResponse" }
  /v1/webhooks:
    post:
      summary: Register a webhook for callbacks
      operationId: registerWebhook
      security: [ { ApiKeyAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/WebhookRegister" }
            example:
              url: "https://merchant.example/webhook"
              events: ["delivery_report","consent_changed","analytics"]
              secret: "sk_xxx"
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/WebhookRegisterResponse" }
  /v1/coupons:
    post:
      summary: Create a coupon and shortlink
      operationId: createCoupon
      security: [ { ApiKeyAuth: [] } ]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/CouponCreate" }
            example:
              store_id: "store-abc"
              discount: { type: "percent", value: 10 }
              expires_in: 86400
              max_redemptions: 1
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema: { $ref: "#/components/schemas/CouponCreateResponse" }
```

## Draft Postman Collection

```json
{
  "info": {
    "name": "Post-Checkout Webhook API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Ingest Event",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{API_KEY}}" },
          { "key": "Content-Type", "value": "application/json" },
          { "key": "Idempotency-Key", "value": "evt-{{RANDOM}}" }
        ],
        "url": {
          "raw": "{{BASE_URL}}/v1/events",
          "host": ["{{BASE_URL}}"],
          "path": ["v1", "events"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"idempotency_key\":\"evt-123\",\n  \"event_type\":\"order_completed\",\n  \"source\":\"shopify\",\n  \"source_id\":\"store-abc\",\n  \"customer\":{\"phone\":\"+15555550123\",\"email\":\"x@x.com\",\"consent\":true,\"consent_source\":\"checkout_opt_in\",\"consent_ts\":\"2026-05-06T12:00:00Z\"},\n  \"order\":{\"id\":\"ord-321\",\"total\":24.5,\"currency\":\"USD\"}\n}"
        }
      }
    },
    {
      "name": "Register Webhook",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{API_KEY}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": {
          "raw": "{{BASE_URL}}/v1/webhooks",
          "host": ["{{BASE_URL}}"],
          "path": ["v1", "webhooks"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"url\":\"https://merchant.example/webhook\",\n  \"events\":[\"delivery_report\",\"consent_changed\",\"analytics\"],\n  \"secret\":\"sk_xxx\"\n}"
        }
      }
    },
    {
      "name": "Create Coupon",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{API_KEY}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "url": {
          "raw": "{{BASE_URL}}/v1/coupons",
          "host": ["{{BASE_URL}}"],
          "path": ["v1", "coupons"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\n  \"store_id\":\"store-abc\",\n  \"discount\":{\"type\":\"percent\",\"value\":10},\n  \"expires_in\":86400,\n  \"max_redemptions\":1\n}"
        }
      }
    }
  ],
  "variable": [
    { "key": "BASE_URL", "value": "https://api.postcheckout.example" },
    { "key": "API_KEY", "value": "pk_live_xxx" },
    { "key": "RANDOM", "value": "12345" }
  ]
}
```

## Related Documents

- [Productization Loop](./productization-loop.md)
- [Technical Implementation Plan v1](./technical-implementation-plan-v1.md)
- [Deal Room Outline](./deal-room-outline.md)
- [Usage Events](../../developer-platform/agent-api/usage-events.md)
- [Billing Architecture v1](../../developer-platform/billing/billing-architecture-v1.md)
