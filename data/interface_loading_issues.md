# Interface Not Loading

If the web app shows a blank screen, freezes, or never finishes loading:

## Quick fixes
- Hard refresh: Cmd/Ctrl + Shift + R.
- Clear cookies and site data for our domain, then sign in again.
- Try an Incognito / Private window — this rules out browser extensions.
- Try a different browser (Chrome, Firefox, Safari, Edge are supported).

## Clearing cookies
1. Open browser settings → Privacy → Cookies and site data.
2. Search for our domain and remove all stored cookies and site data.
3. Close all tabs for our app, reopen, and sign in again.

## If you see a specific error
- "Session expired" — sign out and back in.
- "Service unavailable" — check status.example.com for ongoing incidents.
- Slow region — open the network tab; if API requests take >2 seconds consistently, contact support with a HAR file.

## Supported browsers
Latest two versions of Chrome, Firefox, Safari, and Edge. Internet Explorer is not supported. Disable aggressive ad blockers on our domain — they can block our API calls.
