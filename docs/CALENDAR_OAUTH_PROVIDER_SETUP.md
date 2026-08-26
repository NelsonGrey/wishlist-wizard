# Calendar Provider OAuth Setup (Google / Microsoft / Facebook)

This is the manual, external, developer-console work needed to make the calendar
"Connections" feature (web `ConnectCalendarDialog.tsx`/`CalendarSettings.tsx`, mobile
`calendar_screen.dart`'s Connections tab) actually functional for Google, Outlook, and
Facebook. It's separate from anything in this codebase — it happens entirely on each
provider's own developer site, under your account.

**Current state**: none of the 9 secrets these providers need
(`GOOGLE_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI`, `MICROSOFT_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI`,
`FACEBOOK_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI`) exist with real values in any environment.
They're seeded in `wishlist-wizard-dev`'s Secret Manager with a `__unconfigured__`
placeholder (see `src/api/calendar.ts`'s `hasOAuthProviderConfig`/`isOAuthValueSet`, in the
`wishlist-wizard-functions` companion repo) so the backend can deploy, but the feature stays
inert — `getCalendarAuthUrl` returns `{ supported: false }` until real values replace the
placeholder. **Apple Calendar doesn't need any of this** — it's a pasted iCal subscription
URL, not OAuth, and already works end-to-end.

## What "register an OAuth app" means, per provider

### Google (Google Cloud Console)
1. In a GCP project (reuse `wishlist-wizard-dev`/`-staging`/`-prod`, or a dedicated one),
   enable the **Google Calendar API** and **People API**.
2. Configure the **OAuth consent screen** — app name, logo, support email, and the scopes
   already requested in code: `calendar`, `contacts.readonly`, `userinfo.email`.
3. Create an **OAuth 2.0 Client ID** (type: "Web application"). This gives you a
   **Client ID** and **Client Secret**.
4. Add authorized redirect URIs: both the web one and `wishlistwizard://calendar-callback`
   (the mobile custom scheme registered in `Info.plist`/`AndroidManifest.xml`).
5. **Caveat**: Calendar access is a "sensitive scope." Past 100 test users, Google requires
   an **app verification review** before it works for the general public — days to weeks,
   needs a privacy policy URL and a demo video. Not a same-day task.

### Microsoft (Microsoft Entra admin center, formerly Azure AD)
1. Register an app in the **Microsoft Entra admin center**.
2. Add **API permissions**: `Calendars.ReadWrite`, `User.Read`, `Contacts.Read`,
   `offline_access` (matches what the code requests).
3. Create a **client secret** under "Certificates & secrets."
4. Add redirect URIs (web + `wishlistwizard://calendar-callback`).
5. Generally faster than Google — no lengthy verification for this scope set in most cases,
   though multi-tenant "publisher verification" exists if you want to avoid an "unverified"
   warning on the consent screen.

### Facebook (Meta for Developers)
1. Create an app at developers.facebook.com.
2. Add the **Facebook Login** product, configure OAuth redirect URIs the same way.
3. Request the permissions the code uses: `public_profile`, `email`, `user_birthday`,
   `user_friends`.
4. **Caveat**: `user_birthday` and `user_friends` are restricted permissions — Meta requires
   an **App Review** submission (screencast of the flow, written justification per
   permission) before real users outside your own test accounts can grant them. Typically
   the slowest of the three to get production-ready.

## What to do with the resulting credentials

Each provider gives you a **Client ID** and **Client Secret**. Set them in GCP Secret
Manager, replacing the `__unconfigured__` placeholders — dev first, then staging/prod once
ready:

```bash
printf "<real-client-id>" | gcloud secrets versions add GOOGLE_CLIENT_ID \
  --project=wishlist-wizard-dev --data-file=-
```
(repeat per secret, per environment — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_REDIRECT_URI`, and the `MICROSOFT_*`/`FACEBOOK_*` equivalents)

`*_REDIRECT_URI` should be set to the **web** redirect (`https://<origin>/app/calendar`) —
mobile always passes its own `redirectUri` (`wishlistwizard://calendar-callback`) explicitly
per-request, so the env var is only the fallback used when no caller supplies one.

No code changes are needed once the real values are in place — `hasOAuthProviderConfig`
will start returning `true` and the existing web/mobile flows take over automatically. Redeploy
functions (`npm run deploy:api` from the `wishlist-wizard` repo root, or
`firebase deploy --only functions --project <env>` from `packages/functions`) so the new
secret values actually get picked up by a running function instance.
