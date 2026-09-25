// ============================================================
// 游戏逻辑层（纯逻辑，零 DOM / 零引擎依赖）
// 视图层（Canvas/DOM）只调用这里的 API，不反向依赖渲染
// ============================================================
import { CONFIG, FAMILY, CAT_KEYS, EVENTS, getEvent } from './content.js';

export class Game {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.phase = 'menu';            // menu | scavenge | shelter | over
    this.day = 0;
    this.timeLeft = CONFIG.scavengeSeconds;
    this.inventory = Object.fromEntries(CAT_KEYS.map((k) => [k, 0]));
    this.family = FAMILY.map((f) => ({ ...f, alive: false, health: 100, mental: 100 }));
    this.outcome = 'none';          // none | win | lose
    this.selectedGoal = 'survive';
    this.flags = {};
    this.currentEvent = null;       // 当前待玩家抉择的事件
    this.history = [];              // 事件/天数日志，供结算展示
  }

  start(goal = 'survive') {
    this.reset();
    this.selectedGoal = goal;
    this.phase = 'scavenge';
    this.timeLeft = CONFIG.scavengeSeconds;
  }

  // —— 搜刮阶段 ——
  collect(target) {
    if (this.phase !== 'scavenge') return false;
    const fam = this.family.find((f) => f.id === target);
    if (fam) {
      if (!fam.alive) {
        fam.alive = true;
        return true;
      }
      return false;
    }
    if (CAT_KEYS.includes(target)) {
      this.inventory[target] += 1;
      return true;
    }
    return false;
  }

  tickScavenge(dt) {
    if (this.phase !== 'scavenge') return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endScavenge();
    }
  }

  endScavenge() {
    this.phase = 'shelter';
    this.day = 1;
  }

  aliveMembers() {
    return this.family.filter((f) => f.alive);
  }

  // —— 避难所阶段：每天推进 ——
  // 返回: {type:'event'|'rescue'|'gameover', event?, outcome?}
  presentDay() {
    if (this.outcome !== 'none') return { type: 'gameover', outcome: this.outcome };

    this._consume();
    if (this.outcome !== 'none') return { type: 'gameover', outcome: this.outcome };

    let ev;
    if (this.day >= CONFIG.rescueAfterDay) {
      ev = getEvent('rescue');
    } else {
      const pool = EVENTS.filter((e) => e.id !== 'rescue');
      ev = pool[Math.floor(this.rng() * pool.length)];
    }
    this.currentEvent = ev;
    this.history.push({ day: this.day, event: ev.id });
    return { type: ev.id === 'rescue' ? 'rescue' : 'event', event: ev };
  }

  // 每日被动消耗（食物/水/精神）
  _consume() {
    for (const m of this.aliveMembers()) {
      let fed = false, watered = false;
      if (this.inventory.food > 0) { this.inventory.food--; fed = true; }
      if (this.inventory.water > 0) { this.inventory.water--; watered = true; }
      if (!fed) m.health -= CONFIG.starveHealth;
      if (!watered) m.health -= CONFIG.thirstHealth;
      m.mental = Math.max(0, m.mental - CONFIG.mentalDecay);
      if (m.health <= 0) { m.health = 0; m.alive = false; }
    }
    if (this.aliveMembers().length === 0) this.outcome = 'lose';
  }

  // 玩家对当前事件做出选择
  choose(optionIndex) {
    if (this.phase !== 'shelter' || !this.currentEvent) return { type: 'gameover', outcome: this.outcome };
    const opt = this.currentEvent.options[optionIndex];
    this._applyEffect(opt.effect);
    if (this.outcome !== 'none') {
      this.phase = 'over';
      return { type: 'gameover', outcome: this.outcome };
    }
    this.day++;
    return { type: 'continue' };
  }

  _applyEffect(eff) {
    if (!eff) return;
    if (eff.inv) {
      for (const k in eff.inv) {
        this.inventory[k] = (this.inventory[k] || 0) + eff.inv[k];
      }
    }
    if (eff.health || eff.mental) {
      for (const m of this.aliveMembers()) {
        if (eff.health) m.health = Math.max(0, Math.min(100, m.health + eff.health));
        if (eff.mental) m.mental = Math.max(0, Math.min(100, m.mental + eff.mental));
        if (m.health <= 0) { m.health = 0; m.alive = false; }
      }
    }
    if (eff.flags) Object.assign(this.flags, eff.flags);
    if (eff.outcome) this.outcome = eff.outcome;
    if (this.aliveMembers().length === 0) this.outcome = 'lose';
  }

  // 结算评分：天数 + 存活人数 + 剩余物资
  score() {
    const alive = this.aliveMembers().length;
    const inv = CAT_KEYS.reduce((a, k) => a + this.inventory[k], 0);
    return this.day * 10 + alive * 50 + inv;
  }

  summary() {
    return {
      outcome: this.outcome,
      day: this.day,
      alive: this.aliveMembers().map((m) => m.name),
      inventory: { ...this.inventory },
      score: this.score(),
    };
  }
}
