// ===== 剪单人生 Demo · 主逻辑 =====
(function () {
  'use strict';

  const PPS = 64;            // 时间线像素/秒
  const SNAP_T = 0.18;       // 节奏点吸附阈值（秒）
  const MIN_DUR = 0.5;

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(36).slice(2, 9);

  const state = {
    clips: [],          // { id, mid, in, out, filter, comp:{dx,dy,scale,snapped} }
    playhead: 0,
    playing: false,
    selectedId: null,
    tool: 'select',
    order: null,
    stats: null,
    anomalySeen: 0,
    budget: 0,
    stageW: 0,
    stageH: 0,
    previewMatId: null,
  };

  // ---------- 音频反馈 ----------
  let actx = null;
  function ensureAudio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (actx && actx.state === 'suspended') actx.resume();
  }
  function beep(freq, dur, type = 'sine', vol = 0.16, delay = 0) {
    if (!actx) return;
    const t0 = actx.currentTime + delay;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(actx.destination);
    osc.start(t0); osc.stop(t0 + dur);
  }
  const sndGood = () => beep(880, 0.09);
  const sndBad = () => beep(150, 0.18, 'square', 0.14);
  const sndPerfect = () => { beep(660, 0.09); beep(880, 0.09, 'sine', 0.16, 0.08); beep(1320, 0.16, 'sine', 0.16, 0.16); };
  const sndAnomaly = () => { beep(130, 0.35, 'triangle', 0.14); beep(97, 0.45, 'triangle', 0.12, 0.1); };

  // ---------- 弹出反馈 ----------
  function popup(text, cls) {
    const layer = $('toast-layer');
    const el = document.createElement('div');
    el.className = 'popup ' + cls;
    el.textContent = text;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }
  function shakeStage() {
    const s = $('preview-stage');
    s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake');
    setTimeout(() => s.classList.remove('shake'), 450);
  }
  function flickerStage() {
    const s = $('preview-stage');
    s.classList.remove('flicker'); void s.offsetWidth; s.classList.add('flicker');
    setTimeout(() => s.classList.remove('flicker'), 550);
  }
  function ringAt(x, y) {
    const s = $('preview-stage');
    const r = document.createElement('div');
    r.className = 'snap-ring';
    r.style.left = x + 'px'; r.style.top = y + 'px';
    s.appendChild(r);
    setTimeout(() => r.remove(), 550);
  }

  // ---------- 场景渲染 ----------
  let lastPreviewClipId = null;
  function sceneHTML(mid) {
    const m = MATERIALS.find((x) => x.id === mid);
    const inner = {
      cat:     `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;bottom:37%">🧶</span><span class="bg-deco" style="right:63%;top:36%">🪟</span><span class="hero anim-bounce">🐱</span><span class="deco" style="left:42%;top:12%">🎵</span><span class="deco" style="right:42%;top:20%">🎵</span></div>`,
      food:    `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;bottom:37%">🥢</span><span class="bg-deco" style="right:63%;top:36%">🥬</span><span class="hero anim-wiggle">🍜</span><span class="deco anim-steam" style="left:44%;top:20%">💨</span><span class="deco anim-steam" style="left:53%;top:16%;animation-delay:.5s">💨</span></div>`,
      wedding: `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;top:36%">🌸</span><span class="bg-deco" style="right:63%;bottom:37%">🎀</span><span class="hero anim-float">💒</span><span class="deco anim-confetti" style="left:42%;top:8%">🎊</span><span class="deco anim-confetti" style="right:42%;top:10%;animation-delay:.4s">🎉</span><span class="deco anim-confetti" style="left:48%;top:6%;animation-delay:.8s">💞</span></div>`,
      drive:   `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;bottom:37%">🛣️</span><span class="bg-deco" style="right:63%;top:36%">🚦</span><span class="hero anim-drive">🚗</span><span class="deco" style="left:42%;bottom:10%">🏙️</span><span class="deco" style="right:42%;bottom:14%">🌆</span></div>`,
      selfie:  `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;top:36%">🌟</span><span class="bg-deco" style="right:63%;bottom:37%">📱</span><span class="hero anim-pulse">🤳</span><span class="deco anim-float" style="left:42%;top:14%">✨</span><span class="deco anim-float" style="right:42%;top:22%;animation-delay:.6s">✨</span></div>`,
      dance:   `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;top:36%">🎶</span><span class="bg-deco" style="right:63%;bottom:37%">💥</span><span class="hero anim-spin">🕺</span><span class="deco anim-wiggle" style="left:42%;bottom:14%">⚡</span><span class="deco anim-wiggle" style="right:42%;bottom:18%;animation-delay:.3s">🔥</span></div>`,
      rain:    `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;bottom:37%">🏠</span><span class="bg-deco" style="right:63%;top:36%">☔</span><span class="hero anim-sway" style="font-size:130px">☂️</span><span class="deco anim-float" style="left:42%;top:14%">🌧️</span><span class="deco anim-float" style="right:42%;top:20%;animation-delay:.5s">🌧️</span><span class="deco anim-float" style="left:48%;bottom:12%;animation-delay:.9s">🌧️</span></div>`,
      cctv:    `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;bottom:37%">🚪</span><span class="bg-deco" style="right:63%;top:36%">⚠️</span><span class="hero anim-flicker-slow">📹</span><span class="cctv-scan anim-scan"></span><span class="cctv-time">03:15:00</span><span class="overlay-text" style="left:12px;top:10px">CAM-04</span></div>`,
      ghost:   `<div class="scene"><div class="bg-pattern"></div><span class="bg-deco" style="left:37%;bottom:37%">🕯️</span><span class="bg-deco" style="right:63%;top:36%">🕸️</span><span class="hero anim-flicker-slow">👻</span><span class="deco anim-float" style="left:42%;top:16%">🌫️</span><span class="deco anim-float" style="right:42%;top:24%;animation-delay:.7s">🌫️</span></div>`,
    };
    return `<div class="scene-${m.id}" style="position:absolute;inset:0">${inner[m.id]}</div>`;
  }

  // ---------- 布局计算 ----------
  // 自由摆放：start 存在每个 clip 上，允许空隙
  const totalDur = () => state.clips.reduce((s, c) => Math.max(s, c.start + (c.out - c.in)), 0);
  // 优先取指针所在片段；恰好在片段结尾时取上一段的最后一帧（避免边界跳变/结尾变空）
  const clipAt = (t) =>
    state.clips.find((c) => Math.abs(t - (c.start + (c.out - c.in))) < 0.0001) ||
    state.clips.find((c) => t >= c.start && t < c.start + (c.out - c.in));
  const selected = () => state.clips.find((c) => c.id === state.selectedId) || null;
  const mat = (c) => MATERIALS.find((m) => m.id === c.mid);

  // 找时间轴上最近的节奏点（异常点不参与吸附，只做极近距离探测）
  function nearestMarker(t) {
    let best = null, bestD = SNAP_T;
    for (const c of state.clips) {
      const m = mat(c);
      for (const g of m.good) {
        const mt = c.start + (g - c.in);
        const d = Math.abs(mt - t);
        if (d < bestD) { bestD = d; best = { type: 'good', t: mt }; }
      }
      for (const b of m.bad) {
        const mt = c.start + (b - c.in);
        const d = Math.abs(mt - t);
        if (d < bestD) { bestD = d; best = { type: 'bad', t: mt }; }
      }
      for (const a of m.anomaly) {
        const mt = c.start + (a - c.in);
        const d = Math.abs(mt - t);
        if (d < 0.055) { best = { type: 'anomaly', t: mt }; }
      }
    }
    return best;
  }

  function onMarkerFeedback(type) {
    if (!state.stats) return;
    if (type === 'good') {
      state.stats.good++; popup('好点！', 'good'); sndGood();
    } else if (type === 'bad') {
      state.stats.bad++; popup('坏点！', 'bad'); sndBad(); shakeStage();
    } else if (type === 'anomaly') {
      state.anomalySeen++;
      popup('？', 'anomaly'); sndAnomaly(); flickerStage();
    }
  }

  // ---------- 渲染 ----------
  function renderMediaList() {
    const list = $('media-list');
    list.innerHTML = '';
    for (const m of MATERIALS) {
      const card = document.createElement('div');
      card.className = 'media-card';
      card.draggable = true;
      card.style.setProperty('--c1', m.c1);
      card.style.setProperty('--c2', m.c2);
      card.innerHTML = `<div class="media-thumb">${sceneHTML(m.id)}</div>
        <div><div class="m-name">${m.name}</div><div class="m-meta">${fmtShort(m.dur)} · 好${m.good.length} · 坏${m.bad.length}</div></div>`;
      if (m.anomaly.length) card.innerHTML += `<span class="anomaly-badge">?</span>`;
      card.addEventListener('click', () => { ensureAudio(); addClip(m); });
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', m.id);
        e.dataTransfer.effectAllowed = 'copy';
        state.previewMatId = m.id;
        renderPreview();
      });
      card.addEventListener('dragend', () => {
        state.previewMatId = null;
        renderPreview();
      });
      list.appendChild(card);
    }
  }

  function renderRuler(total) {
    const ruler = $('ruler');
    ruler.innerHTML = '';
    ruler.style.width = Math.max(total, 8) * PPS + 'px';
    for (let i = 0; i <= Math.ceil(total); i++) {
      const tick = document.createElement('div');
      tick.className = 'tick' + (i % 5 === 0 ? ' major' : '');
      tick.style.left = i * PPS + 'px';
      if (i % 5 === 0) tick.innerHTML = `<span class="tick-label">${fmtShort(i)}</span>`;
      ruler.appendChild(tick);
    }
  }

  function renderTrack(total) {
    const track = $('track');
    track.innerHTML = '';
    track.style.width = Math.max(total, 8) * PPS + 'px';
    $('drop-hint').style.display = state.clips.length ? 'none' : 'block';

    for (const c of state.clips) {
      const m = mat(c);
      const el = document.createElement('div');
      el.className = 'clip' + (c.id === state.selectedId ? ' selected' : '');
      el.dataset.id = c.id;
      el.style.left = c.start * PPS + 'px';
      el.style.width = Math.max((c.out - c.in) * PPS - 6, 42) + 'px';
      el.style.setProperty('--c1', m.c1);
      el.style.setProperty('--c2', m.c2);
      el.innerHTML = `<span class="clip-emoji">${m.emoji}</span>
        <span class="clip-name">${m.name}</span>
        <span class="clip-dur">${(c.out - c.in).toFixed(1)}s</span>`;

      // 节奏点小圆点
      for (const g of m.good) { if (g >= c.in && g <= c.out) el.appendChild(dot(g, c, 'good')); }
      for (const b of m.bad)  { if (b >= c.in && b <= c.out) el.appendChild(dot(b, c, 'bad')); }
      for (const a of m.anomaly) { if (a >= c.in && a <= c.out) el.appendChild(dot(a, c, 'anomaly')); }

      // 边缘手柄（选中时可见）
      if (c.id === state.selectedId) {
        const elL = document.createElement('div'); elL.className = 'edge left'; el.appendChild(elL);
        const elR = document.createElement('div'); elR.className = 'edge right'; el.appendChild(elR);
      }

      track.appendChild(el);
      bindClip(el, c);
    }
  }
  function dot(t, c, type) {
    const d = document.createElement('div');
    d.className = 'marker-dot ' + type;
    d.style.left = ((t - c.in) / (c.out - c.in)) * 100 + '%';
    d.title = type === 'anomaly' ? '???' : type;
    return d;
  }

  function renderPreview() {
    const stage = $('preview-stage');
    const sceneEl = $('scene');
    state.stageW = stage.clientWidth;
    state.stageH = stage.clientHeight;
    stage.classList.toggle('paused', !state.playing);
    const playing = state.playing;
    if (state.previewMatId && !playing) {
      sceneEl.innerHTML = sceneHTML(state.previewMatId);
      sceneEl.style.transform = '';
      sceneEl.style.filter = '';
      $('guides').hidden = true;
      lastPreviewClipId = null;
      return;
    }
    const c = clipAt(state.playhead);

    if (!c) {
      sceneEl.innerHTML = `<div class="scene-empty">🎬 把素材拖进时间线开始剪</div>`;
      sceneEl.style.transform = '';
      sceneEl.style.filter = '';
      $('guides').hidden = true;
      lastPreviewClipId = null;
      return;
    }
    const m = mat(c);
    if (lastPreviewClipId !== c.id) {
      sceneEl.innerHTML = sceneHTML(m.id);
      lastPreviewClipId = c.id;
    }
    const dx = (c.comp.dx || 0), dy = (c.comp.dy || 0), sc = (c.comp.scale || 1.4);
    sceneEl.style.transform = `translate(${dx}px, ${dy}px) scale(${sc})`;
    sceneEl.style.filter = FILTERS[c.filter] ? FILTERS[c.filter].css : '';

    // 构图辅助线（选中时显示）
    const guides = $('guides');
    guides.hidden = !selected();
  }

  function renderInspector() {
    const c = selected();
    $('insp-empty').hidden = !!c;
    $('insp-body').hidden = !c;
    if (!c) return;
    const m = mat(c);
    $('insp-name').textContent = `${m.emoji} ${m.name}（${(c.out - c.in).toFixed(1)}s）`;

    // 滤镜按钮
    const fb = $('filter-btns');
    fb.innerHTML = '';
    for (const key of Object.keys(FILTERS)) {
      const b = document.createElement('button');
      b.className = 'filter-btn' + (c.filter === key ? ' active' : '');
      b.textContent = FILTERS[key].name;
      b.addEventListener('click', () => { ensureAudio(); c.filter = key; renderAll(); });
      fb.appendChild(b);
    }

    // 缩放滑条
    $('scale-slider').value = Math.round((c.comp.scale || 1.4) * 100);
    $('scale-label').textContent = $('scale-slider').value + '%';

    // 节奏点说明
    const chips = $('marker-chips');
    chips.innerHTML = '';
    m.good.forEach(() => chips.appendChild(chip('好点', 'good')));
    m.bad.forEach(() => chips.appendChild(chip('坏点', 'bad')));
    m.anomaly.forEach(() => chips.appendChild(chip('？？？', 'anomaly')));
  }
  function chip(text, cls) {
    const s = document.createElement('span');
    s.className = 'chip ' + cls;
    s.textContent = text;
    return s;
  }

  function renderBrief() {
    const o = state.order;
    $('brief-header').textContent = `${o.avatar} ${o.client}（${o.mood}）`;
    $('brief-text').textContent = o.text;
    const checks = $('brief-checks');
    checks.innerHTML = '';
    const dur = totalDur();
    checks.appendChild(check(`⏱ 时长 ${dur.toFixed(1)}s / ${o.range[0]}–${o.range[1]}s`, dur >= o.range[0] && dur <= o.range[1]));
    const hasColor = state.clips.some((c) => c.filter === o.color);
    checks.appendChild(check(`🎨 客户喜欢的色调「${FILTERS[o.color].name}」`, o.color === 'none' ? true : hasColor));
    const badKept = countBadKept();
    if (o.chaos) checks.appendChild(check(`😈 坏镜头越鬼畜越好 ×${badKept}`, true));
    else if (o.forbidBad) checks.appendChild(check(`😱 坏镜头剪干净（剩 ${badKept} 个）`, badKept === 0));
    if (o.mystery) checks.appendChild(check(`👁 观察异常 ×${state.anomalySeen}`, state.anomalySeen > 0));
  }
  function check(text, ok) {
    const d = document.createElement('div');
    d.className = 'check ' + (ok ? 'ok' : 'bad');
    d.textContent = (ok ? '✓ ' : '✗ ') + text;
    return d;
  }

  function renderStatus() {
    const o = state.order;
    $('st-client').textContent = `${o.avatar} ${o.client} · ${o.mood}`;
    $('st-duration').textContent = `⏱ 当前 ${totalDur().toFixed(1)}s`;
    $('st-budget').textContent = `💰 预算 ¥${state.budget}`;
    $('st-anomaly').textContent = `👁 观察记录 ${state.anomalySeen} 次`;
    $('time-label').textContent = fmt(state.playhead) + ' / ' + fmt(totalDur());
  }
  function fmt(t) {
    t = Math.max(0, t);
    const h = Math.floor(t / 3600);
    const m = Math.floor(t / 60) % 60;
    const s = Math.floor(t) % 60;
    const f = Math.floor((t - Math.floor(t)) * 25);
    return [h, m, s, f].map((x) => String(x).padStart(2, '0')).join(':');
  }
  function fmtShort(t) {
    const m = Math.floor(t / 60), s = Math.floor(t) % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function renderAll() {
    const total = totalDur();
    renderRuler(total);
    renderTrack(total);
    renderPreview();
    renderInspector();
    renderBrief();
    renderStatus();
    updatePlayhead();
  }

  function updatePlayhead() {
    $('playhead').style.left = state.playhead * PPS + 'px';
    $('time-label').textContent = fmt(state.playhead) + ' / ' + fmt(totalDur());
  }

  // ---------- 时间线操作 ----------
  function addClip(m, start, atIndex) {
    const clip = {
      id: uid(), mid: m.id, in: 0, out: Math.min(m.dur, 4.5), start: 0,
      filter: 'none', comp: { dx: 0, dy: 0, scale: 1.4, snapped: false },
    };
    if (atIndex == null) {
      clip.start = (start == null) ? totalDur() : start;
      state.clips.push(clip);
    } else {
      clip.start = start;
      state.clips.splice(atIndex, 0, clip);
    }
    state.selectedId = clip.id;
    state.playhead = clip.start;
    renderAll();
  }

  function removeClip(id) {
    const i = state.clips.findIndex((c) => c.id === id);
    if (i < 0) return;
    state.clips.splice(i, 1);
    if (state.selectedId === id) state.selectedId = state.clips[i] ? state.clips[i].id : (state.clips[i - 1] ? state.clips[i - 1].id : null);
    renderAll();
  }

  function cutAt(t) {
    const c = clipAt(t);
    if (!c) return;
    const tClip = t - c.start + c.in;
    if (tClip < c.in + 0.18 || tClip > c.out - 0.18) return;

    const m = mat(c);
    let fb = null;
    for (const g of m.good) if (Math.abs(g - tClip) <= 0.05) fb = 'good';
    for (const b of m.bad) if (Math.abs(b - tClip) <= 0.05) fb = 'bad';
    for (const a of m.anomaly) if (Math.abs(a - tClip) <= 0.05) fb = 'anomaly';

    const A = { ...c, out: tClip };
    const B = { ...c, id: uid(), in: tClip, start: c.start + (tClip - c.in) };
    const i = state.clips.indexOf(c);
    state.clips.splice(i, 1, A, B);
    state.selectedId = B.id;
    state.playhead = B.start;

    if (fb === 'good') { state.stats.perfect++; popup('Perfect Cut!', 'perfect'); sndPerfect(); }
    else if (fb === 'bad') { state.stats.bad++; popup('剪坏啦！', 'bad'); sndBad(); shakeStage(); }
    else if (fb === 'anomaly') { state.anomalySeen++; popup('？', 'anomaly'); sndAnomaly(); flickerStage(); }
    else { popup('咔嚓', 'good'); sndGood(); }
    renderAll();
  }

  function bindClip(el, c) {
    el.addEventListener('pointerdown', (e) => {
      ensureAudio();
      const edge = e.target.closest('.edge');
      if (edge) { startTrim(e, c, edge.classList.contains('left')); return; }
      if (state.tool === 'blade') {
        const rect = el.parentElement.getBoundingClientRect();
        cutAt((e.clientX - rect.left) / PPS);
        return;
      }
      state.selectedId = c.id;
      state.playhead = c.start;
      document.querySelectorAll('.clip').forEach((x) => x.classList.toggle('selected', x.dataset.id === c.id));
      renderInspector();
      renderPreview();
      updatePlayhead();
      startDrag(e, el, c);
    });
  }

  // 自由拖动摆放（允许空隙，重叠时弹回）
  function startDrag(e, el, c) {
    e.preventDefault();
    const startX = e.clientX;
    const origStart = c.start;
    const dur = c.out - c.in;
    el.classList.add('dragging');

    const overlaps = (s) => {
      for (const o of state.clips) {
        if (o.id === c.id) continue;
        const od = o.out - o.in;
        if (s < o.start + od && o.start < s + dur) return true;
      }
      return false;
    };

    const move = (ev) => {
      const dx = (ev.clientX - startX) / PPS;
      const ns = clamp(origStart + dx, 0, 60);
      c.start = ns;
      el.style.left = ns * PPS + 'px';
      const ov = overlaps(ns);
      el.classList.toggle('overlap', ov);
      autoScroll(ev.clientX);
    };
    const up = () => {
      el.classList.remove('dragging');
      el.classList.remove('overlap');
      if (overlaps(c.start)) {
        c.start = origStart;
        popup('片段重叠了！', 'bad'); sndBad(); shakeStage();
      } else {
        c.start = Math.round(c.start * 4) / 4; // 吸附到 0.25s 网格
      }
      renderAll();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function autoScroll(clientX) {
    const panel = $('timeline-panel');
    const r = panel.getBoundingClientRect();
    if (clientX > r.right - 50) panel.scrollLeft += 16;
    else if (clientX < r.left + 50) panel.scrollLeft -= 16;
  }

  // 边缘裁剪（带节奏点吸附）
  function startTrim(e, c, isLeft) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const oIn = c.in, oOut = c.out;
    const move = (ev) => {
      const dx = (ev.clientX - startX) / PPS;
      if (isLeft) {
        let ni = clamp(oIn + dx, 0, oOut - MIN_DUR);
        const snap = snapEdge(ni, c, 'left');
        if (snap) ni = snap;
        c.start = Math.max(0, c.start + (ni - oIn)); // 左缘裁剪时右缘锚定
        c.in = ni;
      } else {
        let no = clamp(oOut + dx, oIn + MIN_DUR, mat(c).dur);
        const snap = snapEdge(no, c, 'right');
        if (snap) no = snap;
        c.out = no;
      }
      renderAll();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function snapEdge(t, c, side) {
    const m = mat(c);
    for (const g of m.good) {
      if (Math.abs(g - t) <= SNAP_T) { state.stats.good++; popup('好点！', 'good'); sndGood(); return g; }
    }
    for (const b of m.bad) {
      if (Math.abs(b - t) <= SNAP_T) { state.stats.bad++; popup('坏点！', 'bad'); sndBad(); shakeStage(); return b; }
    }
    for (const a of m.anomaly) {
      if (Math.abs(a - t) <= 0.055) { state.anomalySeen++; popup('？', 'anomaly'); sndAnomaly(); flickerStage(); return t; }
    }
    return null;
  }

  // ---------- 播放与走带 ----------
  let raf = null, lastTs = 0;
  function play() {
    if (state.playing) return;
    if (!state.clips.length) return;
    if (state.playhead >= totalDur() - 0.01) state.playhead = 0;
    state.playing = true;
    $('btn-play').textContent = '⏸';
    renderPreview();
    lastTs = performance.now();
    const loop = (ts) => {
      if (!state.playing) return;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      state.playhead = clamp(state.playhead + dt, 0, totalDur());
      if (state.playhead >= totalDur() - 0.001) {
        state.playhead = totalDur();
        state.playing = false;
        $('btn-play').textContent = '▶';
      }
      updatePlayhead();
      renderPreview();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function pause() {
    state.playing = false;
    $('btn-play').textContent = '▶';
    if (raf) cancelAnimationFrame(raf);
    renderPreview();
  }

  // ---------- 构图 ----------
  function startCompDrag(e) {
    const c = selected();
    if (!c || state.playing) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const sdx = c.comp.dx || 0, sdy = c.comp.dy || 0;
    const move = (ev) => {
      const dx = clamp(sdx + (ev.clientX - startX), -state.stageW * 0.5, state.stageW * 0.5);
      const dy = clamp(sdy + (ev.clientY - startY), -state.stageH * 0.5, state.stageH * 0.5);
      c.comp.dx = dx; c.comp.dy = dy; c.comp.snapped = false;
      $('scene').style.transform = `translate(${dx}px, ${dy}px) scale(${c.comp.scale || 1.4})`;
    };
    const up = (ev) => {
      const anchors = [
        { x: 0, y: 0, name: '居中' },
        { x: -0.167 * state.stageW, y: 0, name: '左三分' },
        { x: 0.167 * state.stageW, y: 0, name: '右三分' },
      ];
      let snapped = false;
      for (const a of anchors) {
        if (Math.abs(c.comp.dx - a.x) < state.stageW * 0.05 && Math.abs(c.comp.dy - a.y) < state.stageH * 0.07) {
          c.comp.dx = a.x; c.comp.dy = a.y; c.comp.snapped = true;
          snapped = true;
          const cx = state.stageW / 2 + a.x, cy = state.stageH / 2 + a.y;
          ringAt(cx, cy);
          popup(a.name + '，好构图！', 'good');
          sndGood();
          break;
        }
      }
      if (!snapped && (Math.abs(ev.clientX - startX) > 8 || Math.abs(ev.clientY - startY) > 8)) {
        popup('构图歪了…', 'bad'); sndBad();
      }
      renderAll();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function setScale(v) {
    const c = selected();
    if (!c) return;
    let sc = v / 100;
    for (const t of [1, 1.5, 2]) {
      if (Math.abs(sc - t) <= 0.045) { sc = t; popup('刚刚好！', 'good'); sndGood(); break; }
    }
    c.comp.scale = sc;
    $('scale-label').textContent = Math.round(sc * 100) + '%';
    renderPreview();
  }

  // ---------- 订单与交付 ----------
  function countBadKept() {
    let n = 0;
    for (const c of state.clips) for (const b of mat(c).bad) if (b >= c.in && b <= c.out) n++;
    return n;
  }

  function scoreOrder() {
    const o = state.order, st = state.stats;
    let s = 60;
    s += st.good * 2 + st.perfect * 4;
    if (o.chaos) s += st.bad * 3; else s -= st.bad * 2;
    const badKept = countBadKept();
    if (o.chaos) s += badKept * 2;
    else if (o.forbidBad) s -= badKept * 5;
    const compN = state.clips.filter((c) => c.comp.snapped).length;
    s += Math.min(compN, 2) * 4;
    const colorOk = o.color === 'none' || state.clips.some((c) => c.filter === o.color);
    if (colorOk) s += 5;
    const dur = totalDur();
    if (dur >= o.range[0] && dur <= o.range[1]) s += 6; else s -= 10;
    if (o.mystery && state.anomalySeen > 0) s += 10;
    return clamp(Math.round(s), 0, 100);
  }

  function gradeOf(s) {
    if (s >= 90) return ['S', '剪神下凡'];
    if (s >= 78) return ['A', '相当能打'];
    if (s >= 62) return ['B', '中规中矩'];
    if (s >= 45) return ['C', '甲方皱眉'];
    return ['D', '连夜跑路'];
  }

  function deliver() {
    if (!state.clips.length) { popup('时间线还是空的！', 'bad'); return; }
    ensureAudio();
    pause();
    const ov = $('deliver-overlay');
    ov.hidden = false;
    $('deliver-result').hidden = true;
    $('deliver-progress').style.width = '0%';
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 18 + 8;
      $('deliver-progress').style.width = Math.min(p, 100) + '%';
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(showResult, 350);
      }
    }, 120);
  }

  function showResult() {
    const o = state.order;
    const score = scoreOrder();
    const [g, gname] = gradeOf(score);
    $('grade').textContent = g;
    $('grade').style.color = score >= 78 ? '#2e9e4f' : score >= 62 ? '#d99a1b' : '#e05050';
    $('score-line').textContent = `综合评分 ${score} · ${gname}`;
    const badKept = countBadKept();
    const detail = [];
    detail.push(`好点吸附 ×${state.stats.good}  Perfect ×${state.stats.perfect}  坏点 ×${state.stats.bad}`);
    detail.push(`构图 ${state.clips.filter((c) => c.comp.snapped).length}/${state.clips.length} 个素材  ·  时长 ${totalDur().toFixed(1)}s`);
    if (o.mystery) detail.push(state.anomalySeen ? '👁 你看到了 3 点 15 分的人。' : '👁 你什么都没注意到。');
    $('detail-line').textContent = detail.join('｜');
    const replies = o.reply;
    let reply;
    if (score >= 78) reply = replies[0];
    else if (score >= 62) reply = replies[3];
    else if (score >= 45) reply = replies[2];
    else reply = replies[1];
    $('client-line').textContent = `${o.avatar} ${o.client}：${reply}`;
    $('deliver-progress-wrap').style.display = 'none';
    $('deliver-result').hidden = false;
  }

  function resetForOrder(o) {
    state.order = o;
    state.clips = [];
    state.playhead = 0;
    state.playing = false;
    state.selectedId = null;
    state.stats = { good: 0, bad: 0, perfect: 0 };
    state.anomalySeen = 0;
    state.previewMatId = null;
    state.budget = 688;
    // 预置两段素材，方便直接上手
    const seeds = ['wedding', 'dance'];
    let t = 0;
    for (const id of seeds) {
      const m = MATERIALS.find((x) => x.id === id);
      state.clips.push({
        id: uid(), mid: m.id, in: 0, out: Math.min(m.dur, 4.5), start: t,
        filter: 'none', comp: { dx: 0, dy: 0, scale: 1.4, snapped: false },
      });
      t += Math.min(m.dur, 4.5);
    }
    state.selectedId = state.clips[0].id;
    const ov = $('deliver-overlay');
    ov.hidden = true;
    $('deliver-progress-wrap').style.display = '';
    $('deliver-result').hidden = true;
    renderAll();
  }

  // ---------- 事件绑定 ----------
  function bindResize() {
    const startResize = (e, mode) => {
      e.preventDefault();
      ensureAudio();
      const startX = e.clientX, startY = e.clientY;
      const cs = getComputedStyle(document.documentElement);
      const poolW = parseFloat(cs.getPropertyValue('--pool-w')) || 340;
      const inspW = parseFloat(cs.getPropertyValue('--insp-w')) || 250;
      const tlH = parseFloat(cs.getPropertyValue('--tl-h')) || 172;
      const rs = document.documentElement.style;
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (mode === 'pool') rs.setProperty('--pool-w', clamp(poolW + dx, 240, 500) + 'px');
        if (mode === 'insp') rs.setProperty('--insp-w', clamp(inspW - dx, 220, 440) + 'px');
        if (mode === 'tl') rs.setProperty('--tl-h', clamp(tlH - dy, 110, 420) + 'px');
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
    $('resize-pool').addEventListener('pointerdown', (e) => startResize(e, 'pool'));
    $('resize-insp').addEventListener('pointerdown', (e) => startResize(e, 'insp'));
    $('resize-tl').addEventListener('pointerdown', (e) => startResize(e, 'tl'));
  }

  function bindEvents() {
    bindResize();
    $('btn-play').addEventListener('click', () => { ensureAudio(); state.playing ? pause() : play(); });
    $('btn-start').addEventListener('click', () => { ensureAudio(); pause(); state.playhead = 0; updatePlayhead(); renderPreview(); });
    $('btn-end').addEventListener('click', () => { ensureAudio(); pause(); state.playhead = totalDur(); updatePlayhead(); renderPreview(); });
    $('btn-prev').addEventListener('click', () => { ensureAudio(); pause(); state.playhead = clamp(state.playhead - 1 / 25, 0, totalDur()); updatePlayhead(); renderPreview(); });
    $('btn-next-f').addEventListener('click', () => { ensureAudio(); pause(); state.playhead = clamp(state.playhead + 1 / 25, 0, totalDur()); updatePlayhead(); renderPreview(); });
    $('btn-cut').addEventListener('click', () => { ensureAudio(); cutAt(state.playhead); });
    $('btn-delete').addEventListener('click', () => { const c = selected(); if (c) removeClip(c.id); });
    $('btn-deliver').addEventListener('click', deliver);
    $('btn-retry').addEventListener('click', () => { $('deliver-overlay').hidden = true; $('deliver-progress-wrap').style.display = ''; state.stats = { good: 0, bad: 0, perfect: 0 }; renderAll(); });
    $('btn-next').addEventListener('click', () => resetForOrder(state.order));
    $('btn-center').addEventListener('click', () => { const c = selected(); if (!c) return; ensureAudio(); c.comp.dx = 0; c.comp.dy = 0; c.comp.snapped = true; popup('居中，好构图！', 'good'); sndGood(); renderAll(); });
    $('scale-slider').addEventListener('input', (e) => setScale(+e.target.value));

    document.querySelectorAll('.tool-btn[data-tool]').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn[data-tool]').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        state.tool = b.dataset.tool;
      });
    });

    // 走带：点击/拖动定位（带吸附）
    const rulerWrap = $('ruler-wrap');
    const seekFrom = (e) => {
      const rect = rulerWrap.getBoundingClientRect();
      let t = clamp((e.clientX - rect.left) / PPS, 0, totalDur());
      const mk = nearestMarker(t);
      if (mk && mk.type !== 'anomaly') { t = mk.t; onMarkerFeedback(mk.type); }
      else if (mk && mk.type === 'anomaly') { t = mk.t; onMarkerFeedback('anomaly'); }
      state.playhead = t;
      state.playing = false;
      $('btn-play').textContent = '▶';
      updatePlayhead();
      renderPreview();
    };
    rulerWrap.addEventListener('pointerdown', (e) => {
      ensureAudio();
      seekFrom(e);
      const move = (ev) => seekFrom(ev);
      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });

    // 素材拖入时间线
    const track = $('track');
    track.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; $('drop-hint').style.display = 'none'; });
    track.addEventListener('dragleave', () => { $('drop-hint').style.display = state.clips.length ? 'none' : 'block'; });
    track.addEventListener('drop', (e) => {
      e.preventDefault();
      const mid = e.dataTransfer.getData('text/plain');
      const m = MATERIALS.find((x) => x.id === mid);
      if (!m) return;
      ensureAudio();
      const rect = track.getBoundingClientRect();
      const t = clamp((e.clientX - rect.left) / PPS, 0, 60);
      const dur = Math.min(m.dur, 4.5);
      const overlap = state.clips.some((oc) => t < oc.start + (oc.out - oc.in) && oc.start < t + dur);
      let start = t, idx = state.clips.length;
      if (!overlap) {
        for (let i = 0; i < state.clips.length; i++) {
          const oc = state.clips[i];
          if (t < oc.start + (oc.out - oc.in) / 2) { idx = i; break; }
        }
      } else {
        start = totalDur();
      }
      addClip(m, start, idx);
    });

    // 构图拖拽
    $('preview-stage').addEventListener('pointerdown', startCompDrag);

    // 键盘
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); ensureAudio(); state.playing ? pause() : play(); }
      if (e.code === 'ArrowLeft') { state.playhead = clamp(state.playhead - 0.2, 0, totalDur()); updatePlayhead(); renderPreview(); }
      if (e.code === 'ArrowRight') { state.playhead = clamp(state.playhead + 0.2, 0, totalDur()); updatePlayhead(); renderPreview(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected()) removeClip(selected().id);
      if (e.key === 'Escape') { if (!$('deliver-overlay').hidden) $('deliver-overlay').hidden = true; }
    });

    window.addEventListener('resize', renderPreview);
  }

  // ---------- 启动 ----------
  function init() {
    renderMediaList();
    bindEvents();
    resetForOrder(ORDERS[0]);
  }
  init();
})();
