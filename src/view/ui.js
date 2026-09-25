// DOM 界面层：菜单 / 避难所卡片 / 结算（与 Canvas 搜刮互补）
import { CATEGORIES, CAT_KEYS, FAMILY } from '../core/content.js';
import { PALETTE } from './theme.js';

export function showScreen(name) {
  for (const s of document.querySelectorAll('.screen')) {
    s.style.display = s.dataset.screen === name ? 'flex' : 'none';
  }
}

export function menuHTML(best) {
  return `
    <h1 class="title">60秒生存</h1>
    <p class="lede">核弹警报拉响，你只有 <b>60 秒</b> 冲进屋里抢救家人和物资，
       然后躲进避难所活下去。能在第 6 天等到军方救援吗？</p>
    <div class="best">历史最佳：${best ? best.score + ' 分（第 ' + best.day + ' 天）' : '暂无'}</div>
    <button id="btn-start" class="btn-primary">开始生存</button>
    <p class="hint">桌面：方向键 / WASD 移动　手机：点按或拖动屏幕移动</p>`;
}

export function shelterTopHTML(game) {
  const inv = CAT_KEYS.map((c) => `<span class="chip">${CATEGORIES[c].icon} ${game.inventory[c]}</span>`).join('');
  const fam = FAMILY.map((f) => {
    const m = game.family.find((x) => x.id === f.id);
    const col = !m.alive ? '#999' : m.health < 35 ? PALETTE.red : m.mental < 35 ? PALETTE.purple : PALETTE.teal;
    const bars = m.alive
      ? `<span class="bars"><i class="h" style="width:${m.health}%"></i><i class="m" style="width:${m.mental}%"></i></span><small>${m.health}血/${m.mental}精</small>`
      : '<small>已失联</small>';
    return `<span class="fam" style="color:${col}"><span class="nm">${m.alive ? '●' : '○'} ${m.name}</span>${bars}</span>`;
  }).join('');
  return `<div class="shelter-top">
      <div class="day">第 <b>${game.day}</b> 天</div>
      <div class="inv">${inv}</div>
      <div class="fam-row">${fam}</div>
    </div>`;
}

export function eventHTML(event) {
  const opts = event.options.map((o, i) =>
    `<button class="opt" data-i="${i}">${o.label}</button>`).join('');
  return `<div class="event-card">
      <div class="ev-title">${event.title}</div>
      <div class="ev-text">${event.text}</div>
      <div class="ev-opts">${opts}</div>
    </div>`;
}

export function endingHTML(summary, best) {
  const win = summary.outcome === 'win';
  const alive = summary.alive.length ? summary.alive.join('、') : '无';
  const inv = CAT_KEYS.filter((c) => summary.inventory[c] > 0)
    .map((c) => `${CATEGORIES[c].icon}${summary.inventory[c]}`).join(' ') || '无';
  return `<div class="ending-card ${win ? 'win' : 'lose'}">
      <div class="end-title">${win ? '🎉 获救成功！' : '💀 避难所沉寂了'}</div>
      <div class="end-line">坚持天数：第 <b>${summary.day}</b> 天</div>
      <div class="end-line">幸存家人：${alive}</div>
      <div class="end-line">剩余物资：${inv}</div>
      <div class="end-score">本局得分 <b>${summary.score}</b></div>
      <div class="best">历史最佳：${best ? best.score + ' 分' : '—'}</div>
      <button id="btn-restart" class="btn-primary">再来一局</button>
    </div>`;
}
