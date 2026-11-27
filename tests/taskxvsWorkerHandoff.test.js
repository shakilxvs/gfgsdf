import test from "node:test";
import assert from "node:assert/strict";
import {
  dispatchWorkerSuccessor,
  evaluateWorkerRuns,
  WORKER_WORKFLOW_FILE
} from "../whatsapp-worker/handoff.js";

const MINUTE = 60 * 1000;
const NOW = Date.parse("2026-11-27T18:00:00Z");

function run({
  status = "completed",
  conclusion = "success",
  startedMinutesAgo = 345,
  finishedMinutesAgo = 0,
  createdMinutesAgo = startedMinutesAgo,
  id = "1"
} = {}) {
  return {
    id,
    status,
    conclusion,
    created_at: new Date(NOW - createdMinutesAgo * MINUTE).toISOString(),
    run_started_at: new Date(NOW - startedMinutesAgo * MINUTE).toISOString(),
    updated_at: new Date(NOW - finishedMinutesAgo * MINUTE).toISOString()
  };
}

test("does not dispatch when a replacement is already queued", () => {
  const decision = evaluateWorkerRuns([
    run({ status: "queued", conclusion: null, createdMinutesAgo: 2 }),
    run({ status: "in_progress", conclusion: null, startedMinutesAgo: 340, id: "2" })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, false);
});

test("refreshes a replacement that has been stuck in the queue", () => {
  const decision = evaluateWorkerRuns([
    run({ status: "queued", conclusion: null, createdMinutesAgo: 25 })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, true);
});

test("leaves a healthy active worker alone", () => {
  const decision = evaluateWorkerRuns([
    run({ status: "in_progress", conclusion: null, startedMinutesAgo: 120 })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, false);
});

test("queues a handoff when an active worker is near its session limit", () => {
  const decision = evaluateWorkerRuns([
    run({ status: "in_progress", conclusion: null, startedMinutesAgo: 340 })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, true);
});

test("does not restart a short successful session, including a logged-out sender", () => {
  const decision = evaluateWorkerRuns([
    run({ conclusion: "success", startedMinutesAgo: 8, finishedMinutesAgo: 1 })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, false);
});

test("recovers after a full session ended without a successor", () => {
  const decision = evaluateWorkerRuns([
    run({ conclusion: "success", startedMinutesAgo: 350, finishedMinutesAgo: 5 })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, true);
});

test("retries a failed worker after the recovery delay", () => {
  const decision = evaluateWorkerRuns([
    run({ conclusion: "failure", startedMinutesAgo: 4, finishedMinutesAgo: 4 })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, false);
});

test("starts the first worker if no run exists", () => {
  const decision = evaluateWorkerRuns([], { now: NOW });
  assert.equal(decision.shouldDispatch, true);
});

test("dispatches the worker workflow on main using a workflow_dispatch request", async () => {
  let request;
  const result = await dispatchWorkerSuccessor({
    token: "test-token",
    repository: "shakilxvs/gfgsdf",
    ref: "main",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 204 };
    }
  });

  assert.deepEqual(result, { queued: true });
  assert.equal(
    request.url,
    `https://api.github.com/repos/shakilxvs/gfgsdf/actions/workflows/${WORKER_WORKFLOW_FILE}/dispatches`
  );
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers.Authorization, "Bearer test-token");
  assert.deepEqual(JSON.parse(request.options.body), { ref: "main" });
});

test("rejects dispatch without credentials without making a request", async () => {
  let called = false;
  await assert.rejects(
    () => dispatchWorkerSuccessor({
      repository: "shakilxvs/gfgsdf",
      fetchImpl: async () => { called = true; }
    }),
    /token and repository are required/
  );
  assert.equal(called, false);
});

test("reports rejected GitHub workflow dispatch requests", async () => {
  await assert.rejects(
    () => dispatchWorkerSuccessor({
      token: "test-token",
      repository: "shakilxvs/gfgsdf",
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        text: async () => "Resource not accessible by integration"
      })
    }),
    /dispatch failed \(403\)/
  );
});

test("does not restart a successful full session until the handoff grace period passes", () => {
  const decision = evaluateWorkerRuns([
    run({ conclusion: "success", startedMinutesAgo: 345, finishedMinutesAgo: 1 })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, false);
});

test("backs off repeated failures up to the configured maximum", () => {
  const failedRuns = [
    run({ id: "3", conclusion: "failure", startedMinutesAgo: 1, finishedMinutesAgo: 1, createdMinutesAgo: 1 }),
    run({ id: "2", conclusion: "failure", startedMinutesAgo: 8, finishedMinutesAgo: 8, createdMinutesAgo: 8 }),
    run({ id: "1", conclusion: "failure", startedMinutesAgo: 18, finishedMinutesAgo: 18, createdMinutesAgo: 18 })
  ];
  const decision = evaluateWorkerRuns(failedRuns, { now: NOW });

  assert.equal(decision.shouldDispatch, false);
  assert.match(decision.reason, /waiting/);
});

test("retries a failed worker once the recovery delay passes", () => {
  const decision = evaluateWorkerRuns([
    run({ conclusion: "failure", startedMinutesAgo: 7, finishedMinutesAgo: 7 })
  ], { now: NOW });

  assert.equal(decision.shouldDispatch, true);
});
