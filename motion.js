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
  let lastTime = 0;
  const random = (a, b) => a + Math.random() * (b - a);
  const mobile = () => width < 700;
  const centerX = (y, time) => width * (mobile() ? .88 : .78)
    + Math.sin(y * .0035 + time * .00026) * (mobile() ? 45 : 125)
    + Math.sin(y * .007 - time * .00019) * (mobile() ? 16 : 40);
  const pathX = (y, lane, time) => centerX(y, time)
    + lane * (mobile() ? 25 : 64)
    + Math.sin(y * .008 + time * .00052 + lane * 1.4) * (mobile() ? 10 : 24);

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth;
    height = innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: mobile() ? 70 : 180 }, () => ({
      y: random(-height, height), lane: random(-3.6, 3.6),
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
    const delta = lastTime ? Math.min((time - lastTime) / 16.667, 2) : 1;
    lastTime = time;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    // Nested broad strokes build a luminous river without costly full-screen blur.
    for (const [size, alpha] of [[620,.025],[460,.035],[310,.045],[180,.065]]) {
      trace(0, time);
      ctx.strokeStyle = `rgba(255,88,18,${alpha})`;
      ctx.lineWidth = small ? size * .48 : size;
      ctx.stroke();
    }
    const strands = small ? 16 : 32;
    for (let i = 0; i <= strands; i++) {
      const lane = (i / strands - .5) * 7.2;
      const core = Math.abs(lane) < .7;
      trace(lane, time);
      ctx.strokeStyle = `rgba(255,${core ? 183 : 112},${core ? 99 : 35},${core ? .62 : .26})`;
      ctx.lineWidth = core ? (small ? 2 : 3.4) : (i % 3 === 0 ? 1.8 : .8);
      ctx.stroke();
      // Moving highlights follow each curved strand instead of straight rain streaks.
      ctx.setLineDash([small ? 80 : 160, 430 + i * 17]);
      ctx.lineDashOffset = -time * (.12 + i * .002) - i * 83;
      ctx.strokeStyle = core ? 'rgba(255,226,173,.85)' : 'rgba(255,163,69,.65)';
      ctx.lineWidth = core ? 2.2 : 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const p of particles) {
      p.y += p.drift * (1.8 + speed * .18) * delta;
      if (p.y > height + 160) p.y = -160;
      const x = pathX(p.y, p.lane, time) + Math.sin(time * .001 + p.phase) * 7;
      const tail = (small ? 75 : 170) + speed * 2.2;
      const streak = ctx.createLinearGradient(x, p.y - tail, x, p.y + 4);
      streak.addColorStop(0, 'rgba(255,91,18,0)');
      streak.addColorStop(.65, 'rgba(255,116,32,.2)');
      streak.addColorStop(1, `rgba(255,187,92,${.4 + .18 * p.drift})`);
      ctx.strokeStyle = streak;
      ctx.lineWidth = p.radius;
      ctx.beginPath();
      for (let y = p.y - tail; y <= p.y; y += tail / 12) {
        const px = pathX(y, p.lane, time) + Math.sin(time * .001 + p.phase) * 7;
        if (y === p.y - tail) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,206,130,.8)';
      ctx.fill();
    }

    const crestY = height * (.18 + scrollProgress * .68);
    const crestX = centerX(crestY, time);
    const radius = small ? 110 : 240;
    const crest = ctx.createRadialGradient(crestX, crestY, 3, crestX, crestY, radius);
    crest.addColorStop(0, 'rgba(255,208,124,.43)');
    crest.addColorStop(.23, 'rgba(255,105,27,.21)');
    crest.addColorStop(1, 'rgba(255,102,21,0)');
    ctx.fillStyle = crest;
    ctx.fillRect(crestX - radius, crestY - radius, radius * 2, radius * 2);
    ctx.globalCompositeOperation = 'source-over';
    speed *= Math.pow(.9, delta);
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
