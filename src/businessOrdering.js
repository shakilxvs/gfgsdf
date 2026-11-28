/**
 * Move one business before another without mutating the current workspace order.
 * Both the top workspace tabs and sidebar consume the same businesses array,
 * so one reorder operation updates both surfaces together.
 */
export function moveBusinessInOrder(businesses, sourceId, targetId) {
  if (!Array.isArray(businesses) || !sourceId || !targetId || sourceId === targetId) {
    return Array.isArray(businesses) ? [...businesses] : [];
  }

  const sourceIndex = businesses.findIndex(business => String(business.id) === String(sourceId));
  const targetIndex = businesses.findIndex(business => String(business.id) === String(targetId));
  if (sourceIndex < 0 || targetIndex < 0) return [...businesses];

  const next = [...businesses];
  const [moved] = next.splice(sourceIndex, 1);
  const insertionIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  next.splice(insertionIndex, 0, moved);
  return next;
}
