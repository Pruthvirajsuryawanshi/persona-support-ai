# Database Integration

We support Postgres 13+, MySQL 8+, and SQL Server 2019+.

## Connection string format
`postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require`

The SSL mode parameter is required for production. Self-signed certificates require `sslmode=verify-ca` plus an uploaded CA bundle in Settings → Integrations → Database.

## Common errors
- "Internal error: connection reset" — almost always a firewall or PgBouncer pooling issue. Allowlist our egress IPs (listed in Settings → Integrations) and confirm that the pool is in transaction mode, not statement mode.
- "permission denied for schema public" — the database user lacks USAGE on the schema. Grant: `GRANT USAGE ON SCHEMA public TO <user>; GRANT SELECT ON ALL TABLES IN SCHEMA public TO <user>;`
- "too many connections" — increase max_connections, or enable our managed connection pooler.
- "SSL handshake failed" — your CA bundle is stale; download the latest from Settings → Integrations.

## Verifying connectivity
Use the "Test connection" button on the integration page. It runs a SELECT 1 and reports latency. If latency exceeds 200ms consistently, you may be in a different region — open a ticket so we can re-region your workspace.
