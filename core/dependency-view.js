export function buildDependencyView(task, decomposition, subtaskAggregation) {
  if (!decomposition?.decomposed) {
    return {
      taskId: task.id,
      hasChildren: false,
      parentStatus: task.status || null,
      childKinds: [],
      childStatusSummary: {}
    };
  }

  const childStatusSummary = (subtaskAggregation?.details || []).reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return {
    taskId: task.id,
    hasChildren: true,
    parentStatus: task.status || null,
    childKinds: decomposition.subtasks.map((s) => s.kind),
    childStatusSummary,
    verifyChildDone: !!(subtaskAggregation?.details || []).find((d) => d.subtaskKind === 'verify' && d.status === 'done')
  };
}

export function summarizeChildren(subtaskAggregation) {
  const details = subtaskAggregation?.details || [];
  return {
    total: details.length,
    done: details.filter((d) => d.status === 'done').length,
    blocked: details.filter((d) => d.status === 'blocked' || d.status === 'permanent-blocked').length,
    needsFollowup: details.filter((d) => d.status === 'needs_followup' || d.status === 'pending-retry').length,
    successfulKinds: details.filter((d) => d.status === 'done').map((d) => d.subtaskKind),
    incompleteKinds: details.filter((d) => d.status !== 'done').map((d) => d.subtaskKind)
  };
}
