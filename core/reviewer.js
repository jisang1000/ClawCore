export function reviewRun(task, verification, { schema = { ok: true, errors: [] }, decomposition = { decomposed: false, subtasks: [] }, approvalState = { status: 'missing' }, subtaskAggregation = { total: 0, done: 0, blocked: 0, needsFollowup: 0 } } = {}) {
  const blockers = [];

  if (!schema.ok) blockers.push(`Task schema invalid: ${schema.errors.join(' ')}`);
  if (approvalState.status === 'expired') blockers.push('Approval request expired before execution.');
  if (approvalState.status === 'rejected') blockers.push('Approval request was rejected.');
  if (subtaskAggregation.total > 0 && subtaskAggregation.done < subtaskAggregation.total) blockers.push('Not all generated subtasks reached done status.');
  if (verification.unverified.length > 0) blockers.push('Real execution and final verification are not fully implemented yet.');

  const allChildrenDone = subtaskAggregation.total > 0 && subtaskAggregation.done === subtaskAggregation.total;
  const childVerifyDone = subtaskAggregation.details?.some((d) => d.subtaskKind === 'verify' && d.status === 'done');
  const canPromoteParent = allChildrenDone && childVerifyDone && verification.unverified.length <= 1;

  const nextSteps = [];
  if (!schema.ok) nextSteps.push('Fix task schema and rerun.');
  if (approvalState.status === 'expired') nextSteps.push('Request approval again before rerunning the task.');
  if (approvalState.status === 'rejected') nextSteps.push('Re-request approval or change task scope before rerunning.');
  if (subtaskAggregation.total > 0 && subtaskAggregation.done < subtaskAggregation.total) nextSteps.push('Review child task results and rerun incomplete subtasks.');
  if (verification.unverified.length > 0 && !canPromoteParent) nextSteps.push('Implement real executor actions and final verification checks.');
  if (decomposition.decomposed) nextSteps.push(`Consider subtask flow: ${decomposition.subtasks.map((s) => s.kind).join(' -> ')}`);

  return {
    taskId: task.id,
    review: blockers.length === 0 || canPromoteParent ? 'ready' : 'needs_followup',
    blockers: canPromoteParent ? blockers.filter((b) => b !== 'Real execution and final verification are not fully implemented yet.') : blockers,
    nextStep: blockers.length === 0 || canPromoteParent ? 'Proceed to a real tool-integrated implementation.' : nextSteps.join(' ')
  };
}
