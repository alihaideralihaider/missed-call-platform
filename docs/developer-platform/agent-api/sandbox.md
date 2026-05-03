# Sandbox

The sandbox should let developers test agent workflows without sending real messages, charging real cards, or touching live customers.

## Sandbox Businesses

Sandbox businesses should be generated from the developer portal or API.

Example:

```json
{
  "business": {
    "id": "biz_test_123",
    "name": "Demo Restaurant"
  },
  "location": {
    "id": "loc_test_456",
    "name": "Main Location"
  }
}
```

## Test Customers

Test customers should support predictable behavior.

Examples:

- `+15555550001`: valid SMS consent
- `+15555550002`: missing consent
- `+15555550003`: opted out
- `customer@example.com`: valid email consent

## Test Events

Developers should be able to replay standard events:

- missed call with no consent
- missed call with IVR press-1 consent
- cart started
- modifier suggestion requested
- checkout completed
- payment completed

## Replay Events

Future endpoint:

```http
POST /v1/agent/sandbox/replay
```

Example:

```json
{
  "template": "missed_call_with_sms_consent",
  "business": {
    "id": "biz_test_123"
  }
}
```

## Test Webhook Endpoint

Future endpoint:

```http
POST /v1/agent/sandbox/webhooks/test
```

Example:

```json
{
  "webhook_url": "https://example.com/webhooks/authtoolkit",
  "event_type": "agent.run.completed"
}
```

## Logs

Sandbox logs should show:

- request ID
- event ID
- agent run ID
- action type
- action status
- suppression reason
- webhook delivery attempts

## Sandbox Safety

- no live SMS by default
- no real payment links by default
- no production customer data
- deterministic fixture data where possible
- clear distinction between `atk_test_` and `atk_live_` keys

