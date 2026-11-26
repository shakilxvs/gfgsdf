# Meta WhatsApp Cloud API / Coexistence Handover

**Last updated:** 2026-11-26  
**Repository:** [shakilxvs/gfgsdf](https://github.com/shakilxvs/gfgsdf)  
**Production app:** https://task.shakilxvs.com  
**Current main commit reviewed:** `91703d51cfab9adcf2a1a2affc535a77d0ac0bd3`

> Read this document before making any Meta, WhatsApp, Render, GitHub Actions, or Neon changes. This is the current handover state, not a statement that Meta onboarding is complete.

## 1. Executive summary: where things stand

Shakil is preparing to move TaskXVS notifications from the existing unofficial WhatsApp Web/Baileys sender to Meta's official WhatsApp Cloud API.

The desired route is to connect the **existing TaskXVS sender number that is currently used in the WhatsApp Business App**, using Meta's supported WhatsApp Business App Coexistence / Embedded Signup path if Meta confirms the account and number are eligible.

The user selected **Independent Tech Provider** in Meta's Connect on WhatsApp setup. The current Meta Business Verification flow was completed and submitted using Shlomo C K Group Inc business details and an IRS CP 575 A / SS-4 EIN assignment notice. Meta displayed:

> Information submitted. It should take about 2 business days to review your submission. We'll update your verification status after the review is complete.

**Current state: WAITING FOR META BUSINESS VERIFICATION REVIEW.** The submission confirmation was shown on 2026-11-25 at approximately 2:11 PM local time. The two-business-day estimate is Meta's on-screen estimate, not a guaranteed completion time. No approval or rejection has been observed yet.

Do not restart verification, change submitted business details, register/unregister the WhatsApp number, disconnect the existing sender, or generate a new token just to make progress. First wait for Meta's result and inspect the current status.

## 2. User goals and non-negotiable constraints

- User wants the official Meta Cloud API and prefers a **direct, self-managed integration**.
- User does not want to pay an external WhatsApp provider / Solution Partner.
- User wants to keep using the **same existing TaskXVS sender number in the WhatsApp Business App**, if Meta's Coexistence flow permits it.
- User wants the least complicated supported route and prefers concise, one-step-at-a-time instructions. Do not overwhelm the user with a long checklist when only one next action is needed.
- User's strongest operational constraint: **do not break the working TaskXVS platform**.
- Only work in `shakilxvs/gfgsdf`, the dedicated TaskXVS Render service, and the dedicated TaskXVS Neon project described below.
- **Never modify or inspect the user's other serious Neon project(s), V3PL databases/services, or unrelated projects.**
- Never reset or delete WhatsApp auth/session keys, trigger a QR relink, register/unregister the production number, or switch notification traffic without an explicit user go-ahead.
- Do not promise that Meta Cloud API messaging itself is entirely free. The user's no-paid-provider requirement means avoid a paid intermediary; check Meta's current direct messaging pricing before production activation.
- Do not ask the user to paste an access token, app secret, verify token, database URL, or other credential into chat, an issue, a PR, or source control.

## 3. Meta app and business verification: exact current state

### Meta Developer app

- App name: **Task Manager**
- App ID: `1615865400569794`
- Use case: **Connect on WhatsApp**
- Integration type chosen: **Integrate with API**
- Step 1 test: completed. A Meta test-number message was sent successfully and received.
- Step 2 Production setup: not complete.
- Meta webhook Callback URL and Verify token fields were blank in the user's screenshot. TaskXVS has not yet implemented the Meta webhook endpoint.
- A production number has **not** been registered through Meta Cloud API.
- Payment setup for Meta production messaging has not been confirmed.

### Selected onboarding path

The user selected **Onboard as an independent Tech Provider**. They briefly viewed/switched to the existing Solution Partner route, then returned to the Independent Tech Provider route. The most recent screenshot showed the Independent Tech Provider page.

Do not switch to "Onboard with an existing Solution Partner" unless the user explicitly changes the requirement. The user does not want an external paid provider.

The Independent Tech Provider page showed:
- Business Verification section with a "Start verification" action.
- App Review section.
- "Submit documentation for App Review" displayed an **In review** badge in the screenshot.
- At that time, the independent Tech Provider page showed 0 of 2 steps complete.

Treat App Review and Business Verification as separate Meta processes. Re-check their live statuses after business verification returns; do not infer that one approval completes the other.

### Current Meta Business Portfolio

The Meta Business Portfolio was changed to **Shlomo C K Group Inc**.

- Business Portfolio ID shown in Meta: `1533261822188720`
- Current portfolio display name: **Shlomo C K Group Inc**
- Business legal name entered in Business Details: **Shlomo C K group Inc** (case variation in the UI)
- Business country: United States
- Business address entered: 96 Carlton Rd W, Suffern, New York 10901, USA
- Business phone entered in Meta: a US number ending in `0091` (do not copy the full number into this repository)
- Website entered: https://shlomockgroup.com/
- EIN was entered in Meta from the client document. **Do not store the full EIN in this repository.**

The portfolio had previously been labeled Shlomo C K Group LLC, then was corrected to Shlomo C K Group Inc after inspecting the IRS letter. The current screenshot showed Shlomo C K Group Inc.

### Submitted document

The client supplied an IRS notice:
- Document type: **IRS CP 575 A**
- Notice date: 2019-07-03
- Legal name shown on the notice: **SHLOMO C K GROUP INC**
- Address shown on the notice: 96 Carlton Rd W, Suffern, NY 10901
- It is an IRS EIN assignment / SS-4 confirmation notice.

Meta's upload-type dropdown included "IRS SS-4 (EIN Assignment Letter)" and the user selected that document type. Meta could not find a matching record from the search form, so it asked for a document upload. The user uploaded the original document and received the successful "Information submitted" confirmation with an estimated review time of about two business days.

**Do not commit the IRS PDF, EIN, tax documents, or screenshots containing tax identifiers to GitHub.** The source document remains client-provided and should be kept private.

### Critical ownership / entity question — NOT YET RESOLVED

Shakil previously described Shlomo C K Group as his client. The verification submission is under Shlomo C K Group Inc's portfolio and uses Shlomo's documents.

The conversation has **not conclusively established who legally owns the Task Manager Meta app, the TaskXVS software, and the Tech Provider operation**. Do not assume that because Meta accepted a document for review, Shlomo's business is necessarily the correct entity for every Tech Provider/App Review requirement.

Before proceeding beyond the pending verification:
1. Establish whether Shlomo C K Group Inc is genuinely the legal entity that owns/operates the Meta app and the Tech Provider service, or whether it is only a client whose WhatsApp number will be connected.
2. Ensure the client authorized the use of their portfolio, identity, business details, and IRS document.
3. If Meta approves the business verification, do not assume that approval resolves app ownership, Advanced Access, Tech Provider onboarding, or Coexistence eligibility.
4. If Meta rejects the verification or asks questions about ownership, read the exact reason and resolve the correct legal entity/portfolio before submitting anything again. Do not fabricate, alter, or mix documents.

## 4. Meta system user and token: partial / inconsistent confirmation

The user created a Meta Business Portfolio system user:

- Name: `Taskxvs cloud api`
- System User ID shown: `61596658992430`
- User reports that an access token was generated.

Important unresolved observations:
- A Meta success popup said "3 assets were assigned".
- After refreshing, the System Users page showed the Assigned assets tab with "No assets assigned".
- The Installed apps tab was not conclusively verified in the screenshots.
- The exact token scopes/permissions were not independently verified in the conversation.
- No token value was shared with the assistant, and none is stored in this repository.

After the verification review, inspect the System User again:
1. Confirm the Task Manager app is listed under Installed apps.
2. Confirm the required WhatsApp Business Account asset is assigned if Meta's flow requires it.
3. Confirm the appropriate permissions are present.
4. Only generate/rotate a token if required, and store it directly in the designated secret manager. Never display or commit it.

Do not treat "token generated" as proof that the production Cloud API is ready.

## 5. Existing TaskXVS WhatsApp system — KEEP RUNNING

The current production WhatsApp sender is working through **Baileys**, an unofficial WhatsApp Web client. It is not Meta's official Cloud API.

### GitHub workflow

- Workflow: [TaskXVS Free WhatsApp Cloud Worker](../.github/workflows/taskxvs-whatsapp-worker.yml)
- Worker code: [whatsapp-worker/worker.js](../whatsapp-worker/worker.js)
- Worker setup notes: [whatsapp-worker/README.md](../whatsapp-worker/README.md)
- Scheduled cron: `0 */6 * * *` (every six hours, UTC)
- Each session runs for up to 345 minutes (5 hours 45 minutes).
- Queue is polled every 5 minutes while the WhatsApp connection is active.
- Owner deadline reminders are checked independently once per hour, not on every queue poll.
- Manual `workflow_dispatch` remains available.
- Concurrency group prevents overlapping worker sessions.
- GitHub-hosted runners are used; no separate paid VPS is required for the worker schedule.
- This is not guaranteed 24/7 delivery; scheduled starts can be delayed and there can be session gaps.

Required repository Actions secret name:
- `TASKXVS_WHATSAPP_DATABASE_URL`

The secret must point to the dedicated TaskXVS database with the `taskxvs_whatsapp_worker` role. Do not print or expose its value.

### Dedicated Neon project

Use only:
- Neon project: `shakilxvs-taskxvs`
- Project ID: `blue-forest-29308991`
- Database: `taskxvs`
- Region: Singapore (`aws-ap-southeast-1`)
- App database role: `taskxvs_app`
- Worker role: `taskxvs_whatsapp_worker`

The worker's intended database access is restricted to the `whatsapp_gateway` schema. It can process the WhatsApp queue and its auth/session state. It must not be granted access to `public.tasks`, the owner reminder ledger, or unrelated application data. Do not broaden its permissions casually.

The worker reads the scheduler credential from `whatsapp_gateway.scheduler_token` for two authenticated internal TaskXVS endpoints: the hourly owner deadline-reminder sweep and WhatsApp notification-log synchronization. Do not reveal or rotate the credential unless deliberately planned.

### Notification-log status synchronization

The worker intentionally has **no UPDATE permission** on `public.whatsapp_notification_logs`, and it still cannot read `public.tasks` or `public.owner_reminder_email_runs`.

The delivery-status mismatch is now addressed through a durable, least-privilege flow:
- After a queue item changes state, the worker writes a narrow pending status record to `whatsapp_gateway.notification_log_sync_queue`.
- The worker sends that record to the authenticated TaskXVS endpoint `POST /api/internal/notifications/whatsapp-status`.
- TaskXVS validates the existing scheduler token and a strict payload, then updates only the matching `public.whatsapp_notification_logs` row using the application database role.
- Transient network/server failures are retried immediately, then retained in the outbox with exponential backoff up to one hour.
- A newer update cannot be deleted by an older in-flight synchronization, and a sent notification-log row cannot be downgraded to queued/failed.

Only the WhatsApp worker role received SELECT/INSERT/UPDATE/DELETE on the new outbox table in `whatsapp_gateway`. No public-schema privileges were added to the worker. The database migration was tested on a temporary Neon branch before applying to the dedicated TaskXVS project.

There were 36 previous outbound queue records whose queue status was `sent` while the linked notification log had been `queued`. Those 36 metadata rows were corrected manually based on the queue's existing sent state; no messages were resent.

### Existing sender state and recipient sync issue

The sender was recently verified as connected. Do not clear its auth keys or reconnect it unless the user explicitly asks.

The user reported that some messages displayed on one recipient phone but not another, with WhatsApp showing "Waiting for this message. This may take a while." The queue records showed outbound sends with no recorded send error. That recipient-device decryption/synchronization issue was **not conclusively fixed**. Do not promise all recipient-device sync problems can be fixed by the TaskXVS code.

### Message format already deployed

New TaskXVS WhatsApp messages use:
- Business name at the top.
- Event emoji and event label.
- Task title and description.
- Status and priority with suitable emojis.
- Readable deadline date.
- Blank-line spacing.
- TaskXVS link.
- No unnecessary "You receive this because you opted in..." footer.

The mobile top-left hamburger/menu sizing and spacing fix was also deployed in the latest production release.

## 6. Existing TaskXVS product behavior to preserve

- Owner activity emails go to Shakil's configured owner email only when another authenticated team member performs an activity. Owner's own actions and system-generated actions do not send owner activity emails.
- Private owner deadline digest reminders are enabled at 7, 2, and 1 days before a task deadline.
- Owner reminder timezone defaults to New York; the owner can change it in Settings.
- Searchable world-clock timezone picker is deployed.
- Category accent colors are used for task-list icons.
- Existing task creation, business management, team access, WhatsApp settings, and email notifications must not regress.

## 7. What is NOT yet implemented for Meta Cloud API

A review of `server.js` on main at commit `91703d51cfab9adcf2a1a2affc535a77d0ac0bd3` found no Meta webhook implementation markers:
- No `hub.verify_token` callback verification route.
- No `x-hub-signature-256` validation.
- No `whatsapp_business_account` webhook event handler.

The following are not yet confirmed or implemented:
- Meta webhook callback URL and verify token.
- Webhook GET verification and POST signature verification.
- Meta Graph API sending client.
- Encrypted/safe storage for Meta production credentials.
- Embedded Signup / Coexistence onboarding launch and callback.
- Production WABA ID and production Phone Number ID.
- Production number registration/Coexistence migration.
- Incoming message and delivery/read-status webhook processing.
- Production message templates and Meta template approvals.
- End-to-end test of the official API.

Do not enter a callback URL in Meta until a real HTTPS endpoint is implemented and deployed.

## 8. Next actions — minimal order

### NOW: wait for Meta's business verification result

1. Check Meta Business Settings → Business Info → Business verification status.
2. Check the Meta Developer app's Independent Tech Provider page and the App Review card separately.
3. Meta's 2-business-day estimate was shown after the 2026-11-25 submission. Wait for the actual status/notification; do not treat the estimate as a promise.
4. Do not edit the submitted business details or repeat the application while it is pending.
5. Do not register the production number, clear the current WhatsApp session, or stop the GitHub worker.

### AFTER Meta responds

1. Read the exact approval/rejection message.
2. Reconfirm legal ownership of the app/provider operation and client authorization (see Section 3).
3. Verify system user app installation, asset assignment and token permissions (Section 4).
4. Check the outstanding Tech Provider/App Review requirements.
5. Only then implement the official Meta Cloud API components in an isolated branch/PR and deploy to the existing TaskXVS Render service.
6. Use Meta Embedded Signup / Coexistence for the existing WhatsApp Business App number only if Meta confirms the account/number is eligible.
7. Test sending and webhook delivery with an approved test path before switching any production notifications.
8. Keep the current Baileys sender available as a rollback until the official integration is proven. Ask the user before changing primary routing or disconnecting the existing number.

## 9. Safe implementation plan for the next AI/developer

When the user is ready to build, inspect current main before coding and work in small, reviewable PRs. Likely implementation sequence:

1. **Meta credentials/config:** app ID, app secret, verify token, system-user token, WABA ID and phone-number ID stored as protected Render environment variables or an appropriate secret store. Never hard-code values.
2. **Webhook endpoint:** HTTPS GET challenge verification; POST validation using Meta's app secret and `X-Hub-Signature-256`; request-size/time limits; event logging without logging secrets or message contents.
3. **Embedded Signup / Coexistence:** confirm current Meta docs and eligibility first; implement the supported OAuth/Embedded Signup flow and server-side token exchange.
4. **Persistence:** add narrowly scoped tables/fields for provider configuration, WABA/phone identifiers, webhook events and idempotency. Use additive migrations only in the dedicated TaskXVS Neon project.
5. **Message sending:** add a provider abstraction so the existing notification queue can route to Meta Cloud API without removing the current Baileys fallback prematurely.
6. **Statuses:** record accepted, sent, delivered, read and failed results from webhook events; deduplicate webhook retries.
7. **Cutover:** explicit owner approval after test messages and status callbacks succeed; do not silently switch or unregister the existing sender.

Before implementing any of these, verify the current Meta documentation and the actual app/portfolio status. Meta's UI and requirements may have changed.

## 10. Security and data-protection checklist

Never place any of the following in GitHub:
- Meta access tokens or app secrets.
- Webhook verify token.
- Neon connection strings/passwords.
- Full EIN or tax-document scans.
- WhatsApp auth/session key material or QR codes.
- Full private customer phone numbers.

Do not modify:
- Any Neon project except `blue-forest-29308991` for TaskXVS work.
- Any V3PL project/service/database.
- Existing WhatsApp auth state unless explicitly authorized.
- Business/task/category/team data to facilitate Meta verification.

## 11. Quick links

- [TaskXVS production](https://task.shakilxvs.com)
- [GitHub repository](https://github.com/shakilxvs/gfgsdf)
- [Task Manager Meta app](https://developers.facebook.com/apps/1615865400569794/)
- [Meta Business Settings](https://business.facebook.com/latest/settings)
- [TaskXVS WhatsApp worker workflow](https://github.com/shakilxvs/gfgsdf/actions/workflows/taskxvs-whatsapp-worker.yml)
- [TaskXVS worker README](../whatsapp-worker/README.md)

---

## Handover note for the next AI

**Do not start by changing production.** Read this document, inspect current Meta status, verify who legally owns the app/provider business, and then tell Shakil the single next action. The present blocker is Meta's pending business verification review. Existing TaskXVS WhatsApp notifications must continue to work while the official Meta route is prepared.
