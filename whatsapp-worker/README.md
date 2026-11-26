# TaskXVS WhatsApp worker

This worker runs on standard GitHub-hosted runners. It uses scheduled runner sessions rather than a paid VPS or a phone that must stay online.

## Dedicated Neon database

The worker uses the existing `taskxvs` database in the dedicated `shakilxvs-taskxvs` Neon project.

Its PostgreSQL role is `taskxvs_whatsapp_worker`. Its intended read/write permissions are limited to the `whatsapp_gateway` schema. Do not give it access to application task tables in the `public` schema.

The schema is defined in `whatsapp-worker/schema.sql`. The application role is `taskxvs_app`. Do not use the old `shlomo_tasks` database or `shlomo_app` role.

## GitHub Actions secret

Repository Actions secret:

```
TASKXVS_WHATSAPP_DATABASE_URL
```

The value must be the Neon connection string for database `taskxvs` using role `taskxvs_whatsapp_worker` in the dedicated `shakilxvs-taskxvs` project. Do not use the application role connection string.

Never commit the connection string, expose it in Actions variables, print it in logs, or paste it into an issue or pull request.

## Runtime behavior

The workflow is automatically scheduled with cron `0 */6 * * *` (every six hours, UTC). It also retains `workflow_dispatch` for an owner-triggered manual run.

Each session can run for up to 345 minutes (5 hours 45 minutes). While connected, the worker checks the Neon outbound queue every 20 minutes to reduce compute use on the Neon Free plan. GitHub may delay scheduled starts, and there can be a gap between sessions. This is **not** a guaranteed 24/7 connection.

The workflow uses the concurrency group `taskxvs-whatsapp-cloud-worker` with `cancel-in-progress: false`, so a scheduled run should not cancel an active run.

The worker also reads a single scheduler credential from `whatsapp_gateway.scheduler_token` and calls the authenticated TaskXVS internal deadline-reminder endpoint. It does not read task records or the owner reminder ledger. Do not expose or copy the scheduler credential.

## Current WhatsApp provider

This worker uses Baileys, an unofficial WhatsApp Web client. It is not Meta's official Cloud API. The sender may be restricted by WhatsApp and scheduled sessions have delivery gaps. Use the dedicated sender number and send only to opted-in recipients.

Meta Cloud API / Coexistence is being prepared separately. Do not remove or replace this worker until the official integration has been approved, implemented, tested end to end, and the owner explicitly approves cutover.

See [the Meta Cloud API handover](../docs/META-WHATSAPP-CLOUD-API-HANDOVER.md) for the current Meta review status and safety requirements.

## Pairing and recovery

The sender phone is used to pair the linked device through WhatsApp **Linked devices → Link a device**. A linked session may need to be re-established if WhatsApp logs it out.

If the phone unlinks the device or Baileys reports a connection conflict (440), the worker stops instead of looping with invalid or competing credentials. The TaskXVS owner Settings includes a **Reconnect WhatsApp** action that clears the saved WhatsApp auth state. Use it only when the owner explicitly authorizes a reset, because it requires a fresh QR pairing.

Do not start another worker run while an earlier run is active.

## Notification-log status synchronization

The worker does not have write permission on `public.whatsapp_notification_logs`, and that restriction is intentional.

After each outbound queue status change, the worker records a small pending update in `whatsapp_gateway.notification_log_sync_queue`. It then sends the update to the authenticated TaskXVS internal endpoint:

`POST /api/internal/notifications/whatsapp-status`

The TaskXVS application validates the scheduler token and the narrow payload, then updates only the specified WhatsApp notification-log row using its application database role. It cannot be used to change tasks, businesses, recipients, or message content.

Pending updates survive worker restarts. Transient network/server errors are retried, then rescheduled with exponential backoff up to one hour. A newer pending status replaces an older unsent status, and a sent log cannot be downgraded by a later queued/failed update. The worker deletes the outbox row only after the TaskXVS endpoint confirms synchronization.

The worker role still has no access to `public.tasks` or `public.owner_reminder_email_runs`. Do not grant it broad access to the `public` schema.
