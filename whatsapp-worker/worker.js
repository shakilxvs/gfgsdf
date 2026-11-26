import makeWASocket, {
  BufferJSON,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  proto
} from "@whiskeysockets/baileys";
import pg from "pg";
const { Pool } = pg;
import pino from "pino";
import QRCode from "qrcode";
import { postTaskXvsInternal } from "./internal-api.js";

const DATABASE_URL = process.env.DATABASE_URL;
const RUN_MINUTES = Math.max(10, Number(process.env.WHATSAPP_WORKER_MINUTES || 345));
const RUN_UNTIL = Date.now() + RUN_MINUTES * 60_000;
const QUEUE_POLL_INTERVAL_MS = 5 * 60 * 1000;
const OWNER_REMINDER_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const NOTIFICATION_LOG_SYNC_POLL_INTERVAL_MS = 30 * 1000;
const NOTIFICATION_LOG_SYNC_BATCH_SIZE = 25;
const TASKXVS_BASE_URL = process.env.TASKXVS_BASE_URL || "https://task.shakilxvs.com";
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Set GitHub Actions secret TASKXVS_WHATSAPP_DATABASE_URL.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 4,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 60000
});

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const encode = value => JSON.stringify(value, BufferJSON.replacer);
const decode = value => JSON.parse(JSON.stringify(value), BufferJSON.reviver);

async function updateGateway(status, patch = {}) {
  await pool.query(
    `INSERT INTO whatsapp_gateway.gateway_state
       (id,status,qr_data_url,phone_number,last_seen_at,last_error,updated_at)
     VALUES (TRUE,$1,$2,$3,CASE WHEN $1='connected' THEN now() ELSE NULL END,$4,now())
     ON CONFLICT(id) DO UPDATE SET
       status=EXCLUDED.status,
       qr_data_url=EXCLUDED.qr_data_url,
       phone_number=EXCLUDED.phone_number,
       last_seen_at=CASE WHEN EXCLUDED.status='connected' THEN now()
                         ELSE whatsapp_gateway.gateway_state.last_seen_at END,
       last_error=EXCLUDED.last_error,
       updated_at=now()`,
    [status, patch.qr_data_url ?? null, patch.phone_number ?? null, patch.last_error ?? null]
  );
}

async function createPostgresAuthState() {
  const credsResult = await pool.query(
    "SELECT value FROM whatsapp_gateway.auth_kv WHERE key='creds' LIMIT 1"
  );
  const creds = credsResult.rowCount ? decode(credsResult.rows[0].value) : initAuthCreds();

  if (!credsResult.rowCount) {
    await pool.query(
      "INSERT INTO whatsapp_gateway.auth_kv(key,value,updated_at) VALUES('creds',$1::jsonb,now()) ON CONFLICT(key) DO NOTHING",
      [encode(creds)]
    );
  }

  const keys = {
    get: async (type, ids) => {
      if (!ids.length) return {};
      const names = ids.map(id => type + "-" + id);
      const result = await pool.query(
        "SELECT key,value FROM whatsapp_gateway.auth_kv WHERE key=ANY($1::text[])",
        [names]
      );
      const stored = new Map(result.rows.map(row => [row.key, row.value]));
      const output = {};
      for (const id of ids) {
        let value = stored.has(type + "-" + id) ? decode(stored.get(type + "-" + id)) : null;
        if (type === "app-state-sync-key" && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value);
        }
        output[id] = value;
      }
      return output;
    },
    set: async data => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const [category, entries] of Object.entries(data)) {
          for (const [id, value] of Object.entries(entries || {})) {
            const key = category + "-" + id;
            if (value === null || value === undefined) {
              await client.query("DELETE FROM whatsapp_gateway.auth_kv WHERE key=$1", [key]);
            } else {
              await client.query(
                "INSERT INTO whatsapp_gateway.auth_kv(key,value,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
                [key, encode(value)]
              );
            }
          }
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  };

  return {
    state: { creds, keys },
    saveCreds: async () => {
      await pool.query(
        "INSERT INTO whatsapp_gateway.auth_kv(key,value,updated_at) VALUES('creds',$1::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=now()",
        [encode(creds)]
      );
    }
  };
}

