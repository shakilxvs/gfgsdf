const PRIORITY_ORDER = { urgent: 0, high: 1, low: 2, normal: 3 };

function deadlineDays(task, today) {
  if (!task?.deadline || !today) return null;
  const deadlineTime = Date.parse(`${task.deadline}T00:00:00Z`);
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(deadlineTime) || !Number.isFinite(todayTime)) return null;
  return Math.round((deadlineTime - todayTime) / 86400000);
}

function priorityRank(task) {
  return PRIORITY_ORDER[task?.priority] ?? PRIORITY_ORDER.normal;
}

function bucketFor(task, today) {
  // Completed tasks are pinned to the bottom, regardless of deadline or priority.
  if (task?.status === "done") return 4;

  const days = deadlineDays(task, today);

  // Overdue tasks and tasks due within the next two calendar days take precedence
  // over every priority level.
  if (days !== null && days <= 2) return 0;

  // A deliberately assigned priority (anything other than the Normal default)
  // takes precedence over the regular deadline ordering.
  if (task?.priority && task.priority !== "normal") return 1;

  // Remaining dated work is sorted separately from tasks without a deadline.
  if (task?.deadline) return 2;
  return 3;
}

function compareText(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function compareManual(a, b, sortMode) {
  switch (sortMode) {
    case "newest":
      return compareText(b.created_at, a.created_at);
    case "oldest":
      return compareText(a.created_at, b.created_at);
    case "updated":
      return compareText(b.updated_at, a.updated_at);
    case "deadline_latest":
      return compareText(b.deadline, a.deadline);
    case "priority":
    case "priority_high":
      return priorityRank(a) - priorityRank(b);
    case "priority_low":
      return priorityRank(b) - priorityRank(a);
    case "title_az":
      return compareText(a.title, b.title);
    case "title_za":
      return compareText(b.title, a.title);
    default:
      return 0;
  }
}

/**
 * Sort tasks using the workspace's automatic urgency rules.
 *
 * 1. Overdue / due within two days, ordered by nearest deadline.
 * 2. Explicitly prioritized tasks, ordered by priority (deadline ignored).
 * 3. Other dated unfinished tasks, furthest deadline first by default.
 * 4. Unfinished tasks without a deadline.
 * 5. Completed tasks.
 *
 * Existing manual sort choices remain available within each compatible group;
 * they never move a task across these groups or put completed work above open work.
 * The input array is never mutated.
 */
export function smartSortTasks(tasks, today, sortMode = "deadline") {
  return (Array.isArray(tasks) ? tasks : [])
    .map((task, index) => ({ task, index, bucket: bucketFor(task, today) }))
    .sort((left, right) => {
      if (left.bucket !== right.bucket) return left.bucket - right.bucket;

      const a = left.task;
      const b = right.task;

      if (left.bucket === 0) {
        // Deadline wins over priority in the two-day / overdue window.
        return compareText(a.deadline, b.deadline) || left.index - right.index;
      }

      if (left.bucket === 1) {
        // Priority wins over deadline for explicitly prioritized tasks.
        const prioritySort = compareManual(a, b, sortMode === "priority_low" ? "priority_low" : "priority_high");
        if (prioritySort) return prioritySort;
        const secondarySort = sortMode === "deadline" || sortMode === "deadline_latest"
          ? 0
          : compareManual(a, b, sortMode);
        return secondarySort || left.index - right.index;
      }

      if (left.bucket === 2 && (sortMode === "deadline" || sortMode === "deadline_latest")) {
        // The default regular-task order is furthest deadline first.
        return compareText(b.deadline, a.deadline) || left.index - right.index;
      }

      if (left.bucket === 3 && (sortMode === "deadline" || sortMode === "deadline_latest")) {
        // No-deadline work stays after dated work; show the most recently updated first.
        return compareText(b.updated_at, a.updated_at) || left.index - right.index;
      }

      if (left.bucket === 4 && (sortMode === "deadline" || sortMode === "deadline_latest")) {
        // Completed tasks remain at the bottom; most recently updated appears first.
        return compareText(b.updated_at, a.updated_at) || left.index - right.index;
      }

      return compareManual(a, b, sortMode) || left.index - right.index;
    })
    .map(item => item.task);
}
