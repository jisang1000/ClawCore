export function buildReportMeta(task, { approvalState = null, externalActionSummary = null } = {}) {
  return {
    schemaVersion: '0.2.0',
    generatedAt: new Date().toISOString(),
    taskId: task.id,
    taskType: task.taskType || null,
    hasApprovalState: !!approvalState?.exists,
    hasExternalSummary: !!externalActionSummary
  };
}