async function claimQueueBatch() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `WITH ready AS (
         SELECT id
         FROM whatsapp_gateway.outbound_queue
         WHERE status='queued'
         ORDER BY created_at,id
         LIMIT 5
         FOR UPDATE SKIP LOCKED
       )
       UPDATE whatsapp_gateway.outbound_queue q
       SET status='sending',attempts=attempts+1,error_message=NULL,updated_at=now()
       FROM ready
       WHERE q.id=ready.id
       RETURNING q.id,q.notification_log_id,q.recipient_number,q.message_body,q.attempts`
    );
    await client.query("COMMIT");
    return result.rows;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

let lastDeadlineSweepAt = 0;
let lastNotificationLogSyncAt = 0;

async function getSchedulerToken() {
  const result = await pool.query(
    "SELECT token FROM whatsapp_gateway.scheduler_token WHERE id=true LIMIT 1"
  );
  return result.rows[0]?.token || "";
}

async function triggerOwnerDeadlineReminderSweep(force = false) {
  if (!force && Date.now() - lastDeadlineSweepAt < OWNER_REMINDER_SWEEP_INTERVAL_MS) return;
  lastDeadlineSweepAt = Date.now();

  try {
    const token = await getSchedulerToken();
    if (!token) {
      logger.warn("Owner reminder scheduler token is not configured.");
      return;
    }

    await postTaskXvsInternal({
      baseUrl: TASKXVS_BASE_URL,
      path: "/api/internal/notifications/deadlines",
      token,
      payload: {},
      maxAttempts: 2,
      timeoutMs: 60000,
      retryDelayMs: 2500
    });
    logger.info("Owner deadline reminder check completed");
  } catch (error) {
    // If TaskXVS is temporarily unavailable, retry in five minutes, not one hour.
    lastDeadlineSweepAt = Date.now() - OWNER_REMINDER_SWEEP_INTERVAL_MS + 5 * 60 * 1000;
    logger.warn({ error: error.message }, "Owner deadline reminder handoff failed");
  }
}

async function enqueueNotificationLogSync(notificationLogId, status, details = {}) {
  const id = Number(notificationLogId);
  if (!Number.isSafeInteger(id) || id <= 0) return;

  const wamid = details.wamid ? String(details.wamid).slice(0, 500) : null;
  const errorMessage = status === "failed"
    ? String(details.errorMessage || "WhatsApp delivery failed").slice(0, 700)
    : null;

  await pool.query(
    `INSERT INTO whatsapp_gateway.notification_log_sync_queue
       (notification_log_id,status,wamid,error_message,next_attempt_at,updated_at)
     VALUES ($1,$2,$3,$4,now(),now())
     ON CONFLICT(notification_log_id) DO UPDATE SET
       status=CASE
         WHEN whatsapp_gateway.notification_log_sync_queue.status='sent' THEN 'sent'
         ELSE EXCLUDED.status
       END,
       wamid=COALESCE(EXCLUDED.wamid,whatsapp_gateway.notification_log_sync_queue.wamid),
       error_message=CASE
         WHEN whatsapp_gateway.notification_log_sync_queue.status='sent' OR EXCLUDED.status='sent' THEN NULL
         WHEN EXCLUDED.status='failed' THEN EXCLUDED.error_message
         ELSE NULL
       END,
       attempts=0,
       next_attempt_at=now(),
       last_error=NULL,
       updated_at=now()`,
    [id, status, wamid, errorMessage]
  );
}

async function enqueueNotificationLogSyncSafely(notificationLogId, status, details = {}) {
  if (!notificationLogId) return;
  try {
    await enqueueNotificationLogSync(notificationLogId, status, details);
  } catch (error) {
    logger.error(
      { notificationLogId: String(notificationLogId), error: error.message },
      "Could not queue WhatsApp notification-log synchronization"
    );
  }
}

