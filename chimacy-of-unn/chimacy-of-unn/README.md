# CHIMACY OF UNN — Admission Assessment & Client Management Platform

A two-sided platform: a public **Client Portal** (no login, WhatsApp-first) for prospective students to self-assess their eligibility for University of Nigeria, Nsukka admission, and a private **Admin Portal** for staff to manage requests, clients, payments, and configuration. Built on React 19 + Vite + Tailwind, with Supabase (Postgres + Auth + Storage + Realtime) as the shared backend.

---

## What changed in this upgrade

This is an upgrade of the existing quotation tool, not a rebuild. Everything that worked before (pricing database, benchmarks, PDF quotations, admin login) still works — it's been extended, not replaced.

- **Performance overhaul** — removed `backdrop-blur` from every repeated card (kept only on the Sidebar/Topbar chrome, where it's cheap), route-level lazy loading (`React.lazy`) so no page downloads another page's code, the PDF library (`jsPDF`) now loads on-demand instead of in the initial bundle, memoized Sidebar/Topbar/Card, faster/fewer CSS transitions, in-memory caching for rarely-changing data (programmes, rules).
- **Logo bug fixed** — uploads now save to Supabase and broadcast to every device immediately (previously they only updated local form state until a separate "Save" click was remembered). Images are also now client-side compressed/resized before upload, and actually get embedded as real images in PDFs (previously a bare remote URL was passed to jsPDF, which silently fails in the browser — this is fixed too).
- **Payment/invoice bug fixed** — confirming a payment no longer auto-downloads anything. "Confirm Payment," "Generate Invoice," and "Download Invoice" are now three separate, deliberate actions.
- **Multi-admin roles** — Super Admin / Admin, backed by a real `admin_profiles` table, not a shared password.
- **New: Client Portal** — public landing page, JAMB/O'Level aggregate calculator, programme eligibility assessment, terms acceptance, request submission, WhatsApp handoff, and request tracking — no client account, ever.
- **New: Admin Requests inbox** — every Client Portal submission appears here in real time, with a full assessment breakdown, status workflow, private notes, and one-click "Accept & Convert to Client" that feeds into the existing Client Records/Checkout system without duplicating any pricing logic.
- **New: Real-time notifications** — a notification bell with unread count, live updates via Supabase Realtime, and an optional sound (browser-policy-compliant: sound is enabled via a deliberate click).
- **New: WhatsApp integration throughout** — "Chat on WhatsApp," "Continue on WhatsApp," and "Contact on WhatsApp" buttons generate prefilled messages; this app never builds an in-app chat.
- **New: Optional Flutterwave payment** — client-side uses only the public key; verification runs server-side in a Supabase Edge Function using the secret key, which never touches the browser.

---

## Architecture

```
        CLIENT PORTAL (public, no login)
               |
               v
         SUPABASE (Postgres + Auth + Storage + Realtime + Edge Functions)
               ^
               |
        ADMIN PORTAL (Supabase Auth login required)
```

One authoritative database. Programmes, pricing, and benchmarks live in exactly one table (`programmes`), read by both portals through different, appropriately-scoped access paths — the Admin Portal reads the table directly (full access), the Client Portal only ever calls secure functions that return a safe subset (see "Security model" below).

---

## One thing I could not do myself

The Flutterwave secret key must never live in frontend code — that's correct, and it means real payment *verification* has to run on a server. I wrote a Supabase Edge Function (`supabase/functions/verify-payment/index.ts`) to do this properly, but **I cannot deploy or test Edge Functions from this environment** (it requires the Supabase CLI running on a real machine with your credentials). The function is written correctly and I've documented the exact deploy steps below, but please verify it works end-to-end once it's live — this is the one piece of this build I could not personally confirm. Payment is explicitly optional in this design (per the spec), so nothing else in the app depends on it working.

---

## One-time backend setup

### 1. Run the SQL migrations, in this exact order
In Supabase, SQL Editor, paste and run each of these completely, one at a time:
1. `supabase/schema.sql`
2. `supabase/schema-v2-additions.sql`
3. `supabase/schema-v3-additions.sql`
4. `supabase/schema-v4-additions.sql`

All three are additive - if you already have data from before, nothing is deleted. They add new tables/columns/functions and tighten a few security policies (only super admins can now edit branding/pricing/rules; both roles can still manage clients/payments day-to-day).

### 2. Create admin accounts
Supabase, Authentication, Users, Add user, for each admin/staff member. The first person to log in automatically becomes Super Admin; everyone after that starts as a regular Admin (promote them from Administrators, change their role, once you're logged in as the super admin).

### 3. Environment variables
Copy `.env.example` to `.env`:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
Same two variables go in Netlify, Site configuration, Environment variables.

### 4. WhatsApp number
Log in as an admin, Settings, enter your WhatsApp Number (local format like `0803...` is fine, it's converted automatically). Every "Chat on WhatsApp" button across both portals uses this.

### 5. (Optional) Flutterwave online payment
- Get your keys from your Flutterwave dashboard.
- Public key goes into Admin Settings page, "Flutterwave Public Key" field.
- Secret key gets set as an Edge Function secret (never in this app):
  ```bash
  supabase functions deploy verify-payment
  supabase secrets set FLUTTERWAVE_SECRET_KEY=FLWSECK-your-real-secret-key
  ```
  (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available automatically inside every Edge Function - you don't set those yourself.)
- If you skip this entirely, the app works fine - the "Pay Now" button on the client confirmation screen simply won't appear, and admins record payments manually via Checkout & Invoices as before.

---

## Local development & Netlify deployment

```bash
npm install
npm run dev
npm run build
```

Netlify: build command `npm run build`, publish directory `dist` (already set in `netlify.toml`), plus the two `VITE_SUPABASE_*` environment variables. The app uses `BrowserRouter` for clean URLs (`/check-eligibility`, `/admin/login`, etc.) - `netlify.toml` already includes the required catch-all redirect so deep links and page refreshes work.

---

## Routes

**Public (Client Portal):**

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/check-eligibility` | Full assessment flow (JAMB, O'Level, aggregate, result) |
| `/request-assistance` | Same flow (aliased - the journey is continuous, not two separate forms) |
| `/track-request` | Request ID + phone lookup |

**Admin** (all require login; the ones marked with a star require Super Admin):

| Route | Purpose |
|---|---|
| `/admin/login` | Admin login |
| `/admin` | Dashboard |
| `/admin/requests` | Assistance Requests inbox |
| `/admin/new-client` | New client / manual quotation |
| `/admin/clients` | Client Records |
| `/admin/quotation` | Quick eligibility checker + regenerate PDFs |
| `/admin/payments` | Checkout & Invoices |
| `/admin/pricing` * | Pricing Database |
| `/admin/benchmarks` * | Alias of Pricing Database (benchmarks are per-programme fields there) |
| `/admin/rules` * | Terms & Conditions |
| `/admin/aggregate-settings` * | JAMB/O'Level weightings, one-sitting bonus, grade conversion |
| `/admin/administrators` * | Manage admin roles |
| `/admin/settings` * | Branding, WhatsApp, colors, Flutterwave public key |

---

## Security model

- Every admin table (`programmes`, `rules`, `quotations`, `requests`, `admin_profiles`, etc.) uses Row-Level Security requiring a logged-in Supabase session. Write access to branding, pricing, and rules is further restricted to Super Admin via an `is_super_admin()` policy check.
- The Client Portal never queries confidential tables directly. It only calls a small set of `SECURITY DEFINER` Postgres functions: `list_programmes_public()` (name/grade/price only - no benchmark numbers), `check_eligibility()` (returns a computed result, never the raw benchmark database), `create_request()` (inserts a request without needing any table grant), and `get_request_status()` (phone number + request number act as a shared secret for tracking).
- The hidden internal benchmark numbers (minimum/preferred/double-working score on `programmes`) are never sent to the browser for anonymous visitors - only the specific programme's descriptive benchmark text is returned as part of one eligibility result, matching how you'd naturally explain it to a client, not the whole database at once.
- Flutterwave's secret key lives only in the Edge Function's environment, never in any `VITE_` variable or client bundle.

---

## Known limitations (being upfront about these)

- **Flutterwave verification is unverified by me** - see the callout above. Test it with a real (or Flutterwave's sandbox/test-mode) transaction before relying on it.
- **Role permissions are pragmatic, not exhaustive.** Both Admin and Super Admin can manage day-to-day requests, clients, and payments (this matches how a small team actually needs to operate); only Super Admin can touch branding, pricing, rules, the aggregate model, and other admin accounts. If you need finer-grained control later, the `is_super_admin()` SQL helper makes it straightforward to tighten specific policies further.
- **Sound notifications require one click per browser session** to enable - this is a browser autoplay restriction, not a bug; there's an "Enable Sound" control in the notification bell.
- **The aggregate model is a configurable approximation**, clearly labeled as such to clients (with a disclaimer), and editable from Admin, Aggregate Settings - it is not guaranteed to always match UNN's official method going forward.
- **No `npm install && npm run build` was run here** - this sandbox has no network access to install dependencies. Every file was manually reviewed (comment/string-aware bracket-balance checks across all JS/JSX, SQL paren-balance checks on all three migrations). Please run the real build before deploying and let me know if anything surfaces.

---

## File overview

**New:** `src/pages/client/*` (Landing, Assessment, TrackRequest, TermsList), `src/pages/Requests.jsx`, `src/pages/Administrators.jsx`, `src/pages/AggregateSettings.jsx`, `src/pages/ConfigNeeded.jsx`, `src/components/Layout/ClientPortalLayout.jsx`, `src/components/Layout/NotificationBell.jsx`, `src/context/NotificationContext.jsx`, `src/utils/aggregate.js`, `src/utils/publicApi.js`, `src/utils/whatsapp.js`, `src/utils/flutterwave.js`, `src/utils/cache.js`, `src/utils/image.js`, `supabase/schema-v2-additions.sql`, `supabase/schema-v3-additions.sql`, `supabase/functions/verify-payment/index.ts`.

**Modified:** `src/App.jsx` (full routing rewrite, lazy-loaded), `src/main.jsx` (BrowserRouter), `src/index.css` and `tailwind.config.js` (performance), `src/context/AuthContext.jsx` and `SettingsContext.jsx` (roles, new fields), `src/components/Layout/Sidebar.jsx`, `Topbar.jsx`, `DashboardLayout.jsx`, `src/components/ProtectedRoute.jsx`, `UI/Card.jsx`, `UI/Modal.jsx`, `src/pages/Settings.jsx`, `Checkout.jsx`, `Dashboard.jsx`, `ClientRecords.jsx`, `NewClient.jsx`, `GenerateQuotation.jsx`, `src/utils/db.js`, `pdfGenerator.js`, `netlify.toml`.

**Dependencies:** none added or removed - Flutterwave loads via its hosted script tag at runtime, not an npm package.

---

## Testing checklist (what to verify once deployed)

Client Portal: assessment flow end-to-end, aggregate math against the worked example in the original spec, terms gate, request submission, request ID shown, WhatsApp handoff, request tracking. Admin Portal: login with 2+ accounts, role restrictions, requests inbox plus realtime arrival plus sound, accept-and-convert, notes, Checkout confirm-payment-does-NOT-download, generate/download invoice separately, logo upload appears in sidebar/topbar/login/PDF, Pricing/Rules/Aggregate Settings edits. General: `npm run build` succeeds, direct navigation to any `/admin/...` or `/check-eligibility` URL works after a refresh (no 404).
