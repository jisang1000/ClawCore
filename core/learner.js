import fs from 'fs';
import path from 'path';

function classifyLesson(review) {
  if (review.review === 'ready') return 'success-pattern';
  if ((review.blockers || []).length > 0) return 'blocker';
  return 'general';
}

export function logLesson(task, review, baseDir) {
  const lessonDir = path.join(baseDir, 'memory', 'self-improving');
  fs.mkdirSync(lessonDir, { recursive: true });
  const lessonPath = path.join(lessonDir, 'lessons.md');
  const kind = classifyLesson(review);
  const line = `- ${new Date().toISOString()} | ${task.id} | ${kind} | ${review.review} | ${review.nextStep}\n`;
  fs.appendFileSync(lessonPath, line, 'utf8');

  const candidatePath = path.join(baseDir, 'sandbox', 'candidate-rules', 'candidates.json');
  let candidates = [];
  if (fs.existsSync(candidatePath)) {
    candidates = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  }

  if (kind === 'blocker') {
    const key = review.nextStep;
    const existing = candidates.find((c) => c.rule === key);
    if (existing) {
      existing.count += 1;
      existing.lastSeenTask = task.id;
      existing.updatedAt = new Date().toISOString();
    } else {
      candidates.push({
        rule: key,
        kind: 'candidate-rule',
        count: 1,
        lastSeenTask: task.id,
        updatedAt: new Date().toISOString()
      });
    }
    fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
    fs.writeFileSync(candidatePath, JSON.stringify(candidates, null, 2), 'utf8');
  }

  return lessonPath;
}
