import fs from 'fs';
import path from 'path';

export function loadPolicies(baseDir) {
  const policyDir = path.join(baseDir, 'policy');
  const files = ['safety-policy.yaml', 'approval-policy.yaml', 'self-modification-policy.yaml'];
  return files.map((name) => ({
    name,
    path: path.join(policyDir, name),
    exists: fs.existsSync(path.join(policyDir, name))
  }));
}

export function evaluateApproval(task) {
  const approvalRequiredTypes = new Set(['external-action']);
  const required = approvalRequiredTypes.has(task.taskType);
  const approved = task.approved === true;
  return {
    taskId: task.id,
    approvalRequired: required,
    allowedToExecute: required ? approved : true,
    reason: required
      ? approved
        ? 'Task type normally requires approval, and approval is now present.'
        : 'Task type requires approval before any external action.'
      : 'No additional approval required for this task type.'
  };
}
