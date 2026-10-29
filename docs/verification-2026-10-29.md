# Product demo verification — October 29, 2026

## Outcome

**Blocked at API → database; production readiness not established.**

Story under test: a driver publishes a ride, a passenger discovers it in the browser, completes authentication, books a seat, and sees the persisted booking and updated availability.

## Evidence

| Boundary | Result | Evidence |
| --- | --- | --- |
| Repository deployment metadata | Missing | GitHub `homepageUrl` is empty; no production demo URL was established |
| Configured MongoDB | Failed | Direct connection through Mongoose with a five-second server-selection timeout returned `MongooseServerSelectionError` |
| Local UI preview | Passed for rendering | `/`, `/register`, `/login`, `/map`, `/help-center`, and `/browse-all-rides` returned HTTP 200 |
| Screenshot review | Passed for captured screens | Login, registration, map, and help center captures visually inspected at 1440 × 1100 |
| External map tiles | Rendered | Map screenshot contains Leaflet/OpenStreetMap tiles and attribution |
| Browser geolocation | Unavailable | Map displays “Unable to get your location” |
| Authentication and OTP delivery | Blocked / not exercised | No database connection; no real phone numbers used and no provider messages sent |
| Create ride → persistence | Blocked / not exercised | Database boundary unavailable |
| Search → booking → updated seats | Blocked / not exercised | No persisted test ride or authenticated test account |
| Messaging callbacks | Not verified | No deployed HTTPS callback test performed |

The screenshot server was a temporary loopback-only UI preview, not `src/index.js`. It served the existing HTML and CSS and returned explicit HTTP 503 responses for `/api/*`; it did not fake API success, authentication, rides, or booking data. HTTP 200 above proves preview page availability only.

## Production blockers found by source inspection

1. **OTP disclosure:** `src/routes/auth.js` includes `otp: result.otp` in the request-OTP response for testing. Production authentication must not disclose the verification code to the requesting browser.
2. **Static source exposure:** `src/index.js` mounts the repository root with `express.static`. Limit public assets to a dedicated directory or explicit allowlist; source/configuration files should not be public assets.
3. **Mock driver assignment:** `/api/ride/book` calls `getMockDriver()`. This is a prototype flow, not a dispatch confirmation from an actual driver.
4. **Database startup handling:** `connectDB()` can return `false` after a failed connection; `startServer()` does not check that return value before logging success, starting scheduled work, and opening the HTTP listener. A listening server therefore does not prove database readiness.
5. **Overlapping ride routes:** handlers in `src/index.js` run before the unified `/api` router, so authorization and validation must be reviewed on the effective handler rather than assumed from the later router.
6. **Automated coverage:** `npm test` remains a placeholder that exits unsuccessfully. The manual integration scripts do not establish regression coverage.

These findings are recorded for follow-up; this documentation update does not claim to remediate them.

## Resume the acceptance test

1. Restore connectivity to a dedicated test MongoDB database; keep credentials outside Git. Confirm the database health endpoint reports healthy, not just that the listener starts.
2. Resolve the production blockers above and configure a known HTTPS demo URL with test-provider credentials.
3. Use dedicated driver and passenger test accounts. Verify OTP delivery through the provider and confirm invalid/expired codes and unauthenticated requests are rejected.
4. Publish one clearly labeled synthetic ride. Verify it exists in MongoDB and appears in browser discovery with matching time, destination, fare, and seat count.
5. Book a seat as the passenger. Verify the response in the browser, persisted passenger membership, driver/passenger history, and exact seat decrement.
6. Attempt duplicate and over-capacity bookings. Confirm rejection without corrupting inventory. Cancel the test booking and verify capacity is restored.
7. Verify provider callbacks and notifications against test recipients, then remove only records created for this run.
8. Capture populated driver/passenger screens only after this flow passes. Record request status codes and sanitized database evidence without publishing tokens, OTPs, personal data, or connection strings.

## Showcase files

- `images/pdrides-home.png` — existing home-page showcase.
- `images/pdrides-login.png` — role selection.
- `images/pdrides-register.png` — registration form.
- `images/pdrides-map.png` — map rendering and trip controls, with location warning visible.
- `images/pdrides-help.png` — topic-based help center.

## Source syntax check

All 26 JavaScript modules under src/ passed node --check. This verifies parsing only; it does not establish runtime behavior.
