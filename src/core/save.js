// 存档层：本地成绩持久化（localStorage），Node 环境下安全降级
const KEY = 'sixty_best_v1';

export function loadBest() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const v = localStorage.getItem(KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export function saveBest(record) {
  try {
    if (typeof localStorage === 'undefined') return;
    const prev = loadBest();
    const best = !prev || record.score > prev.score ? record : prev;
    localStorage.setItem(KEY, JSON.stringify(best));
  } catch {
    /* 忽略隐私模式等写入失败 */
  }
}
