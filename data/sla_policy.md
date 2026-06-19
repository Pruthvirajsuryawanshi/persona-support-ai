# Service Level Agreement (SLA) Policy

## Overview

This document defines the response and resolution time commitments for customer support tickets based on plan tier and issue severity.

## Support Tiers

| Plan | Support Channel | First Response | Resolution Target |
|---|---|---|---|
| Free | Email only | 48 hours | Best effort |
| Starter | Email + Chat | 8 business hours | 3 business days |
| Professional | Email + Chat + Phone | 4 business hours | 1 business day |
| Enterprise | Dedicated agent | 1 hour (24/7) | 4 hours (P1) |

## Severity Levels

### P1 — Critical (Service Down)
- **Definition**: Complete service outage or data loss affecting all users
- **Enterprise response**: 15 minutes (24/7)
- **Professional response**: 1 hour (business hours)
- **Examples**: API completely unavailable, database connection failure, authentication system down

### P2 — High (Major Feature Impaired)
- **Definition**: Core functionality severely degraded for most users
- **Enterprise response**: 1 hour (24/7)
- **Professional response**: 4 business hours
- **Examples**: Slow response times >10s, intermittent 500 errors, payment processing failures

### P3 — Medium (Minor Feature Impaired)
- **Definition**: Non-critical feature broken; workaround available
- **Enterprise response**: 4 business hours
- **Professional response**: 1 business day
- **Examples**: Report export fails, webhook delays, single integration broken

### P4 — Low (Cosmetic/Enhancement)
- **Definition**: UI inconsistency, documentation question, or feature request
- **All plans**: 3–5 business days

## SLA Breach Compensation

If we fail to meet P1 or P2 SLA targets on Enterprise plans:
- 1 day breach: 10% service credit on next invoice
- 3+ day breach: 25% service credit
- Credits are applied automatically; no claim needed

## Measuring Response Time

SLA timers start when a ticket is received in our system.
Business hours: Monday–Friday, 09:00–18:00 UTC (excluding public holidays).
Enterprise P1 SLAs are measured 24/7.

## Escalation Path

If your issue is not resolved within the target time:
1. Reply to the ticket requesting escalation
2. Contact your dedicated account manager (Enterprise)
3. Email escalations@example.com with your ticket ID
