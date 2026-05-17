# AuthToolkit Dev Integrity Dashboard Prototype

## Purpose

This is a local static prototype for the AuthToolkit Dev Integrity Control Room. It reads generated local JSON artifacts and displays the first Architecture, Vault, and Dev control-room views.

## Generate Data

From `worker/web`:

```sh
npm run integrity:map
npm run integrity:review
```

## Run Dashboard

From `worker/web`:

```sh
npm run integrity:dashboard
```

Open:

```text
http://localhost:4317
```

## Privacy

This is a local-only prototype. It does not upload code, diffs, secrets, env values, customer data, payment data, session data, or logs.

The dashboard displays names and counts already present in generated local artifacts. It must not display raw secret values.
