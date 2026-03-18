export function recommendTaskShape(task) {
  const goal = `${task.goal || ''} ${(task.constraints || []).join(' ')} ${task.targetPath || ''}`.toLowerCase();

  if (!task.taskType) {
    if (goal.includes('inspect') && goal.includes('verify')) {
      task.taskType = 'generic-inspect';
    } else if (goal.includes('directory') || goal.includes('폴더') || goal.includes('디렉토리')) {
      task.taskType = 'directory-check';
    } else if ((goal.includes('markdown') || goal.includes('.md') || goal.includes('section') || goal.includes('섹션')) && !(goal.includes('inspect') && goal.includes('verify'))) {
      task.taskType = 'safe-local-fix';
      if (!task.action) task.action = 'patch-markdown-section';
    } else if (goal.includes('yaml') || goal.includes('.yaml') || goal.includes('.yml')) {
      task.taskType = goal.includes('check') || goal.includes('verify') || goal.includes('확인')
        ? 'file-check'
        : 'safe-local-fix';
      if (task.taskType === 'safe-local-fix' && !task.action) task.action = 'patch-yaml';
    } else if (goal.includes('json') || goal.includes('config')) {
      task.taskType = goal.includes('check') || goal.includes('verify') || goal.includes('확인')
        ? 'config-check'
        : 'safe-local-fix';
      if (task.taskType === 'safe-local-fix' && !task.action) task.action = 'patch-json';
    } else if (goal.includes('environment') || goal.includes('tool') || goal.includes('version') || goal.includes('설치') || goal.includes('환경') || goal.includes('preset')) {
      task.taskType = 'environment-check';
    } else if (goal.includes('file') || goal.includes('파일') || goal.includes('note')) {
      task.taskType = 'file-check';
    } else if (goal.includes('command') || goal.includes('node') || goal.includes('python') || goal.includes('git') || goal.includes('tmux')) {
      task.taskType = 'command-check';
    } else {
      task.taskType = 'generic-inspect';
    }
  }

  if (task.taskType === 'safe-local-fix' && !task.action) {
    if ((task.targetPath || '').endsWith('.md')) task.action = 'patch-markdown-section';
    else if ((task.targetPath || '').endsWith('.yaml') || (task.targetPath || '').endsWith('.yml')) task.action = 'patch-yaml';
    else if ((task.targetPath || '').endsWith('.json')) task.action = 'patch-json';
  }

  task.recommendation = {
    recommendedTaskType: task.taskType,
    confidence: task.taskType === 'generic-inspect' ? 'low' : 'medium',
    reason: `Recommended from goal text: ${task.goal || 'no goal provided'}`,
    recommendedAction: task.action || null
  };

  return task;
}
