# Errors

The v1 Agent API should use a consistent error response format.

## Error Shape

```json
{
  "error": {
    "code": "invalid_request",
    "message": "item.id is required",
    "request_id": "req_123"
  }
}
```

## Error Codes

### invalid_request

The request is malformed or missing required fields.

```json
{
  "error": {
    "code": "invalid_request",
    "message": "event_type is required",
    "request_id": "req_123"
  }
}
```

### unauthorized

The request is missing a valid API key.

```json
{
  "error": {
    "code": "unauthorized",
    "message": "A valid API key is required",
    "request_id": "req_124"
  }
}
```

### forbidden

The API key is valid but does not have access to the requested business, location, agent installation, or scope.

### not_found

The requested resource does not exist or is not visible to the current API key.

### conflict

The request conflicts with current state.

Examples:

- duplicate idempotency key with different payload
- suggestion already accepted
- action no longer valid

### validation_failed

The requested action failed source-system validation.

Examples:

- modifier option is no longer attached to item
- item is unavailable
- price changed
- required modifier selections are incomplete

### rate_limited

The client exceeded allowed request volume.

Recommended headers:

```http
Retry-After: 30
```

### internal_error

An unexpected server error occurred.

Public messages should be safe and generic. Detailed errors should be available in logs by `request_id`.

## Suppression Is Not Always an Error

Expected policy blocks should return successful responses with suppressed statuses where possible.

Example:

```json
{
  "status": "suppressed",
  "reason": "missing_explicit_consent",
  "request_id": "req_125"
}
```

This is better than returning `500` for normal trust, consent, or eligibility outcomes.

