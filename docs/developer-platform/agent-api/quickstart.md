# Quickstart

This quickstart shows the developer flow for the AuthToolkit / RecoveryStack v1 Agent API.

The first internal SaanaOS wrapper persists events and agent runs. Full authentication, webhooks, and public developer portal features are still future phases.

## 1. Get a Test API Key

Use a test key while building:

```text
atk_test_123456789
```

Live keys should use:

```text
atk_live_123456789
```

## 2. Base URL

```text
https://api.authtoolkit.com
```

Sandbox may use:

```text
https://sandbox.api.authtoolkit.com
```

## 3. Send Your First Event

```bash
curl -X POST https://api.authtoolkit.com/v1/agent/events \
  -H "Authorization: Bearer atk_test_123456789" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: evt_demo_001" \
  -d '{
    "event_type": "missed_call",
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
    "attempt_job_id": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
      "call_sid": "CA_demo_123"
    }
  }'
```

Example response:

```json
{
  "event_id": "evt_123",
  "agent_run_id": "run_123",
  "status": "accepted",
  "request_id": "req_123"
}
```

The event intake layer now stores an internal `agent_events` record and an `agent_runs` record.
`attempt_job_id` is optional and links the run to a Universal Attempts Engine job when a source system has one. It is used for traceability only and does not change attempts execution behavior.

## 4. Call an Agent Action

Pass the returned `agent_run_id` into action calls when you want the action to appear in the run trace.
The `agent_run_id` field is optional; omitting it preserves the action response but skips run-level action logging.

```bash
curl -X POST https://api.authtoolkit.com/v1/agent/actions/suggest-modifier \
  -H "Authorization: Bearer atk_test_123456789" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_run_id": "run_123",
    "source_system": "saanaos",
    "source_slug": "demo-restaurant",
    "item": {
      "id": "item_123"
    },
    "cart": {
      "id": "cart_123",
      "subtotal": 24.5
    },
    "customer": {
      "phone": "+15555550123"
    }
  }'
```

Example response:

```json
{
  "suggestion": null,
  "request_id": "req_124"
}
```

## 5. Get an Agent Run

```bash
curl https://api.authtoolkit.com/v1/agent/runs/run_123 \
  -H "Authorization: Bearer atk_test_123456789"
```

Example response:

```json
{
  "agent_run_id": "run_123",
  "attempt_job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "accepted",
  "event_type": "missed_call",
  "source_system": "saanaos",
  "source_slug": "demo-restaurant",
  "run": {
    "id": "run_123",
    "event_id": "evt_123",
    "attempt_job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "accepted",
    "event_type": "missed_call",
    "source_system": "saanaos",
    "source_slug": "demo-restaurant",
    "created_at": "2026-05-03T12:00:00Z",
    "completed_at": null,
    "metadata": {}
  },
  "event": {
    "id": "evt_123",
    "event_type": "missed_call",
    "metadata": {
      "call_sid": "CA_demo_123"
    },
    "customer": {
      "phone": "+15555550123"
    }
  },
  "actions": [
    {
      "id": "act_123",
      "type": "suggest_modifier",
      "action_version": "v1",
      "status": "completed",
      "payload": {
        "source_system": "saanaos",
        "source_slug": "demo-restaurant",
        "item": {
          "id": "item_123"
        },
        "cart": {
          "id": "cart_123",
          "subtotal": 24.5
        },
        "customer": {
          "phone": "+15555550123"
        }
      },
      "result": {
        "suggestion": null
      },
      "created_at": "2026-05-03T12:00:00Z",
      "completed_at": "2026-05-03T12:00:01Z"
    }
  ],
  "request_id": "req_125"
}
```

Action records are idempotent by `request_id`. Timestamps are returned as UTC ISO-8601 strings.

## 6. Receive a Webhook

Configure a webhook endpoint in the future developer portal:

```text
https://example.com/webhooks/authtoolkit
```

Example webhook:

```json
{
  "type": "agent.action.suppressed",
  "created_at": "2026-05-03T12:00:00Z",
  "agent_run_id": "run_123",
  "business": {
    "id": "biz_123"
  },
  "action": {
    "type": "send_message",
    "status": "suppressed",
    "reason": "missing_explicit_consent"
  }
}
```
