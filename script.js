(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- neural network background ---------- */
  const cv = $('#neural'), ctx = cv.getContext('2d');
  let W, H, nodes = [], mouse = { x: -999, y: -999 };
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(110, Math.floor(W * H / 14000));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.8 + .6, h: Math.random() < .5 ? 190 : (Math.random() < .5 ? 255 : 315)
    }));
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of nodes) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140) { p.x += dx / d * 1.2; p.y += dy / d * 1.2; }
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) {
          ctx.strokeStyle = `hsla(${a.h},100%,70%,${(1 - d / 130) * .28})`;
          ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      if (md < 200) {
        ctx.strokeStyle = `hsla(190,100%,70%,${(1 - md / 200) * .5})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
      ctx.fillStyle = `hsla(${a.h},100%,72%,.9)`;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, 7); ctx.fill();
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  size(); frame();
  addEventListener('resize', size);

  /* ---------- cursor glow, progress bar ---------- */
  const glow = $('.cursor-glow');
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px';
  });
  const bar = $('.progress');
  const links = $$('.nav-links a');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
    let cur = '';
    for (const s of $$('section[id]')) if (s.getBoundingClientRect().top < innerHeight * .4) cur = s.id;
    links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + cur));
  }, { passive: true });

  /* ---------- text scramble ---------- */
  const glyphs = '!<>-_\\/[]{}—=+*^?#01アイウエオ';
  function scramble(el) {
    const txt = el.dataset.text; let f = 0;
    const total = 28;
    const tick = () => {
      el.textContent = txt.split('').map((c, i) =>
        c === ' ' ? ' ' : (i < (f / total) * txt.length ? c : glyphs[Math.floor(Math.random() * glyphs.length)])
      ).join('');
      if (f++ < total) requestAnimationFrame(tick); else el.textContent = txt;
    };
    tick();
  }
  if (!reduce) $$('.scramble').forEach((el, i) => setTimeout(() => scramble(el), 250 + i * 300));
  $$('.scramble').forEach(el => el.addEventListener('mouseenter', () => !reduce && scramble(el)));

  /* ---------- rotating role ---------- */
  const roles = ['AI automations', 'LLM integrations', 'n8n pipelines', 'NER models that win', 'full-stack apps', 'things that save hours'];
  const rot = $('#rotator'); let ri = 0;
  async function typeRole() {
    if (reduce) return;
    while (true) {
      const word = roles[ri++ % roles.length];
      for (let i = 0; i <= word.length; i++) { rot.textContent = word.slice(0, i); await wait(55); }
      await wait(1700);
      for (let i = word.length; i >= 0; i--) { rot.textContent = word.slice(0, i); await wait(28); }
      await wait(250);
    }
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  typeRole();

  /* ---------- reveal + counters ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));
  function countUp(el) {
    const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
    const t0 = performance.now(), dur = reduce ? 0 : 1600;
    const step = t => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 4);
      el.textContent = (to * e).toFixed(dec) + (k === 1 ? suf : '');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- tilt + spotlight cards, magnetic buttons ---------- */
  if (fine && !reduce) {
    $$('.tilt').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.transform = `perspective(900px) rotateX(${(.5 - y) * 7}deg) rotateY(${(x - .5) * 9}deg) translateY(-4px)`;
        c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
      });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });
    $$('.magnetic').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- project filters ---------- */
  $$('.f').forEach(btn => btn.addEventListener('click', () => {
    $$('.f').forEach(b => b.classList.toggle('active', b === btn));
    const f = btn.dataset.f;
    $$('#projectGrid .card').forEach(c => c.classList.toggle('hide', f !== 'all' && c.dataset.cat !== f));
  }));

  /* ---------- NER demo ---------- */
  const COLORS = {
    PERSON: '#ff4ecd', CITY: '#00e0ff', PROVINCE_REGION: '#4dd4ff', COUNTRY: '#7cc4ff',
    GOVERNMENT_BODY: '#ffd166', POLITICAL_PARTY: '#ff9f43', ORGANIZATION: '#a78bfa',
    EDUCATIONAL_INSTITUTION: '#c084fc', COURT_LEGAL_BODY: '#f97316', LAW_ACT: '#fb7185',
    EVENT: '#34d399', MEDIA_OUTLET: '#2dd4bf', SPORTS_TEAM: '#86efac', DATE: '#3dffa8',
    TIME: '#a3e635', MONEY: '#facc15', PERCENT: '#fde047', PHONE_NUMBER: '#94a3b8', ID_NUMBER: '#cbd5e1'
  };
  const GAZ = {
    PERSON: ['Shehbaz Sharif', 'Imran Khan', 'Nawaz Sharif', 'Maryam Nawaz', 'Bilawal Bhutto Zardari', 'Asif Ali Zardari', 'Asim Munir', 'Murad Ali Shah', 'Babar Azam', 'Shaheen Afridi', 'Mohammad Rizwan', 'Ishaq Dar', 'Mohsin Naqvi', 'Fazlur Rehman', 'Malala Yousafzai'],
    CITY: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Hyderabad', 'Sialkot', 'Gwadar', 'Gilgit', 'Skardu', 'Abbottabad'],
    PROVINCE_REGION: ['Khyber Pakhtunkhwa', 'Gilgit-Baltistan', 'Balochistan', 'Punjab', 'Sindh', 'Azad Kashmir'],
    COUNTRY: ['Pakistan', 'China', 'India', 'Afghanistan', 'Iran', 'Saudi Arabia', 'United States', 'Turkey', 'UAE', 'Qatar'],
    GOVERNMENT_BODY: ['State Bank of Pakistan', 'National Assembly', 'Senate', 'Election Commission of Pakistan', 'Federal Board of Revenue', 'FBR', 'NADRA', 'ECP', 'FIA', 'NAB', 'Sindh Assembly', 'Punjab Assembly', 'Ministry of Finance', 'Pakistan Army', 'PTA'],
    POLITICAL_PARTY: ['PML-N', 'PTI', 'PPP', 'MQM-P', 'JUI-F', 'Jamaat-e-Islami', 'Pakistan Tehreek-e-Insaf'],
    ORGANIZATION: ['K-Electric', 'PIA', 'Engro', 'IMF', 'World Bank', 'Pakistan Stock Exchange', 'PSX', 'OGDCL', 'Jazz', 'HBL', 'Sui Southern Gas Company'],
    EDUCATIONAL_INSTITUTION: ['NED University', 'LUMS', 'University of Karachi', 'Karachi University', 'NUST', 'FAST', 'IBA Karachi', 'Aga Khan University', 'Punjab University'],
    COURT_LEGAL_BODY: ['Supreme Court', 'Islamabad High Court', 'Sindh High Court', 'Lahore High Court', 'Peshawar High Court', 'Federal Shariat Court', 'Anti-Terrorism Court'],
    LAW_ACT: ['26th Amendment', 'Constitution', 'PECA', 'Finance Bill', 'Army Act', 'Elections Act'],
    EVENT: ['PSL', 'Pakistan Super League', 'Independence Day', 'Champions Trophy', 'Eid ul Fitr', 'Eid ul Adha', 'general elections', 'AI Odyssey 2026'],
    MEDIA_OUTLET: ['Dawn', 'Geo News', 'The News', 'ARY News', 'Express Tribune', 'Samaa', 'PTV'],
    SPORTS_TEAM: ['Karachi Kings', 'Lahore Qalandars', 'Islamabad United', 'Peshawar Zalmi', 'Quetta Gladiators', 'Multan Sultans', 'Green Shirts']
  };
  const RX = [
    ['ID_NUMBER', /\b\d{5}-\d{7}-\d\b/g],
    ['PHONE_NUMBER', /(?:\+92[\s-]?|\b0)3\d{2}[\s-]?\d{7}\b/g],
    ['MONEY', /\b(?:Rs\.?|PKR|\$|USD)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion|trillion|crore|lakh|bn|m))?\b/gi],
    ['PERCENT', /\b\d+(?:\.\d+)?\s?(?:%|percent\b)/gi],
    ['TIME', /\b\d{1,2}:\d{2}\s?(?:[ap]\.?m\.?)?|\b\d{1,2}\s?(?:am|pm)\b/gi],
    ['DATE', /\b(?:\d{1,2}\s)?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s\d{1,2})?(?:,?\s\d{4})?\b|\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b|\b(?:yesterday|today|tomorrow|last week|next week)\b|\b(?:19|20)\d{2}\b/gi]
  ];
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function ner(text) {
    const found = [];
    const add = (s, e, l) => { if (!found.some(f => s < f.e && e > f.s)) found.push({ s, e, l }); };
    for (const [l, rx] of RX) for (const m of text.matchAll(rx)) add(m.index, m.index + m[0].length, l);
    const entries = Object.entries(GAZ).flatMap(([l, ws]) => ws.map(w => [l, w])).sort((a, b) => b[1].length - a[1].length);
    for (const [l, w] of entries) {
      const rx = new RegExp('(?<![\\w-])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'g');
      for (const m of text.matchAll(rx)) add(m.index, m.index + w.length, l);
    }
    // title + capitalised name heuristic
    for (const m of text.matchAll(/\b(?:Mr\.?|Ms\.?|Dr\.?|Justice|Minister|Chief Minister|President|General)\s+((?:[A-Z][a-z]+\s?){1,3})/g)) {
      const name = m[1].trim(), s = m.index + m[0].indexOf(name);
      add(s, s + name.length, 'PERSON');
    }
    return found.sort((a, b) => a.s - b.s);
  }
  const nerIn = $('#nerInput'), nerOut = $('#nerOut'), legend = $('#nerLegend');
  function runNer() {
    const t = nerIn.value, ents = ner(t);
    let html = '', last = 0;
    ents.forEach((e, i) => {
      const c = COLORS[e.l];
      html += esc(t.slice(last, e.s)) +
        `<span class="ent" style="background:${c}22;border:1px solid ${c}88;color:${c};animation-delay:${i * 60}ms">${esc(t.slice(e.s, e.e))}<small>${e.l}</small></span>`;
      last = e.e;
    });
    nerOut.innerHTML = html + esc(t.slice(last)) || '<span style="color:var(--muted)">Type something…</span>';
    const used = [...new Set(ents.map(e => e.l))];
    legend.innerHTML = used.map(l => `<span style="background:${COLORS[l]}22;color:${COLORS[l]}">${l}</span>`).join('');
  }
  const samples = [
    'Prime Minister Shehbaz Sharif met PTI leaders in Islamabad on Monday, while the State Bank of Pakistan raised rates by 1.5% and the Sindh High Court fined K-Electric Rs 50 million.',
    'Karachi Kings beat Lahore Qalandars by 6 wickets in the PSL opener at 8:00 pm on 14 February, Geo News reported.',
    'NADRA said CNIC 42101-1234567-1 was blocked; complaints can be made on 0300-1234567 before Friday.',
    'Students from NED University and LUMS presented at AI Odyssey 2026 in Karachi, Sindh.',
    'The IMF asked Pakistan to raise Rs 1.2 trillion in new taxes before the Finance Bill reaches the National Assembly in June 2026.',
    'Chief Minister Murad Ali Shah announced that Gwadar and Quetta in Balochistan will get new hospitals, Dawn reported yesterday.'
  ];
  let si = 0;
  $('#nerRun').addEventListener('click', runNer);
  $('#nerRandom').addEventListener('click', () => { si = (si + 1) % samples.length; nerIn.value = samples[si]; runNer(); });
  nerIn.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runNer(); });
  runNer();

  /* ---------- Kruskal demo ---------- */
  const g = $('#graph'), gx = g.getContext('2d');
  const PLACES = ['Saddar', 'Clifton', 'DHA', 'Korangi', 'Gulshan', 'Nazimabad', 'Malir', 'Lyari', 'PECHS', 'Orangi', 'Landhi', 'Johar'];
  let V = [], E = [], state = {}, running = false;
  function newGraph() {
    const cols = 4, rows = 3; V = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      V.push({ x: 70 + c * 140 + (Math.random() - .5) * 60, y: 60 + r * 120 + (Math.random() - .5) * 50, n: PLACES[V.length] });
    const set = new Set(); E = [];
    const addE = (a, b) => {
      const k = a < b ? a + '-' + b : b + '-' + a;
      if (a === b || set.has(k)) return; set.add(k);
      E.push({ a, b, w: Math.round(Math.hypot(V[a].x - V[b].x, V[a].y - V[b].y) / 10 + Math.random() * 6), s: 'idle' });
    };
    for (let i = 0; i < V.length; i++) {
      const near = V.map((v, j) => [j, Math.hypot(v.x - V[i].x, v.y - V[i].y)]).filter(p => p[0] !== i).sort((a, b) => a[1] - b[1]);
      addE(i, near[0][0]); addE(i, near[1][0]); if (Math.random() < .6) addE(i, near[2][0]);
    }
    state = { active: -1 }; $('#kStat').textContent = 'cost: —'; draw();
  }
  function draw() {
    gx.clearRect(0, 0, g.width, g.height);
    for (const [i, e] of E.entries()) {
      const a = V[e.a], b = V[e.b];
      const col = e.s === 'take' ? '#3dffa8' : e.s === 'skip' ? 'rgba(255,92,122,.35)' : i === state.active ? '#ffd166' : 'rgba(154,160,199,.28)';
      gx.strokeStyle = col; gx.lineWidth = e.s === 'take' ? 4 : i === state.active ? 4 : 1.5;
      gx.setLineDash(e.s === 'skip' ? [5, 5] : []);
      if (e.s === 'take') { gx.shadowColor = '#3dffa8'; gx.shadowBlur = 12; } else gx.shadowBlur = 0;
      gx.beginPath(); gx.moveTo(a.x, a.y); gx.lineTo(b.x, b.y); gx.stroke();
      gx.shadowBlur = 0; gx.setLineDash([]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      gx.fillStyle = '#070912'; gx.fillRect(mx - 12, my - 9, 24, 18);
      gx.fillStyle = e.s === 'take' ? '#3dffa8' : '#9aa0c7'; gx.font = '600 11px JetBrains Mono, monospace'; gx.textAlign = 'center'; gx.textBaseline = 'middle';
      gx.fillText(e.w, mx, my);
    }
    for (const v of V) {
      gx.fillStyle = '#0b0d1d'; gx.strokeStyle = '#7c5cff'; gx.lineWidth = 2.5;
      gx.beginPath(); gx.arc(v.x, v.y, 11, 0, 7); gx.fill(); gx.stroke();
      gx.fillStyle = '#00e0ff'; gx.beginPath(); gx.arc(v.x, v.y, 4, 0, 7); gx.fill();
      gx.fillStyle = '#e8eaff'; gx.font = '500 11px Inter, sans-serif'; gx.fillText(v.n, v.x, v.y - 22);
    }
  }
  async function kruskal() {
    if (running) return; running = true;
    E.forEach(e => e.s = 'idle');
    const order = E.map((e, i) => i).sort((i, j) => E[i].w - E[j].w);
    const parent = V.map((_, i) => i), rank = V.map(() => 0);
    const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
    let cost = 0, taken = 0;
    for (const i of order) {
      state.active = i; draw(); await wait(reduce ? 0 : 380);
      const ra = find(E[i].a), rb = find(E[i].b);
      if (ra !== rb) {
        if (rank[ra] < rank[rb]) parent[ra] = rb; else if (rank[ra] > rank[rb]) parent[rb] = ra; else { parent[rb] = ra; rank[ra]++; }
        E[i].s = 'take'; cost += E[i].w; taken++;
      } else E[i].s = 'skip';
      $('#kStat').textContent = `cost: ${cost} · edges: ${taken}/${V.length - 1}`;
      if (taken === V.length - 1) break;
    }
    state.active = -1; draw(); running = false;
  }
  $('#kRun').addEventListener('click', kruskal);
  $('#kNew').addEventListener('click', () => { if (!running) newGraph(); });
  newGraph();

  /* ---------- terminal ---------- */
  const term = $('#term'), body = $('#termBody'), tin = $('#termIn');
  const out = html => { body.insertAdjacentHTML('beforeend', html + '\n'); body.scrollTop = body.scrollHeight; };
  const CMDS = {
    help: () => `<span class="y">available commands</span>
  whoami      who is this guy
  skills      what I work with
  projects    things I built
  experience  where I've worked
  awards      trophies
  resume      download my CV
  contact     get in touch
  github      open GitHub
  linkedin    open LinkedIn
  clear       clear the screen
  sudo hire-me  ;)`,
    whoami: () => `<span class="c">Muhammad Danish Meraj</span>
AI Automation Engineer @ Techoid · CS @ NED University, Karachi
I wire LLMs, APIs and data into real workflows.`,
    skills: () => `<span class="p">ai</span>        Gemini API, prompt engineering, agent workflows
<span class="p">automation</span> n8n, REST APIs, webhooks, Postman
<span class="p">ml</span>        PyTorch, Hugging Face Transformers, NER, Pandas
<span class="p">stack</span>     Python, Django, Spring Boot, Next.js, React, Flutter, PostgreSQL`,
    projects: () => `🏆 ner-pk              XLM-R NER, 0.918 F1 — competition winner
⚡ smart-ev-charging   Kruskal + knapsack DP, ~340 tests
🧠 mental-health-ooad  Spring Boot + React, 3 design patterns
🔎 echolens            Gemini research assistant
🚨 incident-triage     expert system, 60+ rules
🅿  parking-dfa         <a href="https://smart-parking-dfa.vercel.app" target="_blank">smart-parking-dfa.vercel.app</a>`,
    experience: () => `2026–now  Developer & Automation Engineer · Techoid
2026      AI Automation Engineer (Intern) · CAQT
2026–now  Frontend Developer · Ida Rieu Welfare Association
2025–26   Full Stack Developer · CSIT, NED University`,
    awards: () => `<span class="y">🏆 Winner — Dory's Data Dive, AI Odyssey 2026</span> (NED University)
📜 Google AI · IBM Data Science · HP Data Science & Analytics`,
    resume: () => { open('assets/Muhammad-Danish-Meraj-Resume.pdf', '_blank'); return 'opening CV…'; },
    contact: () => `email     <a href="mailto:muhammaddanishmeraj@gmail.com">muhammaddanishmeraj@gmail.com</a>
github    <a href="https://github.com/M-Danish-Meraj" target="_blank">github.com/M-Danish-Meraj</a>
linkedin  <a href="https://linkedin.com/in/muhammad-danish-meraj-52318332b" target="_blank">linkedin.com/in/muhammad-danish-meraj</a>`,
    github: () => { open('https://github.com/M-Danish-Meraj', '_blank'); return 'opening GitHub…'; },
    linkedin: () => { open('https://linkedin.com/in/muhammad-danish-meraj-52318332b', '_blank'); return 'opening LinkedIn…'; },
    clear: () => { body.innerHTML = ''; return null; },
    'sudo hire-me': () => `<span class="c">[sudo] access granted ✔</span>
Excellent decision. Drafting an email…`,
    ls: () => 'about  experience  projects  lab  awards  contact  resume.pdf',
    'rm -rf /': () => '<span class="p">nice try.</span>'
  };
  function openTerm() {
    term.hidden = false;
    if (!body.innerHTML) out(`<span class="c">danish-os v2026.11</span> — type <span class="y">help</span> to start.`);
    setTimeout(() => tin.focus(), 30);
  }
  const closeTerm = () => { term.hidden = true; };
  $('#openTerm').addEventListener('click', openTerm);
  $('#closeTerm').addEventListener('click', closeTerm);
  term.addEventListener('click', e => { if (e.target === term) closeTerm(); });
  addEventListener('keydown', e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === '`' && !typing) { e.preventDefault(); openTerm(); }
    if (e.key === 'Escape' && !term.hidden) closeTerm();
  });
  const hist = []; let hi = 0;
  tin.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hist.length) { hi = Math.max(0, hi - 1); tin.value = hist[hi]; e.preventDefault(); }
    if (e.key === 'ArrowDown' && hist.length) { hi = Math.min(hist.length, hi + 1); tin.value = hist[hi] || ''; e.preventDefault(); }
    if (e.key === '`') { e.preventDefault(); closeTerm(); }
  });
  $('#termForm').addEventListener('submit', e => {
    e.preventDefault();
    const cmd = tin.value.trim(); tin.value = '';
    if (!cmd) return;
    hist.push(cmd); hi = hist.length;
    out(`<span class="c">danish@portfolio:~$</span> ${esc(cmd)}`);
    const fn = CMDS[cmd.toLowerCase()];
    const res = fn ? fn() : `command not found: ${esc(cmd)} — try <span class="y">help</span>`;
    if (res) out(res);
    if (cmd.toLowerCase() === 'sudo hire-me') setTimeout(() => location.href = 'mailto:muhammaddanishmeraj@gmail.com?subject=Let%27s%20work%20together', 900);
  });

  console.log('%cHey, curious dev 👋  Press ` on the page for a terminal.', 'color:#00e0ff;font:600 14px monospace');
})();
