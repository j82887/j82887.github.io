(() => {
  const progress = document.querySelector('.scroll-progress span');
  const canvas = document.getElementById('flow-canvas');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!canvas || !progress) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0, height = 0, dpr = 1, scrollProgress = 0;
  let speed = 0, lastY = scrollY, raf = 0;
  let particles = [];
  const random = (a, b) => a + Math.random() * (b - a);
  const mobile = () => width < 700;
  const centerX = (y, time) => width * (mobile() ? .84 : .79)
    + Math.sin(y * .0035 + time * .00026) * (mobile() ? 24 : 72)
    + Math.sin(y * .007 - time * .00019) * (mobile() ? 9 : 23);
  const pathX = (y, lane, time) => centerX(y, time)
    + lane * (mobile() ? 18 : 36)
    + Math.sin(y * .008 + time * .00052 + lane * 1.4) * (mobile() ? 6 : 17);

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: mobile() ? 58 : 145 }, () => ({
      y: random(-height, height), lane: random(-2.7, 2.7),
      drift: random(.75, 2.1), radius: random(.6, 2), phase: random(0, Math.PI * 2)
    }));
    if (reduceMotion.matches) ctx.clearRect(0, 0, width, height);
  }

  function onScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollProgress = Math.min(1, Math.max(0, scrollY / max));
    progress.style.transform = `scaleX(${scrollProgress})`;
    speed = Math.min(32, speed + Math.abs(scrollY - lastY) * .12);
    lastY = scrollY;
  }

  function trace(lane, time) {
    ctx.beginPath();
    for (let y = -180; y <= height + 180; y += 12) {
      const x = pathX(y, lane, time);
      if (y === -180) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const small = mobile();
    const glow = ctx.createLinearGradient(width * (small ? .53 : .55), 0, width, 0);
    glow.addColorStop(0, 'rgba(255,85,18,0)');
    glow.addColorStop(.55, 'rgba(255,91,19,.06)');
    glow.addColorStop(1, 'rgba(255,119,33,.13)');
    trace(0, time);
    ctx.strokeStyle = glow;
    ctx.lineWidth = small ? 100 : 250;
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    for (let lane = -3; lane <= 3; lane++) {
      trace(lane, time);
      ctx.strokeStyle = `rgba(255,${lane === 0 ? 174 : 111},${lane === 0 ? 82 : 31},${(small ? .35 : .51) / (1 + Math.abs(lane) * .32)})`;
      ctx.lineWidth = lane === 0 ? (small ? 2.5 : 3.5) : (small ? 1.1 : 1.7);
      ctx.shadowColor = '#ff7124';
      ctx.shadowBlur = lane === 0 ? (small ? 20 : 38) : 18;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    for (const p of particles) {
      p.y += p.drift * (1.15 + speed * .18);
      if (p.y > height + 160) p.y = -160;
      const x = pathX(p.y, p.lane, time) + Math.sin(time * .001 + p.phase) * 7;
      const tail = (small ? 42 : 90) + speed * 2.2;
      const streak = ctx.createLinearGradient(x, p.y - tail, x, p.y + 4);
      streak.addColorStop(0, 'rgba(255,91,18,0)');
      streak.addColorStop(.65, 'rgba(255,116,32,.2)');
      streak.addColorStop(1, `rgba(255,187,92,${.4 + .18 * p.drift})`);
      ctx.fillStyle = streak;
      ctx.fillRect(x - p.radius / 2, p.y - tail, p.radius, tail + 4);
      ctx.beginPath();
      ctx.arc(x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,206,130,.8)';
      ctx.fill();
    }

    const crestY = height * (.18 + scrollProgress * .68);
    const crestX = centerX(crestY, time);
    const radius = small ? 62 : 135;
    const crest = ctx.createRadialGradient(crestX, crestY, 3, crestX, crestY, radius);
    crest.addColorStop(0, 'rgba(255,208,124,.43)');
    crest.addColorStop(.23, 'rgba(255,105,27,.21)');
    crest.addColorStop(1, 'rgba(255,102,21,0)');
    ctx.fillStyle = crest;
    ctx.fillRect(crestX - radius, crestY - radius, radius * 2, radius * 2);
    ctx.globalCompositeOperation = 'source-over';
    speed *= .9;
    raf = requestAnimationFrame(draw);
  }

  function motionMode() {
    cancelAnimationFrame(raf);
    document.documentElement.classList.toggle('js-motion', !reduceMotion.matches);
    if (reduceMotion.matches) {
      ctx.clearRect(0, 0, width, height);
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    } else {
      document.querySelectorAll('.reveal').forEach(el => {
        if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-visible');
      });
      raf = requestAnimationFrame(draw);
    }
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: .09, rootMargin: '0px 0px 50px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  addEventListener('resize', resize, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  reduceMotion.addEventListener('change', motionMode);
  resize(); onScroll(); motionMode();
})();
