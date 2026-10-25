// Lost? A small runner for the 404 page. Press space, the up arrow, or tap the
// car to jump the cones. Distance is the score; the best run stays in this browser
// and, if it is good enough, can go on the shared leaderboard under any name.
const canvas = document.getElementById('lost-canvas');
const status = document.getElementById('lost-status');
const button = document.getElementById('lost-start');
const board = document.getElementById('lost-board');
const boardList = document.getElementById('lost-board-list');
const boardNote = document.getElementById('lost-board-note');
const form = document.getElementById('lost-submit');
const nameInput = document.getElementById('lost-name');

if (canvas && status && button) {
  const ctx = canvas.getContext('2d');
  const W = 560, H = 150, GROUND = 112;
  const CAR_X = 60, CAR_W = 66;
  const GRAVITY = 1700, JUMP = -560;
  const BEST_KEY = 'ap-lost-best-v1', NAME_KEY = 'ap-lost-name-v1';
  const idleText = 'Stuck here? Press space or tap the car.';

  let state = 'idle';          // idle | running | crashed
  let speed = 0, distance = 0, best = 0;
  let carY = 0, carVy = 0;     // carY: car offset above the ground (negative = airborne)
  let obstacles = [], groundOffset = 0, wheelAngle = 0;
  let last = 0, frame = 0, crashedAt = 0, startedAt = 0, shownFitting = false, fittingUntil = 0;
  let dpr = 1;
  let top = [], boardEnabled = null, boardLoading = null, lastRun = null, myName = '';

  try {
    best = Number(localStorage.getItem(BEST_KEY)) || 0;
    myName = localStorage.getItem(NAME_KEY) || '';
  } catch { /* storage may be unavailable */ }

  const colours = () => {
    const s = getComputedStyle(document.documentElement);
    return {
      ink: s.getPropertyValue('--ink').trim() || '#000',
      paper: s.getPropertyValue('--paper').trim() || '#fff',
      rule: s.getPropertyValue('--rule').trim() || '#ddd',
      red: s.getPropertyValue('--red').trim() || '#c8102e',
    };
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.getBoundingClientRect().width || W;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(width * (H / W) * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.width / W, 0, 0);
    draw();
  }

  const metres = n => `${Math.floor(n).toLocaleString('en-GB')} m`;
  function setStatus(text) { if (status.textContent !== text) status.textContent = text; }

  function reset() {
    speed = 270; distance = 0; carY = 0; carVy = 0; obstacles = []; groundOffset = 0; shownFitting = false;
    spawn(W + 120);
  }

  function spawn(x) {
    const r = Math.random();
    const kind = r < 0.55 ? 'cone' : r < 0.85 ? 'cones' : 'tyres';
    const width = kind === 'cone' ? 18 : kind === 'cones' ? 40 : 24;
    const height = kind === 'tyres' ? 30 : 24;
    obstacles.push({ x, kind, width, height });
  }

  function start() {
    reset();
    state = 'running';
    startedAt = last = performance.now();
    if (form) form.hidden = true;
    button.textContent = 'Jump';
    loadBoard();
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function jump() {
    if (state === 'idle') { start(); carVy = JUMP; return; }
    if (state === 'crashed') { if (performance.now() - crashedAt > 350) start(); return; }
    if (carY >= 0) carVy = JUMP;
  }

  function crash() {
    state = 'crashed';
    crashedAt = performance.now();
    lastRun = { score: Math.floor(distance), duration: (crashedAt - startedAt) / 1000 };
    if (distance > best) {
      best = Math.floor(distance);
      try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* ignore */ }
    }
    setStatus(`Crashed at ${metres(distance)}. Best ${metres(best)}. Space to go again.`);
    button.textContent = 'Go again';
    offerSubmission();
  }

  function tick(now) {
    frame = 0;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (state === 'running') {
      speed = Math.min(640, speed + 9 * dt);
      const dx = speed * dt;
      distance += dx / 10;            // 10 px = 1 m
      groundOffset = (groundOffset + dx) % 40;
      wheelAngle += dx / 7;
      carVy += GRAVITY * dt;
      carY += carVy * dt;
      if (carY > 0) { carY = 0; carVy = 0; }
      for (const o of obstacles) o.x -= dx;
      obstacles = obstacles.filter(o => o.x + o.width > -20);
      const lastOb = obstacles[obstacles.length - 1];
      if (!lastOb || lastOb.x < W - (260 + Math.random() * 260) * (speed / 300)) spawn(W + 40);
      const carTop = GROUND + carY - 24, carBottom = GROUND + carY - 2;
      for (const o of obstacles) {
        const overlapX = CAR_X + 8 < o.x + o.width - 3 && CAR_X + CAR_W - 8 > o.x + 3;
        const overlapY = carBottom > GROUND - o.height + 4 && carTop < GROUND;
        if (overlapX && overlapY) { crash(); break; }
      }
      if (state === 'running') {
        if (!shownFitting && distance >= 404) { shownFitting = true; fittingUntil = now + 1400; }
        setStatus(now < fittingUntil ? '404 m. Fitting.' : `${metres(distance)}${best ? ` · Best ${metres(best)}` : ''}`);
      }
    }
    draw();
    if (state === 'running') frame = requestAnimationFrame(tick);
  }

  function drawCar(c, x, y) {
    ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = c.ink; ctx.fillStyle = c.paper;
    ctx.beginPath(); ctx.rect(x, y - 26, 12, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y - 22); ctx.lineTo(x + 8, y - 14); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 5); ctx.lineTo(x + 8, y - 14); ctx.lineTo(x + 20, y - 16); ctx.lineTo(x + 28, y - 22);
    ctx.lineTo(x + 36, y - 22); ctx.lineTo(x + 40, y - 15); ctx.lineTo(x + 50, y - 12); ctx.lineTo(x + 64, y - 8);
    ctx.lineTo(x + 66, y - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 31, y - 20, 3.5, Math.PI, 0); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.rect(x + 56, y - 6, 14, 3); ctx.fill(); ctx.stroke();
    for (const wx of [x + 15, x + 53]) {
      ctx.beginPath(); ctx.arc(wx, y - 7, 7, 0, Math.PI * 2); ctx.fillStyle = c.paper; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(wheelAngle) * 5, y - 7 + Math.sin(wheelAngle) * 5);
      ctx.lineTo(wx - Math.cos(wheelAngle) * 5, y - 7 - Math.sin(wheelAngle) * 5);
      ctx.stroke();
    }
  }

  function drawObstacle(c, o) {
    ctx.lineWidth = 2; ctx.strokeStyle = c.ink; ctx.fillStyle = c.paper;
    const cone = (x) => {
      ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 9, GROUND - 24); ctx.lineTo(x + 18, GROUND); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.red; ctx.beginPath(); ctx.moveTo(x + 4, GROUND - 11); ctx.lineTo(x + 14, GROUND - 11); ctx.lineTo(x + 15.5, GROUND - 7); ctx.lineTo(x + 2.5, GROUND - 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.paper;
    };
    if (o.kind === 'cone') cone(o.x);
    else if (o.kind === 'cones') { cone(o.x); cone(o.x + 22); }
    else {
      for (const [cx, cy] of [[o.x + 12, GROUND - 7], [o.x + 12, GROUND - 22]]) {
        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  function draw() {
    const c = colours();
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = c.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, GROUND + 0.5); ctx.lineTo(W, GROUND + 0.5); ctx.stroke();
    for (let x = -groundOffset; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, GROUND + 8); ctx.lineTo(x + 14, GROUND + 8); ctx.stroke();
    }
    for (const o of obstacles) drawObstacle(c, o);
    drawCar(c, CAR_X, GROUND + carY);
    if (state === 'crashed') {
      ctx.fillStyle = c.red;
      ctx.beginPath(); ctx.arc(CAR_X + 60, GROUND - 14, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- leaderboard ----
  function renderBoard(highlight) {
    if (!board || !boardList) return;
    board.hidden = false;
    boardList.replaceChildren();
    if (!top.length) {
      const li = document.createElement('li');
      li.className = 'ap-lost-empty';
      li.textContent = 'No runs yet. Yours could be first.';
      boardList.append(li);
      return;
    }
    top.forEach((entry, i) => {
      const li = document.createElement('li');
      if (highlight && entry.name === highlight) li.className = 'is-you';
      const rank = document.createElement('span'); rank.textContent = String(i + 1);
      const name = document.createElement('span'); name.textContent = entry.name;
      const score = document.createElement('span'); score.textContent = metres(entry.score);
      li.append(rank, name, score);
      boardList.append(li);
    });
  }

  function loadBoard() {
    if (boardEnabled !== null || boardLoading || !board) return boardLoading;
    boardLoading = fetch('/api/scores', { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : { enabled: false, top: [] })
      .then(data => { boardEnabled = Boolean(data.enabled); top = data.top || []; if (boardEnabled) renderBoard(myName); })
      .catch(() => { boardEnabled = false; })
      .finally(() => { boardLoading = null; });
    return boardLoading;
  }

  function qualifies(score) {
    if (!boardEnabled || score < 10) return false;
    if (top.length < 10) return true;
    return score > top[top.length - 1].score;
  }

  async function offerSubmission() {
    if (!form || !lastRun) return;
    if (boardEnabled === null) await loadBoard();
    if (!qualifies(lastRun.score)) {
      if (boardEnabled && boardNote) boardNote.textContent = top.length ? `Beat ${metres(top[top.length - 1].score)} to get on the board.` : '';
      return;
    }
    const run = lastRun;
    form.hidden = false;
    form.querySelector('label').textContent = `Put ${metres(run.score)} on the board as`;
    if (nameInput) { nameInput.value = myName; nameInput.focus({ preventScroll: true }); }
    if (boardNote) boardNote.textContent = '';
  }

  async function submit(event) {
    event.preventDefault();
    if (!lastRun || !nameInput) return;
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const submitButton = form.querySelector('button');
    submitButton.disabled = true;
    try {
      const r = await fetch('/api/scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: lastRun.score, duration: lastRun.duration }),
      });
      const data = await r.json();
      if (!r.ok) { boardNote.textContent = data.error || 'That did not go through.'; return; }
      myName = name;
      try { localStorage.setItem(NAME_KEY, name); } catch { /* ignore */ }
      top = data.top || top;
      renderBoard(name);
      form.hidden = true;
      boardNote.textContent = data.rank ? `You’re number ${data.rank}.` : 'Added.';
      canvas.focus({ preventScroll: true });
    } catch {
      boardNote.textContent = 'The leaderboard did not answer. Try again in a moment.';
    } finally {
      submitButton.disabled = false;
    }
  }

  // ---- input ----
  const onKey = event => {
    if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
    const tag = (event.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    const inGame = state !== 'idle' || event.target === button || event.target === canvas;
    if (!inGame) return;
    event.preventDefault();
    if (!event.repeat) jump();
  };
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', event => { event.preventDefault(); canvas.focus({ preventScroll: true }); jump(); });
  button.addEventListener('click', () => { canvas.focus({ preventScroll: true }); jump(); });
  if (form) form.addEventListener('submit', submit);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (frame) { cancelAnimationFrame(frame); frame = 0; } }
    else if (state === 'running' && !frame) { last = performance.now(); frame = requestAnimationFrame(tick); }
  });
  window.addEventListener('resize', resize, { passive: true });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);

  canvas.tabIndex = 0;
  setStatus(idleText);
  resize();
}
