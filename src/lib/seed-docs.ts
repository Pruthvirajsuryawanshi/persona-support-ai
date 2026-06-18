export type SeedDoc = { source: string; title: string; content: string };

export const SEED_DOCS: SeedDoc[] = [
  {
    source: "password_reset_guide.md",
    title: "Password Reset Guide",
    content: `# Password Reset Guide

If you can't sign in, you can reset your password in under two minutes.

## Steps
1. Go to the sign-in page and click "Forgot password".
2. Enter the email associated with your account.
3. Check your inbox for a message from no-reply@support.example. The email arrives within 1-2 minutes. Check Spam if you don't see it.
4. Click the secure reset link. The link expires after 30 minutes.
5. Enter a new password of at least 12 characters. It must contain at least one number and one symbol.
6. You will be signed in automatically after a successful reset.

## Troubleshooting
- "Link expired" — request a new reset email; only the most recent link is valid.
- Email never arrives — verify the email address on file; check your spam folder; whitelist support.example.
- "Password too weak" — use a longer passphrase with mixed case and a symbol.
- Two-factor enabled — after resetting, you will still be prompted for your 2FA code on next sign-in.

If repeated attempts fail, contact support with the timestamp of your last reset attempt.`,
  },
  {
    source: "api_authentication.md",
    title: "API Authentication and Bearer Tokens",
    content: `# API Authentication

All API requests require a bearer token in the Authorization header.

## Header format
\`\`\`
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
\`\`\`

## Obtaining a key
1. Sign in and open Settings → API Keys.
2. Click "Create new key", give it a name, and select scopes.
3. Copy the key immediately — it is shown only once.

## Common error codes
- 401 Unauthorized — missing/invalid token, or token revoked. Verify the key exists in Settings → API Keys and that the request includes the Authorization header.
- 403 Forbidden — key is valid but lacks the required scope. Add the scope and rotate the key.
- 429 Too Many Requests — rate limit exceeded. The default tier allows 60 req/min and 5000 req/hour. Implement exponential backoff.
- 500 — transient server error; retry with backoff.

## Rotating a compromised key
1. Create a replacement key first.
2. Roll it out to all clients.
3. Revoke the old key from Settings → API Keys → Revoke.
Revocation is instant. There is no grace period.`,
  },
  {
    source: "billing_overview.md",
    title: "Billing Cycles, Invoices and Disputes",
    content: `# Billing Overview

Subscriptions are billed monthly on the day you upgraded. Annual plans are billed once per year and renew automatically.

## Where to find invoices
Settings → Billing → Invoices. Each PDF contains the line items, applicable taxes, and the payment method used.

## Failed payments
If a charge fails we retry on day 1, 3, and 7. After the third failed attempt the subscription is downgraded to Free. To restore service, update your card under Settings → Billing → Payment Method.

## Disputes and refunds
For incorrect charges, open Settings → Billing → "Dispute a charge" and describe the issue. Disputes are reviewed within 2 business days. Approved refunds are returned to the original payment method within 5-10 business days depending on the issuer.

## Duplicate charges
Duplicate charges are typically authorization holds released within 3-5 business days. If both charges settle, file a dispute — it is fast-tracked and resolved within 1 business day.

## Plan changes
Upgrades take effect immediately and are prorated. Downgrades take effect at the next renewal so you retain paid features until the period ends.`,
  },
  {
    source: "database_integration.md",
    title: "Database Integration Errors",
    content: `# Database Integration

We support Postgres 13+, MySQL 8+, and SQL Server 2019+.

## Connection string format
\`postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require\`

The SSL mode parameter is required for production. Self-signed certificates require \`sslmode=verify-ca\` plus an uploaded CA bundle in Settings → Integrations → Database.

## Common errors
- "Internal error: connection reset" — almost always a firewall or PgBouncer pooling issue. Allowlist our egress IPs (listed in Settings → Integrations) and confirm that the pool is in transaction mode, not statement mode.
- "permission denied for schema public" — the database user lacks USAGE on the schema. Grant: \`GRANT USAGE ON SCHEMA public TO <user>; GRANT SELECT ON ALL TABLES IN SCHEMA public TO <user>;\`
- "too many connections" — increase max_connections, or enable our managed connection pooler.
- "SSL handshake failed" — your CA bundle is stale; download the latest from Settings → Integrations.

## Verifying connectivity
Use the "Test connection" button on the integration page. It runs a SELECT 1 and reports latency. If latency exceeds 200ms consistently, you may be in a different region — open a ticket so we can re-region your workspace.`,
  },
  {
    source: "rate_limits.md",
    title: "Rate Limits and Quotas",
    content: `# Rate Limits

Limits are applied per API key and per workspace.

## Default tier
- 60 requests per minute per key
- 5,000 requests per hour per workspace
- 100 MB total request body per minute

## Pro tier
- 600 requests per minute per key
- 50,000 requests per hour per workspace
- 1 GB total request body per minute

## Response headers
Every response includes:
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset (Unix timestamp)

## Handling 429
Implement exponential backoff with jitter. Start at 1s, double up to 30s, retry up to 5 times. Read Retry-After when present and honor it.

## Requesting higher limits
Contact sales for sustained limit increases. Burst credits are also available — 100,000 extra requests are auto-granted to Pro accounts each month.`,
  },
  {
    source: "two_factor_auth.md",
    title: "Two-Factor Authentication (2FA)",
    content: `# Two-Factor Authentication

We support TOTP (Google Authenticator, Authy, 1Password) and hardware security keys (WebAuthn / FIDO2).

## Enabling TOTP
1. Settings → Security → Two-Factor Authentication → Enable.
2. Scan the QR code with your authenticator app.
3. Enter the 6-digit code to confirm.
4. Save the 10 backup recovery codes in a safe place. Each can be used once.

## Hardware keys
Click "Add security key" and follow the browser prompt. We recommend registering at least two keys.

## Lost your 2FA device
- If you have backup codes, sign in with one and re-enroll a new device.
- If you have lost both your device and backup codes, contact support with proof of account ownership. Recovery takes 24-72 hours.`,
  },
  {
    source: "webhook_configuration.md",
    title: "Webhook Configuration and Signing",
    content: `# Webhooks

Webhooks deliver events to your endpoint via signed HTTP POST.

## Configuring
Settings → Developers → Webhooks → Add endpoint. Provide an HTTPS URL and select event types.

## Verifying signatures
Every webhook includes \`X-Signature\` (hex HMAC-SHA256 of the raw body using your endpoint's signing secret) and \`X-Timestamp\` (Unix seconds). Validate both — reject requests older than 5 minutes to prevent replay attacks.

\`\`\`ts
import { createHmac, timingSafeEqual } from "crypto";
const expected = createHmac("sha256", SECRET).update(rawBody).digest("hex");
if (!timingSafeEqual(Buffer.from(expected), Buffer.from(received))) reject();
\`\`\`

## Retries
Failed deliveries (non-2xx) are retried with exponential backoff over 24 hours: 1m, 5m, 30m, 2h, 6h, 12h. After 24 hours the event is marked as failed and you receive an email summary.

## Common issues
- 401/403 from your server — usually misconfigured signature verification. Use the test endpoint to inspect what we send.
- Timeouts — endpoints must respond within 10 seconds. Acknowledge with 200 quickly and process asynchronously.`,
  },
  {
    source: "data_export.md",
    title: "Exporting Your Data",
    content: `# Data Export

You can export all data tied to your account at any time.

## Requesting an export
Settings → Privacy → Request export. Select the workspaces and date range. Exports are produced as a ZIP containing JSON files plus any attachments.

## Delivery
Exports under 500 MB are emailed as a signed download link valid for 7 days. Larger exports are made available in Settings → Privacy → Exports for 30 days.

## Format
- accounts.json
- projects.json
- messages.jsonl (one event per line)
- attachments/ (original filenames preserved)

## Frequency
You can request one export per 24-hour period. Enterprise plans can configure scheduled weekly exports to S3 or GCS.`,
  },
  {
    source: "sso_setup.md",
    title: "SAML Single Sign-On (SSO) Setup",
    content: `# SAML SSO

SAML SSO is available on the Business and Enterprise plans.

## Setup
1. Settings → Security → SSO → Configure SAML.
2. Copy the ACS URL and Entity ID and paste them into your IdP (Okta, Azure AD, Google Workspace, OneLogin).
3. Upload the IdP metadata XML.
4. Map the NameID to email and optionally map groups to roles.
5. Click "Test connection" and sign in via the IdP — a green check confirms the assertion is valid.
6. Enable "Require SSO for all members" once verified.

## Troubleshooting
- "Invalid signature" — IdP signing certificate does not match. Re-upload metadata.
- "Email not asserted" — map the NameID attribute to email in your IdP.
- Just-in-time provisioning is on by default — new users are created on first sign-in with the role mapped from their IdP group.`,
  },
  {
    source: "interface_loading_issues.md",
    title: "App Interface Loading Issues",
    content: `# Interface Not Loading

If the web app shows a blank screen, freezes, or never finishes loading:

## Quick fixes
- Hard refresh: Cmd/Ctrl + Shift + R.
- Clear cookies and site data for our domain, then sign in again.
- Try an Incognito / Private window — this rules out browser extensions.
- Try a different browser (Chrome, Firefox, Safari, Edge are supported).

## If you see a specific error
- "Session expired" — sign out and back in.
- "Service unavailable" — check status.example.com for ongoing incidents.
- Slow region — open the network tab; if API requests take >2 seconds consistently, contact support with a HAR file.

## Supported browsers
Latest two versions of Chrome, Firefox, Safari, and Edge. Internet Explorer is not supported. Disable aggressive ad blockers on our domain — they can block our API calls.`,
  },
];
