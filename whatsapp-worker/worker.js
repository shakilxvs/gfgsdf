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

const DATABASE_URL = process.env.DATABASE_URL;
const RUN_MINUTES = Math.max(10, Number(process.env.WHATSAPP_WORKER_MINUTES || 345));
const RUN_UNTIL = Date.now() + RUN_MINUTES * 60_000;
const QUEUE_POLL_INTERVAL_MS = 20 * 60 * 1000;
const logger = pino({ level: "silent" });

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
       RETURNING q.id,q.recipient_number,q.message_body,q.attempts`
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

async function processQueue(socket, isConnected) {
  if (!isConnected()) return false;
  const items = await claimQueueBatch();
  for (const item of items) {
    if (!isConnected()) {
      await pool.query(
        "UPDATE whatsapp_gateway.outbound_queue SET status='queued',updated_at=now() WHERE id=$1",
        [item.id]
      );
      continue;
    }
    try {
      const digits = String(item.recipient_number).replace(/\D/g, "");
      if (digits.length < 8) throw new Error("Invalid recipient phone number.");
      const result = await socket.sendMessage(digits + "@s.whatsapp.net", { text: item.message_body });
      await pool.query(
        "UPDATE whatsapp_gateway.outbound_queue SET status='sent',sent_at=now(),updated_at=now(),error_message=NULL WHERE id=$1",
        [item.id]
      );
      logger.info({ queueId: item.id, messageId: result?.key?.id || null }, "WhatsApp message sent");
    } catch (error) {
      const retry = !isConnected() && item.attempts < 3;
      await pool.query(
        "UPDATE whatsapp_gateway.outbound_queue SET status=$2,error_message=$3,updated_at=now() WHERE id=$1",
        [item.id, retry ? "queued" : "failed", String(error.message || error).slice(0, 900)]
      );
      logger.error({ queueId: item.id, error: String(error.message || error) }, "WhatsApp message failed");
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
    if (connected) {
      const hadMessages = await processQueue(socket, () => connected && !closed);
      await pool.query(
        "UPDATE whatsapp_gateway.gateway_state SET last_seen_at=now(),updated_at=now() WHERE id=true AND status='connected'"
      );
      if (!hadMessages && connected && !closed) {
        // Let Neon scale to zero between checks to keep this within its free compute allowance.
        await sleep(QUEUE_POLL_INTERVAL_MS);
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
