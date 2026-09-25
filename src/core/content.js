// ============================================================
// 内容数据层（数据驱动，策划改这里不影响逻辑）
// MVP 仅含最小可运行闭环所需内容，后续扩展按架构挂载点追加
// ============================================================

export const CONFIG = {
  scavengeSeconds: 60,     // 搜刮阶段总时长（真实秒）
  rescueAfterDay: 6,      // 第 6 天起强制出现"军方救援"事件（确保合理游玩可通关）
  dailyFood: 1,           // 每名存活成员每日消耗食物
  dailyWater: 1,          // 每名存活成员每日消耗水
  mentalDecay: 6,         // 每日基础精神衰减
  starveHealth: 15,       // 缺食物扣血
  thirstHealth: 10,       // 缺水扣血
};

// 家庭成员（搜刮阶段需被"救出"才会进入避难所）
export const FAMILY = [
  { id: 'ted', name: 'Ted' },
  { id: 'dolores', name: 'Dolores' },
  { id: 'maryjane', name: 'Mary Jane' },
  { id: 'timmy', name: 'Timmy' },
];

// 物资分类（搜刮节点与事件效果都用分类键，保持一致）
export const CATEGORIES = {
  food:    { name: '食物', icon: '🥫' },
  water:   { name: '饮水', icon: '💧' },
  medical: { name: '医疗', icon: '🩹' },
  tool:    { name: '工具', icon: '🛠️' },
  fun:     { name: '娱乐', icon: '🎲' },
};
export const CAT_KEYS = Object.keys(CATEGORIES);

// 事件池：effect 通过对存活成员作用（health/mental 为全体增量）
// inv 为分类库存增量；outcome 可直接判定胜负；flags 记录选择记忆
export const EVENTS = [
  {
    id: 'knock',
    title: '门外有动静',
    text: '有人敲门。是邻居，还是劫掠者？',
    options: [
      { label: '开门交易：给食物，换医疗包', effect: { inv: { food: -2, medical: 1 }, mental: -3 } },
      { label: '紧闭门窗，谁也不信', effect: { mental: -8 } },
    ],
  },
  {
    id: 'sick',
    title: '家人病了',
    text: '一名家人发烧，需要药品。',
    options: [
      { label: '用医疗包治疗', effect: { inv: { medical: -1 }, health: 20 } },
      { label: '硬扛过去', effect: { health: -15 } },
    ],
  },
  {
    id: 'roach',
    title: '变异蟑螂来袭',
    text: '避难所里爬满了变异蟑螂！',
    options: [
      { label: '用娱乐品砸（消耗娱乐）', effect: { inv: { fun: -1 }, mental: 5 } },
      { label: '任其横行', effect: { mental: -10, health: -5 } },
    ],
  },
  {
    id: 'radio',
    title: '收音机杂音',
    text: '收音机传来断断续续的军方信号。',
    options: [
      { label: '仔细调频收听', effect: { mental: 5, flags: { radio: true } } },
      { label: '关掉，省点精神', effect: { mental: -3 } },
    ],
  },
  {
    id: 'argue',
    title: '家庭成员争执',
    text: '长期封闭让气氛紧张。',
    options: [
      { label: '讲个笑话缓和（消耗娱乐）', effect: { inv: { fun: -1 }, mental: 8 } },
      { label: '各执己见', effect: { mental: -10 } },
    ],
  },
  {
    id: 'leak',
    title: '水管渗漏',
    text: '储水正在悄悄减少。',
    options: [
      { label: '用工具修补（消耗工具）', effect: { inv: { tool: -1, water: 1 } } },
      { label: '将就着用', effect: { water: -1, mental: -3 } },
    ],
  },
  {
    id: 'rescue',
    title: '军方救援信号',
    text: '广播要求幸存者回应信号！这是离开废土的机会。',
    options: [
      { label: '回应信号，请求救援', effect: { outcome: 'win' } },
      { label: '保持静默（怕是陷阱）', effect: { mental: -6 } },
    ],
  },
];

export function getEvent(id) {
  return EVENTS.find((e) => e.id === id);
}
