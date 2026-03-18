import fs from 'fs';
import path from 'path';

export function buildExternalActionSummary(baseDir, task, approvalState) {
  if (task.taskType !== 'external-action') return null;

  const mockPath = path.join(baseDir, 'tasks', 'reports', 'mock-external', `${task.id}.mock.json`);
  const mockResult = fs.existsSync(mockPath) ? JSON.parse(fs.readFileSync(mockPath, 'utf8')) : null;

  return {
    taskId: task.id,
    action: task.action || null,
    target: task.target || null,
    approvalStatus: approvalState?.status || 'missing',
    approvalHistoryCount: Array.isArray(approvalState?.payload?.history) ? approvalState.payload.history.length : 0,
    mockResult: mockResult
      ? {
          simulated: mockResult.simulated === true,
          executed: mockResult.executed === true,
          createdAt: mockResult.createdAt,
          target: mockResult.target,
          action: mockResult.action
        }
      : null,
    outcomeLabel: mockResult
      ? (mockResult.simulated ? 'simulated-external-action' : 'executed-external-action')
      : 'no-external-result'
  };
}
