document.addEventListener('DOMContentLoaded', () => {
  // ===== ELEMENT CACHE =====
  const headingValue = document.getElementById('heading-value');
  const compassTicks = document.getElementById('compass-ticks');
  const utcClock = document.getElementById('utc-clock');
  const gpsCoords = document.getElementById('gps-coords');
  const altValue = document.getElementById('alt-value');
  const spdValue = document.getElementById('spd-value');
  const rngValue = document.getElementById('rng-value');
  const pwrValue = document.getElementById('pwr-value');
  const pwrFill = document.getElementById('pwr-fill');
  const tgtRange = document.getElementById('tgt-range');
  const sysStatus = document.getElementById('sys-status');
  const trkStatus = document.getElementById('trk-status');
  const lnkStatus = document.getElementById('lnk-status');
  const wpnStatus = document.getElementById('wpn-status');
  const sensorMode = document.getElementById('sensor-mode');
  const fltMode = document.getElementById('flt-mode');
  const altTicks = document.getElementById('alt-ticks');
  const spdTicks = document.getElementById('spd-ticks');
  const altReadout = document.getElementById('alt-tape-readout');
  const spdReadout = document.getElementById('spd-tape-readout');
  const horizon = document.getElementById('horizon');
  const rwrThreats = document.getElementById('rwr-threats');
  const reticle = document.getElementById('reticle');
  const noiseTurb = document.querySelector('#thermal-noise feTurbulence');
  // DRIP elements
  const dripUasId = document.getElementById('drip-uas-id');
  const dripSession = document.getElementById('drip-session');
  const dripOperator = document.getElementById('drip-operator');
  const dripAuthEl = document.getElementById('drip-auth');
  const dripRidMode = document.getElementById('drip-rid-mode');
  // New elements
  const obsState = document.getElementById('obs-state');
  const authFill = document.getElementById('auth-fill');
  const authPages = document.getElementById('auth-pages');
  const authSig = document.getElementById('auth-sig');
  const trustNodes = document.getElementById('trust-nodes');
  const encEntries = document.getElementById('enc-entries');
  const commlogLines = document.getElementById('commlog-lines');
  const rwrDrones = document.getElementById('rwr-drones');
  const trackTrails = document.getElementById('track-trails');
  const agcOverlay = document.getElementById('agc-overlay');
  const flashOverlay = document.getElementById('flash-overlay');
  const binoOverlay = document.getElementById('bino-overlay');
  const honeycombLayer = document.getElementById('honeycomb-layer');

  // ===== FLIGHT STATE =====
  let headingBase = 247;
  let heading = 247;
  let alt = 2847;
  let spd = 124;
  let rng = 8.4;
  let pwr = 94;
  let lat = 34.205111;
  let lon = -118.242250;
  let tgtRng = 1.24;
  let bank = 0;
  let wpnCount = 2;
  let gimbalPan = 245;
  let gimbalTilt = 12;
  let flirZoom = 3.5;
  let noiseSeed = 0;
  const fltModes = ['AUTO', 'LOITER', 'RTB'];
  let fltModeIdx = 0;
  let reticleOffX = 0, reticleOffY = 0;
  let nvgMode = false;

  // ===== NVG PHYSICS STATE =====
  let agcLevel = 0;       // 0-1, AGC dimming amount
  let flashLevel = 0;     // 0-1, flash overlay opacity
  let warmupStart = 0;    // rAF timestamp when NVG warm-up began
  let phosphorTrail = []; // [{x, y, age}] for phosphor persistence

  // ===== DRIP STATE =====
  function seededHash(seed, length) {
    let h = seed ^ 0xDEADBEEF;
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      h ^= h << 13; h ^= h >> 17; h ^= h << 5;
      h = (h + 0x9E3779B9 + (i * 0x6D2B79F5)) | 0;
      result += chars[Math.abs(h) % 16];
    }
    return result;
  }

  function formatHHIT(hex) {
    return hex.match(/.{4}/g).join(':');
  }

  const dripSeed = 0xA1D7;
  const uasHHIT = seededHash(dripSeed, 32);
  const operatorId = 'FAA:UA-' + seededHash(dripSeed + 1, 6).toUpperCase();
  let sessionDET = seededHash(dripSeed + 2, 16);

  // ===== AUTH PROGRESS STATE =====
  let authPage = 0;
  const AUTH_TOTAL = 16;

  // ===== OBSERVER STATE MACHINE =====
  const obsStates = ['SCAN', 'DETECT', 'TRACK', 'VERIFY', 'MONITR'];
  let obsIdx = 0;

  // ===== MULTI-DRONE FLEET =====
  const droneFleet = [
    { seed: 0xA1D7, call: 'RVN1', angle: 0.3, dist: 5, type: 'FXD', auth: true, rid: 'BCAST' },
    { seed: 0xB3E9, call: 'HWK3', angle: 2.1, dist: 28, type: 'ROT', auth: true, rid: 'NET' },
    { seed: 0xC5F2, call: 'VPR7', angle: 4.5, dist: 22, type: 'VTL', auth: false, rid: 'BCAST' },
    { seed: 0xD7A4, call: 'EGL2', angle: 5.8, dist: 35, type: 'FXD', auth: true, rid: 'NET' },
  ];

  // ===== COMMLOG STATE =====
  const commTemplates = [
    'SKYWATCH: {c} ON STATION BPT LOITER',
    'OVERLORD: COPY {c} CLEARED HOT',
    '{c}: TALLY TGT MAINTAINING TRACK',
    'SKYWATCH: {c} BINGO FUEL RTB',
    'OVERLORD: ALL STATIONS SHIFT FREQ ALPHA',
    '{c}: CONTACT SINGLE PAX MOVING SOUTH',
    'GROUNDHOG: ROGER POS ID ON OBJ',
    '{c}: LASING TGT STANDBY',
    'OVERLORD: ABORT ABORT CIV IN AO',
    'SKYWATCH: FENCE IN WEAPONS HOT',
    '{c}: RTB WINCHESTER',
    'GROUNDHOG: REQUEST CAS GRID {g}',
    'OVERLORD: GOOD EFFECT ON TARGET',
    '{c}: SENSOR DEG SWITCHING {m}',
  ];
  let commBuffer = [];
  const COMM_MAX = 5;

  // ===== ENCOUNTER LOG STATE =====
  let encBuffer = [];
  const ENC_MAX = 4;
  let encCounter = 431;

  // ===== BUILD FUNCTIONS =====

  function buildCompassTicks() {
    const cardinals = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    let svg = '';
    for (let rep = -1; rep <= 1; rep++) {
      for (let deg = 0; deg < 360; deg += 5) {
        const x = (deg + rep * 360) * 2.2;
        const isMajor = deg % 15 === 0;
        const h = isMajor ? 12 : 6;
        svg += `<line x1="${x}" y1="${60 - h}" x2="${x}" y2="60" style="stroke: var(${isMajor ? '--hud-primary' : '--hud-tick'})" stroke-width="${isMajor ? 1.5 : 0.8}"/>`;
        if (cardinals[deg]) {
          svg += `<text x="${x}" y="${60 - h - 5}" style="fill: var(--hud-primary)" font-family="'Courier New', monospace" font-size="11" text-anchor="middle" letter-spacing="1">${cardinals[deg]}</text>`;
        } else if (deg % 30 === 0) {
          svg += `<text x="${x}" y="${60 - h - 4}" style="fill: var(--hud-dim)" font-family="'Courier New', monospace" font-size="9" text-anchor="middle">${deg}°</text>`;
        }
      }
    }
    compassTicks.innerHTML = svg;
  }

  function buildTapeTicks(group, min, max, step, majorEvery, x, isLeft) {
    let svg = '';
    for (let val = min; val <= max; val += step) {
      const y = -val;
      const isMajor = val % majorEvery === 0;
      const tickLen = isMajor ? 25 : 12;
      const x1 = isLeft ? x + 120 - tickLen : x;
      const x2 = isLeft ? x + 120 : x + tickLen;
      svg += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="tape-tick${isMajor ? '--major' : ''}"/>`;
      if (isMajor) {
        const tx = isLeft ? x1 - 5 : x2 + 5;
        svg += `<text x="${tx}" y="${y + 4}" class="tape-label" text-anchor="${isLeft ? 'end' : 'start'}">${val}</text>`;
      }
    }
    group.innerHTML = svg;
  }

  function buildTrustChain() {
    const chain = [
      { label: 'ICAO', status: 'ROOT', indent: 0 },
      { label: 'FAA', status: 'CAA:VRFD', indent: 1 },
      { label: 'SKYOPS', status: 'OPR:VRFD', indent: 2 },
      { label: 'RVN-1', status: 'UAS:VRFD', indent: 3 },
    ];
    let svg = '';
    chain.forEach((node, i) => {
      const x = node.indent * 22;
      const y = i * 16;
      if (i > 0) {
        svg += `<line x1="${x - 14}" y1="${y - 8}" x2="${x - 14}" y2="${y + 4}" style="stroke: var(--hud-deep)" stroke-width="0.5"/>`;
        svg += `<line x1="${x - 14}" y1="${y + 4}" x2="${x - 2}" y2="${y + 4}" style="stroke: var(--hud-deep)" stroke-width="0.5"/>`;
      }
      svg += `<text x="${x}" y="${y + 7}" style="fill: var(--hud-dim); font-size: 9px">${node.label}</text>`;
      svg += `<text x="${x + 55}" y="${y + 7}" style="fill: var(--hud-primary); font-size: 9px">${node.status}</text>`;
    });
    trustNodes.innerHTML = svg;
  }

  // ===== INIT =====
  buildCompassTicks();
  buildTapeTicks(altTicks, 2000, 3600, 50, 250, 100, true);
  buildTapeTicks(spdTicks, 80, 180, 5, 25, 1700, false);
  buildTrustChain();

  // Initialize DRIP display
  dripUasId.textContent = formatHHIT(uasHHIT);
  dripOperator.textContent = operatorId;
  dripSession.textContent = formatHHIT(sessionDET);

  // ===== UTILITY FUNCTIONS =====

  function formatDMS(decimal, posChar, negChar) {
    const sign = decimal >= 0 ? posChar : negChar;
    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(1);
    return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(4, '0')}"${sign}`;
  }

  function formatTime(d) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mon = months[d.getUTCMonth()];
    const yyyy = d.getUTCFullYear();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${dd} ${mon} ${yyyy} ${hh}:${mm}:${ss}Z`;
  }

  function commaNum(n) { return Math.round(n).toLocaleString('en-US'); }

  function drift(value, range, min, max) {
    return Math.max(min, Math.min(max, value + (Math.random() - 0.5) * range));
  }

  function timeStamp() {
    const d = new Date();
    return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}:${String(d.getUTCSeconds()).padStart(2,'0')}Z`;
  }

  // ===== COMMLOG =====
  function addCommMessage() {
    const tpl = commTemplates[Math.floor(Math.random() * commTemplates.length)];
    const call = droneFleet[Math.floor(Math.random() * droneFleet.length)].call;
    const grid = `${Math.floor(Math.random() * 90 + 10)}S${Math.floor(Math.random() * 900 + 100)}`;
    const mode = nvgMode ? 'FLIR' : 'NVG';
    const msg = tpl.replace('{c}', call).replace('{g}', grid).replace('{m}', mode);
    commBuffer.push(`${timeStamp()} ${msg}`);
    if (commBuffer.length > COMM_MAX) commBuffer.shift();
    let svg = '';
    commBuffer.forEach((line, i) => {
      const op = 0.4 + (i / COMM_MAX) * 0.6; // older messages dimmer
      svg += `<text x="0" y="${i * 13}" opacity="${op.toFixed(2)}">${line}</text>`;
    });
    commlogLines.innerHTML = svg;
  }

  // ===== ENCOUNTER LOG =====
  function addEncounter() {
    const drone = droneFleet[Math.floor(Math.random() * droneFleet.length)];
    const hash = seededHash(encCounter + dripSeed, 4);
    const entry = `ENC-${String(encCounter).padStart(4,'0')}-${drone.call}-${hash}  ${timeStamp()}`;
    encCounter++;
    encBuffer.push(entry);
    if (encBuffer.length > ENC_MAX) encBuffer.shift();
    let svg = '';
    encBuffer.forEach((line, i) => {
      svg += `<text x="0" y="${i * 14}" style="fill: var(--hud-dim)">${line}</text>`;
    });
    encEntries.innerHTML = svg;
  }

  // ===== MULTI-DRONE RWR RENDERING =====
  function renderDrones() {
    let svg = '';
    droneFleet.forEach(d => {
      d.angle += (Math.random() - 0.5) * 0.08;
      d.dist = Math.max(6, Math.min(38, d.dist + (Math.random() - 0.5) * 1.5));
      const x = Math.cos(d.angle) * d.dist;
      const y = Math.sin(d.angle) * d.dist;
      const col = d.auth ? '--hud-bright' : '--hud-flash';
      const shape = d.rid === 'BCAST'
        ? `<polygon points="0,-3 2.5,2 -2.5,2" style="fill: var(${col})" opacity="0.9"/>`
        : `<polygon points="0,-3 2.5,2 -2.5,2" style="fill: none; stroke: var(${col})" stroke-width="0.8" stroke-dasharray="2,1" opacity="0.9"/>`;
      svg += `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)})">${shape}<text x="5" y="1" style="fill: var(--hud-dim); font-family: 'Courier New', monospace; font-size: 6px">${d.call}</text></g>`;
    });
    rwrDrones.innerHTML = svg;
  }

  // ===== rAF LOOP =====
  let compassTime = 0;
  function animate(timestamp) {
    compassTime = timestamp || 0;

    // Compass heading (sinusoidal drift)
    heading = headingBase + Math.sin(compassTime * 0.0003) * 8 + Math.sin(compassTime * 0.0007) * 3;
    heading = ((heading % 360) + 360) % 360;
    headingValue.textContent = Math.round(heading) + '°';
    const compassOffset = 960 - heading * 2.2;
    compassTicks.setAttribute('transform', `translate(${compassOffset}, 0)`);

    // Bank angle drift
    bank = Math.sin(compassTime * 0.0004) * 12 + Math.sin(compassTime * 0.00091) * 5;
    horizon.setAttribute('transform', `rotate(${bank.toFixed(1)}, 960, 540)`);

    // Noise seed (every 3rd frame)
    if (++noiseSeed % 3 === 0) {
      noiseTurb.setAttribute('seed', noiseSeed);
    }

    // --- NVG PHYSICS ---

    // Warm-up animation (entering NVG mode)
    if (warmupStart > 0) {
      const elapsed = (compassTime - warmupStart) / 1000;
      if (elapsed < 2.5) {
        const p = elapsed / 2.5;
        agcLevel = 1 - p;
        agcOverlay.setAttribute('opacity', agcLevel.toFixed(3));
        binoOverlay.setAttribute('opacity', (p * 0.85).toFixed(3));
        honeycombLayer.setAttribute('opacity', (p * 0.07).toFixed(3));
      } else {
        warmupStart = 0;
        agcLevel = 0;
        agcOverlay.setAttribute('opacity', '0');
        binoOverlay.setAttribute('opacity', '0.85');
        honeycombLayer.setAttribute('opacity', '0.07');
      }
    }

    // AGC recovery (skip during warm-up)
    if (warmupStart === 0 && agcLevel > 0.005) {
      agcLevel *= 0.985;
      agcOverlay.setAttribute('opacity', agcLevel.toFixed(3));
    } else if (warmupStart === 0 && agcLevel > 0 && agcLevel <= 0.005) {
      agcLevel = 0;
      agcOverlay.setAttribute('opacity', '0');
    }

    // Flash recovery (green-out / complementary)
    if (flashLevel > 0.005) {
      flashLevel *= 0.96;
      flashOverlay.setAttribute('opacity', flashLevel.toFixed(3));
    } else if (flashLevel > 0) {
      flashLevel = 0;
      flashOverlay.setAttribute('opacity', '0');
    }

    // Phosphor persistence trails (NVG mode only)
    if (nvgMode && phosphorTrail.length > 0) {
      let trailSvg = '';
      phosphorTrail = phosphorTrail.filter(t => {
        t.age += 0.016;
        if (t.age > 3) return false;
        const op = Math.max(0, 1 - t.age / 3);
        trailSvg += `<g transform="translate(${(960 + t.x).toFixed(0)}, ${(540 + t.y).toFixed(0)})" opacity="${op.toFixed(2)}">` +
          `<line x1="-12" y1="0" x2="12" y2="0" style="stroke: var(--hud-primary)" stroke-width="0.5"/>` +
          `<line x1="0" y1="-12" x2="0" y2="12" style="stroke: var(--hud-primary)" stroke-width="0.5"/>` +
          `<rect x="-6" y="-6" width="12" height="12" fill="none" style="stroke: var(--hud-primary)" stroke-width="0.3"/>` +
          `</g>`;
        return true;
      });
      trackTrails.innerHTML = trailSvg;
    } else if (!nvgMode && trackTrails.innerHTML !== '') {
      trackTrails.innerHTML = '';
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // ===== UTC CLOCK (1s) =====
  setInterval(() => {
    utcClock.textContent = formatTime(new Date());
  }, 1000);

  // ===== TELEMETRY DRIFT (1s) =====
  setInterval(() => {
    alt = drift(alt, 15, 2400, 3200);
    spd = drift(spd, 3, 100, 160);
    rng = drift(rng, 0.15, 5, 12);
    pwr = drift(pwr, 0.3, 60, 100);
    tgtRng = drift(tgtRng, 0.02, 0.8, 2.5);

    altValue.textContent = commaNum(alt);
    spdValue.textContent = Math.round(spd);
    rngValue.textContent = rng.toFixed(1);
    pwrValue.textContent = Math.round(pwr);
    tgtRange.textContent = `RNG ${tgtRng.toFixed(2)}km`;

    // Power bar
    const barH = Math.round(pwr);
    pwrFill.setAttribute('height', barH);
    pwrFill.setAttribute('y', 100 - barH);

    // Tape instruments
    altTicks.setAttribute('transform', `translate(0, ${530 + alt})`);
    altReadout.textContent = commaNum(alt);
    spdTicks.setAttribute('transform', `translate(0, ${530 + spd * 5})`);
    spdReadout.textContent = Math.round(spd);

    // Gimbal/sensor drift
    gimbalPan = drift(gimbalPan, 1.5, 200, 290);
    gimbalTilt = drift(gimbalTilt, 0.5, 5, 25);
    flirZoom = drift(flirZoom, 0.1, 2.0, 6.0);
    const modeLabel = nvgMode ? 'NVG' : 'FLIR';
    sensorMode.textContent = `${modeLabel} ${flirZoom.toFixed(1)}x Z${Math.round(gimbalPan)} T${Math.round(gimbalTilt)}`;

    // Weapon status
    wpnStatus.textContent = wpnCount > 0 ? `${wpnCount}xHELLF` : 'EMPTY';

    // Auth page assembly (one page per second)
    if (authPage < AUTH_TOTAL) {
      authPage++;
      authFill.setAttribute('width', Math.round(authPage / AUTH_TOTAL * 198));
      authPages.textContent = `${authPage}/${AUTH_TOTAL} PG`;
      if (authPage === AUTH_TOTAL) {
        authSig.textContent = 'VRFD';
        authSig.style.fill = 'var(--hud-bright)';
      }
    }
  }, 1000);

  // ===== GPS DRIFT (2s) =====
  setInterval(() => {
    lat = drift(lat, 0.00005, 34.19, 34.22);
    lon = drift(lon, 0.00005, -118.26, -118.23);
    gpsCoords.textContent = `${formatDMS(lat, 'N', 'S')}  ${formatDMS(lon, 'E', 'W')}`;
  }, 2000);

  // ===== STATUS TOGGLES (3s) =====
  let statusCycle = 0;
  setInterval(() => {
    statusCycle++;

    // Link status
    if (statusCycle % 3 === 0) {
      lnkStatus.textContent = lnkStatus.textContent === 'ACTV' ? 'SYNC' : 'ACTV';
    }
    // Track scan
    if (statusCycle % 5 === 0) {
      trkStatus.textContent = 'SCAN';
      setTimeout(() => { trkStatus.textContent = 'ENBL'; }, 800);
    }
    // System check
    if (statusCycle % 7 === 0) {
      sysStatus.textContent = 'CHK';
      setTimeout(() => { sysStatus.textContent = 'ENBL'; }, 500);
    }
    // Flight mode cycle
    if (statusCycle % 4 === 0) {
      fltModeIdx = (fltModeIdx + 1) % fltModes.length;
      fltMode.textContent = fltModes[fltModeIdx];
    }

    // DRIP session/auth rotation
    if (statusCycle % 10 === 0) {
      sessionDET = seededHash(dripSeed + statusCycle, 16);
      dripSession.textContent = formatHHIT(sessionDET);
    }
    if (statusCycle % 8 === 0) {
      dripAuthEl.textContent = ['VRFD', 'ACTV', 'PEND'][statusCycle % 3];
    }
    if (statusCycle % 6 === 0) {
      dripRidMode.textContent = dripRidMode.textContent === 'BCAST' ? 'NET' : 'BCAST';
    }

    // Observer state machine
    if (statusCycle % 4 === 0) {
      obsIdx = (obsIdx + 1) % obsStates.length;
      obsState.textContent = `● ${obsStates[obsIdx]}`;
    }

    // Auth cycle reset (~60s)
    if (statusCycle % 20 === 0 && authPage >= AUTH_TOTAL) {
      authPage = 0;
      authFill.setAttribute('width', '0');
      authPages.textContent = '0/16 PG';
      authSig.textContent = 'AWAIT';
      authSig.style.fill = 'var(--hud-dim)';
    }

    // RWR threats
    let dots = '';
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 22;
      dots += `<circle cx="${(Math.cos(angle) * dist).toFixed(1)}" cy="${(Math.sin(angle) * dist).toFixed(1)}" r="2.5" class="rwr-dot"/>`;
    }
    rwrThreats.innerHTML = dots;

    // Multi-drone fleet on RWR
    renderDrones();
  }, 3000);

  // ===== COMMLOG + ENCOUNTERS (5s) =====
  setInterval(() => {
    addCommMessage();
  }, 4000);

  setInterval(() => {
    addEncounter();
  }, 8000);

  // Seed initial COMMLOG
  setTimeout(() => addCommMessage(), 500);
  setTimeout(() => addCommMessage(), 1200);
  setTimeout(() => addCommMessage(), 2000);
  // Seed initial encounters
  setTimeout(() => addEncounter(), 600);
  setTimeout(() => addEncounter(), 1500);

  // ===== CLICK TO PLACE TARGET =====
  document.getElementById('hud').addEventListener('click', (e) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    // Phosphor persistence: record old position before moving
    if (nvgMode) {
      phosphorTrail.push({ x: reticleOffX, y: reticleOffY, age: 0 });
      if (phosphorTrail.length > 6) phosphorTrail.shift();
    }

    reticleOffX = svgPt.x - 960;
    reticleOffY = svgPt.y - 540;
    reticle.setAttribute('transform', `translate(${reticleOffX.toFixed(0)}, ${reticleOffY.toFixed(0)})`);
    reticle.style.transformOrigin = `${960 + reticleOffX}px ${540 + reticleOffY}px`;
    tgtRng = 0.5 + (1080 - svgPt.y) / 1080 * 3;
  });

  // ===== KEYBOARD CONTROLS =====
  document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'a': headingBase -= 2; break;
      case 'd': headingBase += 2; break;
      case 'w': alt = Math.min(alt + 20, 3600); break;
      case 's': alt = Math.max(alt - 20, 2000); break;
      case 'ArrowLeft': e.preventDefault(); headingBase -= 5; break;
      case 'ArrowRight': e.preventDefault(); headingBase += 5; break;
      case 'ArrowUp': e.preventDefault(); alt = Math.min(alt + 50, 3600); break;
      case 'ArrowDown': e.preventDefault(); alt = Math.max(alt - 50, 2000); break;

      case ' ':
        e.preventDefault();
        if (wpnCount > 0) {
          wpnCount--;
          // Fire flash
          const svg = document.getElementById('hud');
          const flash = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          flash.setAttribute('x', '0');
          flash.setAttribute('y', '0');
          flash.setAttribute('width', '1920');
          flash.setAttribute('height', '1080');
          flash.style.fill = 'var(--hud-flash)';
          flash.classList.add('fire-flash');
          svg.appendChild(flash);
          flash.addEventListener('animationend', () => flash.remove());

          // AGC response (dims scene)
          agcLevel = Math.min(1, agcLevel + 0.4);
          agcOverlay.setAttribute('opacity', agcLevel.toFixed(3));

          // NVG green-out (bright flash through tubes)
          if (nvgMode) {
            flashOverlay.style.fill = 'var(--hud-bright)';
            flashLevel = 0.6;
            flashOverlay.setAttribute('opacity', '0.6');
          }

          // COMMLOG: weapon fire event
          const call = droneFleet[0].call;
          commBuffer.push(`${timeStamp()} ${call}: RIFLE RIFLE RIFLE`);
          if (commBuffer.length > COMM_MAX) commBuffer.shift();
          let csv = '';
          commBuffer.forEach((line, i) => {
            const op = 0.4 + (i / COMM_MAX) * 0.6;
            csv += `<text x="0" y="${i * 13}" opacity="${op.toFixed(2)}">${line}</text>`;
          });
          commlogLines.innerHTML = csv;
        }
        break;

      case 'n': case 'N':
        nvgMode = !nvgMode;
        if (nvgMode) {
          // Enter NVG: tube warm-up sequence
          document.body.classList.add('nvg');
          agcLevel = 1;
          agcOverlay.setAttribute('opacity', '1');
          warmupStart = performance.now();
        } else {
          // Exit NVG: complementary magenta afterimage flash
          flashOverlay.style.fill = '#ff00ff';
          flashLevel = 0.35;
          flashOverlay.setAttribute('opacity', '0.35');
          // Remove vignette + honeycomb
          binoOverlay.setAttribute('opacity', '0');
          honeycombLayer.setAttribute('opacity', '0');
          warmupStart = 0;
          agcLevel = 0;
          agcOverlay.setAttribute('opacity', '0');
          document.body.classList.remove('nvg');
          // Clear phosphor trails
          phosphorTrail = [];
          trackTrails.innerHTML = '';
        }
        break;
    }
  });
});
