# AGENTS.md - SaleKit API Learning Project

## 1. Interaction rules

- The user may write in English or Myanmar, but always respond in Myanmar language.
- Never create, update, remove, rename, move, fix, or otherwise modify code, files, folders, configuration, dependencies, the database, or project structure unless the user explicitly says the exact phrase:

  `Build Now`

- Similar phrases such as `start`, `next`, `continue`, `go ahead`, `do it`, or `proceed` are not permission to modify the project.
- Before `Build Now`, only inspect, discuss, explain, review, plan, suggest, and provide commands or focused code snippets for the user to write manually.
- When `Build Now` is given, make only the changes already discussed or explicitly requested in that message.
- Do not silently install packages, create database objects, run migrations, seed data, or modify the SaleKit frontend.

## 2. Project purpose

SaleKit API is a backend learning project for the existing SaleKit React frontend. The goal is to learn and manually reproduce useful Express, TypeScript, MySQL, product ownership, API, email OTP, authentication, and minimal role-based authorization fundamentals.

The user must be able to rebuild the focused authentication system and ownership-aware CRUD manually during a 5-hour-30-minute coding test. Prefer the simplest secure implementation and the least amount of code that still demonstrates the required behavior clearly.

This is not intended to be an enterprise architecture or a production-ready POS backend. The main rule is:

> Help the user become capable of building the API without AI. Choose the simplest correct and valuable solution over an impressive or overly abstract solution.

## 3. Current project status and direction

- The Express + TypeScript project is initialized.
- Environment configuration and the MySQL connection are implemented.
- Product CRUD API endpoints are implemented.
- Product API testing has been completed before beginning frontend integration.
- Frontend product integration was started but is intentionally paused. Preserve the existing frontend work and mock data.
- The current focus is backend authentication and email OTP flows, followed by ownership-aware product CRUD, then minimal `user`/`admin` role-based authorization.
- The agreed RBAC demonstration is intentionally limited to `GET /api/admin/users` and `GET /api/admin/stats`.
- After the complete backend flow is tested independently, connect authentication and product CRUD to the React frontend.
- Sales, checkout persistence, deployment, OAuth, MFA, role-management endpoints, and advanced authorization remain future scope.

## 4. Agreed technology

- Node.js
- Express
- TypeScript
- MySQL
- `mysql2` using the promise API
- `cors`
- `dotenv`
- `tsx` for development
- `bcrypt` for password hashing
- `jsonwebtoken` for access JWT creation and verification
- `cookie-parser` for reading the authentication cookie
- `nodemailer` with SMTP for email delivery
- A small rate-limiting package only when the OTP and authentication endpoints require brute-force protection

Add TypeScript type packages only when required. Do not add an ORM, framework, Redis, queue, dependency-injection system, or validation library unless the user explicitly requests one.

## 5. Required working style

The project must be built through tiny, logically connected code steps.

- Do not build a complete authentication feature or multiple endpoints in one step.
- Do not complete an entire file merely because the file exists.
- Do not generate the complete backend in one response.
- Teach one small concept or code flow at a time.
- The user normally writes the important code manually.
- AI help should focus on guidance, review, repetitive code, configuration details, and fixes explicitly requested by the user.
- Keep each step small enough for the user to understand, explain, and reproduce under coding-test time pressure.

For every manual step:

1. State the small goal.
2. Name the exact file and location where the code belongs.
3. Provide only the focused snippet needed for that step.
4. Briefly explain what it does and why it is needed.
5. Explain how to verify it before moving on.
6. Wait for the user to say `done` or ask a question.

When the user says `done`, continue with the next smallest useful logical step. Inspect the actual current code before diagnosing an error.

## 6. Simplicity and code style

- Prefer ordinary functions, direct control flow, and readable variable names.
- Use simple TypeScript types and interfaces.
- Avoid advanced generics, decorators, classes, dependency injection, and unnecessary assertions.
- Avoid `any`; fix types properly.
- Keep related logic close together until a clear second responsibility or real repetition justifies extraction.
- Do not create repository or service layers merely to imitate enterprise architecture.
- The existing route/controller structure may be extended for authentication without introducing extra architectural layers.
- A small email module or authentication middleware file is allowed because each has a clear separate responsibility.
- Avoid clever one-liners and excessive helper functions.
- Add short comments only where the reason is not obvious.
- Preserve existing working code and avoid unrelated refactors.

## 7. Authentication scope

Build these backend flows:

