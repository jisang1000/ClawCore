import { loadAdoptedRules } from './rules.js';

function inferGoalSignals(task) {
  const goal = (task.goal || '').toLowerCase();
  return {
    wantsInspect: goal.includes('inspect') || goal.includes('check') || goal.includes('verify'),
    wantsPropose: goal.includes('propose') || goal.includes('fix') || goal.includes('repair'),
    wantsEnvironment: goal.includes('environment') || task.taskType === 'environment-check',
    wantsDecomposition: goal.includes('inspect') && goal.includes('verify'),
    wantsExternal: task.taskType === 'external-action'
  };
}

export function orchestrate(task, baseDir) {
  const priority = task.priority || 'medium';
  const riskLevel = task.riskLevel || 'medium';
  const adoptedRules = loadAdoptedRules(baseDir);
  const hasVerificationRule = adoptedRules.some((r) => r.rule === 'Implement real executor actions and final verification checks.');
  const signals = inferGoalSignals(task);

  let strategy = 'single-agent';
  let parallelizable = false;
  let pauseRecommended = false;
  let reason = 'Default orchestration for the current scaffold.';
  const guidance = [];
  const nextStrategyOnFailure = [];

  if (riskLevel === 'high' && signals.wantsExternal) {
    strategy = 'guarded-execution';
    pauseRecommended = true;
    reason = 'High-risk external action should remain gated and carefully reviewed.';
    nextStrategyOnFailure.push('approval-rerequest', 'narrow-scope');
  } else if (signals.wantsEnvironment) {
    strategy = 'decompose-and-verify';
    parallelizable = true;
    reason = 'Environment work benefits from decomposed checks and explicit verification.';
    nextStrategyOnFailure.push('refresh-generated-subtasks', 're-run-environment-checks');
  } else if (task.taskType === 'safe-local-fix') {
    strategy = 'single-agent-safe-fix';
    reason = 'Safe local fix is suitable for direct bounded execution.';
    nextStrategyOnFailure.push('verify-target-state', 'apply-smaller-fix');
  } else if (signals.wantsDecomposition) {
    strategy = 'goal-decomposition';
    reason = 'This task explicitly mixes inspect/propose/verify phases and should use child-task orchestration.';
    nextStrategyOnFailure.push('refresh-generated-subtasks', 'specialize-child-actions');
  } else if (priority === 'high' && ['command-check', 'file-check', 'directory-check'].includes(task.taskType)) {
    strategy = 'priority-single-agent';
    reason = 'High-priority low-risk inspection task can run immediately.';
    nextStrategyOnFailure.push('retry-with-stronger-verification');
  }

  if (hasVerificationRule) guidance.push('Use stronger final verification before considering a task complete.');
  if (signals.wantsPropose && strategy !== 'single-agent-safe-fix') guidance.push('Preserve a concrete propose/fix step instead of treating the task as inspection only.');
  if (signals.wantsDecomposition) guidance.push('Prefer parent-child execution with explicit child aggregation.');

  return {
    taskId: task.id,
    strategy,
    parallelizable,
    pauseRecommended,
    reason,
    guidance,
    adoptedRuleCount: adoptedRules.length,
    goalSignals: signals,
    nextStrategyOnFailure
  };
}
