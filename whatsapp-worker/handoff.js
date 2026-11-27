export const WORKER_WORKFLOW_FILE = "taskxvs-whatsapp-worker.yml";
export const WORKER_CONCURRENCY_GROUP = "taskxvs-whatsapp-cloud-worker";

const PENDING_STATES = new Set(["queued", "waiting", "requested", "pending"]);
const FAILURE_CONCLUSIONS = new Set(["failure", "timed_out", "startup_failure", "cancelled"]);

function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Decide whether the watchdog should dispatch a replacement worker.
 *
 * The normal handoff is dispatched by the running worker five minutes
 * before it exits. This watchdog is only a fallback for missing/stalled runs.
 */
export function evaluateWorkerRuns(runs, {
  now = Date.now(),
  activeHandoffThresholdMs = 338 * 60 * 1000,
  pendingStaleThresholdMs = 20 * 60 * 1000,
  completedGraceMs = 3 * 60 * 1000,
  fullSessionMinimumMs = 330 * 60 * 1000,
  failureRetryBaseMs = 5 * 60 * 1000,
  failureRetryMaxMs = 30 * 60 * 1000
} = {}) {
  const ordered = [...(runs || [])].sort(
    (a, b) => timestamp(b.created_at) - timestamp(a.created_at)
  );

  const pending = ordered.find(run => PENDING_STATES.has(run.status));
  if (pending) {
    const ageMs = Math.max(0, now - timestamp(pending.created_at));
    if (ageMs < pendingStaleThresholdMs) {
      return { shouldDispatch: false, reason: "A replacement worker is already queued." };
    }
    return { shouldDispatch: true, reason: "The queued replacement is stale; refreshing it." };
  }

  const active = ordered.find(run => run.status === "in_progress");
  if (active) {
    const startedAt = timestamp(active.run_started_at || active.created_at);
    const ageMs = Math.max(0, now - startedAt);
    if (ageMs < activeHandoffThresholdMs) {
      return { shouldDispatch: false, reason: "The current worker is healthy and has time remaining." };
    }
    return { shouldDispatch: true, reason: "The active worker is near its session limit and has no queued replacement." };
  }

  const latest = ordered[0];
  if (!latest) {
    return { shouldDispatch: true, reason: "No worker run exists yet; starting the first session." };
  }

  if (latest.status !== "completed") {
    return { shouldDispatch: false, reason: "The latest worker run is not in a recoverable terminal state." };
  }

  const finishedAt = timestamp(latest.updated_at || latest.completed_at);
  const finishedAgeMs = Math.max(0, now - finishedAt);
  const startedAt = timestamp(latest.run_started_at || latest.created_at);
  const durationMs = Math.max(0, finishedAt - startedAt);

  if (latest.conclusion === "success") {
    // A short successful exit is intentional for a logged-out/session-conflict
    // state or an unconfigured repository. Do not create a QR/reconnect loop.
    if (durationMs < fullSessionMinimumMs) {
      return { shouldDispatch: false, reason: "The last session ended early successfully; automatic retry is paused to avoid a reconnect loop." };
    }
    if (finishedAgeMs < completedGraceMs) {
      return { shouldDispatch: false, reason: "The previous full session just ended; allowing its successor handoff to settle." };
    }
    return { shouldDispatch: true, reason: "A full worker session ended without a successor; recovering automatically." };
  }

  if (FAILURE_CONCLUSIONS.has(latest.conclusion)) {
    let consecutiveFailures = 0;
    for (const run of ordered) {
      if (run.status !== "completed" || !FAILURE_CONCLUSIONS.has(run.conclusion)) break;
      consecutiveFailures += 1;
    }
    const exponent = Math.min(Math.max(0, consecutiveFailures - 1), 3);
    const retryDelayMs = Math.min(failureRetryMaxMs, failureRetryBaseMs * (2 ** exponent));
    if (finishedAgeMs < retryDelayMs) {
      return { shouldDispatch: false, reason: `The last worker failed; waiting ${Math.ceil((retryDelayMs - finishedAgeMs) / 60000)} more minute(s) before retrying.` };
    }
    return { shouldDispatch: true, reason: "The previous worker failed; starting an automatic recovery run." };
  }

  return { shouldDispatch: false, reason: "No automatic recovery is required for the latest run state." };
}

export async function dispatchWorkerSuccessor({
  token,
  repository,
  ref = "main",
  fetchImpl = globalThis.fetch
} = {}) {
  if (!token || !repository) {
    throw new Error("GitHub Actions token and repository are required for automatic worker handoff.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch is unavailable; cannot request the next WhatsApp worker session.");
  }

  const endpoint = `https://api.github.com/repos/${repository}/actions/workflows/${WORKER_WORKFLOW_FILE}/dispatches`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({ ref }),
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `GitHub rejected the WhatsApp worker handoff (${response.status})${detail ? `: ${detail.slice(0, 240)}` : ""}`
    );
  }

  return { queued: true };
}
