const retryableStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * POST a JSON payload to an authenticated TaskXVS internal endpoint.
 * Retries network failures, timeouts, rate limits, and server errors only.
 * Authentication/validation errors fail immediately so they are visible.
 */
export async function postTaskXvsInternal({
  baseUrl,
  path,
  token,
  payload = {},
  maxAttempts = 3,
  timeoutMs = 15000,
  retryDelayMs = 1000,
  fetchImpl = globalThis.fetch,
  sleepImpl = wait
}) {
  if (!baseUrl || !path) throw new Error("TaskXVS internal endpoint URL is not configured.");
  if (!token) throw new Error("TaskXVS internal scheduler token is not configured.");
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable in this worker runtime.");

  const endpoint = new URL(path, baseUrl.endsWith("/") ? baseUrl : baseUrl + "/").toString();
  const attempts = Math.max(1, Math.min(5, Number(maxAttempts) || 1));
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-taskxvs-scheduler-token": token
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (response.ok) {
        return await response.json().catch(() => ({}));
      }

      const detail = await response.text().catch(() => "");
      lastError = new Error(
        `TaskXVS internal endpoint returned ${response.status}${detail ? ": " + detail.slice(0, 250) : ""}`
      );

      if (!retryableStatuses.has(response.status)) {
        Object.assign(lastError, { retryable: false, status: response.status });
        throw lastError;
      }
    } catch (error) {
      if (error?.retryable === false) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < attempts) {
      await sleepImpl(retryDelayMs * attempt);
    }
  }

  throw lastError || new Error("TaskXVS internal request failed.");
}
