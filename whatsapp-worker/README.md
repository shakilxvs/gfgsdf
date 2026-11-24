# TaskXVS WhatsApp cloud worker

This worker runs on standard GitHub-hosted runners for this public repository. It uses a scheduled runner session rather than a paid VPS or a device kept online.

## Required repository secret

Add an Actions repository secret named `TASKXVS_WHATSAPP_DATABASE_URL`. Its value must be a Neon connection string for the dedicated `taskxvs_whatsapp_worker` role on the `shlomo_tasks` database.

The role is scoped to the `whatsapp_gateway` schema. Do not place the connection string in the repository, source files, Actions variables, or logs.

## Runtime behavior

The scheduled workflow starts every six hours and keeps one WhatsApp Web session connected for up to 345 minutes. Messages are queued in Neon and sent while the runner is connected. There can be gaps between sessions, and GitHub can delay scheduled workflow starts.

The phone is needed to scan the pairing QR once. It does not need to remain powered on after pairing. Baileys is an unofficial WhatsApp Web client and may lead to account restrictions. Use a dedicated sender and only send to recipients who opted in.
