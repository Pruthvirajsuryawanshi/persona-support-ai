# API Authentication

All API requests require a bearer token in the Authorization header.

## Header format
```
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

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
Revocation is instant. There is no grace period.

## Troubleshooting API connectivity
- Confirm the Authorization header uses the exact format `Bearer <token>` with a single space.
- Verify Content-Type is application/json for POST/PUT requests.
- Check rate-limit response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.
