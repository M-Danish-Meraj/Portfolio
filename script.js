(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- theme toggle ---------- */
  const root = document.documentElement;
  $('#theme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    draw();
  });

  /* ---------- reveal + active nav ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
  const navLinks = $$('.masthead nav a');
  addEventListener('scroll', () => {
    let cur = '';
    for (const s of $$('section[id]')) if (s.getBoundingClientRect().top < innerHeight * .35) cur = s.id;
    navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + cur));
  }, { passive: true });

  /* ---------- project filters ---------- */
  $$('.f').forEach(btn => btn.addEventListener('click', () => {
    $$('.f').forEach(b => b.classList.toggle('on', b === btn));
    const f = btn.dataset.f;
    $$('.lead-project, .plist .p').forEach(el => {
      el.classList.toggle('hide', f !== 'all' && el.dataset.cat !== f);
      el.classList.add('in');
    });
  }));

  /* ---------- NER demo ---------- */
  const HUE = {
    PERSON: 12, CITY: 200, PROVINCE_REGION: 215, COUNTRY: 230, GOVERNMENT_BODY: 40, POLITICAL_PARTY: 28,
    ORGANIZATION: 280, EDUCATIONAL_INSTITUTION: 300, COURT_LEGAL_BODY: 350, LAW_ACT: 335, EVENT: 150,
    MEDIA_OUTLET: 175, SPORTS_TEAM: 120, DATE: 95, TIME: 80, MONEY: 50, PERCENT: 60, PHONE_NUMBER: 0, ID_NUMBER: 0
  };
  const entColor = l => {
    const dark = css('--paper').startsWith('#1');
    if (l === 'PHONE_NUMBER' || l === 'ID_NUMBER') return css('--muted');
    return `hsl(${HUE[l]} ${dark ? '70% 62%' : '65% 38%'})`;
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
  function ner(text) {
    const found = [];
    const add = (s, e, l) => { if (!found.some(f => s < f.e && e > f.s)) found.push({ s, e, l }); };
    for (const [l, rx] of RX) for (const m of text.matchAll(rx)) add(m.index, m.index + m[0].length, l);
    const entries = Object.entries(GAZ).flatMap(([l, ws]) => ws.map(w => [l, w])).sort((a, b) => b[1].length - a[1].length);
    for (const [l, w] of entries) {
      const rx = new RegExp('(?<![\\w-])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'g');
      for (const m of text.matchAll(rx)) add(m.index, m.index + w.length, l);
    }
    for (const m of text.matchAll(/\b(?:Mr\.?|Ms\.?|Dr\.?|Justice|Minister|Chief Minister|President|General)\s+((?:[A-Z][a-z]+\s?){1,3})/g)) {
      const name = m[1].trim(), s = m.index + m[0].indexOf(name);
      add(s, s + name.length, 'PERSON');
    }
    return found.sort((a, b) => a.s - b.s);
  }
  const nerIn = $('#nerInput'), nerOut = $('#nerOut');
  function runNer() {
    const t = nerIn.value, ents = ner(t);
    let html = '', last = 0;
    for (const e of ents) {
      html += esc(t.slice(last, e.s)) +
        `<span class="ent" style="--c:${entColor(e.l)}">${esc(t.slice(e.s, e.e))}<small>${e.l.replace(/_/g, ' ')}</small></span>`;
      last = e.e;
    }
    nerOut.innerHTML = (html + esc(t.slice(last))) || '<span class="muted">Type a sentence above.</span>';
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
  let V = [], E = [], active = -1, running = false;
  function newGraph() {
    V = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
      V.push({ x: 70 + c * 140 + (Math.random() - .5) * 60, y: 64 + r * 116 + (Math.random() - .5) * 44, n: PLACES[V.length] });
    const seen = new Set(); E = [];
    const addE = (a, b) => {
      const k = Math.min(a, b) + '-' + Math.max(a, b);
      if (a === b || seen.has(k)) return; seen.add(k);
      E.push({ a, b, w: Math.round(Math.hypot(V[a].x - V[b].x, V[a].y - V[b].y) / 10 + Math.random() * 6), s: 'idle' });
    };
    V.forEach((v, i) => {
      const near = V.map((u, j) => [j, Math.hypot(u.x - v.x, u.y - v.y)]).filter(p => p[0] !== i).sort((a, b) => a[1] - b[1]);
      addE(i, near[0][0]); addE(i, near[1][0]); if (Math.random() < .6) addE(i, near[2][0]);
    });
    active = -1; $('#kStat').textContent = 'cost —'; draw();
  }
  function draw() {
    if (!V.length) return;
    const ink = css('--ink'), muted = css('--muted'), rule = css('--rule'), accent = css('--accent'), paper = css('--paper');
    gx.clearRect(0, 0, g.width, g.height);
    gx.textAlign = 'center'; gx.textBaseline = 'middle';
    E.forEach((e, i) => {
      const a = V[e.a], b = V[e.b];
      gx.strokeStyle = e.s === 'take' ? accent : i === active ? ink : e.s === 'skip' ? muted : rule;
      gx.lineWidth = e.s === 'take' ? 3 : i === active ? 2.5 : 1.2;
      gx.setLineDash(e.s === 'skip' ? [4, 4] : []);
      gx.beginPath(); gx.moveTo(a.x, a.y); gx.lineTo(b.x, b.y); gx.stroke();
      gx.setLineDash([]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      gx.fillStyle = paper; gx.fillRect(mx - 11, my - 8, 22, 16);
      gx.fillStyle = e.s === 'take' ? accent : muted; gx.font = '500 11px "IBM Plex Mono", monospace';
      gx.fillText(e.w, mx, my);
    });
    for (const v of V) {
      gx.fillStyle = paper; gx.strokeStyle = ink; gx.lineWidth = 1.5;
      gx.beginPath(); gx.arc(v.x, v.y, 6, 0, 7); gx.fill(); gx.stroke();
      gx.fillStyle = ink; gx.font = '400 12px "IBM Plex Sans", sans-serif';
      gx.fillText(v.n, v.x, v.y - 18);
    }
  }
  async function kruskal() {
    if (running) return; running = true;
    E.forEach(e => e.s = 'idle');
    const order = E.map((_, i) => i).sort((i, j) => E[i].w - E[j].w);
    const parent = V.map((_, i) => i), rank = V.map(() => 0);
    const find = x => parent[x] === x ? x : (parent[x] = find(parent[x]));
    let cost = 0, taken = 0;
    for (const i of order) {
      active = i; draw(); await wait(reduce ? 0 : 340);
      const ra = find(E[i].a), rb = find(E[i].b);
      if (ra !== rb) {
        if (rank[ra] < rank[rb]) parent[ra] = rb; else if (rank[ra] > rank[rb]) parent[rb] = ra; else { parent[rb] = ra; rank[ra]++; }
        E[i].s = 'take'; cost += E[i].w; taken++;
      } else E[i].s = 'skip';
      $('#kStat').textContent = `cost ${cost} · ${taken}/${V.length - 1} roads`;
      if (taken === V.length - 1) break;
    }
    active = -1; draw(); running = false;
  }
  $('#kRun').addEventListener('click', kruskal);
  $('#kNew').addEventListener('click', () => { if (!running) newGraph(); });
  document.fonts?.ready.then(draw);
  newGraph();

  /* ---------- terminal ---------- */
  const term = $('#term'), body = $('#termBody'), tin = $('#termIn');
  const out = html => { body.insertAdjacentHTML('beforeend', html + '\n'); body.scrollTop = body.scrollHeight; };
  const CMDS = {
    help: () => `<span class="y">commands</span>
  whoami · skills · projects · experience · awards
  resume · contact · github · linkedin · clear`,
    whoami: () => `Muhammad Danish Meraj
Developer & Automation Engineer at Techoid; CS at NED University, Karachi.`,
    skills: () => `ai          Gemini API, prompt engineering, agent workflows
automation  n8n, REST APIs, webhooks
ml          PyTorch, Hugging Face Transformers, NER
stack       Python, Django, Spring Boot, Next.js, React, Flutter, PostgreSQL`,
    projects: () => `ner-pk               XLM-R NER, 0.918 micro-F1 (competition winner)
smart-ev-charging    Kruskal + knapsack DP, ~340 tests
mental-health-ooad   Spring Boot + React, three design patterns
echolens             Gemini research assistant
incident-triage      expert system, 60+ rules
parking-dfa          <a href="https://smart-parking-dfa.vercel.app" target="_blank" rel="noopener">smart-parking-dfa.vercel.app</a>`,
    experience: () => `2026–     Developer & Automation Engineer, Techoid
2026      AI Automation Engineer (Intern), CAQT
2026–     Frontend Developer, Ida Rieu Welfare Association
2025–26   Full Stack Developer, CSIT NED University`,
    awards: () => `Winner, Dory's Data Dive, AI Odyssey 2026 (NED University)
Google AI · IBM Data Science · HP Data Science & Analytics`,
    resume: () => { open('assets/Muhammad-Danish-Meraj-Resume.pdf', '_blank'); return 'opening résumé…'; },
    contact: () => `<a href="mailto:muhammaddanishmeraj@gmail.com">muhammaddanishmeraj@gmail.com</a>`,
    github: () => { open('https://github.com/M-Danish-Meraj', '_blank'); return 'opening GitHub…'; },
    linkedin: () => { open('https://linkedin.com/in/muhammad-danish-meraj-52318332b', '_blank'); return 'opening LinkedIn…'; },
    ls: () => 'work  projects  lab  awards  contact  resume.pdf',
    clear: () => { body.innerHTML = ''; return null; }
  };
  function openTerm() {
    term.hidden = false;
    if (!body.innerHTML) out(`Type <span class="c">help</span> to see commands.`);
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
  });
  $('#termForm').addEventListener('submit', e => {
    e.preventDefault();
    const cmd = tin.value.trim(); tin.value = '';
    if (!cmd) return;
    hist.push(cmd); hi = hist.length;
    out(`<span class="c">$</span> ${esc(cmd)}`);
    const fn = CMDS[cmd.toLowerCase()];
    const res = fn ? fn() : `not found: ${esc(cmd)} — try <span class="c">help</span>`;
    if (res) out(res);
  });
})();
