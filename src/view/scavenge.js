// ============================================================
// 搜刮阶段视图：Canvas2D 实时小游戏
// 仅负责"渲染 + 输入"，所有状态改动都通过 game.collect / game.tickScavenge
// 对照架构方案/原版机制：程序生成房间 + 家具障碍、操控 Ted、点按/拖动移动、倒计时青→黄→红渐变+闪屏
// ============================================================
import { PALETTE, FONT_TITLE, FONT_BODY } from './theme.js';
import { CONFIG, CAT_KEYS, CATEGORIES, FAMILY } from '../core/content.js';

export class Scavenge {
  constructor(canvas, game, onComplete) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.onComplete = onComplete;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.keys = {};
    this.target = null;        // 点按/拖动目标点（松手后保留→实现"点按移动"）
    this.dragging = false;
    this.player = { x: 0, y: 0, r: 18, speed: 210 };
    this.nodes = [];
    this.obstacles = [];       // 程序生成的家具障碍 {x,y,w,h,kind}
    this.running = false;
    this.lastT = 0;
    this.raf = 0;

    this._onKeyDown = (e) => { this.keys[e.key.toLowerCase()] = true; };
    this._onKeyUp = (e) => { this.keys[e.key.toLowerCase()] = false; };
    this._onPointerDown = (e) => { this.dragging = true; this.target = this._pos(e); };
    this._onPointerMove = (e) => { if (this.dragging) this.target = this._pos(e); };
    this._onPointerUp = () => { this.dragging = false; /* 保留 target → 点按移动 */ };
    this._onResize = () => this._resize();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('resize', this._onResize);
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.W = w; this.H = h;
  }

  // 圆形碰撞：撞墙(边界)或撞家具返回 true
  _hits(x, y) {
    const r = this.player.r;
    if (x < r || x > this.W - r || y < r || y > this.H - r) return true;
    for (const o of this.obstacles) {
      const cx = Math.max(o.x, Math.min(x, o.x + o.w));
      const cy = Math.max(o.y, Math.min(y, o.y + o.h));
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
    }
    return false;
  }

  start() {
    this._resize();
    if (!this.W) { requestAnimationFrame(() => this.start()); return; }
    this.player.x = this.W * 0.5;
    this.player.y = this.H * 0.5;
    this.target = null;
    this._generateRoom();
    this._generateNodes();
    this.running = true;
    this.lastT = performance.now();
    const loop = (t) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.lastT) / 1000);
      this.lastT = t;
      this._update(dt);
      this._draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  // 程序生成 3~5 件家具作为障碍（每次房间布局不同）
  _generateRoom() {
    this.obstacles = [];
    const W = this.W, H = this.H, m = 36;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const w = 50 + Math.random() * 90;
      const h = 40 + Math.random() * 80;
      const x = m + Math.random() * (W - 2 * m - w);
      const y = m + Math.random() * (H - 2 * m - h);
      this.obstacles.push({ x, y, w, h, kind: Math.random() < 0.5 ? 'sofa' : 'table' });
    }
  }

  // 在空地(避开家具/其他节点)找一个自由点
  _freeSpot(r) {
    const W = this.W, H = this.H, m = 30;
    for (let i = 0; i < 200; i++) {
      const x = m + r + Math.random() * (W - 2 * m - 2 * r);
      const y = m + r + Math.random() * (H - 2 * m - 2 * r);
      if (this._hits(x, y)) continue;
      let ok = true;
      for (const nd of this.nodes) {
        if ((nd.x - x) ** 2 + (nd.y - y) ** 2 < (r + nd.r + 24) ** 2) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return { x: W / 2, y: H / 2 };
  }

  _generateNodes() {
    this.nodes = [];
    for (const f of FAMILY) {
      const p = this._freeSpot(16);
      this.nodes.push({ ...p, r: 16, kind: 'family', id: f.id, label: f.name, icon: '🧍', collected: false });
    }
    const counts = { food: 12, water: 12, medical: 5, tool: 5, fun: 5 };
    for (const c of CAT_KEYS) {
      for (let i = 0; i < counts[c]; i++) {
        const p = this._freeSpot(14);
        this.nodes.push({ ...p, r: 14, kind: 'item', cat: c, icon: CATEGORIES[c].icon, collected: false });
      }
    }
  }

  _update(dt) {
    const p = this.player;
    let dx = 0, dy = 0;
    if (this.keys['arrowleft'] || this.keys['a']) dx -= 1;
    if (this.keys['arrowright'] || this.keys['d']) dx += 1;
    if (this.keys['arrowup'] || this.keys['w']) dy -= 1;
    if (this.keys['arrowdown'] || this.keys['s']) dy += 1;

    if (dx || dy) {
      this.target = null;                 // 键盘优先，清除点按目标
      const len = Math.hypot(dx, dy);
      this._move(dx / len * p.speed * dt, dy / len * p.speed * dt);
    } else if (this.target) {
      const tdx = this.target.x - p.x, tdy = this.target.y - p.y;
      const d = Math.hypot(tdx, tdy);
      if (d > 6) {
        const step = Math.min(d, p.speed * dt);
        this._move(tdx / d * step, tdy / d * step);
      } else {
        this.target = null;
      }
    }
    p.x = Math.max(p.r, Math.min(this.W - p.r, p.x));
    p.y = Math.max(p.r, Math.min(this.H - p.r, p.y));

    // 拾取检测（碰到即收集，移动端点按=走过去自动捡）
    for (const n of this.nodes) {
      if (n.collected) continue;
      if (Math.hypot(n.x - p.x, n.y - p.y) < p.r + n.r + 4) {
        const ok = n.kind === 'family' ? this.game.collect(n.id) : this.game.collect(n.cat);
        if (ok) n.collected = true;
      }
    }

    this.game.tickScavenge(dt);
    if (this.game.phase !== 'scavenge') this._finish();
  }

  // 分轴移动 + 碰撞，实现沿家具"滑行"而非穿模
  _move(mx, my) {
    const p = this.player;
    if (!this._hits(p.x + mx, p.y)) p.x += mx;
    if (!this._hits(p.x, p.y + my)) p.y += my;
  }

  _finish() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this._teardown();
    this.onComplete && this.onComplete();
  }

  _teardown() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);
  }

  _draw() {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(0, 0, W, H);

    // 地板网格（复古感）
    ctx.strokeStyle = 'rgba(43,43,43,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // 家具障碍
    for (const o of this.obstacles) {
      ctx.fillStyle = o.kind === 'sofa' ? '#cbb89c' : '#b8a888';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.lineWidth = 2; ctx.strokeStyle = PALETTE.ink; ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = 'rgba(43,43,43,0.55)'; ctx.font = '14px ' + FONT_BODY;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.kind === 'sofa' ? '🛋️' : '🪑', o.x + o.w / 2, o.y + o.h / 2);
    }

    // 节点
    for (const n of this.nodes) {
      if (n.collected) continue;
      ctx.beginPath();
      ctx.fillStyle = n.kind === 'family' ? PALETTE.purple : PALETTE.yellow;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = PALETTE.ink; ctx.stroke();
      ctx.font = '16px ' + FONT_BODY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.icon, n.x, n.y + 1);
    }

    // 玩家 Ted
    ctx.beginPath();
    ctx.fillStyle = PALETTE.red;
    ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = PALETTE.ink; ctx.stroke();
    ctx.fillStyle = PALETTE.ink; ctx.font = 'bold 11px ' + FONT_BODY;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Ted', this.player.x, this.player.y + this.player.r + 2);

    // 倒计时：青→黄→红 渐变 + 最后 10 秒脉动
    const frac = this.game.timeLeft / CONFIG.scavengeSeconds;
    const col = frac > 0.5 ? PALETTE.teal : frac > 0.25 ? PALETTE.yellow : PALETTE.red;
    const t = Math.ceil(this.game.timeLeft);
    let scale = 1;
    if (t <= 10) scale = 1 + 0.12 * Math.abs(Math.sin(performance.now() / 150));
    ctx.save();
    ctx.translate(16, 14); ctx.scale(scale, scale);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold 22px ' + FONT_TITLE; ctx.fillStyle = col;
    ctx.fillText('⏱ ' + t + 's', 0, 0);
    ctx.restore();
    ctx.font = '14px ' + FONT_BODY; ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('已救出 ' + this.game.aliveMembers().length + '/' + FAMILY.length, 14, 46);

    // 库存条
    ctx.textAlign = 'right'; ctx.font = '16px ' + FONT_BODY;
    const inv = this.game.inventory;
    ctx.fillText(CAT_KEYS.map((c) => CATEGORIES[c].icon + inv[c]).join('  '), W - 14, 14);

    // 提示
    ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(43,43,43,0.5)';
    ctx.font = '13px ' + FONT_BODY;
    ctx.fillText('点按/拖动移动，碰到物品即收集；倒计时结束进入避难所', W / 2, H - 22);

    // 最后 10 秒核警报闪屏
    if (t <= 10) {
      const a = 0.10 + 0.12 * Math.abs(Math.sin(performance.now() / 200));
      ctx.fillStyle = 'rgba(192,57,43,' + a.toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }
}
