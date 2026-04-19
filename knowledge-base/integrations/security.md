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

## Why Webhooks Are Excluded

Server-to-server integrations such as `POST /api/payments/webhook` do not come from a browser, so they cannot rely on `Origin` the way app mutations do.

Those endpoints should be protected with provider-specific verification instead:
- MercadoPago webhook signature validation
- Rate limiting
- Provider allowlisting where possible

## Operational Notes

- Keep `NEXT_PUBLIC_APP_URL` aligned with the primary deployed domain.
- If preview domains need write access later, extend the trusted-origin helper deliberately instead of disabling the check.
- SameSite cookies are the baseline protection layer, but origin validation gives us an explicit server-side CSRF guard on top.
