# Authentication System

## Overview

UnifyOne uses **custom JWT-based authentication** with email/password and Google OAuth sign-in. Supabase is **NOT required** for authentication — it is only used for optional real-time features (live updates, presence).

## Primary Auth Method: Email + Password

### Server-Side (`server/_core/customAuth.ts`)

- **Password Hashing**: scrypt (Node.js crypto, no external deps)
- **Session Tokens**: JWT signed with `JWT_SECRET` (HS256)
- **Email Verification**: Optional (auto-bypassed if `RESEND_API_KEY` is not set)
- **Password Reset**: Via time-limited tokens sent to email

### Endpoints

| Endpoint                        | Method | Purpose                                                           |
| ------------------------------- | ------ | ----------------------------------------------------------------- |
| `/api/auth/signup`              | POST   | Create account with email/password                                |
| `/api/auth/signin`              | POST   | Sign in with email/password                                       |
| `/api/auth/logout`              | POST   | Clear session cookie                                              |
| `/api/auth/google/start`        | POST   | Start Google OAuth and return a Google authorize URL              |
| `/api/auth/google/callback`     | GET    | Exchange Google code, create/update user, set app session cookies |
| `/api/auth/verify-email`        | POST   | Verify email with token from email link                           |
| `/api/auth/forgot-password`     | POST   | Request password reset link                                       |
| `/api/auth/reset-password`      | POST   | Reset password with token                                         |
| `/api/auth/resend-verification` | POST   | Resend verification email                                         |

### Client-Side

- **Login Page**: `client/src/pages/Login.tsx` — calls `/api/auth/signin` or `/api/auth/signup`
- **Auth Hook**: `client/src/_core/hooks/useAuth.ts` — provides `user`, `loading`, `logout()`, `isAuthenticated`
- **Session Storage**: HTTP-only cookie (`app_session_id`)

## Google OAuth Sign-In

Google OAuth uses the same UnifyOne session cookies as email/password, so all tRPC auth and tenant checks continue to use `ctx.user` from the local database.

### Global Provider Setup

Set these server-side environment variables:

```bash
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
PUBLIC_APP_URL=https://1commerce.online
```

In Google Cloud Console, configure the OAuth client as a Web application and add this Authorized redirect URI:

```text
https://1commerce.online/api/auth/google/callback
```

`GOOGLE_OAUTH_REDIRECT_URI` is optional. Leave it blank to default to `PUBLIC_APP_URL + /api/auth/google/callback`.

### Tenant-Specific Provider Setup

Workspace owners can also save tenant-specific Google OAuth credentials from Settings -> Advanced. Then open the login page with:

```text
/login?tenant=your-store-slug
```

Tenant-specific settings take priority for that tenant. If they are absent, the global Google provider is used.

### User Linking

- If a Google email matches an existing, non-deleted user, that user is signed in and marked `emailVerified: true`.
- If no matching user exists, a passwordless user is created with `loginMethod: "google"`.
- If a tenant-specific login tries to use a Google account already attached to another tenant, the login is rejected to protect tenant isolation.

## Email Verification Behavior

### When `RESEND_API_KEY` is set (production)

1. User signs up → account created with `emailVerified: false`
2. Verification email sent with link to `/verify-email?token=...`
3. User clicks link → `POST /api/auth/verify-email` verifies token → sets `emailVerified: true`
4. User can sign in after verification

### When `RESEND_API_KEY` is NOT set (development / no email service)

1. User signs up → account created with `emailVerified: true` (auto-verified)
2. No verification email sent
3. User can sign in immediately

## Fallback Auth Providers (Optional)

### Clerk

- **Endpoint**: `POST /api/auth/clerk`
- **Setup**: Set `CLERK_SECRET_KEY` in `.env`, add Clerk SDK to frontend
- **How it works**: Clerk authenticates user → frontend sends session token to `/api/auth/clerk` → server verifies with Clerk API → issues app session cookie

### Firebase

- **Endpoint**: `POST /api/auth/firebase`
- **Setup**: Set `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY` in `.env`, add Firebase SDK to frontend
- **How it works**: Firebase authenticates user → frontend sends ID token to `/api/auth/firebase` → server verifies with Firebase Admin SDK → issues app session cookie

## Supabase (Optional — Real-time Only)

Supabase is **NOT** used for authentication. It's only used for:

- Real-time subscriptions (`client/src/lib/supabaseRealtime.ts`)
- Live presence indicators
- Push notifications

If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set, the app gracefully degrades to polling mode.

## Session Flow

1. **Sign In**: User submits email + password → backend verifies → JWT signed → cookie set
2. **Authenticated Requests**: Browser sends cookie → backend verifies JWT → populates `ctx.user` in tRPC context
3. **Sign Out**: User clicks logout → `POST /api/auth/logout` → cookie cleared

## Security Features

- **Scrypt password hashing** (CPU/memory-hard, resistant to GPU cracking)
- **HTTP-only cookies** (no XSS attacks)
- **SameSite=Lax** (CSRF protection)
- **Timing-safe password comparison** (prevents timing attacks)
- **Signed OAuth state** for Google sign-in callback integrity
- **Rate limiting** on login/signup/password-reset (Upstash Redis in production, in-memory in dev)
- **Email enumeration protection** (always return success for password reset requests)

## Environment Variables

### Required

- `JWT_SECRET` — Secret for signing session JWTs (min 32 chars)
- `DATABASE_URL` — PostgreSQL connection string

### Optional

- `RESEND_API_KEY` — Email service (if absent, email verification is skipped)
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` — Enable global Google OAuth sign-in
- `CLERK_SECRET_KEY` — Enable Clerk fallback auth
- `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY` — Enable Firebase fallback auth
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Enable real-time features

## Migration from Supabase Auth

If you're migrating from Supabase auth:

1. **Remove Supabase client calls** from your frontend (already done in this repo)
2. **Remove `/api/auth/supabase-session` endpoint** if no longer needed (legacy, still present for backward compatibility)
3. **Update OAuth flows** if using Supabase OAuth providers → migrate to Google OAuth, Clerk, or Firebase
4. **Keep Supabase for Realtime** if you use live updates/presence (it's optional and doesn't affect auth)

## Testing

Run the custom auth tests:

```bash
pnpm test server/__tests__/customAuth.test.ts
```

The tests verify:

- Password hashing/verification
- Sign up flow (validation, duplicate emails, success)
- Sign in flow (missing user, wrong password, unverified email, success)
- Cookie generation (session + logout)
