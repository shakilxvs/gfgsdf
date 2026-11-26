import test from "node:test";
import assert from "node:assert/strict";
import { smartSortTasks } from "../src/taskOrdering.js";

const TODAY = "2026-11-26";

function task(id, overrides = {}) {
  return {
    id,
    title: id,
    status: "todo",
    priority: "normal",
    deadline: null,
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
    ...overrides
  };
}

test("puts overdue and tasks due within two days first, regardless of priority", () => {
  const tasks = [
    task("urgent-next-week", { priority: "urgent", deadline: "2026-12-04" }),
    task("due-in-two-days", { deadline: "2026-11-28" }),
    task("due-today-low", { priority: "low", deadline: "2026-11-26" }),
    task("overdue", { deadline: "2026-11-24" }),
    task("due-tomorrow-urgent", { priority: "urgent", deadline: "2026-11-27" })
  ];

  assert.deepEqual(
    smartSortTasks(tasks, TODAY).map(item => item.id),
    ["overdue", "due-today-low", "due-tomorrow-urgent", "due-in-two-days", "urgent-next-week"]
  );
});

test("puts explicitly prioritized tasks ahead of regular tasks and ignores their deadlines", () => {
  const tasks = [
    task("normal-far", { deadline: "2026-12-20" }),
    task("low-priority", { priority: "low", deadline: "2026-12-10" }),
    task("high-no-deadline", { priority: "high" }),
    task("urgent-far", { priority: "urgent", deadline: "2027-01-20" }),
    task("normal-near-future", { deadline: "2026-12-05" })
  ];

  assert.deepEqual(
    smartSortTasks(tasks, TODAY).map(item => item.id),
    ["urgent-far", "high-no-deadline", "low-priority", "normal-far", "normal-near-future"]
  );
});

test("sorts regular dated unfinished tasks by latest deadline first", () => {
  const tasks = [
    task("december-10", { deadline: "2026-12-10" }),
    task("december-20", { deadline: "2026-12-20" }),
    task("december-15", { deadline: "2026-12-15" })
  ];

  assert.deepEqual(
    smartSortTasks(tasks, TODAY).map(item => item.id),
    ["december-20", "december-15", "december-10"]
  );
});

test("places no-deadline unfinished tasks after dated tasks and completed tasks last", () => {
  const tasks = [
    task("done-urgent-tomorrow", { status: "done", priority: "urgent", deadline: "2026-11-27" }),
    task("normal-no-deadline"),
    task("normal-dated", { deadline: "2026-12-20" }),
    task("done-no-deadline", { status: "done" })
  ];

  assert.deepEqual(
    smartSortTasks(tasks, TODAY).map(item => item.id),
    ["normal-dated", "normal-no-deadline", "done-urgent-tomorrow", "done-no-deadline"]
  );
});

test("supports existing manual sorting within the smart groups without moving tasks between groups", () => {
  const tasks = [
    task("priority-z", { priority: "high", title: "Z task" }),
    task("priority-a", { priority: "high", title: "A task" }),
    task("normal-z", { deadline: "2026-12-10", title: "Z task" }),
    task("normal-a", { deadline: "2026-12-20", title: "A task" }),
    task("done-a", { status: "done", title: "A task" })
  ];

  assert.deepEqual(
    smartSortTasks(tasks, TODAY, "title_az").map(item => item.id),
    ["priority-a", "priority-z", "normal-a", "normal-z", "done-a"]
  );
});

test("does not mutate the input array", () => {
  const tasks = [
    task("later", { deadline: "2026-12-20" }),
    task("sooner", { deadline: "2026-12-10" })
  ];
  const originalIds = tasks.map(item => item.id);

  smartSortTasks(tasks, TODAY);

  assert.deepEqual(tasks.map(item => item.id), originalIds);
});
