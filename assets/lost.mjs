// Lost? A small runner for the 404 page. Press space, the up arrow, or tap the
// car to jump the cones. Distance is the score; the best run stays in this browser.
const canvas = document.getElementById('lost-canvas');
const status = document.getElementById('lost-status');
const button = document.getElementById('lost-start');

if (canvas && status && button) {
  const ctx = canvas.getContext('2d');
  const W = 560, H = 150, GROUND = 112;
  const CAR_X = 60, CAR_W = 66;
  const GRAVITY = 1700, JUMP = -560;
  const BEST_KEY = 'ap-lost-best-v1';
  const idleText = 'Stuck here? Press space or tap the car.';

  let state = 'idle';          // idle | running | crashed
  let speed = 0, distance = 0, best = 0;
  let carY = 0, carVy = 0;     // carY is the car's bottom edge offset above the ground (negative = airborne)
  let obstacles = [], groundOffset = 0, wheelAngle = 0;
  let last = 0, frame = 0, crashedAt = 0, shownFitting = false, fittingUntil = 0;
  let dpr = 1;

  try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { /* storage may be unavailable */ }

  const colours = () => {
    const s = getComputedStyle(document.documentElement);
    return {
      ink: s.getPropertyValue('--ink').trim() || '#000',
      paper: s.getPropertyValue('--paper').trim() || '#fff',
      muted: s.getPropertyValue('--muted').trim() || '#666',
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
    last = performance.now();
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
    if (distance > best) {
      best = Math.floor(distance);
      try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* ignore */ }
    }
    setStatus(`Crashed at ${metres(distance)}. Best ${metres(best)}. Space to go again.`);
    button.textContent = 'Go again';
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
      // collision: car body box, slightly forgiving
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
    // x: left edge, y: ground line for the wheels
    ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = c.ink; ctx.fillStyle = c.paper;
    // rear wing
    ctx.beginPath(); ctx.rect(x + 0, y - 26, 12, 4); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 6, y - 22); ctx.lineTo(x + 8, y - 14); ctx.stroke();
    // body
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 5);
    ctx.lineTo(x + 8, y - 14);
    ctx.lineTo(x + 20, y - 16);
    ctx.lineTo(x + 28, y - 22);
    ctx.lineTo(x + 36, y - 22);
    ctx.lineTo(x + 40, y - 15);
    ctx.lineTo(x + 50, y - 12);
    ctx.lineTo(x + 64, y - 8);
    ctx.lineTo(x + 66, y - 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // helmet
    ctx.beginPath(); ctx.arc(x + 31, y - 20, 3.5, Math.PI, 0); ctx.fill(); ctx.stroke();
    // front wing
    ctx.beginPath(); ctx.rect(x + 56, y - 6, 14, 3); ctx.fill(); ctx.stroke();
    // wheels
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
    // ground and scrolling ticks
    ctx.strokeStyle = c.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, GROUND + 0.5); ctx.lineTo(W, GROUND + 0.5); ctx.stroke();
    ctx.strokeStyle = c.rule;
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

  // input
  const onKey = event => {
    if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
    const inGame = state !== 'idle' || event.target === button || event.target === canvas;
    if (!inGame) return;
    event.preventDefault();
    if (!event.repeat) jump();
  };
  window.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', event => { event.preventDefault(); canvas.focus({ preventScroll: true }); jump(); });
  button.addEventListener('click', () => { canvas.focus({ preventScroll: true }); jump(); });
  // Pause while the tab is hidden rather than running blind.
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
