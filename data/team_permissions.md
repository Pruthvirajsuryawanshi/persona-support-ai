# Team Roles and Permissions Guide

## Overview

This document describes the permission model for managing your team on the platform.

## Role Types

### Owner
- One per organization
- Full access to all features and settings
- Only role that can delete the organization account
- Manages billing and subscriptions
- Can transfer ownership to another Admin

### Admin
- Can manage team members (invite, remove, change roles)
- Full access to all workspaces and projects
- Can configure integrations and API keys
- Cannot access or modify billing (unless also Owner)

### Agent
- Can view and respond to assigned tickets
- Can access shared knowledge base
- Cannot manage team members or integrations
- Cannot view billing information

### Viewer
- Read-only access to tickets and reports
- Cannot respond to tickets or modify any settings
- Useful for stakeholders who need visibility without write access

## Permission Matrix

| Action | Owner | Admin | Agent | Viewer |
|---|---|---|---|---|
| View tickets | ✅ | ✅ | ✅ | ✅ |
| Respond to tickets | ✅ | ✅ | ✅ | ❌ |
| Manage team members | ✅ | ✅ | ❌ | ❌ |
| Configure integrations | ✅ | ✅ | ❌ | ❌ |
| Manage API keys | ✅ | ✅ | ❌ | ❌ |
| View billing | ✅ | ❌ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ | ❌ |
| Export data | ✅ | ✅ | ❌ | ❌ |

## Inviting Team Members

1. Go to **Settings → Team → Invite Member**
2. Enter the email address and select a role
3. An invitation email is sent; the link expires in 72 hours
4. Pending invitations are shown in **Settings → Team → Pending Invites**

## Changing a Member's Role

1. Go to **Settings → Team**
2. Click the three-dot menu next to the member's name
3. Select **Change Role**
4. Changes take effect immediately

## Removing a Member

1. Go to **Settings → Team**
2. Click the three-dot menu → **Remove from Organization**
3. The member loses access immediately
4. Their historical activity (tickets responded to) is retained for audit purposes

## Single Sign-On (SSO) and Auto-Provisioning

Enterprise plans support SCIM auto-provisioning:
- New users added to your IdP group are automatically invited with the mapped role
- Users removed from your IdP group are automatically deprovisioned
- Configure SCIM under **Settings → Security → SCIM Provisioning**
