# Agent Events

Events tell AuthToolkit that something happened in a business workflow. The agent can then decide whether to create an action, suppress an action, wait, or do nothing.

## Endpoint

```http
POST /v1/agent/events
```

## Supported Event Types

- `missed_call`
- `message_received`
- `cart_started`
- `modifier_suggestion_requested`
- `checkout_completed`
- `payment_completed`

## Common Request Shape

```json
{
  "event_type": "missed_call",
  "business": {
    "id": "biz_123"
  },
  "location": {
    "id": "loc_456"
  },
  "agent_installation": {
    "id": "agt_inst_789"
  },
  "customer": {
    "id": "cus_123",
    "phone": "+15555550123",
    "email": "customer@example.com"
  },
  "source_system": "saanaos",
  "source_slug": "demo-restaurant",
  "metadata": {}
}
```

## Common Response Shape

```json
{
  "event_id": "evt_123",
  "agent_run_id": "run_123",
  "status": "accepted",
  "request_id": "req_123"
}
```

## missed_call

```json
{
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
    "call_sid": "CA_demo_123",
    "to": "+15555550000",
    "from": "+15555550123"
  }
}
```

Notes:

- A missed call alone is not consent to send SMS.
- The agent may create a recovery job but should suppress outbound messaging unless explicit consent exists.

## message_received

```json
{
  "event_type": "message_received",
  "business": {
    "id": "biz_123"
  },
  "customer": {
    "phone": "+15555550123"
  },
  "metadata": {
    "channel": "sms",
    "body": "I want to order again"
  }
}
```

## cart_started

```json
{
  "event_type": "cart_started",
  "business": {
    "id": "biz_123"
  },
  "location": {
    "id": "loc_456"
  },
  "customer": {
    "phone": "+15555550123"
  },
  "metadata": {
    "cart_id": "cart_123",
    "subtotal": 24.5
  }
}
```

## modifier_suggestion_requested

```json
{
  "event_type": "modifier_suggestion_requested",
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
    "cart_id": "cart_123",
    "item_id": "item_123",
    "cart_subtotal": 24.5
  }
}
```

Notes:

- The public API should reference item and option IDs from the source system.
- The execution layer must validate that suggested options are attached and available.

## checkout_completed

```json
{
  "event_type": "checkout_completed",
  "business": {
    "id": "biz_123"
  },
  "customer": {
    "name": "Customer Name",
    "phone": "+15555550123",
    "email": "customer@example.com",
    "consent": {
      "sms": true,
      "email": true
    }
  },
  "transaction": {
    "id": "order_456",
    "amount": 42.5,
    "currency": "USD"
  },
  "metadata": {
    "channel": "web_checkout"
  }
}
```

## payment_completed

```json
{
  "event_type": "payment_completed",
  "business": {
    "id": "biz_123"
  },
  "customer": {
    "email": "customer@example.com"
  },
  "transaction": {
    "id": "pay_123",
    "amount": 42.5,
    "currency": "USD"
  }
}
```

