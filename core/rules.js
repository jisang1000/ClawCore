import fs from 'fs';
import path from 'path';

export function adoptCandidateRule(baseDir, ruleText) {
  const candidatePath = path.join(baseDir, 'sandbox', 'candidate-rules', 'candidates.json');
  const adoptedPath = path.join(baseDir, 'memory', 'self-improving', 'adopted-rules.json');

  if (!fs.existsSync(candidatePath)) return { ok: false, reason: 'candidate rules file not found' };

  const candidates = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  const match = candidates.find((c) => c.rule === ruleText);
  if (!match) return { ok: false, reason: 'candidate rule not found' };

  let adopted = [];
  if (fs.existsSync(adoptedPath)) adopted = JSON.parse(fs.readFileSync(adoptedPath, 'utf8'));

  if (!adopted.find((r) => r.rule === ruleText)) {
    adopted.push({ rule: ruleText, adoptedAt: new Date().toISOString(), sourceCount: match.count });
    fs.mkdirSync(path.dirname(adoptedPath), { recursive: true });
    fs.writeFileSync(adoptedPath, JSON.stringify(adopted, null, 2), 'utf8');
  }

  return { ok: true, adoptedPath, rule: ruleText };
}

export function loadAdoptedRules(baseDir) {
  const adoptedPath = path.join(baseDir, 'memory', 'self-improving', 'adopted-rules.json');
  if (!fs.existsSync(adoptedPath)) return [];
  return JSON.parse(fs.readFileSync(adoptedPath, 'utf8'));
}

export function hasRule(baseDir, ruleText) {
  return loadAdoptedRules(baseDir).some((r) => r.rule === ruleText);
}
