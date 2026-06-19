# SAML Single Sign-On (SSO) Setup

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
- Just-in-time provisioning is on by default — new users are created on first sign-in with the role mapped from their IdP group.
