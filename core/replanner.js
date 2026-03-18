export function buildReplan(task, { verification = null, review = null, orchestration = null, subtaskAggregation = null } = {}) {
  const actions = [];

  if (review?.review === 'needs_followup') {
    if (subtaskAggregation?.needsFollowup > 0) actions.push('refresh-or-rerun-incomplete-child-tasks');
    if (verification?.unverified?.length > 0) actions.push('strengthen-verification-or-specialize-executor');
    if (orchestration?.nextStrategyOnFailure?.length) actions.push(...orchestration.nextStrategyOnFailure);
  }

  return {
    taskId: task.id,
    required: actions.length > 0,
    actions: [...new Set(actions)]
  };
}
