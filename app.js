const clock = document.querySelector('#clock');
const coords = document.querySelector('#coords');
const glow = document.querySelector('.cursor-glow');
const sound = document.querySelector('.sound');
const themeToggle = document.querySelector('.theme-toggle');
const hud = document.querySelector('.hud');
const progressTrack = document.querySelector('.scroll-progress');
const progress = document.querySelector('.scroll-progress span');
const navLinks = [...document.querySelectorAll('[data-nav]')];

function updateClock() {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(new Date());
  clock.textContent = `GMT+7 VN ${time}`;
}
updateClock();
setInterval(updateClock, 1000);

window.addEventListener('pointermove', (event) => {
  const x = Math.round(event.clientX).toString().padStart(4, '0');
  const y = Math.round(event.clientY).toString().padStart(4, '0');
  coords.innerHTML = `${x} X&nbsp;&nbsp;${y} Y`;
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
  glow.style.opacity = '1';
});

sound.addEventListener('click', () => {
  const active = sound.getAttribute('aria-pressed') !== 'true';
  sound.setAttribute('aria-pressed', String(active));
  sound.textContent = active ? 'SOUND [|]' : 'SOUND [·]';
});

themeToggle.addEventListener('click', () => {
  const dark = document.body.dataset.theme !== 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.textContent = dark ? 'THEME [D]' : 'THEME [L]';
});

let lastScrollY = window.scrollY;
let scrollTicking = false;
let previousFrameY = window.scrollY;
let bendTarget = 0;
let bendCurrent = 0;
let tiltTarget = 0;
let tiltCurrent = 0;
let lastScrollMotion = 0;

function updateScrollInterface() {
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const ratio = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
  progress.style.transform = `scaleX(${ratio})`;

  const goingDown = window.scrollY > lastScrollY;
  const headerHidden = goingDown && window.scrollY > 160;
  hud.classList.toggle('is-hidden', headerHidden);
  progressTrack.classList.toggle('is-header-hidden', headerHidden);
  lastScrollY = window.scrollY;
  scrollTicking = false;
}

addEventListener('scroll', () => {
  const delta = window.scrollY - previousFrameY;
  previousFrameY = window.scrollY;
  if (Math.abs(delta) > .25) {
    bendTarget = Math.min(.42 + Math.abs(delta) / 22, 1);
    tiltTarget = Math.max(-3.2, Math.min(3.2, delta / 16));
    lastScrollMotion = performance.now();
  }
  if (!scrollTicking) {
    requestAnimationFrame(updateScrollInterface);
    scrollTicking = true;
  }
}, { passive: true });

function animateCylinder() {
  const stillMoving = performance.now() - lastScrollMotion < 110;
  if (!stillMoving) {
    bendTarget *= .84;
    tiltTarget *= .8;
  }
  bendCurrent += (bendTarget - bendCurrent) * (stillMoving ? .24 : .12);
  tiltCurrent += (tiltTarget - tiltCurrent) * (stillMoving ? .2 : .12);

  const stableBend = bendCurrent < .001 ? 0 : bendCurrent;
  const stableTilt = Math.abs(tiltCurrent) < .001 ? 0 : tiltCurrent;
  document.documentElement.style.setProperty('--scroll-bend', stableBend.toFixed(4));
  document.documentElement.style.setProperty('--scroll-tilt', stableTilt.toFixed(4));
  requestAnimationFrame(animateCylinder);
}

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) animateCylinder();

const observedSections = ['work', 'about', 'contact']
  .map(id => document.getElementById(id))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => {
      const active = link.dataset.nav === entry.target.id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

observedSections.forEach(section => sectionObserver.observe(section));
updateScrollInterface();

const canvas = document.querySelector('#signal-canvas');
const context = canvas.getContext('2d');
let pointer = { x: innerWidth * .5, y: innerHeight * .5 };
let previous = { ...pointer };
let traces = [];

function sizeCanvas() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = canvas.clientWidth * ratio;
  canvas.height = canvas.clientHeight * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}
sizeCanvas();
addEventListener('resize', sizeCanvas);
addEventListener('pointermove', event => { pointer = { x: event.clientX, y: event.clientY }; });

function draw() {
  context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  previous.x += (pointer.x - previous.x) * .08;
  previous.y += (pointer.y - previous.y) * .08;
  if (Math.hypot(pointer.x - previous.x, pointer.y - previous.y) > 2) {
    traces.push({ x: previous.x, y: previous.y, life: 1 });
  }
  traces = traces.slice(-42).filter(point => point.life > .015);
  traces.forEach((point, index) => {
    point.life *= .94;
    const radius = 10 + index * .75;
    const gradient = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    const darkTheme = document.body.dataset.theme === 'dark';
    const trailColor = darkTheme ? '145,177,255' : '45,102,190';
    gradient.addColorStop(0, `rgba(${trailColor},${point.life * .2})`);
    gradient.addColorStop(1, `rgba(${trailColor},0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  });
  requestAnimationFrame(draw);
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) draw();
