import { hasRule } from './rules.js';

function buildVerifyStep(strengthenVerification) {
  return {
    id: 'step-3',
    action: 'verify-outcome',
    success: strengthenVerification
      ? 'The intended result is verified with explicit final checks, not assumed.'
      : 'The intended result is verified or explicitly marked unverified.',
    status: 'pending'
  };
}

function buildCommon(task, strengthenVerification) {
  return {
    taskId: task.id,
    goal: task.goal,
    constraints: task.constraints || [],
    successCriteria: task.successCriteria || [],
    verificationStrength: strengthenVerification ? 'strong' : 'normal'
  };
}

function inferPhaseHints(task) {
  const goal = (task.goal || '').toLowerCase();
  const phases = [];
  if (goal.includes('inspect') || goal.includes('check')) phases.push('inspect');
  if (goal.includes('propose') || goal.includes('fix') || goal.includes('repair')) phases.push('propose');
  if (goal.includes('verify')) phases.push('verify');
  return phases;
}

export function createPlan(task, baseDir) {
  const strengthenVerification = hasRule(baseDir, 'Implement real executor actions and final verification checks.');
  const common = buildCommon(task, strengthenVerification);
  const verifyStep = buildVerifyStep(strengthenVerification);
  const phaseHints = inferPhaseHints(task);
  const replanningHints = [];

  if (phaseHints.includes('propose')) replanningHints.push('If verification fails, specialize the propose/fix step before retrying.');
  if (phaseHints.includes('verify')) replanningHints.push('If verify remains weak, promote child verification or add explicit target checks.');
  if (task.taskType === 'environment-check') replanningHints.push('If a bundled check fails, split failed tools into child environment checks and rerun selectively.');

  let steps;

  if (task.taskType === 'command-check') {
    steps = [
      { id: 'step-1', action: 'inspect-current-state', success: 'Target command and environment are identified.', status: 'pending' },
      { id: 'step-2', action: 'run-command-check', success: 'The command runs and returns output successfully.', status: 'pending' },
      verifyStep
    ];
  } else if (task.taskType === 'file-check') {
    steps = [
      { id: 'step-1', action: 'inspect-current-state', success: 'Target file path is identified.', status: 'pending' },
      { id: 'step-2', action: 'run-file-check', success: 'The target file exists.', status: 'pending' },
      verifyStep
    ];
  } else if (task.taskType === 'directory-check') {
    steps = [
      { id: 'step-1', action: 'inspect-current-state', success: 'Target directory path is identified.', status: 'pending' },
      { id: 'step-2', action: 'run-directory-check', success: 'The target directory exists.', status: 'pending' },
      verifyStep
    ];
  } else if (task.taskType === 'config-check') {
    steps = [
      { id: 'step-1', action: 'inspect-current-state', success: 'Target config path and required keys are identified.', status: 'pending' },
      { id: 'step-2', action: 'run-config-check', success: 'The config exists and contains required keys.', status: 'pending' },
      verifyStep
    ];
  } else if (task.taskType === 'environment-check') {
    steps = [
      { id: 'step-1', action: 'inspect-current-state', success: 'Environment check list is identified.', status: 'pending' },
      { id: 'step-2', action: 'run-environment-checks', success: 'Configured commands are executed and results captured.', status: 'pending' },
      verifyStep
    ];
  } else if (task.taskType === 'safe-local-fix') {
    steps = [
      { id: 'step-1', action: 'inspect-current-state', success: 'Safe local target path is identified.', status: 'pending' },
      { id: 'step-2', action: 'apply-safe-local-fix', success: 'Safe local target exists after action.', status: 'pending' },
      verifyStep
    ];
  } else if (task.taskType === 'external-action') {
    steps = [
      { id: 'step-1', action: 'policy-check', success: 'Approval requirements are evaluated before execution.', status: 'pending' },
      { id: 'step-2', action: 'block-or-request-approval', success: 'Task is blocked or routed to approval if required.', status: 'pending' },
      verifyStep
    ];
  } else {
    steps = [
      { id: 'step-1', action: 'inspect-current-state', success: 'Current state and likely constraints are identified.', status: 'pending' },
      { id: 'step-2', action: 'propose-safe-next-step', success: 'A safe next action, likely fix, or missing dependency is identified.', status: 'pending' },
      verifyStep
    ];
  }

  return {
    ...common,
    phaseHints,
    replanningHints,
    steps
  };
}
