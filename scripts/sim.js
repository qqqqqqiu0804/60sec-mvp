// Node 端逻辑闭环验证（不依赖浏览器）
// 运行: node scripts/sim.js
import { Game } from '../src/core/game.js';
import { CAT_KEYS, FAMILY } from '../src/core/content.js';
import { mulberry32 } from '../src/core/rng.js';

function assert(cond, msg) {
  if (!cond) throw new Error('断言失败: ' + msg);
  console.log('  ✓ ' + msg);
}

// ---------- 模拟一：充足资源 + 理性选择 → 应触发救援胜利 ----------
console.log('\n[模拟A] 资源充足 + 理性抉择 → 预期 WIN');
{
  const g = new Game(mulberry32(12345));
  g.start('survive');
  // 搜刮阶段：救出全家 + 大量物资
  for (const f of FAMILY) g.collect(f.id);
  for (let i = 0; i < 30; i++) g.collect('food');
  for (let i = 0; i < 30; i++) g.collect('water');
  for (let i = 0; i < 8; i++) g.collect('medical');
  for (let i = 0; i < 8; i++) g.collect('fun');
  for (let i = 0; i < 5; i++) g.collect('tool');
  g.endScavenge();
  assert(g.phase === 'shelter', '搜刮结束进入避难所');
  assert(g.aliveMembers().length === 4, '全家 4 人均获救');

  let guard = 0;
  while (g.outcome === 'none' && guard++ < 50) {
    const r = g.presentDay();
    if (r.type === 'gameover') break;
    // 理性选择：尽量选第 0 项（多数有益，救援选第 0 项即回应→胜利）
    g.choose(0);
  }
  assert(g.outcome === 'win', '最终结果为胜利(WIN)，outcome=' + g.outcome);
  const s = g.summary();
  console.log('  结算:', JSON.stringify(s));
}

// ---------- 模拟二：零物资 → 应因饥渴团灭 LOSE ----------
console.log('\n[模拟B] 什么都没搜刮 → 预期 LOSE(团灭)');
{
  const g = new Game(mulberry32(999));
  g.start('survive');
  // 只救 1 人，不拿任何物资
  g.collect('ted');
  g.endScavenge();
  let guard = 0;
  while (g.outcome === 'none' && guard++ < 50) {
    const r = g.presentDay();
    if (r.type === 'gameover') break;
    g.choose(0);
  }
  assert(g.outcome === 'lose', '最终结果为失败(LOSE)，outcome=' + g.outcome);
  console.log('  存活人数:', g.aliveMembers().length);
}

// ---------- 模拟三：随机种子 100 局不崩、必出结局 ----------
console.log('\n[模拟C] 100 局随机游玩 → 均能产生确定结局且不抛错');
{
  let wins = 0, loses = 0;
  for (let seed = 0; seed < 100; seed++) {
    const g = new Game(mulberry32(seed * 7 + 1));
    g.start('survive');
    // 随机搜刮
    for (const f of FAMILY) if (g.rng() > 0.3) g.collect(f.id);
    for (const c of CAT_KEYS) {
      const n = Math.floor(g.rng() * 12);
      for (let i = 0; i < n; i++) g.collect(c);
    }
    g.endScavenge();
    let guard = 0;
    while (g.outcome === 'none' && guard++ < 60) {
      const r = g.presentDay();
      if (r.type === 'gameover') break;
      g.choose(Math.floor(g.rng() * g.currentEvent.options.length));
    }
    assert(g.outcome !== 'none', 'seed=' + seed + ' 产生结局 ' + g.outcome);
    if (g.outcome === 'win') wins++;
    else loses++;
  }
  console.log(`  100 局结果: 胜 ${wins} / 负 ${loses}`);
}

console.log('\n✅ 核心逻辑闭环验证通过：搜刮 → 避难所日循环 → 胜负结算 端到端可跑通\n');