```text
POST /api/auth/signup
POST /api/auth/verify-email
POST /api/auth/resend-verification-otp
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

The initial signup input is:

```ts
type SignupData = {
  name: string
  email: string
  password: string
}
```

Rules:

- Normalize email consistently by trimming it and converting it to lowercase.
- Validate all request bodies before database work.
- Never store or log plain-text passwords or raw OTP values.
- Hash passwords with `bcrypt` and verify them with `bcrypt.compare`.
- Start with a bcrypt cost factor of 12, but keep it easy to change and benchmark.
- Account login is rejected until email verification succeeds.
- Login errors should use a small generic response that does not reveal whether the email or password was wrong.
- Forgot-password requests must return the same public response whether or not the email exists.

## 8. Email OTP rules

Email verification and forgot-password recovery use six-digit email OTPs, not clickable authentication tokens.

### Signup verification flow

1. Create the user with an unverified status.
2. Generate a cryptographically secure six-digit OTP.
3. Store only an HMAC-SHA-256 digest of the OTP with an expiry time.
4. Email the raw OTP to the user.
5. The user submits their email and OTP to `/api/auth/verify-email`.
6. Compare the submitted OTP hash, check expiry, mark the user verified, and clear the stored verification OTP fields.

### Forgot-password flow

1. The user submits an email to `/api/auth/forgot-password`.
2. Always return a generic success response.
3. If the account exists, generate a new secure six-digit OTP.
4. Store only its HMAC-SHA-256 digest and expiry, then email the raw OTP.
5. The user submits email, OTP, and the new password to `/api/auth/reset-password`.
6. Validate the OTP and expiry, hash the new password, update it, and clear the reset OTP fields.
7. Do not automatically log the user in after password reset.

OTP policy:

- Verification OTP lifetime: 10 minutes.
- Password-reset OTP lifetime: 10 minutes.
- Only the newest OTP for each purpose is valid; resending replaces the previous OTP.
- A successful OTP can be used only once because its stored hash and expiry are cleared.
- Generate OTP digests with a separate strong `OTP_SECRET` environment variable. Do not use a plain fast hash for a six-digit OTP because its small value space is easy to brute-force offline.
- Apply simple rate limiting to signup, resend, verify, login, forgot-password, and reset-password endpoints before considering the authentication scope complete.
- Never include OTP values in server logs or API responses.

## 9. JWT and cookie rules

- Use a short-lived access JWT without a refresh-token system in the coding-test version.
- Store the access JWT in an `HttpOnly` cookie rather than browser local storage.
- Use a generic cookie name such as `access_token`.
- Suggested access-token lifetime: 1 hour.
- Use a strong random signing secret stored in an environment variable.
- The initial single-API implementation may use `HS256`.
- Explicitly allow only the selected algorithm during verification.
- Verify the JWT signature and validate its expiration, issuer, audience, subject, and token type.
- Never use `jwt.decode()` as proof of authentication.
- Keep the payload small and do not place passwords, password hashes, OTPs, or sensitive personal data in it.

Suggested access-token claims:

```text
sub   = authenticated user ID
type  = "access"
iss   = "salekit-api"
aud   = "salekit-frontend"
iat   = issued-at time
exp   = expiration time
```

- During the initial authentication and ownership phases, keep the token limited to the claims above.
- After the agreed RBAC phase begins, add a validated `role` claim containing only `"user"` or `"admin"`.
- Because the role is carried in a signed one-hour JWT, a database role change may not take effect for an already issued token until that token expires. This tradeoff is accepted for the coding-test version.

Cookie policy:

```text
httpOnly: true
sameSite: "lax"
secure: true in production and false only for local HTTP development
path: "/"
```

- Logout clears the cookie using matching cookie options.
- The simple version does not implement refresh tokens, token rotation, Redis, or a JWT denylist.
- Therefore, a stolen access JWT can remain valid until its short expiry. Explain this tradeoff clearly and add stronger revocation only in a later advanced version.

## 10. Minimal authentication database shape

Keep the coding-test schema simple. The planned `users` fields are:

```text
id
name
email
password_hash
is_verified
verification_otp_hash
verification_otp_expires_at
reset_otp_hash
reset_otp_expires_at
created_at
updated_at
```

- Keep email unique.
- Add the `role` field later during the dedicated RBAC phase, not while the core authentication and ownership work is unfinished.
- The later role field should allow only `user` and `admin`, and existing/new ordinary accounts should default to `user`.
- Store UUID values consistently with the existing product-ID approach unless a different mapping is discussed and agreed.
- Storing the two current OTP purposes directly on `users` is intentional for the small project. Do not create a general token table unless later requirements justify it.
- Do not create, drop, truncate, alter, migrate, or seed database objects without authorization for that exact action using `Build Now`.

## 11. Ownership-aware product CRUD

After authentication is independently working, make products user-specific.

- Add `user_id` to `products` and relate it to `users.id`.
- Protect every product route with the authentication middleware.
- Create products with the authenticated user's ID; never accept ownership from the request body.
- Scope every product read, update, and delete query by the authenticated user's ID.
- Use parameterized SQL for every value.
- Treat a missing product and another user's product the same, normally with `404`, so ownership information is not disclosed.
- Test with at least two accounts and prove that one account cannot list, read, update, or delete the other account's products.
- Before making `products.user_id` required, explicitly decide how existing product rows will receive an owner. Do not silently delete or reassign them.

Expected query conditions include:

```sql
WHERE user_id = ?
```

and for a single product:

```sql
WHERE id = ? AND user_id = ?
```

## 12. Minimal role-based access control

Add RBAC only after authentication and ownership-aware product CRUD are complete and tested.

The coding-test scope has exactly two roles:

```text
user
admin
```

The minimal admin API has exactly these two read-only endpoints:

```text
GET /api/admin/users
GET /api/admin/stats
```

Rules:

- Signup must never accept or trust a role from the request body. New accounts always receive the database default role of `user`.
- Do not add public role-assignment, role-change, user-delete, user-ban, or other admin mutation endpoints during this roadmap.
- Promote the single test admin account only through a separately reviewed and explicitly authorized database action.
- Add the signed role to the access JWT only during the RBAC phase. Validate that it is exactly `user` or `admin` when verifying the token.
- The authentication middleware should expose the authenticated user ID and validated role to later middleware.
- Add a small `requireRole("admin")` middleware. Route order must be `requireAuth`, then `requireRole("admin")`, then the controller.
- Missing or invalid authentication returns `401`. A valid authenticated `user` attempting an admin endpoint returns `403` without exposing unnecessary details.
- `GET /api/admin/users` returns only safe fields such as `id`, `name`, `email`, `role`, and verification status. It must never return password hashes or OTP hashes.
- `GET /api/admin/stats` returns only simple aggregate counts needed to demonstrate admin authorization, such as total users, verified users, and total products.
- Admin status does not bypass normal product ownership in this version. Both `user` and `admin` accounts use ownership-scoped product CRUD; the admin role only unlocks `/api/admin/*` endpoints.
- Test both endpoints with no cookie, a normal-user cookie, and an admin cookie to prove `401`, `403`, and `200` behavior respectively.

## 13. MySQL and API rules

- Use `mysql2/promise` for database access.
- Store database, JWT, SMTP, frontend URL, and environment-specific cookie settings in environment variables.
- Never hard-code or commit real secrets.
- Maintain an `.env.example` without real credentials when new environment variables are introduced.
- Always use parameterized SQL queries. Never concatenate user input into SQL strings.
- Validate product data before insert or update queries.
- Reject empty product names and categories, negative prices, and negative stock.
- Return useful HTTP status codes and small, consistent JSON responses.
- Handle invalid input clearly, normally with `400`.
- Handle unauthenticated requests with `401`.
- Handle authenticated but disallowed behavior with `403` only when revealing that distinction is appropriate.
- Handle missing records clearly, normally with `404`.
- Do not hide database, JWT, bcrypt, email, or TypeScript errors with `any` or unsafe assertions.
- Never return password hashes or OTP hashes in API responses.

## 14. Preserve the SaleKit frontend and mock data

The frontend is located at `D:\User\salekit`. The backend is located at `D:\User\salekit-api`. Keep them as separate sibling projects.

Preserve these frontend references:

- `D:\User\salekit\src\types\index.ts`
- `D:\User\salekit\src\data\initialProducts.ts`
- `D:\User\salekit\src\data\initialSales.ts`

Expected core shapes remain:

```ts
type Product = {
  id: string
  name: string
  price: number
  category: string
  stock: number
}

type CartItem = Product & {
  quantity: number
}

type Sale = {
  id: string
  items: CartItem[]
  total: number
  cashReceived: number
  change: number
  date: string
}
```

- Ownership may exist internally as `user_id` without requiring the frontend to choose or submit it.
- Do not discard existing frontend integration work.
- Do not remove frontend mock data until the corresponding authenticated API flow has been tested and the user explicitly agrees.
- Do not modify the frontend without explicit authorization containing `Build Now`.
- When frontend integration resumes, configure CORS only for the agreed frontend development origin and enable credentials only as required for the authentication cookie.
- Reconnect one frontend data flow at a time and retain simple loading, error, and empty states.

## 15. Tiny-step implementation roadmap

Follow this order, completing and testing one small behavior at a time:

1. Record and review the final authentication scope.
2. Decide and add only the required authentication dependencies.
3. Define the new environment-variable names and update `.env.example` without secrets.
4. Design and manually review the `users` table SQL.
5. Create the `users` table only after exact database authorization.
6. Add the smallest user and authentication TypeScript types.
7. Validate only the signup request body.
8. Hash one password with bcrypt and verify the result independently.
9. Insert an unverified user with parameterized SQL.
10. Generate, hash, store, and expire the signup verification OTP.
11. Configure SMTP and send one development test email.
12. Send the verification OTP after signup.
13. Verify the submitted email OTP and mark the account verified.
14. Add resend-verification behavior that replaces the previous OTP.
15. Validate login input and compare the password hash.
16. Reject unverified login attempts.
17. Create and set the access JWT cookie.
18. Build the authentication middleware and test one protected request.
19. Add `/api/auth/me`.
20. Add logout by clearing the authentication cookie.
21. Add the generic forgot-password request response.
22. Generate, hash, store, expire, and email the reset OTP.
23. Verify the reset OTP and update the bcrypt password hash.
24. Clear reset OTP fields and require a normal login after reset.
25. Add focused rate limiting to authentication and OTP endpoints.
26. Test signup, verification, login, protected access, logout, forgot password, and reset password with an API client.
27. Review the existing `products` rows and agree on their ownership migration.
28. Add `products.user_id` only after exact database authorization.
29. Protect product routes with the authentication middleware.
30. Convert one product endpoint at a time to ownership-aware SQL and test it.
31. Test complete isolation using two separate user accounts.
32. Review the exact `users.role` schema change and test-account promotion plan.
33. Add the `role` field only after exact database authorization, defaulting ordinary accounts to `user`.
34. Add the role type, select it during login, sign it into the JWT, validate it during verification, and expose it on the authenticated request.
35. Add and independently test `requireRole("admin")`.
36. Add `GET /api/admin/users` with safe response fields only.
37. Add `GET /api/admin/stats` with simple aggregate counts only.
38. Test both admin endpoints with no authentication, a normal user, and an admin.
39. Run the TypeScript build and report the real result.
40. Only then resume React authentication and product integration, one frontend data flow at a time.

Do not begin sales, checkout persistence, OAuth, MFA, additional roles, role-management endpoints, deployment, refresh-token rotation, or advanced architecture during this roadmap.

## 16. Coding-test target

The user is preparing to reproduce the system manually in approximately 5 hours and 30 minutes. Keep the practice implementation recognizable under time pressure.

Suggested test-time allocation:

```text
00:00-00:30  Environment, dependencies, and users table
00:30-01:15  Signup validation, bcrypt, and user creation
01:15-02:00  Signup OTP generation, email, and verification
02:00-02:45  Login, JWT cookie, and authentication middleware
02:45-03:15  /me and logout
03:15-04:00  Forgot-password OTP and password reset
04:00-04:40  Product ownership and protected CRUD
04:40-05:10  Minimal RBAC and the two read-only admin endpoints
05:10-05:30  API tests, TypeScript build, and focused fixes
```

Do not sacrifice essential validation, parameterized SQL, password hashing, OTP expiry, JWT verification, or ownership checks merely to finish faster.

## 17. After making authorized changes

After every `Build Now` change:

1. Summarize exactly what changed and where.
2. Explain the request flow, data flow, and important functions in plain Myanmar language.
3. Provide a short manual test procedure.
4. Give one small exercise for the user to attempt without AI.
5. Run appropriate available checks and report the real result.
6. Never claim that TypeScript, the server, MySQL, email, OTP delivery, JWT authentication, or an endpoint works unless it was actually checked.

If a check fails because of unrelated unfinished code, report the exact failure and do not expand the scope without permission.

## 18. Definition of done for a small step

A step is done when:

- The focused behavior works as described.
- The code is simple enough for the user to explain and reproduce.
- Types and common invalid inputs are handled correctly for that step.
- SQL is parameterized where user data is involved.
- Passwords, OTPs, JWTs, and ownership checks follow the agreed rules relevant to that step.
- RBAC steps preserve the strict `user`/`admin` allowlist, return `401` versus `403` correctly, and never allow the request body to grant a role.
- The user knows how to test the behavior manually.
- No unrelated features or abstractions were added.
