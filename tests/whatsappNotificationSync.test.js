import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWhatsAppNotificationStatus } from "../src/whatsappNotificationStatus.js";
import { postTaskXvsInternal } from "../whatsapp-worker/internal-api.js";

test("normalizes valid queued, sent, and failed notification updates", () => {
  assert.deepEqual(
    normalizeWhatsAppNotificationStatus({ notification_log_id: "42", status: "queued" }),
    { notificationLogId: 42, status: "queued", wamid: null, errorMessage: null }
  );
  assert.deepEqual(
    normalizeWhatsAppNotificationStatus({ notification_log_id: 43, status: "sent", wamid: "wamid.123" }),
    { notificationLogId: 43, status: "sent", wamid: "wamid.123", errorMessage: null }
  );
  assert.deepEqual(
    normalizeWhatsAppNotificationStatus({ notification_log_id: "44", status: "failed", error_message: "No route" }),
    { notificationLogId: 44, status: "failed", wamid: null, errorMessage: "No route" }
  );
});

test("rejects invalid notification identifiers and unsupported statuses", () => {
  for (const notification_log_id of [undefined, null, 0, -1, 1.5, "abc", "9007199254740992"]) {
    assert.throws(
      () => normalizeWhatsAppNotificationStatus({ notification_log_id, status: "sent" }),
      error => error.status === 400
    );
  }
  assert.throws(
    () => normalizeWhatsAppNotificationStatus({ notification_log_id: 1, status: "delivered" }),
    error => error.status === 400
  );
});

test("bounds external IDs and failure text", () => {
  const result = normalizeWhatsAppNotificationStatus({
    notification_log_id: 55,
    status: "failed",
    wamid: "w".repeat(700),
    error_message: "e".repeat(1000)
  });
  assert.equal(result.wamid.length, 500);
  assert.equal(result.errorMessage.length, 700);
});

test("retries a transient TaskXVS server error and succeeds", async () => {
  let calls = 0;
  const waits = [];
  const result = await postTaskXvsInternal({
    baseUrl: "https://task.shakilxvs.com",
    path: "/api/internal/notifications/whatsapp-status",
    token: "test-secret",
    payload: { notification_log_id: 99, status: "sent" },
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 503, text: async () => "starting" };
      return { ok: true, json: async () => ({ ok: true }) };
    },
    sleepImpl: async ms => waits.push(ms)
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls, 2);
  assert.deepEqual(waits, [1000]);
});

test("does not retry authentication or validation failures", async () => {
  let calls = 0;
  await assert.rejects(
    postTaskXvsInternal({
      baseUrl: "https://task.shakilxvs.com",
      path: "/api/internal/notifications/whatsapp-status",
      token: "test-secret",
      fetchImpl: async () => {
        calls += 1;
        return { ok: false, status: 401, text: async () => "unauthorized" };
      },
      sleepImpl: async () => {}
    }),
    /returned 401/
  );
  assert.equal(calls, 1);
});

test("retries transient network failures up to the configured limit", async () => {
  let calls = 0;
  await assert.rejects(
    postTaskXvsInternal({
      baseUrl: "https://task.shakilxvs.com",
      path: "/api/internal/notifications/whatsapp-status",
      token: "test-secret",
      maxAttempts: 3,
      fetchImpl: async () => {
        calls += 1;
        throw new Error("temporary network failure");
      },
      sleepImpl: async () => {}
    }),
    /temporary network failure/
  );
  assert.equal(calls, 3);
});

test("requires an internal scheduler token", async () => {
  await assert.rejects(
    postTaskXvsInternal({
      baseUrl: "https://task.shakilxvs.com",
      path: "/api/internal/notifications/whatsapp-status",
      token: "",
      fetchImpl: async () => { throw new Error("should not be called"); }
    }),
    /scheduler token/
  );
});
