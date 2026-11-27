import {
  dispatchWorkerSuccessor,
  evaluateWorkerRuns,
  WORKER_WORKFLOW_FILE
} from "./handoff.js";

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;

if (!token || !repository) {
  throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required for the WhatsApp watchdog.");
}

const endpoint = `https://api.github.com/repos/${repository}/actions/workflows/${WORKER_WORKFLOW_FILE}/runs?per_page=30`;
const response = await fetch(endpoint, {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  }
});

if (!response.ok) {
  throw new Error(`Could not inspect WhatsApp worker runs (${response.status}).`);
}

const payload = await response.json();
const runs = Array.isArray(payload.workflow_runs) ? payload.workflow_runs : [];
const decision = evaluateWorkerRuns(runs);

if (!decision.shouldDispatch) {
  console.log(`WhatsApp watchdog: no action. ${decision.reason}`);
} else {
  await dispatchWorkerSuccessor({ token, repository, ref: "main" });
  console.log(`WhatsApp watchdog: replacement requested. ${decision.reason}`);
}
