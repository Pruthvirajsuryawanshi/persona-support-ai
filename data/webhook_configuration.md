# Webhook Configuration and Signing

Webhooks deliver events to your endpoint via signed HTTP POST.

## Configuring
Settings → Developers → Webhooks → Add endpoint. Provide an HTTPS URL and select event types.

## Verifying signatures
Every webhook includes `X-Signature` (hex HMAC-SHA256 of the raw body using your endpoint's signing secret) and `X-Timestamp` (Unix seconds). Validate both — reject requests older than 5 minutes to prevent replay attacks.

```ts
import { createHmac, timingSafeEqual } from "crypto";
const expected = createHmac("sha256", SECRET).update(rawBody).digest("hex");
if (!timingSafeEqual(Buffer.from(expected), Buffer.from(received))) reject();
```

## Retries
Failed deliveries (non-2xx) are retried with exponential backoff over 24 hours: 1m, 5m, 30m, 2h, 6h, 12h. After 24 hours the event is marked as failed and you receive an email summary.

## Common issues
- 401/403 from your server — usually misconfigured signature verification. Use the test endpoint to inspect what we send.
- Timeouts — endpoints must respond within 10 seconds. Acknowledge with 200 quickly and process asynchronously.
