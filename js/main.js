/* Restaurant du Golf · la bola entra en el hoyo 19, y un mini putt en canvas donde el hoyo es la reserva */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  const D = window.I18N;
  let LANG = 'fr';
  const u = () => D.ui[LANG];
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };

  function applyLang(l) {
    LANG = l;
    document.documentElement.lang = l;
    $$('[data-i18n]').forEach((el) => {
      if (el.dataset.fr === undefined) el.dataset.fr = el.innerHTML;
      el.innerHTML = l === 'fr' ? el.dataset.fr : (D.dom[l] && D.dom[l][el.dataset.i18n]) || el.dataset.fr;
    });
    $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    store.set('dg-lang', l);
    $('#reviews').innerHTML = D.reviews[l].map(([t, w]) => `<figure class="rv"><p>${l === 'fr' ? '« ' + t + ' »' : '«' + t + '»'}</p><cite>${w}, Google</cite></figure>`).join('');
    paintStrokes();
  }
  $$('.lang button').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));

  /* ---------- mini putt ---------- */
  const green = $('#green'), cv = $('#greenCanvas'), g = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 10, s: 1 };
  const hole = { x: 0, y: 0, r: 15 };
  let aiming = null, strokes = 0, done = false, raf = 0, sinking = false;
  function size() {
    W = green.clientWidth; H = green.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    ball.r = W < 500 ? 9 : 11; hole.r = ball.r * 1.45;
    hole.x = W * 0.82; hole.y = H * 0.42;
  }
  function reset() {
    ball.x = W * 0.16; ball.y = H * 0.6; ball.vx = ball.vy = 0; ball.s = 1;
    strokes = 0; done = false; sinking = false;
    $('#win').classList.remove('is-on');
    paintStrokes(); draw();
  }
  function paintStrokes() { $('#strokes').textContent = strokes ? `${u().strokes} : ${strokes}` : u().hint; }
  function draw() {
    g.clearRect(0, 0, W, H);
    // agujero y bandera
    g.fillStyle = '#0c2615'; g.beginPath(); g.ellipse(hole.x, hole.y, hole.r, hole.r * 0.8, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(hole.x, hole.y, hole.r + 6, (hole.r + 6) * 0.8, 0, 0, Math.PI * 2); g.stroke();
    const near = Math.hypot(ball.x - hole.x, ball.y - hole.y) < 70;
    if (!near) {
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(hole.x, hole.y); g.lineTo(hole.x, hole.y - 92); g.stroke();
      g.fillStyle = '#1f3f99'; g.beginPath(); g.moveTo(hole.x + 1.5, hole.y - 92); g.lineTo(hole.x + 44, hole.y - 78); g.lineTo(hole.x + 1.5, hole.y - 64); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.font = `600 13px Brygada 1918, serif`; g.fillText('19', hole.x + 9, hole.y - 74);
    }
    // línea de tiro
    if (aiming) {
      const dx = aiming.sx - aiming.x, dy = aiming.sy - aiming.y;
      const len = Math.min(170, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      g.setLineDash([4, 7]); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(ball.x, ball.y); g.lineTo(ball.x + Math.cos(a) * len * 1.6, ball.y + Math.sin(a) * len * 1.6); g.stroke(); g.setLineDash([]);
      g.fillStyle = `hsla(${120 - len * 0.7}, 70%, 60%, .9)`; g.beginPath(); g.arc(ball.x, ball.y, ball.r + 4 + len / 14, 0, Math.PI * 2); g.globalAlpha = 0.25; g.fill(); g.globalAlpha = 1;
    }
    // bola
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(ball.x + 2, ball.y + 3, ball.r * ball.s, ball.r * 0.6 * ball.s, 0, 0, Math.PI * 2); g.fill();
    const grd = g.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, ball.r * ball.s);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#cfd5e2');
    g.fillStyle = grd; g.beginPath(); g.arc(ball.x, ball.y, ball.r * ball.s, 0, Math.PI * 2); g.fill();
  }
  function step(t) {
    const m = 18;
    ball.x += ball.vx; ball.y += ball.vy;
    ball.vx *= 0.982; ball.vy *= 0.982;
    if (ball.x < m || ball.x > W - m) { ball.vx *= -0.7; ball.x = Math.max(m, Math.min(W - m, ball.x)); }
    if (ball.y < m || ball.y > H - m) { ball.vy *= -0.7; ball.y = Math.max(m, Math.min(H - m, ball.y)); }
    const d = Math.hypot(ball.x - hole.x, ball.y - hole.y), sp = Math.hypot(ball.vx, ball.vy);
    if (d < hole.r && sp < 9) return sink();
    if (d < hole.r && sp >= 9) { ball.vx += (ball.x - hole.x) * 0.02; ball.vy += (ball.y - hole.y) * 0.02; }
    draw();
    if (sp > 0.08) raf = requestAnimationFrame(step); else { ball.vx = ball.vy = 0; raf = 0; }
  }
  function sink() {
    sinking = true; done = true;
    const fin = () => {
      const msg = strokes === 1 ? u().m1 : strokes === 2 ? u().m2 : strokes === 3 ? u().m3 : u().m4;
      $('#winMsg').textContent = msg;
      $('#win').classList.add('is-on');
    };
    if (!hasGsap || REDUCE) { ball.s = 0; draw(); fin(); return; }
    gsap.to(ball, { x: hole.x, y: hole.y, s: 0.2, duration: 0.35, ease: 'power2.in', onUpdate: draw, onComplete: () => { ball.s = 0; draw(); fin(); } });
  }
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  green.addEventListener('pointerdown', (e) => {
    if (done || raf) return;
    const p = pos(e);
    aiming = { sx: p.x, sy: p.y, x: p.x, y: p.y };
    green.setPointerCapture(e.pointerId);
    green.style.cursor = 'grabbing';
  });
  green.addEventListener('pointermove', (e) => { if (!aiming) return; const p = pos(e); aiming.x = p.x; aiming.y = p.y; draw(); });
  green.addEventListener('pointerup', () => {
    if (!aiming) return;
    const dx = aiming.sx - aiming.x, dy = aiming.sy - aiming.y;
    const len = Math.min(170, Math.hypot(dx, dy));
    aiming = null; green.style.cursor = '';
    if (len < 8) { draw(); return; }
    const a = Math.atan2(dy, dx), power = len * 0.115;
    ball.vx = Math.cos(a) * power; ball.vy = Math.sin(a) * power;
    strokes++; paintStrokes();
    raf = requestAnimationFrame(step);
  });
  green.tabIndex = 0;
  green.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !done && !raf) {
      e.preventDefault();
      const a = Math.atan2(hole.y - ball.y, hole.x - ball.x) + (Math.random() - 0.5) * 0.12;
      const d = Math.hypot(hole.x - ball.x, hole.y - ball.y);
      const power = Math.sqrt(d) * 0.62 * (0.9 + Math.random() * 0.2);
      ball.vx = Math.cos(a) * power; ball.vy = Math.sin(a) * power;
      strokes++; paintStrokes(); raf = requestAnimationFrame(step);
    }
  });
  $('#again').addEventListener('click', reset);
  addEventListener('resize', () => { size(); reset(); });

  /* ---------- entrada ---------- */
  function heroIn() {
    if (!hasGsap || REDUCE) return;
    gsap.timeline()
      .from('.hero__big', { yPercent: 60, opacity: 0, duration: 1.3, ease: 'expo.out' })
      .from('.hero__title, .hero__sub, .hero__cta', { y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, '-=1')
      .from('.hero__fig', { clipPath: 'inset(0 0 0 100% round 6px)', duration: 1.4, ease: 'expo.inOut' }, 0)
      .from('.hero__fig img', { scale: 1.2, duration: 1.8, ease: 'expo.out' }, 0.2);
  }
  const tee = $('#tee');
  let seen = false;
  try { seen = sessionStorage.getItem('dg-intro') === '1'; sessionStorage.setItem('dg-intro', '1'); } catch (e) { }
  if (!hasGsap || REDUCE || seen) { tee.remove(); heroIn(); }
  else {
    document.body.classList.add('is-locked');
    const holeX = innerWidth * 0.62;
    const tl = gsap.timeline({ onComplete: () => { tee.remove(); document.body.classList.remove('is-locked'); } });
    tl.to('.tee__ball', { x: holeX + 28, rotate: 720, duration: 1.3, ease: 'power2.out' })
      .to('.tee__ball', { y: 14, scale: 0.4, opacity: 0, duration: 0.22, ease: 'power2.in' })
      .to('.tee__flag', { y: -40, rotate: -12, duration: 0.45, ease: 'back.out(2)' }, '-=0.05')
      .to('.tee__num', { opacity: 1, y: -10, duration: 0.8, ease: 'expo.out' }, '-=0.3')
      .to(tee, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '+=0.25')
      .add(heroIn, '-=0.5');
    tee.addEventListener('click', () => tl.progress(1));
  }

  /* ---------- scroll ---------- */
  function scrollFx() {
    if (!hasGsap || REDUCE) return;
    const nav = $('#nav');
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { const y = s.scroll(); nav.classList.toggle('is-solid', y > 40); nav.classList.toggle('is-hidden', s.direction === 1 && y > 700); } });
    gsap.from('.view__strip figure', { clipPath: 'inset(100% 0 0 0 round 6px)', duration: 1.3, ease: 'expo.inOut', stagger: 0.12, scrollTrigger: { trigger: '.view__strip', start: 'top 80%' } });
    ScrollTrigger.batch('.sg', { start: 'top 88%', once: true, onEnter: (els) => gsap.from(els, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }) });
    gsap.from('.score tr', { opacity: 0, x: -12, duration: 0.6, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: '.score', start: 'top 80%' } });
    gsap.from('.green', { scale: 0.92, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.putt', start: 'top 75%' } });
    ScrollTrigger.batch('.rv', { start: 'top 90%', once: true, onEnter: (els) => gsap.from(els, { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1 }) });
    gsap.from('.visit__fig', { clipPath: 'inset(0 100% 0 0 round 6px)', duration: 1.3, ease: 'expo.inOut', scrollTrigger: { trigger: '.visit', start: 'top 75%' } });
  }

  size(); reset();
  const initial = [new URLSearchParams(location.search).get('lang'), store.get('dg-lang'), (navigator.language || '').slice(0, 2)].find((l) => l === 'fr' || l === 'es') || 'fr';
  applyLang(initial);
  scrollFx();
  addEventListener('load', () => { size(); reset(); hasGsap && ScrollTrigger.refresh(); });
})();
