import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.resolve(__dirname, '..');
const approvalsDir = path.join(baseDir, 'tasks', 'reports', 'approvals');

function normalizeApproval(payload) {
  payload.history = Array.isArray(payload.history) ? payload.history : [];
  if (payload.createdAt && !payload.history.find((h) => h.event === 'requested')) {
    payload.history.unshift({ at: payload.createdAt, event: 'requested', reason: payload.reason || null });
  }
  if (payload.resolvedAt && payload.status === 'approved' && !payload.history.find((h) => h.event === 'approved')) {
    payload.history.push({ at: payload.resolvedAt, event: 'approved', decisionReason: payload.decisionReason || null });
  }
  if (payload.resolvedAt && payload.status === 'rejected' && !payload.history.find((h) => h.event === 'rejected')) {
    payload.history.push({ at: payload.resolvedAt, event: 'rejected', decisionReason: payload.decisionReason || null });
  }
  if (payload.expiredAt && !payload.history.find((h) => h.event === 'expired')) {
    payload.history.push({ at: payload.expiredAt, event: 'expired' });
  }
  payload.requestCount = payload.requestCount || 1;
  return payload;
}

const files = fs.existsSync(approvalsDir)
  ? fs.readdirSync(approvalsDir).filter((f) => f.endsWith('.json') && f !== 'audit.jsonl')
  : [];

const updated = [];
for (const file of files) {
  const full = path.join(approvalsDir, file);
  const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
  const normalized = normalizeApproval(payload);
  fs.writeFileSync(full, JSON.stringify(normalized, null, 2), 'utf8');
  updated.push(file);
}

console.log(JSON.stringify({ ok: true, updatedCount: updated.length, updated }, null, 2));
