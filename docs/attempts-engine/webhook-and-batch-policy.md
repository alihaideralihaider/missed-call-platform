# Webhook and Batch Policy

This policy defines how outcome data should be delivered for the Universal Attempts Engine and future RecoveryStack agents.

## Realtime Outbound

Realtime outbound delivery should use webhooks.

Use webhooks for:

- attempt job created
- attempt executed
- message sent
- message suppressed
- job succeeded
- job expired
- job failed
- agent action completed

Webhook delivery should include request IDs, event IDs, run IDs, and timestamps.

## Batch Outbound

Batch outbound delivery should use SFTP pull only.

The platform should generate batch files and make them available on our SFTP server for client download.

Do not email batch files.

## Time Policy

All batch windows use UTC.

Batch window:

```text
midnight UTC -> midnight UTC
```

Clients are responsible for timezone conversion in their own systems.

All timestamps in webhook payloads and batch files should be UTC ISO-8601.

## File Availability

Batch files should be placed on our SFTP for client download.

Clients pull files from SFTP using their own scheduled process.

## Data Consistency

The same outcome data should be available in both realtime webhook payloads and batch files.

The delivery mechanism changes by mode:

- realtime: webhook push
- batch: SFTP pull

The meaning of the outcome data should not change.

## No Email Delivery

Email is not an approved delivery mechanism for batch outcome files.

Reason:

- weaker auditability
- attachment handling risk
- inconsistent retries
- harder operational monitoring

Use SFTP for batch and webhooks for realtime.
