# Quickstart

This quickstart shows the intended future developer flow for the AuthToolkit / RecoveryStack v1 Agent API.

These endpoints are documentation-first and are not implemented yet.

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

## 4. Get an Agent Run

```bash
curl https://api.authtoolkit.com/v1/agent/runs/run_123 \
  -H "Authorization: Bearer atk_test_123456789"
```

Example response:

```json
{
  "agent_run_id": "run_123",
  "status": "completed",
  "event_type": "missed_call",
  "actions": [
    {
      "type": "create_order_link",
      "status": "succeeded"
    },
    {
      "type": "send_message",
      "status": "suppressed",
      "reason": "missing_explicit_consent"
    }
  ],
  "request_id": "req_124"
}
```

## 5. Receive a Webhook

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