async function processPendingNotificationLogSyncs(force = false) {
  if (!force && Date.now() - lastNotificationLogSyncAt < NOTIFICATION_LOG_SYNC_POLL_INTERVAL_MS) {
    return false;
  }
  lastNotificationLogSyncAt = Date.now();

  const pending = await pool.query(
    `SELECT notification_log_id,status,wamid,error_message,attempts,updated_at::text AS row_version
     FROM whatsapp_gateway.notification_log_sync_queue
     WHERE next_attempt_at <= now()
     ORDER BY next_attempt_at,created_at
     LIMIT $1`,
    [NOTIFICATION_LOG_SYNC_BATCH_SIZE]
  );
  if (!pending.rowCount) return false;

  const token = await getSchedulerToken();
  if (!token) {
    logger.warn("Cannot synchronize WhatsApp notification logs because the scheduler token is missing.");
    return true;
  }

  for (const item of pending.rows) {
    try {
      await postTaskXvsInternal({
        baseUrl: TASKXVS_BASE_URL,
        path: "/api/internal/notifications/whatsapp-status",
        token,
        payload: {
          notification_log_id: String(item.notification_log_id),
          status: item.status,
          wamid: item.wamid,
          error_message: item.error_message
        },
        maxAttempts: 3,
        timeoutMs: 15000,
        retryDelayMs: 1000
      });

      // Match updated_at so a newer status queued during this request is never deleted.
      await pool.query(
        "DELETE FROM whatsapp_gateway.notification_log_sync_queue WHERE notification_log_id=$1 AND updated_at=$2::timestamptz",
        [item.notification_log_id, item.row_version]
      );
      logger.info(
        { notificationLogId: String(item.notification_log_id), status: item.status },
        "WhatsApp notification log synchronized"
      );
    } catch (error) {
      const attempts = Math.max(0, Number(item.attempts) || 0);
      const backoffSeconds = Math.min(3600, 30 * (2 ** Math.min(attempts, 7)));
      const errorMessage = String(error.message || error).slice(0, 700);

      await pool.query(
        `UPDATE whatsapp_gateway.notification_log_sync_queue
         SET attempts=attempts+1,
             next_attempt_at=now()+($2 * interval '1 second'),
             last_error=$3,
             updated_at=now()
         WHERE notification_log_id=$1 AND updated_at=$4::timestamptz`,
        [item.notification_log_id, backoffSeconds, errorMessage, item.row_version]
      );
      logger.warn(
        { notificationLogId: String(item.notification_log_id), backoffSeconds, error: errorMessage },
        "WhatsApp notification-log sync will retry"
      );
    }
  }

  return true;
}


async function processQueue(socket, isConnected) {
  if (!isConnected()) return false;
  const items = await claimQueueBatch();
  for (const item of items) {
    if (!isConnected()) {
      await pool.query(
        "UPDATE whatsapp_gateway.outbound_queue SET status='queued',updated_at=now() WHERE id=$1",
        [item.id]
      );
      await enqueueNotificationLogSyncSafely(item.notification_log_id, "queued");
      continue;
    }
    try {
      const digits = String(item.recipient_number).replace(/\D/g, "");
      if (digits.length < 8) throw new Error("Invalid recipient phone number.");
      const pnJid = digits + "@s.whatsapp.net";
      let destinationJid = pnJid;
      try {
        const lidMapping = socket.signalRepository?.lidMapping;
        const mappedLid = await lidMapping?.getLIDForPN?.(pnJid);
        if (mappedLid) destinationJid = mappedLid;
      } catch (mappingError) {
        logger.warn({ queueId: item.id, error: mappingError.message }, "Could not resolve the cached WhatsApp LID; using the phone-number JID");
      }
      const result = await socket.sendMessage(destinationJid, { text: item.message_body });
      const messageId = result?.key?.id || null;
      await pool.query(
        "UPDATE whatsapp_gateway.outbound_queue SET status='sent',sent_at=now(),updated_at=now(),error_message=NULL WHERE id=$1",
        [item.id]
      );
      await enqueueNotificationLogSyncSafely(item.notification_log_id, "sent", { wamid: messageId });
      logger.info({ queueId: item.id, messageId, recipientJidType: destinationJid.endsWith("@lid") ? "lid" : "phone" }, "WhatsApp message sent to WhatsApp");
    } catch (error) {
      const retry = !isConnected() && item.attempts < 3;
      const errorMessage = String(error.message || error).slice(0, 900);
      await pool.query(
        "UPDATE whatsapp_gateway.outbound_queue SET status=$2,error_message=$3,updated_at=now() WHERE id=$1",
        [item.id, retry ? "queued" : "failed", errorMessage]
      );
      await enqueueNotificationLogSyncSafely(
        item.notification_log_id,
        retry ? "queued" : "failed",
        { errorMessage }
      );
      logger.error({ queueId: item.id, error: errorMessage }, "WhatsApp message failed");
    }
    await sleep(3500);
  }
  return items.length > 0;
}

