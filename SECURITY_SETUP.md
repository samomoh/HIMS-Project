# Secure deployment setup

HealthAI now requires a signed staff session. Keep these values in the hosting provider's secret environment settings; do not commit them to source control.

## Required environment

- `DATABASE_URL`: PostgreSQL connection string.
- `DATABASE_SSL=true`: enable TLS for managed PostgreSQL. Certificate validation stays enabled.
- `SESSION_SECRET`: at least 32 random bytes. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
- `APP_URL`: the public HTTPS origin, for example `https://hmis.example.org`.
- `RESEND_API_KEY`: API key for the Resend email service.
- `RESET_EMAIL_FROM`: a sender address verified with that email provider.

Password recovery and first-login setup send a link through Resend. Without the email settings, the app deliberately does not reveal or return reset tokens.

## First administrator

Before deploying, run `npm run migrate-security` against the configured database to add the session-version field and persistent authentication rate-limit table. This migration is additive and safe to rerun. Confirm the existing application tables are present as well.

After deploying the updated code, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`, then run `npm run bootstrap-admin` once. The password must have at least 12 characters. The command either creates the first super administrator or sets a password on one existing admin account only when no account has a password yet. Remove `BOOTSTRAP_ADMIN_PASSWORD` immediately afterward.

New staff accounts receive a password setup link. Configure email delivery before inviting staff. Existing staff accounts without a password can use the reset flow after email delivery is configured.

## Sample RBAC walkthrough

For a disposable local or staging database only, set `ALLOW_DEMO_ACCOUNTS=true`, `ENABLE_DEMO_ACCOUNTS=true`, and `DEMO_ACCOUNTS_PASSWORD` (at least 12 characters), then run `npm run seed-demo-accounts`. The login screen will show a role picker and fill the selected sample account. It is hidden automatically in production, and the seed command refuses production. Sample accounts use `@example.test` emails and are inserted only when absent; they do not replace existing accounts. Disable both flags and remove the demo password after the walkthrough.

For an isolated local walkthrough, install Docker Desktop, start the included PostgreSQL service with `docker compose up -d db`, then run `npm run db:setup`. The command syncs the Drizzle schema and adds the sample role accounts. The local-only PostgreSQL credentials are `postgres` / `postgres`; the service is bound to localhost and its data is stored in the `hmis-local-pg` volume. The default demo password is `LocalTestingOnly!2026`. These defaults are for disposable local development only. Do not reuse them in staging or production. `npm run db:setup` is a schema sync and should only target the fresh local database.

## Operational notes

- All application pages and API routes are private except sign-in, password reset, and the basic health endpoint.
- Session cookies are HTTP-only, same-site, signed, and invalidated when the account role or password changes.
- The app enforces section roles at the request boundary and re-checks the current account for server actions and sensitive endpoints.
- Seed scripts refuse to run in production. The table-clearing `src/db/seed.ts` script additionally requires `ALLOW_DESTRUCTIVE_SEED=true` and must only be used with a disposable development database.
- Login and password-reset attempts are rate-limited in PostgreSQL across serverless instances. Also configure the deployment platform's edge rate limiter/WAF to absorb traffic before it reaches the app.

This security work does not constitute a clinical, privacy, or regulatory certification. Complete a threat review, operational validation, and applicable healthcare compliance work before using real patient information.
