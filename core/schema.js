const allowedTaskTypes = new Set([
  'command-check',
  'file-check',
  'directory-check',
  'config-check',
  'environment-check',
  'safe-local-fix',
  'external-action',
  'generic-inspect'
]);

const allowedSafeActions = new Set([
  'ensure-file',
  'ensure-json-file',
  'ensure-json-key',
  'ensure-markdown-file',
  'append-markdown-bullets',
  'dedupe-markdown-bullets',
  'ensure-dir',
  'ensure-yaml-file',
  'ensure-yaml-key',
  'patch-json',
  'patch-markdown-section',
  'patch-yaml'
]);

const allowedPresets = new Set(['dev', 'obsidian', 'browser']);

export function validateTaskSchema(task) {
  const errors = [];

  if (!task.id) errors.push('Missing task id.');
  if (!task.goal) errors.push('Missing task goal.');
  if (!Array.isArray(task.successCriteria)) errors.push('successCriteria must be an array.');
  if (task.taskType && !allowedTaskTypes.has(task.taskType)) errors.push(`Unsupported taskType: ${task.taskType}`);
  if (task.taskType === 'command-check' && !task.command) errors.push('command-check requires command.');
  if (['file-check', 'directory-check', 'config-check', 'safe-local-fix'].includes(task.taskType) && !task.targetPath) {
    errors.push(`${task.taskType} requires targetPath.`);
  }
  if (task.taskType === 'config-check' && !Array.isArray(task.requiredKeys)) errors.push('config-check requires requiredKeys array.');
  if (task.taskType === 'environment-check' && !(task.preset || (Array.isArray(task.checks) && task.checks.length > 0))) {
    errors.push('environment-check requires preset or checks.');
  }
  if (task.taskType === 'environment-check' && task.preset && !allowedPresets.has(task.preset)) {
    errors.push(`Unsupported environment preset: ${task.preset}`);
  }
  if (task.taskType === 'external-action' && !task.action) errors.push('external-action requires action.');
  if (task.taskType === 'safe-local-fix' && task.action && !allowedSafeActions.has(task.action)) {
    errors.push(`Unsupported safe-local-fix action: ${task.action}`);
  }
  if (task.taskType === 'safe-local-fix' && task.action === 'patch-json' && task.patch && typeof task.patch !== 'object') {
    errors.push('patch-json requires patch object.');
  }
  if (task.taskType === 'safe-local-fix' && task.action === 'patch-yaml' && task.patch && typeof task.patch !== 'object') {
    errors.push('patch-yaml requires patch object.');
  }
  if (task.taskType === 'safe-local-fix' && task.action === 'ensure-json-key' && !task.key) {
    errors.push('ensure-json-key requires key.');
  }
  if (task.taskType === 'safe-local-fix' && task.action === 'ensure-yaml-key' && !task.key) {
    errors.push('ensure-yaml-key requires key.');
  }
  if (task.taskType === 'safe-local-fix' && task.action === 'append-markdown-bullets') {
    if (!task.sectionTitle) errors.push('append-markdown-bullets requires sectionTitle.');
    if (!Array.isArray(task.bullets)) errors.push('append-markdown-bullets requires bullets array.');
  }
  if (task.taskType === 'safe-local-fix' && task.action === 'dedupe-markdown-bullets' && !task.sectionTitle) {
    errors.push('dedupe-markdown-bullets requires sectionTitle.');
  }
  if (task.taskType === 'safe-local-fix' && task.action === 'patch-markdown-section') {
    if (!task.sectionTitle) errors.push('patch-markdown-section requires sectionTitle.');
    if (!task.sectionContent) errors.push('patch-markdown-section requires sectionContent.');
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
