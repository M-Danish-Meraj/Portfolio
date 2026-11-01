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
    draw(); buildPortrait(false);
  });


  /* ---------- shared pointer ---------- */
  const ptr = { x: -9999, y: -9999, active: false };
  addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true; }, { passive: true });
  document.addEventListener('mouseleave', () => { ptr.active = false; ptr.x = ptr.y = -9999; });
  const isDark = () => css('--paper').startsWith('#1');

  /* ---------- background network: dots and lines that follow the cursor ---------- */
  const net = $('#net'), nx = net.getContext('2d');
  let NW = 0, NH = 0, dots = [];
  function sizeNet() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    NW = innerWidth; NH = innerHeight;
    net.width = NW * dpr; net.height = NH * dpr; nx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, Math.max(28, NW * NH / 16000)));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * NW, y: Math.random() * NH,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3
    }));
  }
  function netFrame() {
    nx.clearRect(0, 0, NW, NH);
    const ink = css('--ink'), accent = css('--accent');
    const LINK = 120, REACH = 180;
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0 || d.x > NW) d.vx *= -1;
      if (d.y < 0 || d.y > NH) d.vy *= -1;
      const dx = ptr.x - d.x, dy = ptr.y - d.y, dist = Math.hypot(dx, dy);
      if (dist < REACH && dist > 1) { d.x += dx / dist * .35; d.y += dy / dist * .35; } // drift toward the cursor
    }
    nx.lineWidth = .6;
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i];
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          nx.globalAlpha = (1 - d / LINK) * .22; nx.strokeStyle = ink;
          nx.beginPath(); nx.moveTo(a.x, a.y); nx.lineTo(b.x, b.y); nx.stroke();
        }
      }
      const md = Math.hypot(a.x - ptr.x, a.y - ptr.y);
      if (md < REACH) {
        nx.globalAlpha = (1 - md / REACH) * .7; nx.strokeStyle = accent;
        nx.beginPath(); nx.moveTo(a.x, a.y); nx.lineTo(ptr.x, ptr.y); nx.stroke();
      }
      nx.globalAlpha = md < REACH ? .9 : .45; nx.fillStyle = md < REACH ? accent : ink;
      nx.beginPath(); nx.arc(a.x, a.y, 1.6, 0, 7); nx.fill();
    }
    nx.globalAlpha = 1;
    if (!reduce && !document.hidden) requestAnimationFrame(netFrame);
  }
  sizeNet(); netFrame();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) requestAnimationFrame(netFrame); });

  /* ---------- hero portrait: ink dots fly in, settle into the photo, scatter under the cursor ---------- */
  const pc = $('#portrait'), px = pc.getContext('2d');
  let PW = 0, PH = 0, parts = [], src = null, portraitOn = false, heroVisible = true;
  let photoLayer = null, photoA = 0, quietSince = 0, lastFrame = 0;
  const photo = new Image();
  photo.onload = () => { src = photo; buildPortrait(true); };
  photo.onerror = () => { src = null; buildPortrait(true); };
  photo.src = 'assets/me.jpg';

  // where the photo sits inside a w x h box: cover-fit, framed on head and shoulders
  function placePhoto(w, h) {
    const s = Math.max(w / src.width, h / src.height) * 1.04;
    return { x: (w - src.width * s) * .55, y: (h - src.height * s) * .12, w: src.width * s, h: src.height * s };
  }
  function sampleSource(cols, rows) {
    const oc = document.createElement('canvas'); oc.width = cols; oc.height = rows;
    const o = oc.getContext('2d', { willReadFrequently: true });
    if (src) {
      const p = placePhoto(cols, rows);
      o.drawImage(src, p.x, p.y, p.w, p.h);
    } else {
      o.fillStyle = '#fff'; o.fillRect(0, 0, cols, rows);
      o.fillStyle = '#000'; o.textAlign = 'center'; o.textBaseline = 'middle';
      o.font = `italic ${Math.round(rows * .62)}px "Instrument Serif", Georgia, serif`;
      o.fillText('DM', cols * .56, rows * .5);
    }
    return o.getImageData(0, 0, cols, rows).data;
  }
  function buildPortrait(intro) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = pc.getBoundingClientRect();
    PW = r.width; PH = r.height;
    if (!PW || !PH) return;
    pc.width = PW * dpr; pc.height = PH * dpr; px.setTransform(dpr, 0, 0, dpr, 0, 0);
    const step = PW < 500 ? 6 : 7;
    const cols = Math.floor(PW / step), rows = Math.floor(PH / step);
    const data = sampleSource(cols, rows);
    const at = (x, y) => (y * cols + x) * 4;
    const keep = src ? subjectMask(data, cols, rows) : null;
    const dark = isDark();
    const mask = src ? new Uint8ClampedArray(cols * rows * 4) : null;
    parts = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = at(x, y), R = data[i], G = data[i + 1], B = data[i + 2];
      const lum = (R * .299 + G * .587 + B * .114) / 255;
      if (src) {
        if (!keep[y * cols + x]) continue;
        mask[i] = mask[i + 1] = mask[i + 2] = mask[i + 3] = 255;
      }
      const tone = src && dark ? lum : 1 - lum;       // light ink on dark paper prints the photo's highlights
      const rad = Math.max(src ? step * .17 : 0, Math.pow(tone, 1.15) * step * .62); // keep the silhouette readable
      if (rad < .55) continue;
      const hx = x * step + step / 2, hy = y * step + step / 2;
      const p = { hx, hy, r: rad, vx: 0, vy: 0, x: hx, y: hy };
      if (intro && !reduce) {
        const a = Math.random() * Math.PI * 2, d = 220 + Math.random() * 520;
        p.x = hx + Math.cos(a) * d; p.y = hy + Math.sin(a) * d;
      }
      parts.push(p);
    }
    photoLayer = src ? makePhotoLayer(mask, cols, rows, step, dpr) : null;
    if (intro) photoA = 0;
    quietSince = 0;
    $('#artCap').textContent = src
      ? `Fig. 1 — ${parts.length.toLocaleString()} ink dots settle into a portrait. Hover to scatter them.`
      : `Fig. 1 — Monogram in ${parts.length.toLocaleString()} ink dots. Move your cursor through it.`;
    if (reduce) { photoA = src ? 1 : 0; for (const p of parts) { p.x = p.hx; p.y = p.hy; } }
    kickPortrait(true);
  }
  // Separates the subject from a plain studio backdrop. The backdrop's brightness is modelled as a smooth
  // quadratic surface fitted to the border cells (which handles a vignette); cells that differ from it, or are
  // clearly coloured, are subject. Then only the biggest connected shape is kept and its holes are filled.
  function subjectMask(data, cols, rows) {
    const n = cols * rows, lum = new Float32Array(n), sat = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const R = data[k * 4], G = data[k * 4 + 1], B = data[k * 4 + 2];
      lum[k] = R * .299 + G * .587 + B * .114;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      sat[k] = mx ? (mx - mn) / mx : 0;
    }
    const feat = (x, y) => { const u = x / cols - .5, v = y / rows - .5; return [1, u, v, u * u, v * v, u * v]; };
    const A = Array.from({ length: 6 }, () => new Float64Array(7));
    const band = Math.max(2, Math.round(cols * .06));
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!(x < band || x >= cols - band || y < band)) continue;
      const f = feat(x, y), z = lum[y * cols + x];
      for (let a = 0; a < 6; a++) { for (let b = 0; b < 6; b++) A[a][b] += f[a] * f[b]; A[a][6] += f[a] * z; }
    }
    for (let c = 0; c < 6; c++) {                       // Gaussian elimination
      let p = c; for (let r = c + 1; r < 6; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < 6; r++) if (r !== c) { const m = A[r][c] / A[c][c]; for (let k = c; k < 7; k++) A[r][k] -= m * A[c][k]; }
    }
    const coef = A.map((row, i) => row[6] / row[i]);
    const isSub = new Uint8Array(n);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const k = y * cols + x, f = feat(x, y);
      const model = f.reduce((s, v, i) => s + v * coef[i], 0);
      isSub[k] = Math.abs(lum[k] - model) > 20 || sat[k] > .2 ? 1 : 0;
    }
    // largest connected subject component
    const comp = new Int32Array(n).fill(-1); let best = -1, bestSize = 0, id = 0;
    for (let s = 0; s < n; s++) {
      if (!isSub[s] || comp[s] >= 0) continue;
      let size = 0; const stack = [s]; comp[s] = id;
      while (stack.length) {
        const k = stack.pop(); size++;
        const x = k % cols, y = (k / cols) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
          const q = Y * cols + X; if (isSub[q] && comp[q] < 0) { comp[q] = id; stack.push(q); }
        }
      }
      if (size > bestSize) { bestSize = size; best = id; }
      id++;
    }
    // backdrop = everything reachable from the top/left/right border without crossing the subject
    const keep = new Uint8Array(n).fill(1), seen = new Uint8Array(n), stack = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
      if ((x === 0 || x === cols - 1 || y === 0) && comp[y * cols + x] !== best) { seen[y * cols + x] = 1; stack.push(y * cols + x); }
    while (stack.length) {
      const k = stack.pop(); keep[k] = 0;
      const x = k % cols, y = (k / cols) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
        const q = Y * cols + X; if (!seen[q] && comp[q] !== best) { seen[q] = 1; stack.push(q); }
      }
    }
    return keep;
  }
  // the real photo, in black and white, cut out with the dot mask and feathered at the edges
  function makePhotoLayer(mask, cols, rows, step, dpr) {
    const layer = document.createElement('canvas'); layer.width = PW * dpr; layer.height = PH * dpr;
    const l = layer.getContext('2d'); l.scale(dpr, dpr);
    const p = placePhoto(cols * step, rows * step);
    l.filter = isDark() ? 'grayscale(1) contrast(1.12) brightness(1.05)' : 'grayscale(1) contrast(1.1)';
    l.drawImage(src, p.x, p.y, p.w, p.h);
    const mc = document.createElement('canvas'); mc.width = cols; mc.height = rows;
    mc.getContext('2d').putImageData(new ImageData(mask, cols, rows), 0, 0);
    l.globalCompositeOperation = 'destination-in';
    l.filter = `blur(${step * .5}px)`;
    l.imageSmoothingEnabled = true;
    l.drawImage(mc, 0, 0, cols * step, rows * step);
    l.drawImage(mc, 0, 0, cols * step, rows * step); // second pass firms up the inside of the mask
    return layer;
  }
  function kickPortrait(force) {
    if ((!portraitOn || force) && heroVisible) { portraitOn = true; requestAnimationFrame(portraitFrame); }
  }
  new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; kickPortrait(); }).observe(pc);
  function portraitFrame(t) {
    if (t === lastFrame) return; lastFrame = t;   // ignore duplicate loops
    if (!heroVisible) { portraitOn = false; return; }
    const r = pc.getBoundingClientRect();
    const mx = ptr.x - r.left, my = ptr.y - r.top;
    const near = ptr.active && mx > -40 && my > -40 && mx < PW + 40 && my < PH + 40;
    const RAD = PW < 500 ? 70 : 95;
    let moving = 0;
    const linked = [];
    for (const p of parts) {
      if (near) {
        const dx = p.x - mx, dy = p.y - my, d = Math.hypot(dx, dy);
        if (d < RAD && d > .1) {
          const f = (1 - d / RAD) * 2.4;
          p.vx += dx / d * f; p.vy += dy / d * f;
          if (d < RAD * .9 && linked.length < 40 && Math.random() < .5) linked.push(p);
        }
      }
      p.vx += (p.hx - p.x) * .06; p.vy += (p.hy - p.y) * .06;
      p.vx *= .8; p.vy *= .8;
      p.x += p.vx; p.y += p.vy;
      if (Math.abs(p.vx) + Math.abs(p.vy) > .08) moving++;
    }
    // once every dot is home and the cursor is away, the photo develops; hovering dissolves it back to dots
    const quiet = !near && moving < 4;
    if (!quiet) quietSince = 0; else if (!quietSince) quietSince = t;
    const want = src && quiet && t - quietSince > 250 ? 1 : 0;
    photoA += (want - photoA) * (want ? .045 : .2);
    if (Math.abs(want - photoA) < .004) photoA = want;

    px.clearRect(0, 0, PW, PH);
    if (photoA < 1) {
      px.globalAlpha = 1 - photoA * .92;
      px.fillStyle = css('--ink');
      px.beginPath();
      for (const p of parts) { px.moveTo(p.x + p.r, p.y); px.arc(p.x, p.y, p.r, 0, Math.PI * 2); }
      px.fill();
    }
    if (photoLayer && photoA > 0) {
      px.globalAlpha = photoA;
      px.drawImage(photoLayer, 0, 0, PW, PH);
    }
    px.globalAlpha = 1;
    if (near && linked.length) {
      const accent = css('--accent');
      px.strokeStyle = accent; px.lineWidth = .7; px.globalAlpha = .55;
      px.beginPath();
      for (const p of linked) { px.moveTo(p.x, p.y); px.lineTo(mx, my); }
      px.stroke(); px.globalAlpha = 1;
      px.fillStyle = accent; px.beginPath(); px.arc(mx, my, 2.5, 0, 7); px.fill();
    }
    const keepGoing = near || moving || photoA !== want || (src && quiet && want === 0);
    if (keepGoing && !reduce) requestAnimationFrame(portraitFrame); else portraitOn = false;
  }
  pc.addEventListener('pointermove', () => kickPortrait());
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') { ptr.active = false; ptr.x = ptr.y = -9999; kickPortrait(); } });
  let rT;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { sizeNet(); buildPortrait(false); }, 150); });
  document.fonts?.ready.then(() => { if (!src && photo.complete) buildPortrait(false); });

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
