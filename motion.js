(() => {
  const progress = document.querySelector('.scroll-progress span');
  const canvas = document.getElementById('flow-canvas');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas || !progress) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  let width = 0, height = 0, dpr = 1, scrollProgress = 0, speed = 0, lastY = scrollY, frame = 0, raf = 0;
  let particles = [];
  const random = (a, b) => a + Math.random() * (b - a);
  const pathX = (y, lane, time) => width * (width < 700 ? 0.82 : 0.77) + Math.sin(y * .0043 + time * .00025 + lane * .6) * (width < 700 ? 22 : 60) + lane * (width < 700 ? 14 : 32);
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.6);
    width = innerWidth; height = innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: width < 700 ? 32 : 65 }, () => ({ y: random(-height, height), lane: random(-2, 2), drift: random(.35, 1.25), radius: random(.6, 1.8), phase: random(0, Math.PI * 2) }));
    if (reduceMotion.matches) ctx.clearRect(0, 0, width, height);
  }
  function onScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollProgress = Math.min(1, Math.max(0, scrollY / max));
    progress.style.transform = `scaleX(${scrollProgress})`;
    speed = Math.min(26, speed + Math.abs(scrollY - lastY) * .12);
    lastY = scrollY;
  }
  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const mobile = width < 700;
    const baseAlpha = mobile ? .22 : .35;
    for (let lane = -2; lane <= 2; lane++) {
      ctx.beginPath();
      for (let y = -20; y <= height + 30; y += 8) {
        const x = pathX(y, lane, time);
        if (y === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255,${lane === 0 ? 151 : 105},49,${baseAlpha / (Math.abs(lane) + 1)})`;
      ctx.lineWidth = lane === 0 ? 1.5 : .75;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.y += p.drift * (.65 + speed * .12);
      if (p.y > height + 25) p.y = -30;
      const x = pathX(p.y, p.lane, time) + Math.sin(time * .001 + p.phase) * 5;
      const tail = (mobile ? 20 : 35) + speed * 1.7;
      const gradient = ctx.createLinearGradient(x, p.y - tail, x, p.y + 3);
      gradient.addColorStop(0, 'rgba(255,95,24,0)');
      gradient.addColorStop(1, `rgba(255,160,77,${.18 + .24 * p.drift})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - p.radius / 2, p.y - tail, p.radius, tail + 3);
      ctx.beginPath(); ctx.arc(x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,188,100,${.45 + .25 * p.drift})`; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    speed *= .91;
    frame++;
    raf = requestAnimationFrame(draw);
  }
  function motionMode() {
    cancelAnimationFrame(raf);
    document.documentElement.classList.toggle('js-motion', !reduceMotion.matches);
    if (reduceMotion.matches) { ctx.clearRect(0, 0, width, height); document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible')); }
    else { document.querySelectorAll('.reveal').forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-visible'); }); raf = requestAnimationFrame(draw); }
  }
  const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } }, { threshold: .09, rootMargin: '0px 0px 50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  reduceMotion.addEventListener('change', motionMode);
  resize(); onScroll(); motionMode();
})();
