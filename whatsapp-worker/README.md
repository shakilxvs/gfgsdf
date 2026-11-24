# TaskXVS WhatsApp cloud worker

This worker runs on standard GitHub-hosted runners for this public repository. It uses scheduled runner sessions rather than a paid VPS or a phone that must stay online.

## Dedicated Neon database

The worker uses the existing `taskxvs` database in the dedicated `shakilxvs-taskxvs` Neon project.

Its PostgreSQL role is `taskxvs_whatsapp_worker`. The role has read/write permissions only in the `whatsapp_gateway` schema. It must not be given access to application tables in the `public` schema.

The schema is defined in `whatsapp-worker/schema.sql`. The application role is `taskxvs_app`. Do not use the old `shlomo_tasks` database or `shlomo_app` role.

## GitHub Actions secret

Add or update this repository Actions secret:

```
TASKXVS_WHATSAPP_DATABASE_URL
```

The value must be the Neon connection string for database `taskxvs` using role `taskxvs_whatsapp_worker` in the `shakilxvs-taskxvs` project. Do not use the application role connection string.

Never commit the connection string, expose it in Actions variables, print it in logs, or paste it into an issue or pull request.

## Runtime behavior

The workflow is intentionally manual-only until the owner verifies QR pairing and a successful test message. Do not restore the six-hour schedule before those checks pass.

When scheduled, the worker keeps one WhatsApp Web session connected for up to 345 minutes. While connected, it checks the Neon queue every 20 minutes to reduce compute usage on the Neon Free plan. Delivery may therefore be delayed by up to 20 minutes while a session is active, plus any gap between runner sessions. GitHub can also delay scheduled workflow starts. This is not a 24/7 delivery guarantee.

## Pairing and safety

Run the workflow manually from GitHub Actions. In TaskXVS owner Settings, refresh the WhatsApp status and scan the QR code using WhatsApp on the dedicated sender phone: **Linked devices → Link a device**.

The sender phone is only needed for pairing, but the linked session may need to be re-established if WhatsApp logs it out. If the phone unlinks the device or Baileys reports a connection conflict (440), the worker stops instead of looping with invalid or competing credentials. In TaskXVS owner Settings, choose **Reconnect WhatsApp** to clear only the saved WhatsApp auth keys. Then start the workflow manually and scan the new QR code. Do not start another worker run while an earlier run is active; the workflow uses a concurrency group to keep sessions serialized.

This worker uses Baileys, an unofficial WhatsApp Web client, not Meta's official Cloud API. Unofficial clients can be restricted by WhatsApp and are not a guaranteed provider integration. Use a dedicated sender number and send only to recipients who explicitly opted in.
