# PayPal Server SDK plan — donations (week 2, slice 1)

Built with the APIMatic PayPal Context Plugin (`paypal@context-plugins`). Every SDK fact below comes from the
installed package's map (`node_modules/pay-pal-server-sdk/sdk-map.md`, `map/operations/orders.md`), its
`api-reference.md`, the model files under `src/models/`, or a sandbox smoke run (2026-10-12). Nothing is from memory.

## Scope

A signed-in supporter donates to a **verified** nonprofit from a post or the nonprofit's profile. Money goes
**directly** to the nonprofit's PayPal sandbox Business account (`purchase_units[].payee.email_address`); Bono never
holds it. Orders are created and captured **server-side**; the browser only gets the client ID and the order ID.

In this slice: SDK client, `donations` table, create-order + capture Server Actions, Donate dialog with JS SDK v6,
thank-you and error states. **Not** in this slice: webhooks (need the public Render URL — next slice), sponsor matching
(week 4), refunds.

## Repo survey (conventions to imitate)

| Concern | Pattern | Exemplar |
| --- | --- | --- |
| Server Action with auth re-check, `FormState`-style result | `"use server"` module in `lib/<area>/actions.ts`; `auth()` first, role check, zod parse | `src/lib/posts/actions.ts` |
| Server-only integration module | `lib/<area>/` (CLAUDE.md: `lib/paypal/`) | — (new) |
| DB schema + migration | Drizzle table in `src/db/schema.ts`, `npx drizzle-kit generate --name <x>` | `src/db/schema.ts` (`posts`) |
| Client component calling an action | `useTransition` + returned `{ error }` | `src/components/delete-post-button.tsx` |
| Server Component gate on session | `getSession()` inside `<Suspense>` | `src/app/feed/page.tsx` |

- Module format: Next.js 16 App Router, bundler resolution, ESM (`import`) everywhere on the server → one SDK dialect,
  so `instanceof PaypalError` is reliable.
- Runtime: Node (Server Actions on the Node runtime). Not edge.
- tsconfig: `strict: true`; **no** `exactOptionalPropertyTypes`, **no** `verbatimModuleSyntax` (still use `import type`
  for types, matching the codebase).
- Toolchain: npm 11, Node 24. Checks: `npx tsc --noEmit`, `npm run lint`, `npm run build`. **No test runner** in the repo.
- Baseline on the untouched tree: tsc clean, lint clean, build green.

## Package & host

