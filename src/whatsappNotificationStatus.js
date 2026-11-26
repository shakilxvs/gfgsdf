const ALLOWED_STATUSES = new Set(["queued", "sent", "failed"]);

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

/**
 * Validate the narrow status-sync contract accepted from the WhatsApp worker.
 * It intentionally accepts no recipient, task, business, or message-body fields.
 */
export function normalizeWhatsAppNotificationStatus(body) {
  const rawId = body?.notification_log_id;
  const idText = typeof rawId === "string" ? rawId.trim() : rawId;
  const notificationLogId =
    typeof idText === "number"
      ? idText
      : (typeof idText === "string" && /^\\d+$/.test(idText) ? Number(idText) : NaN);

  if (!Number.isSafeInteger(notificationLogId) || notificationLogId <= 0) {
    throw badRequest("A valid notification_log_id is required.");
  }

  const status = String(body?.status || "").trim().toLowerCase();
  if (!ALLOWED_STATUSES.has(status)) {
    throw badRequest("Status must be queued, sent, or failed.");
  }

  const wamid = String(body?.wamid || "").trim().slice(0, 500) || null;
  const errorMessage = status === "failed"
    ? String(body?.error_message || "WhatsApp delivery failed").trim().slice(0, 700)
    : null;

  return { notificationLogId, status, wamid, errorMessage };
}
