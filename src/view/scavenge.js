// ============================================================
// 搜刮阶段视图：Canvas2D 实时小游戏
// 仅负责"渲染 + 输入"，所有状态改动都通过 game.collect / game.tickScavenge
// ============================================================
import { PALETTE, FONT_TITLE, FONT_BODY } from './theme.js';
import { CAT_KEYS, CATEGORIES, FAMILY } from '../core/content.js';

export class Scavenge {
  constructor(canvas, game, onComplete) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.onComplete = onComplete;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.keys = {};
    this.pointer = null; // {x,y} 按下时的目标点
    this.player = { x: 0, y: 0, r: 18, speed: 230 };
    this.nodes = [];
    this.running = false;
    this.lastT = 0;
    this.raf = 0;

    this._onKeyDown = (e) => (this.keys[e.key.toLowerCase()] = true);
    this._onKeyUp = (e) => (this.keys[e.key.toLowerCase()] = false);
    this._onPointerDown = (e) => { this.pointer = this._pos(e); };
    this._onPointerMove = (e) => { if (this.pointer) this.pointer = this._pos(e); };
    this._onPointerUp = () => { this.pointer = null; };
    this._onResize = () => this._resize();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('resize', this._onResize);
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.W = w; this.H = h;
  }

  start() {
    this._resize();
    this.player.x = this.W * 0.5;
    this.player.y = this.H * 0.5;
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

  _generateNodes() {
    const margin = 40;
    const place = () => ({
      x: margin + Math.random() * (this.W - margin * 2),
      y: margin + Math.random() * (this.H - margin * 2),
      r: 16, collected: false,
    });
    // 家庭成员节点
    for (const f of FAMILY) {
      const n = place();
      n.kind = 'family'; n.id = f.id; n.label = f.name; n.icon = '🧍';
      this.nodes.push(n);
    }
    // 物资节点：每类若干
    const counts = { food: 5, water: 5, medical: 3, tool: 3, fun: 3 };
    for (const c of CAT_KEYS) {
      for (let i = 0; i < counts[c]; i++) {
        const n = place();
        n.kind = 'item'; n.cat = c; n.icon = CATEGORIES[c].icon;
        this.nodes.push(n);
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
      const len = Math.hypot(dx, dy);
      p.x += (dx / len) * p.speed * dt;
      p.y += (dy / len) * p.speed * dt;
    } else if (this.pointer) {
      const ddx = this.pointer.x - p.x, ddy = this.pointer.y - p.y;
      const d = Math.hypot(ddx, ddy);
      if (d > 4) {
        p.x += (ddx / d) * p.speed * dt;
        p.y += (ddy / d) * p.speed * dt;
      }
    }
    p.x = Math.max(p.r, Math.min(this.W - p.r, p.x));
    p.y = Math.max(p.r, Math.min(this.H - p.r, p.y));

    // 拾取检测
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
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('resize', this._onResize);
  }

  _draw() {
    const ctx = this.ctx, W = this.W, H = this.H;
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(0, 0, W, H);

    // 房间地板网格（复古感）
    ctx.strokeStyle = 'rgba(43,43,43,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // 节点
    for (const n of this.nodes) {
      if (n.collected) continue;
      ctx.beginPath();
      ctx.fillStyle = n.kind === 'family' ? PALETTE.purple : PALETTE.yellow;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = PALETTE.ink; ctx.stroke();
      ctx.font = '18px ' + FONT_BODY;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.icon, n.x, n.y + 1);
    }

    // 玩家
    ctx.beginPath();
    ctx.fillStyle = PALETTE.red;
    ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = PALETTE.ink; ctx.stroke();

    // 顶部 HUD
    const t = Math.ceil(this.game.timeLeft);
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = 'bold 22px ' + FONT_TITLE;
    ctx.fillStyle = t <= 10 ? PALETTE.red : PALETTE.ink;
    ctx.fillText('⏱ ' + t + 's', 14, 12);
    ctx.font = '14px ' + FONT_BODY;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText('已救出 ' + this.game.aliveMembers().length + '/' + FAMILY.length, 14, 40);

    // 库存条
    let ix = W - 14;
    ctx.textAlign = 'right';
    ctx.font = '16px ' + FONT_BODY;
    const inv = this.game.inventory;
    const parts = CAT_KEYS.map((c) => CATEGORIES[c].icon + inv[c]).join('  ');
    ctx.fillText(parts, ix, 14);

    // 提示
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(43,43,43,0.5)';
    ctx.font = '13px ' + FONT_BODY;
    ctx.fillText('拖动/方向键移动，碰到物品即收集；倒计时结束进入避难所', W / 2, H - 22);
  }
}
