# Webhooks

Webhooks notify external systems when agent events, runs, and actions change state.

These webhooks are documentation-first and are not implemented yet.

## Event Types

- `agent.event.accepted`
- `agent.run.started`
- `agent.run.completed`
- `agent.run.failed`
- `agent.action.suggested`
- `agent.action.executed`
- `agent.action.suppressed`
- `agent.action.failed`
- `message.sent`
- `message.suppressed`
- `order_link.created`
- `payment_link.created`

## Payload Shape

```json
{
  "id": "wh_123",
  "type": "agent.action.executed",
  "created_at": "2026-05-03T12:00:00Z",
  "business": {
    "id": "biz_123"
  },
  "location": {
    "id": "loc_456"
  },
  "agent_installation": {
    "id": "agt_inst_789"
  },
  "agent_run_id": "run_123",
  "data": {}
}
```

## Example: Modifier Suggested

```json
{
  "id": "wh_124",
  "type": "agent.action.suggested",
  "created_at": "2026-05-03T12:00:00Z",
  "agent_run_id": "run_124",
  "data": {
    "action": "suggest_modifier",
    "suggestion": {
      "id": "sug_123",
      "item": {
        "id": "item_123"
      },
      "modifier_option": {
        "id": "opt_123",
        "name": "Extra Cheese"
      },
      "price_delta": 1.5
    }
  }
}
```

## Example: Message Suppressed

```json
{
  "id": "wh_125",
  "type": "message.suppressed",
  "created_at": "2026-05-03T12:00:00Z",
  "agent_run_id": "run_125",
  "data": {
    "channel": "sms",
    "reason": "missing_explicit_consent"
  }
}
```

## Retry Behavior

Recommended retry behavior:

- retry for 2xx failures only when delivery is not acknowledged
- retry on 408, 409, 425, 429, and 5xx
- do not retry on 400, 401, 403, or 404
- exponential backoff for up to 24 hours

Example schedule:

- immediate
- 1 minute
- 5 minutes
- 15 minutes
- 1 hour
- 6 hours
- 24 hours

## Signing Secret

Every webhook endpoint should have a signing secret.

Example header:

```http
AuthToolkit-Signature: t=1777819200,v1=abc123
```

Verification concept:

1. read raw request body
2. combine timestamp and body
3. compute HMAC with webhook signing secret
4. compare with provided signature using constant-time comparison
5. reject stale timestamps

## Idempotency

Webhook consumers should store webhook IDs and ignore duplicates.