async function runSocketSession() {
  const auth = await createPostgresAuthState();
  let connected = false;
  let closed = false;
  let loggedOut = false;
  let socket;

  let version;
  try {
    const latest = await fetchLatestBaileysVersion();
    if (latest?.version) version = latest.version;
  } catch {
    logger.warn("Could not fetch the newest WhatsApp Web version. Using the library default.");
  }

  await updateGateway("connecting");
  socket = makeWASocket({
    auth: {
      creds: auth.state.creds,
      keys: makeCacheableSignalKeyStore(auth.state.keys, logger)
    },
    version,
    browser: Browsers.macOS("Chrome"),
    logger,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    keepAliveIntervalMs: 25000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000
  });

  socket.ev.on("creds.update", () => {
    auth.saveCreds().catch(error => logger.error({ error: error.message }, "Could not persist WhatsApp credentials"));
  });

  socket.ev.on("connection.update", async update => {
    try {
      if (update.qr) {
        const qrDataUrl = await QRCode.toDataURL(update.qr, { margin: 2, width: 280 });
        await updateGateway("qr", { qr_data_url: qrDataUrl });
      }
      if (update.connection === "open") {
        connected = true;
        await updateGateway("connected", {
          phone_number: String(socket.user?.id || "").split(":")[0].replace(/\D/g, "")
        });
      }
      if (update.connection === "close") {
        connected = false;
        closed = true;
        const code = update.lastDisconnect?.error?.output?.statusCode;
        const sessionConflict = code === DisconnectReason.connectionReplaced;
        loggedOut = code === DisconnectReason.loggedOut || sessionConflict;
        const disconnectMessage = sessionConflict
          ? "WhatsApp session conflict: another linked session replaced this worker. Automatic retries are stopped to prevent a reconnect loop. Close any other active TaskXVS worker, then use Reconnect WhatsApp in owner Settings."
          : code === DisconnectReason.loggedOut
            ? "WhatsApp sender was logged out or unlinked from the phone. Use Reconnect WhatsApp in owner Settings to create a fresh QR login."
            : (update.lastDisconnect?.error?.message || "WhatsApp connection closed.");
        await updateGateway(loggedOut ? "logged_out" : "disconnected", {
          last_error: disconnectMessage
        });
      }
    } catch (error) {
      logger.error({ error: error.message }, "WhatsApp connection state update failed");
    }
  });

  while (Date.now() < RUN_UNTIL && !closed) {
    await triggerOwnerDeadlineReminderSweep();
    const hadPendingLogSyncs = await processPendingNotificationLogSyncs();
    if (connected) {
      const hadMessages = await processQueue(socket, () => connected && !closed);
      await pool.query(
        "UPDATE whatsapp_gateway.gateway_state SET last_seen_at=now(),updated_at=now() WHERE id=true AND status='connected'"
      );
      if (!hadMessages && connected && !closed) {
        // Retry a pending status sync sooner, while keeping empty queue polling at five minutes.
        await sleep(hadPendingLogSyncs ? NOTIFICATION_LOG_SYNC_POLL_INTERVAL_MS : QUEUE_POLL_INTERVAL_MS);
      }
    } else {
      await sleep(1800);
    }
  }

  try { socket.end(new Error("Scheduled GitHub Actions worker session ended.")); } catch {}
  return { loggedOut, closed };
}

async function main() {
  await pool.query("SELECT 1 FROM whatsapp_gateway.gateway_state LIMIT 1");
  await pool.query("SELECT 1 FROM whatsapp_gateway.auth_kv LIMIT 1");
  await pool.query("SELECT 1 FROM whatsapp_gateway.outbound_queue LIMIT 1");
  await pool.query("SELECT 1 FROM whatsapp_gateway.scheduler_token LIMIT 1");
  await pool.query("SELECT 1 FROM whatsapp_gateway.notification_log_sync_queue LIMIT 1");

  await pool.query(
    "UPDATE whatsapp_gateway.outbound_queue SET status='queued',updated_at=now() WHERE status='sending' AND updated_at < now() - interval '10 minutes'"
  );
  let loggedOut = false;

  try {
    while (Date.now() < RUN_UNTIL && !loggedOut) {
      const result = await runSocketSession();
      loggedOut = result.loggedOut;
      if (!loggedOut && Date.now() < RUN_UNTIL) {
        await sleep(5000);
      }
    }
  } catch (error) {
    await updateGateway("error", { last_error: String(error.message || error).slice(0, 900) }).catch(() => {});
    throw error;
  } finally {
    if (!loggedOut) {
      await updateGateway("disconnected", { last_error: "The free cloud worker session ended. It will reconnect on the next scheduled run." }).catch(() => {});
    }
    await pool.end();
  }
}

main().catch(error => {
  console.error("TaskXVS WhatsApp worker failed:", error.message);
  process.exitCode = 1;
});
