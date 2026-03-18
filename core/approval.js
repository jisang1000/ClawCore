import fs from 'fs';
import path from 'path';

function appendApprovalAudit(baseDir, event) {
  const dir = path.join(baseDir, 'tasks', 'reports', 'approvals');
  fs.mkdirSync(dir, { recursive: true });
  const auditPath = path.join(dir, 'audit.jsonl');
  fs.appendFileSync(auditPath, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, 'utf8');
  return auditPath;
}

export function createApprovalRequest(baseDir, task, approval) {
  const dir = path.join(baseDir, 'tasks', 'reports', 'approvals');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${task.id}.approval.json`);
  const now = Date.now();
  const expiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    taskId: task.id,
    goal: task.goal,
    taskType: task.taskType,
    priority: task.priority || 'medium',
    riskLevel: task.riskLevel || 'medium',
    approvalRequired: approval.approvalRequired,
    allowedToExecute: approval.allowedToExecute,
    reason: approval.reason,
    status: 'pending-human-approval',
    createdAt: new Date(now).toISOString(),
    expiresAt,
    decisionReason: null,
    requestCount: 1,
    history: [
      { at: new Date(now).toISOString(), event: 'requested', reason: approval.reason }
    ]
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  const auditPath = appendApprovalAudit(baseDir, { taskId: task.id, event: 'requested', status: 'pending-human-approval', reason: approval.reason });
  return { filePath, auditPath };
}

export function getApprovalState(baseDir, taskId) {
  const filePath = path.join(baseDir, 'tasks', 'reports', 'approvals', `${taskId}.approval.json`);
  if (!fs.existsSync(filePath)) return { exists: false, status: 'missing', expired: false, filePath };
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const expired = payload.status === 'pending-human-approval' && payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now();
  if (expired) {
    payload.status = 'expired';
    payload.expiredAt = new Date().toISOString();
    payload.history = payload.history || [];
    payload.history.push({ at: payload.expiredAt, event: 'expired' });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    appendApprovalAudit(baseDir, { taskId, event: 'expired', status: 'expired' });
  }
  return { exists: true, status: expired ? 'expired' : payload.status, expired, filePath, payload };
}

export function resolveApproval(baseDir, taskId, approved, decisionReason = null) {
  const filePath = path.join(baseDir, 'tasks', 'reports', 'approvals', `${taskId}.approval.json`);
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: 'approval request file not found' };
  }
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  payload.status = approved ? 'approved' : 'rejected';
  payload.resolvedAt = new Date().toISOString();
  payload.decisionReason = decisionReason;
  payload.history = payload.history || [];
  payload.history.push({ at: payload.resolvedAt, event: approved ? 'approved' : 'rejected', decisionReason });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  const auditPath = appendApprovalAudit(baseDir, { taskId, event: approved ? 'approved' : 'rejected', status: payload.status, decisionReason });
  return { ok: true, filePath, auditPath, status: payload.status, decisionReason };
}

export function rerequestApproval(baseDir, taskId, reason = null) {
  const filePath = path.join(baseDir, 'tasks', 'reports', 'approvals', `${taskId}.approval.json`);
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: 'approval request file not found' };
  }
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  payload.status = 'pending-human-approval';
  payload.createdAt = new Date().toISOString();
  payload.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  payload.rerequestedAt = new Date().toISOString();
  payload.requestCount = (payload.requestCount || 1) + 1;
  payload.decisionReason = reason;
  payload.history = payload.history || [];
  payload.history.push({ at: payload.rerequestedAt, event: 'rerequested', reason });
  delete payload.resolvedAt;
  delete payload.expiredAt;
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  const auditPath = appendApprovalAudit(baseDir, { taskId, event: 'rerequested', status: payload.status, reason, requestCount: payload.requestCount });
  return { ok: true, filePath, auditPath, status: payload.status, requestCount: payload.requestCount };
}

export function summarizeApprovalAudit(baseDir) {
  const auditPath = path.join(baseDir, 'tasks', 'reports', 'approvals', 'audit.jsonl');
  if (!fs.existsSync(auditPath)) return { ok: true, auditPath, totalEvents: 0, byEvent: {} };
  const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
  const events = lines.map((line) => JSON.parse(line));
  const byEvent = events.reduce((acc, event) => {
    acc[event.event] = (acc[event.event] || 0) + 1;
    return acc;
  }, {});
  return { ok: true, auditPath, totalEvents: events.length, byEvent };
}
