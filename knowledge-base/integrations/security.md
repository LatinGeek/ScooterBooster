# Security Integration Notes

## Trusted Origins

State-changing browser routes must validate the `Origin` header before they process the request body or mutate data.

The shared helper lives in `src/lib/security.ts`:
- `assertTrustedOrigin(req)` rejects missing or untrusted origins with a 403 response.
- `getTrustedOrigins(req)` trusts `NEXT_PUBLIC_APP_URL` in every environment.
- In non-production, it also trusts the request origin plus `http://localhost:3000` and `http://127.0.0.1:3000` so local browser development and Playwright remain usable.

## Protected Routes

This policy is currently enforced on:
- `POST /api/auth/session`
- `POST /api/auth/signout`
- `POST /api/bookings`
- `PATCH /api/bookings/[id]`
- `POST /api/payments/initiate`
- `POST /api/reviews`
- `PATCH /api/reviews/[id]`
- `PATCH /api/technicians/me`
- `PATCH /api/users/me`
- `DELETE /api/users/me`
- `POST /api/admin/set-role`
- `PATCH /api/admin/settings`
- `PATCH /api/admin/technicians/[id]`

## Rate Limiting

The shared limiter lives in `src/lib/ratelimit.ts`.

- When `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present, the app uses `@upstash/ratelimit` with `@upstash/redis`.
- Without those variables, the app falls back to a process-local in-memory limiter so local development, tests, and Playwright can still exercise the protected routes.

Current limits:
- auth session/signout: 10 requests per minute per IP
- booking creation: 30 requests per minute per user
- payment initiation: 10 requests per minute per user
- review creation: 10 requests per day per user

## Content Sanitization

The shared sanitizer lives in `src/lib/sanitize.ts` and uses `isomorphic-dompurify` to strip unsafe HTML before validation and persistence.

Current sanitized inputs:
- review comments on `POST /api/reviews`
- technician replies on `PATCH /api/reviews/[id]`
- technician bios on `PATCH /api/technicians/me`

These fields are stored as plain text, not rich HTML.

## Data Export

`GET /api/users/me/export` returns a user-owned export bundle with:
- the user profile document
- the user's bookings
- the user's reviews
- the linked technician profile when the signed-in account also has one

This is the current privacy-export endpoint for account requests. The separate hard-delete/grace-period workflow is still pending.

## Why Webhooks Are Excluded From Origin Checks

Server-to-server integrations such as `POST /api/payments/webhook` do not come from a browser, so they cannot rely on `Origin` the way app mutations do.

Those endpoints should be protected with provider-specific verification instead:
- MercadoPago webhook signature validation
- rate limiting
- provider allowlisting where possible

## Operational Notes

- Keep `NEXT_PUBLIC_APP_URL` aligned with the primary deployed domain.
- If preview domains need write access later, extend the trusted-origin helper deliberately instead of disabling the check.
- SameSite cookies are the baseline protection layer, but origin validation gives us an explicit server-side CSRF guard on top.
- Add the Upstash Redis env vars before expecting distributed rate-limit enforcement in deployed environments.
