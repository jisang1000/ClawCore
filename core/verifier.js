export function verifyExecution(task, executedSteps, { dryRun = false, approval = null, subtaskAggregation = { total: 0, done: 0, blocked: 0, needsFollowup: 0, details: [] } } = {}) {
  const verified = [];
  const unverified = [];
  const step1 = executedSteps.find((s) => s.id === 'step-1');
  const step2 = executedSteps.find((s) => s.id === 'step-2');
  const step3 = executedSteps.find((s) => s.id === 'step-3');

  if (step1 && ['complete', 'simulated-complete'].includes(step1.status)) verified.push('Initial task inspection completed.');

  if (dryRun) {
    unverified.push('Final real-world outcome not verified because this was a dry run.');
    return { taskId: task.id, outcome: 'dry_run', verified, unverified };
  }

  if (approval?.approvalRequired && !approval?.allowedToExecute) {
    verified.push('Approval gate triggered correctly before execution.');
    unverified.push('Task outcome remains unverified because execution was blocked pending approval.');
    return { taskId: task.id, outcome: 'blocked_pending_approval', verified, unverified };
  }

  const complete2 = step2?.status === 'complete';
  const complete3 = step3?.status === 'complete';

  if (task.taskType === 'command-check') {
    if (complete2) verified.push(`Command check succeeded: ${task.command}`); else unverified.push(`Command check failed: ${task.command}`);
    if (complete3) verified.push('Final outcome verification completed.'); else unverified.push('Final outcome could not be confirmed.');
  } else if (task.taskType === 'file-check') {
    if (complete2) verified.push(`File check succeeded: ${task.targetPath}`); else unverified.push(`File check failed: ${task.targetPath}`);
    if (complete3) verified.push('File existence verification completed.'); else unverified.push('Final file verification could not be confirmed.');
  } else if (task.taskType === 'directory-check') {
    if (complete2) verified.push(`Directory check succeeded: ${task.targetPath}`); else unverified.push(`Directory check failed: ${task.targetPath}`);
    if (complete3) verified.push('Directory existence verification completed.'); else unverified.push('Final directory verification could not be confirmed.');
  } else if (task.taskType === 'safe-local-fix') {
    if (complete2) verified.push(`Safe local fix succeeded: ${task.targetPath}`); else unverified.push(`Safe local fix failed: ${task.targetPath}`);
    if (complete3) verified.push('Safe local fix verification completed.'); else unverified.push('Final local fix verification could not be confirmed.');
  } else if (task.taskType === 'external-action' && task.mockOnly === true) {
    if (complete2) verified.push('Mock external action completed safely.'); else unverified.push('Mock external action did not complete.');
    if (complete3) verified.push('Mock external action verification completed.'); else unverified.push('Final mock external verification could not be confirmed.');
  } else if (task.taskType === 'config-check') {
    if (complete2) verified.push(`Config check succeeded: ${task.targetPath}`); else unverified.push(`Config check failed: ${task.targetPath}`);
    if (complete3) verified.push('Config verification completed.'); else unverified.push('Final config verification could not be confirmed.');
  } else if (task.taskType === 'environment-check') {
    if (complete2) verified.push('Environment bundle check succeeded.'); else unverified.push('One or more environment checks failed.');
    if (complete3) verified.push('Environment verification completed.'); else unverified.push('Final environment verification could not be confirmed.');
  } else {
    if (complete2) verified.push('Fallback executor produced a safe next-step recommendation.');
    unverified.push('Concrete real-world outcome still requires a more specific task type or executor.');
  }

  const allChildrenDone = subtaskAggregation.total > 0 && subtaskAggregation.done === subtaskAggregation.total;
  const verifyChildDone = subtaskAggregation.details?.some((d) => d.subtaskKind === 'verify' && d.status === 'done' && d.outcome === 'success');
  if (allChildrenDone && verifyChildDone) {
    verified.push('All generated subtasks completed successfully, including verify subtask.');
    const filtered = unverified.filter((item) => item !== 'Concrete real-world outcome still requires a more specific task type or executor.');
    return {
      taskId: task.id,
      outcome: filtered.length === 0 ? 'success' : 'partial_success',
      verified,
      unverified: filtered
    };
  }

  return { taskId: task.id, outcome: unverified.length === 0 ? 'success' : 'partial_success', verified, unverified };
}
