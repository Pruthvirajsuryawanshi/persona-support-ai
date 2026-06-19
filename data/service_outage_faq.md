# Service Outage & Incident FAQ

## Where to Check Service Status

Always check our live status page first: **status.example.com**

The status page shows:
- Current operational status of all components
- Active incidents with real-time updates
- Historical uptime for the past 90 days
- Subscribe to notifications via email, Slack, or webhook

## What Happens During an Outage

### Detection and Response Timeline

| Stage | Target Time |
|---|---|
| Incident detected | Automated monitoring (< 1 min) |
| On-call engineer paged | < 5 minutes |
| Initial status page update | < 10 minutes |
| Interim update posted | Every 30 minutes |
| Incident resolved | Depends on severity |
| Post-mortem published | Within 5 business days |

### Incident Severity Classification

- **Critical (P1)**: Full service outage — all hands response, 24/7
- **Major (P2)**: Significant degradation — senior engineers engaged
- **Minor (P3)**: Partial impact — resolved in normal business hours

## Common Questions During an Outage

**Q: My API calls are timing out. Is there an outage?**
A: Check status.example.com. If the API is listed as "Operational" but you experience issues, open a support ticket with your request IDs and timestamps.

**Q: How do I get real-time outage updates?**
A: Click "Subscribe to Updates" on status.example.com. Choose email, SMS, or Slack webhook.

**Q: Will I be compensated for downtime?**
A: Enterprise P1 outages breaching SLA targets receive automatic service credits. See the SLA Policy document for details.

**Q: My data shows gaps from the outage period. Will it be backfilled?**
A: For data-ingestion outages, we replay events from our message queue up to 72 hours back once service is restored. Contact support if you notice gaps beyond this window.

**Q: The outage is over but my service isn't recovering. What should I do?**
A: Try these steps:
1. Clear your DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (macOS)
2. Restart your integration service
3. Re-authenticate your API key
4. If using webhooks, check that your endpoint is receiving events

## Planned Maintenance

Scheduled maintenance windows:
- **Standard**: Saturdays 02:00–04:00 UTC
- **Announced**: At least 72 hours in advance via status page and email
- **Emergency**: Announced as soon as practicable

During maintenance, some features may be temporarily unavailable. Core API endpoints remain available unless specifically noted.

## Post-Mortem Reports

After every P1 or P2 incident, we publish a post-mortem within 5 business days that includes:
- Root cause analysis
- Timeline of events
- Actions taken to prevent recurrence

Post-mortems are archived at status.example.com/incidents.
