-- TaskXVS free WhatsApp cloud worker storage.
-- The TaskXVS application runs as taskxvs_app.
-- The separate taskxvs_whatsapp_worker role is created in Neon with read_write
-- access scoped exclusively to this schema in the taskxvs database.

CREATE SCHEMA IF NOT EXISTS whatsapp_gateway;

CREATE TABLE IF NOT EXISTS whatsapp_gateway.auth_kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_gateway.outbound_queue (
  id BIGSERIAL PRIMARY KEY,
  notification_log_id BIGINT UNIQUE REFERENCES public.whatsapp_notification_logs(id) ON DELETE CASCADE,
  recipient_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS whatsapp_gateway_outbound_queue_ready_idx
  ON whatsapp_gateway.outbound_queue(status, created_at)
  WHERE status IN ('queued','sending');

CREATE TABLE IF NOT EXISTS whatsapp_gateway.gateway_state (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected','connecting','qr','connected','logged_out','error')),
  qr_data_url TEXT,
  phone_number TEXT,
  last_seen_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO whatsapp_gateway.gateway_state(id,status)
VALUES (TRUE,'disconnected')
ON CONFLICT(id) DO NOTHING;

GRANT USAGE ON SCHEMA whatsapp_gateway TO taskxvs_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA whatsapp_gateway TO taskxvs_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA whatsapp_gateway TO taskxvs_app;
