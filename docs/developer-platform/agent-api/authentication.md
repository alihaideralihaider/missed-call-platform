# Authentication

The v1 Agent API should use bearer token authentication.

```http
Authorization: Bearer atk_test_xxx
```

## Test and Live Keys

Test keys:

```text
atk_test_xxx
```

Live keys:

```text
atk_live_xxx
```

Test keys should operate only against sandbox businesses, sandbox agent installations, test customers, and non-production action execution.

Live keys should be scoped to approved businesses and production agent installations.

## Idempotency Keys

Clients should send an idempotency key on event creation and action requests.

```http
Idempotency-Key: evt_checkout_456
```

Idempotency prevents duplicate agent runs or duplicate external actions when a client retries a request.

Recommended key sources:

- external event ID
- checkout ID
- call SID
- payment ID
- message ID
- deterministic business workflow ID

## Request IDs

Every response should include a `request_id`.

```json
{
  "request_id": "req_123"
}
```

Developers should include `request_id` when contacting support or debugging webhook delivery.

## Key Scope

Future API keys should support scopes such as:

- `agent.events.write`
- `agent.actions.write`
- `agent.runs.read`
- `webhooks.read`
- `sandbox.write`

## Security Principles

- Never expose API keys in browser JavaScript.
- Use server-to-server calls.
- Rotate live keys if leaked.
- Use idempotency keys for retryable writes.
- Validate webhook signatures before trusting inbound webhook payloads.