| Fact | Value | Source |
| --- | --- | --- |
| Installed as | `pay-pal-server-sdk` (npm alias; the package's own name is `paypal`), pinned to commit `5d0df8a` | `package.json`, `package-lock.json` |
| Import specifier | `"pay-pal-server-sdk"` (the alias folder). Root only — no deep imports | sdk-map.md §header |
| **Drift from the skill's snapshot** | Client class is **`PaypalClient`** (not `PayPalServerSdkClient`); error base is **`PaypalError`** with `err.kind` ∈ `api \| decode \| encode \| connection \| timeout \| auth`; `ClientOptions` **has `retry` and `logging`** | sdk-map.md §Getting a client, §Error-handling model |
| Host | `ServerEnvironment` sandbox default `https://api-m.sandbox.paypal.com`. Bono is **sandbox-only** (CLAUDE.md rule 3), so we pass **no** `serverOptions` and assert at startup that we are not given one | sdk-map.md §Servers & auth |
| Credentials | `oauth2: { clientId: PAYPAL_CLIENT_ID, clientSecret: PAYPAL_CLIENT_SECRET }`; fail fast if either env var is missing (an unset credential does **not** throw — requests just go out unauthenticated) | sdk-map.md §Servers & auth |
| Token | fetched lazily on first call, cached on the client until shortly before expiry; a refused token endpoint rejects with `AuthError` (`err.kind === "auth"`), not an API error | sdk-map.md §Servers & auth |
| Client lifetime | build **once per process** and hold it (module-level singleton, reused across hot reloads in dev like `src/db/index.ts`) — the token cache lives on it | sdk-map.md §Getting a client |
| Retries | default `retry` retries only `GET, HEAD, PUT, OPTIONS` on `408/429/5xx` (max 3) → `createOrder`/`captureOrder` (POST) are **never retried by the SDK**. Keep the defaults. | sdk-map.md §RetryOptions |
| Timeout | `retry.timeout` default 60 000 ms per attempt; set **15 000** — a donor shouldn't wait a minute | sdk-map.md §RetryOptions |
| Logging | off by default; leave off (no secrets risk). `PAYPAL_CLIENT_LOG` env is honoured if Olya ever wants it locally | sdk-map.md §LoggingOptions |
| Idempotency | SDK mints a **fresh** `Idempotency-Key` per call — dedupes nothing across calls. PayPal's documented key is **`payPalRequestId`** (`PayPal-Request-Id`, stored 6 h). We set it ourselves, derived from our donation row id | orders.md, api-reference.md |

Smoke results (sandbox, real credential): `getOrder("SMOKE0TEST0ORDER")` → 404, arm `error2` ✔ (auth works).
`createOrder` with Paws Haven's sandbox email as payee → 200, status `PAYER_ACTION_REQUIRED`, payee echoed ✔.
`captureOrder` **without `body`** → **415** (no `Content-Type` sent) ✘ → **always pass `body: {}`**; with `body: {}` on an
unapproved order → 422 `error5`, issue `ORDER_NOT_APPROVED` ✔. `payPalMockResponse:
'{"mock_application_codes":"INSTRUMENT_DECLINED"}'` → 422 `error5`, issue `INSTRUMENT_DECLINED` ✔.

## Contract sheet

### `client.orders.createOrder`

- **Signature**: `createOrder(request: Orders.CreateOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CreateOrderError>`
- **Wire**: `POST /v2/checkout/orders` · **Auth**: `oauth2` · **Body**: `application/json`, required (`body: OrderRequest`)
- **Mode**: `.asApiResult()` (we branch on status) inside `try/catch` for the `PaypalError` family.

| Field | Channel | Wire | We send |
| --- | --- | --- | --- |
| `payPalRequestId` | header | `PayPal-Request-Id` | `donation-create-<donationId>` |
| `prefer` | header | `Prefer` | default `"return=minimal"` is sent if omitted → send `"return=representation"` (we read `purchaseUnits[0].payee`) |
| `payPalMockResponse` | header | `PayPal-Mock-Response` | not sent in app code |
| `body` | body | — | `OrderRequest` below |

`OrderRequest` (`src/models/order-request.ts`): `intent: CheckoutPaymentIntent` **required** → `CheckoutPaymentIntent.Capture`
(`"CAPTURE"`, `src/models/checkout-payment-intent.ts`); `purchaseUnits: PurchaseUnitRequest[]` **required**;
`paymentSource?: PaymentSource`.

`PurchaseUnitRequest` (`src/models/purchase-unit-request.ts`): `amount: AmountWithBreakdown` **required**;
`payee?: PayeeBase`; `description?: string`; `customId?: string` (wire `custom_id`).
- `AmountWithBreakdown` (`src/models/amount-with-breakdown.ts`): `currencyCode: string` **required** (`"USD"`),
  `value: string` **required** (computed on the server from integer cents: `"25.00"`).
- `PayeeBase` (`src/models/payee-base.ts`): `emailAddress?: string` → nonprofit's `paypal_payee_email` from the DB.
- `description` → `"Donation to <nonprofit name>"` (≤127 chars — truncate); `customId` → our donation id.

`PaymentSource.paypal?: PayPalWallet` (`src/models/pay-pal-wallet.ts`) → `experienceContext?: PayPalWalletExperienceContext`
(`src/models/pay-pal-wallet-experience-context.ts`):
`shippingPreference?` → `"NO_SHIPPING"` (`PayPalWalletContextShippingPreference.NoShipping`) — a donation ships nothing;
`userAction?` → `"PAY_NOW"` (`PayPalExperienceUserAction.PayNow`); `brandName?` → `"Bono"`.

**Returns** `Order` (`src/models/order.ts`) — every member optional: `id?`, `status?: OrderStatus`, `purchaseUnits?`.
Assert `id` is present; else treat as failure.
`OrderStatus` members: `CREATED, SAVED, APPROVED, VOIDED, COMPLETED, PAYER_ACTION_REQUIRED` (smoke returned
`PAYER_ACTION_REQUIRED`, which is the normal state before the buyer approves).

**Error arms (createOrder only)**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [422] `Error` ·
`"error4"` [default] `Error` · `"undeclared"` [default body that didn't fit] `rawBody`. ⚠ Tags are per-operation: do not
reuse this switch for capture. We read `err.status` / `result.status` and `payload.body.details?.[0]?.issue` rather than
switching on `kind` across operations.

### `client.orders.captureOrder`

- **Signature**: `captureOrder(request: Orders.CaptureOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.CaptureOrderError>`
- **Wire**: `POST /v2/checkout/orders/{id}/capture` · **Auth**: `oauth2` · **Body**: optional per the map, but **PayPal
  answers 415 without it** (smoke) → always `body: {}` (`OrderCaptureRequest`, all members optional).
- **Mode**: `.asApiResult()` inside `try/catch`.

| Field | Channel | Wire | We send |
| --- | --- | --- | --- |
| `id` | path | — | the PayPal order id stored on our donation row (never trusted from the browser alone: looked up by order id **and** donor id) |
| `payPalRequestId` | header | `PayPal-Request-Id` | `donation-capture-<donationId>` (a double-click or retry replays, it doesn't double-charge) |
| `prefer` | header | `Prefer` | `"return=representation"` (default `minimal` would omit the capture) |
| `body` | body | — | `{}` |

**Returns** `Order` → `purchaseUnits?[0].payments?: PaymentCollection` (`src/models/payment-collection.ts`) →
`captures?: OrdersCapture[]` (`src/models/orders-capture.ts`): `id?`, `status?: CaptureStatus`, `amount?: Money`.
`Money` (`src/models/money.ts`): `currencyCode: string`, `value: string` (both required when present).
`CaptureStatus` members: `COMPLETED, DECLINED, PARTIALLY_REFUNDED, PENDING, REFUNDED, FAILED`.
**Must assert**: capture present with `id`, `status` and `amount`, else outcome is unknown → reconcile with `getOrder`.
PayPal's captured `amount` is recorded as the truth (it can't differ from ours, since the order is built server-side,
but if it ever did, the row reflects what actually moved).
Map `COMPLETED` → donation `completed`; `PENDING` → `pending` (webhook will finish it next slice);
`DECLINED`/`FAILED` → `failed`.

**Error arms (captureOrder only)**: `"error"` [400] · `"error2"` [401] · `"error3"` [403] · `"error4"` [404] ·
`"error5"` [422] · `"error6"` [500] · `"error7"` [default] — all `Error` · `"undeclared"` [default body that didn't fit].
Handled by status + issue, not by tag:
- 422 + issue `INSTRUMENT_DECLINED` → return `{ declined: true }` so the browser restarts the PayPal flow (PayPal's
  documented recovery); donation stays `created`.
- 422 + issue `ORDER_ALREADY_CAPTURED` → call `getOrder` (below) and reconcile instead of failing.
- anything else → mark `failed`, return an honest message.

`Error` model (`src/models/error.ts`) — imported as **`type Error as PayPalApiError`** to avoid shadowing the global:
`name: string`, `message: string`, `debugId: string` (all **required**), `details?: ErrorDetails[]`;
`ErrorDetails` (`src/models/error-details.ts`): `issue: string` **required**, `description?: string`.
Log `debugId` server-side (never the request body or secrets).

### `client.orders.getOrder` (reconcile only)

- **Signature**: `getOrder(request: Orders.GetOrderRequest, options?: RequestOptions): ApiPromise<Order, Orders.GetOrderError>`
- **Wire**: `GET /v2/checkout/orders/{id}`; fields `id` (path, required). GET → retried by the SDK on 408/429/5xx.
- **Error arms**: `"error"` [401] · `"error2"` [404] · `"error3"` [default] · `"undeclared"`.

### Failures outside the API arms (every call)

`try/catch` around every `.asApiResult()`: `err instanceof PaypalError` → `err.kind` ∈ `connection | timeout | auth |
decode | encode` → "PayPal didn't respond. Your card wasn't charged; please try again." (for capture: "We couldn't
confirm your payment yet" and keep the row `created` so it can be reconciled). `auth` additionally logs "check
PAYPAL_CLIENT_ID/SECRET". A caller abort or anything that isn't a `PaypalError` is rethrown. A `decode` on a 2xx
capture is the one dangerous case (money may have moved): keep the row and reconcile with `getOrder`.

## Data model

`donations`: `id uuid pk` · `donor_id → users` · `nonprofit_id → nonprofit_profiles` · `post_id → posts (set null)` ·
`amount_cents int` · `currency text 'USD'` · `status enum(created, pending, completed, failed)` ·
`paypal_order_id text unique` · `paypal_capture_id text unique` · `payee_email text` (snapshot at order time) ·
`created_at`, `completed_at`. Amount is chosen in the browser but **validated and stored on the server** before the order
is created (presets $10/25/50/100, custom $1–$10,000, whole cents); capture never reads an amount from the browser.

## Browser (JS SDK v6, from PayPal's v6 docs — not part of this SDK)

Script `https://www.sandbox.paypal.com/web-sdk/v6/core`; `await window.paypal.createInstance({ clientId, components:
["paypal-payments"] })`; `findEligibleMethods()` → `isEligible("paypal")` before showing the button;
`createPayPalOneTimePaymentSession({ onApprove, onCancel, onError })`; on click call `createOrder()` **without awaiting**
and pass the promise to `session.start({ presentationMode: "auto" }, promise)`; the promise resolves to `{ orderId }`;
`onApprove(data)` reads `data.orderId` and calls our capture action.

## Assumptions & blockers

1. **End-to-end testing** — decided: Olya adds a sandbox **Personal (buyer)** login to `.env`
   (`PAYPAL_SANDBOX_BUYER_EMAIL`, `PAYPAL_SANDBOX_BUYER_PASSWORD`, never committed) and the browser test logs in with it. Everything up to the popup and every
   error path (via `PayPal-Mock-Response`) can be tested without it.
2. **Who can donate** — decided by Olya (2026-10-12): **any signed-in account** (supporter, nonprofit or sponsor),
   but **never to its own organization**. Signed-out visitors see "Log in to donate".
3. Minor: presets $10/$25/$50/$100, custom $1–$10,000, USD only.
4. Minor: lockfile records the SDK as `git+ssh://…#5d0df8a`; npm fetches public GitHub deps over https at install, but
   verify on the first Render build.
5. Webhook confirmation (CLAUDE.md §3) is the next slice, once there's a public URL.

## Findings during implementation (2026-10-12)

- **PayPal does not validate the payee email at order creation**: `createOrder` with a non-existent payee email
  returns 200. A wrong nonprofit payee email would only fail when the donor tries to pay. Follow-up: check the payee
  during nonprofit verification (week 2, verification slice).
- **Dual dialect**: a scratch script that loaded the SDK as ESM *and* CJS saw `instanceof PaypalError` fail across
  the copies (the hazard the skill warns about). In the app, Next bundles one ESM copy, so `instanceof` is reliable;
  rechecked in a single-dialect script: transport failure and bad credentials both map to `unknown`.
- Verified against the sandbox through `src/lib/paypal/orders.ts`: create (17-char id), idempotent replay returns the
  same order, unapproved capture → `refused` 422 `ORDER_NOT_APPROVED`, mocked decline (via a `fetch` wrapper adding
  `PayPal-Mock-Response`) → `declined`, unknown order → `unknown`.
- Browser: Donate dialog → PayPal button renders (v6 SDK, eligibility checked) → popup opens on
  `www.sandbox.paypal.com` titled "Pay with PayPal" → donation row `created` with order id, payee and post; closing
  the popup shows "Payment cancelled". - **End to end (2026-10-12, approved by hand in the popup with a sandbox Personal account — PayPal rejected the
  same login from headless Chromium):** $10 from a supporter to Open Pantry. Bono row `completed` with order and
  capture ids; `getOrder` at PayPal: order `COMPLETED`, payee = Open Pantry's sandbox account, capture `COMPLETED`
  $10.00 USD, PayPal fee $0.84, net $9.16 to the nonprofit.

## Not built here, by decision

No SDK retries added (POSTs must not be blindly retried; idempotency comes from `PayPal-Request-Id`), no custom
`fetch`, no logging. No test runner is added; verification is the sandbox smoke + Playwright run below.

## Verification

1. `tsc --noEmit`, lint, build.
2. Server: create a donation order for a seeded nonprofit → `getOrder` shows the right payee and amount.
3. Error paths: mocked `INSTRUMENT_DECLINED` → `{ declined: true }`; unapproved capture → honest error; capture by a
   different user → refused; donating to your own organization → refused; unverified nonprofit → refused; amount tampering → refused.
4. Browser: supporter → Donate → amount → PayPal popup → approve → thank-you; DB row `completed` with capture id;
   PayPal order `COMPLETED`. ✔ (see Findings)

## REQUIRED READING

| Step | Hazard | Skill |
| --- | --- | --- |
| Error boundary around every call | two families, per-operation arm tags, decode-on-2xx | **MUST load `typescript-error-handling`** |
| Building the singleton client | options all optional; client must be long-lived | **MUST load `typescript-client-initialization`** |
| Credentials | unset credential doesn't throw; `AuthError` bypasses `.asApiResult()` | **MUST load `typescript-authentication`** |
| First `createOrder`/`captureOrder` call | flat request object, defaulted `prefer`, `.asApiResult()` on the returned value | **MUST load `typescript-calling-endpoints`** |
| Timeout / retry settings | what retries, what the timeout bounds | **MUST load `typescript-configuration-resilience`** |
| Any verification script that fakes `fetch` | which seam to fake, wire-shape stubs | **MUST load `typescript-testing`** |

---

# Slice 2 — nonprofit verification fee (week 2)

Same three operations and the same client as donations; the contract sheet above applies unchanged. Only the
differences are listed here.

## Scope

A nonprofit enters its EIN; the server checks it (no PayPal involved) against the IRS EO BMF extract
(Washington only, loaded by `npm run irs:load -- wa`) or the clearly labeled `demo_ein_registry`. Eligible IRS rows:
`SUBSECTION = 03` (501(c)(3)), `DEDUCTIBILITY = 1` (contributions deductible), `STATUS = 01` (unconditional
exemption) — codes per the IRS EO BMF info sheet (`irs.gov/pub/foia/ig/tege/eo-info.pdf`). The registry name must be
consistent with the profile name. Then the nonprofit pays a one-time fee (default $25, `VERIFICATION_FEE_CENTS`) to
the **platform** account. Decided by Olya (2026-10-12): the fee must be paid **from the same PayPal account the
nonprofit entered for donations**; that is how we confirm the payee account is real and theirs.

## Contract differences from donations

| | Donations | Verification fee |
| --- | --- | --- |
| `purchaseUnits[0].payee.emailAddress` | nonprofit's `paypal_payee_email` | `PAYPAL_PLATFORM_MERCHANT_EMAIL` (env; fail fast if unset) |
| `payPalRequestId` | `donation-create-<id>` / `donation-capture-<id>` | `verification-create-<feeId>` / `verification-capture-<feeId>` |
| `customId` / `description` | donation id / "Donation to X via Bono" | fee id / "Bono nonprofit verification fee" |
| Read after capture | capture id, status, amount | the same, **plus `Order.payer?.emailAddress`** |

`Order.payer?: Payer` (`src/models/order.ts`); `Payer` (`src/models/payer.ts`): `emailAddress?: string` (wire
`email_address`), `payerId?: string` (wire `payer_id`) — both optional, so a missing email means "can't confirm",
never "match". Checked against the completed sandbox donation: with `prefer: "return=representation"` the order
carries `payer.email_address` (and `payer_id`).

Payer check: case-insensitive equality of `payer.emailAddress` and the profile's `paypal_payee_email`.
- match → `verified_at = now()`.
- mismatch or missing → the fee is recorded as paid (money moved; never charge twice) but verification waits; the
  nonprofit is told which account paid and can switch its donation email to that account, which completes
  verification without paying again.
- Once verified, the PayPal donation email can't be changed in the profile form (it would bypass the check).

Wrapper change: `createDonationOrder` / `captureDonationOrder` generalise to `createOrder({ requestId, payeeEmail,
amountCents, description, customId })` and `captureOrder(orderId, requestId)` in `src/lib/paypal/orders.ts`; the
capture details gain `payerEmail?: string`.

## Data

`irs_exempt_orgs` (ein pk, name, city, state, subsection, deductibility, status, loaded_at) — only eligible rows,
not committed, loaded by script. `demo_ein_registry` (ein pk, name) — fictional demo EINs, seeded, labeled as demo
in the UI and README. `nonprofit_profiles` gains `ein` (unique), `ein_source` (`irs` | `demo`), `ein_checked_at`.
`verification_fees` mirrors `donations` (nonprofit, amount, status, order/capture ids, payer email).

## Verification plan

Automated: EIN checks (IRS hit, demo hit, unknown, ineligible, name mismatch, EIN already used), create-order with
platform payee, capture error paths as before. By hand (headless PayPal login is rejected): Olya pays one fee from a
nonprofit's sandbox Business account; then check `getOrder`: payee = platform, payer = that nonprofit's account,
and the nonprofit is verified.

## Slice 2 results (2026-10-13)

By hand in the popup (headless PayPal login is rejected): Open Pantry checked demo EIN 00-0000104, then paid the fee
from its own sandbox Business account. `getOrder`: order and capture `COMPLETED`, $25.00 USD, payee = platform
account, payer = Open Pantry's account; PayPal fee $1.36, net $23.64 to the platform. Bono: fee row `completed`
with capture id and matching payer email, nonprofit verified. Automated: every EIN error path, an IRS match
(Washington data), fee order payee = platform, paid-from-another-account recovery, payee email locked after
verification (also server-side).

---

# Slice 3 — webhooks (week 2)

**The SDK has no webhook surface** (confirmed by the plugin's client-initialization skill: "no webhook tree, no event
parser, no signature verifier … verifying an inbound webhook is entirely yours"). So signature verification follows
PayPal's webhook docs (developer.paypal.com/api/rest/webhooks/rest/), self-verification method, not memory:

- Headers `paypal-transmission-id`, `paypal-transmission-time`, `paypal-transmission-sig` (base64), `paypal-cert-url`.
- Signed message: `${transmissionId}|${transmissionTime}|${PAYPAL_WEBHOOK_ID}|${crc32(rawBody) as decimal}`.
- Verify with SHA256 + the certificate downloaded from `paypal-cert-url` (cached). The body must be the **raw** bytes.
- Our addition: only accept a cert URL that is `https` on a `paypal.com` host, so a forged event can't bring its own cert.

Events subscribed (dashboard, by Olya): `PAYMENT.CAPTURE.COMPLETED`, `.PENDING`, `.DENIED`, `.REFUNDED` (the docs also
name `PAYMENT.CAPTURE.DECLINED` for Payments v2 — handled the same as DENIED).

Parsing uses the SDK's schemas (decode only, after the signature check):
- Capture events → `capturedPaymentSchema` (`src/models/captured-payment.ts`): `customId?` (our donation/fee id),
  `id?` (capture id), `supplementaryData?.relatedIds?.orderId?` (`src/models/related-identifiers.ts`, wire
  `supplementary_data.related_ids.order_id`).
- Refund events → `refundSchema` (`src/models/refund.ts`): `customId?`, `links?` (`rel: "up"` → the capture URL).

The event is only used to find our row. Its outcome is then re-read from PayPal with `getOrder` and settled by the
same code as the capture actions, so a webhook can't set a state PayPal doesn't report. Capture status mapping:
COMPLETED → completed, PENDING → pending, REFUNDED → refunded (new status), PARTIALLY_REFUNDED → completed (logged),
DECLINED/FAILED → failed. Idempotent: settling twice gives the same row; processed event ids are stored.
A handler error answers 500 so PayPal retries; an invalid signature answers 400.

Finding (2026-10-13): PayPal drops orders nobody approved; `getOrder` on one answers 404 (`error2`,
`INVALID_RESOURCE_ID`). `getOrderCapture` treats 404 as "no capture" (definite), so a webhook for such an order is
answered 200 instead of being retried for days. Other refusals stay "unknown" (→ 500, PayPal retries).

## Slice 3 results (2026-10-13)

Live on Render (https://bono-h8b8.onrender.com), two donations approved by hand ($50 → Paws Haven, $25 → Green
Seattle): both captured `completed` by the capture action, then PayPal delivered `PAYMENT.CAPTURE.COMPLETED` for each
within ~20–50 s; signatures verified, events stored, both reconciled via `getOrder` as "donation completed".
Locally: signature checks (genuine, tampered body, wrong webhook id, foreign/http/look-alike cert host, missing
headers, non-ASCII body) and event handling (fee by custom_id and by order id, expired order → no capture, refund of an
unknown capture, refund event while PayPal still reports COMPLETED → stays completed, unknown event type, unreadable
resource, non-Bono order).
