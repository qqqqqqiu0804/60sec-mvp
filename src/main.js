// ============================================================
// 应用入口：串联 菜单 → 搜刮(Canvas) → 避难所(DOM卡片) → 结算
// 核心逻辑全部在 core/Game，本文件只做流程编排与渲染调度
// ============================================================
import { Game } from './core/game.js';
import { loadBest, saveBest } from './core/save.js';
import { Scavenge } from './view/scavenge.js';
import { showScreen, menuHTML, shelterTopHTML, eventHTML, endingHTML } from './view/ui.js';

const game = new Game(Math.random);

const $ = (sel) => document.querySelector(sel);
const menuEl = $('#screen-menu');
const scavengeEl = $('#screen-scavenge');
const shelterEl = $('#screen-shelter');
const endingEl = $('#screen-ending');
const canvas = $('#game');

function renderMenu() {
  menuEl.innerHTML = menuHTML(loadBest());
  $('#btn-start').onclick = startGame;
  showScreen('menu');
}

function startGame() {
  game.start('survive');
  showScreen('scavenge');
  const sc = new Scavenge(canvas, game, enterShelter);
  sc.start();
}

function enterShelter() {
  showScreen('shelter');
  stepDay();
}

function stepDay() {
  const r = game.presentDay();
  if (r.type === 'gameover') return showEnding();
  shelterEl.innerHTML = shelterTopHTML(game) + eventHTML(r.event);
  shelterEl.querySelectorAll('.opt').forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.i, 10);
      const res = game.choose(idx);
      if (res.type === 'gameover') return showEnding();
      stepDay();
    };
  });
}

function showEnding() {
  const summary = game.summary();
  const prevBest = loadBest();
  const record = { score: summary.score, day: summary.day };
  if (!prevBest || record.score > prevBest.score) saveBest(record);
  const best = loadBest();
  endingEl.innerHTML = endingHTML(summary, best);
  $('#btn-restart').onclick = renderMenu;
  showScreen('ending');
}

renderMenu();
