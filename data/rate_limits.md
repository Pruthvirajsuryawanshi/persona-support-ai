# Rate Limits and Quotas

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
Contact sales for sustained limit increases. Burst credits are also available — 100,000 extra requests are auto-granted to Pro accounts each month.
