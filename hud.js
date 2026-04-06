document.addEventListener('DOMContentLoaded', () => {
  // Cache elements
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

  // State
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

  // --- Build compass ticks ONCE (3 repetitions for wrapping) ---
  function buildCompassTicks() {
    const cardinals = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    let svg = '';
    for (let rep = -1; rep <= 1; rep++) {
      for (let deg = 0; deg < 360; deg += 5) {
        const x = (deg + rep * 360) * 2.2;
        const isMajor = deg % 15 === 0;
        const h = isMajor ? 12 : 6;
        svg += `<line x1="${x}" y1="${60 - h}" x2="${x}" y2="60" stroke="${isMajor ? '#ff0000' : '#770000'}" stroke-width="${isMajor ? 1.5 : 0.8}"/>`;
        if (cardinals[deg]) {
          svg += `<text x="${x}" y="${60 - h - 5}" fill="#ff0000" font-family="'Courier New', monospace" font-size="11" text-anchor="middle" letter-spacing="1">${cardinals[deg]}</text>`;
        } else if (deg % 30 === 0) {
          svg += `<text x="${x}" y="${60 - h - 4}" fill="#990000" font-family="'Courier New', monospace" font-size="9" text-anchor="middle">${deg}°</text>`;
        }
      }
    }
    compassTicks.innerHTML = svg;
  }
  buildCompassTicks();

  // --- Build tape ticks ONCE ---
  function buildTapeTicks(group, min, max, step, majorEvery, x, isLeft) {
    let svg = '';
    for (let val = min; val <= max; val += step) {
      const y = -val; // negative so higher values go up
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
  buildTapeTicks(altTicks, 2000, 3600, 50, 250, 100, true);
  buildTapeTicks(spdTicks, 80, 180, 5, 25, 1700, false);

  // Format helpers
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

  // --- rAF loop: compass, bank, noise ---
  let compassTime = 0;
  function animate(timestamp) {
    compassTime = timestamp || 0;

    // Compass: sinusoidal drift on top of user-controlled base
    heading = headingBase + Math.sin(compassTime * 0.0003) * 8 + Math.sin(compassTime * 0.0007) * 3;
    heading = ((heading % 360) + 360) % 360;
    headingValue.textContent = Math.round(heading) + '°';
    const compassOffset = 960 - heading * 2.2;
    compassTicks.setAttribute('transform', `translate(${compassOffset}, 0)`);

    // Bank angle drift
    bank = Math.sin(compassTime * 0.0004) * 12 + Math.sin(compassTime * 0.00091) * 5;
    horizon.setAttribute('transform', `rotate(${bank.toFixed(1)}, 960, 540)`);

    // Noise seed (update every 3rd frame for perf)
    if (++noiseSeed % 3 === 0) {
      noiseTurb.setAttribute('seed', noiseSeed);
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // --- UTC clock (1s) ---
  setInterval(() => {
    utcClock.textContent = formatTime(new Date());
  }, 1000);

  // --- Telemetry drift (1s) ---
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

    // Tape instruments: translate tick groups so current value aligns with y=530
    altTicks.setAttribute('transform', `translate(0, ${530 + alt})`);
    altReadout.textContent = commaNum(alt);
    spdTicks.setAttribute('transform', `translate(0, ${530 + spd * 5})`);
    spdReadout.textContent = Math.round(spd);

    // Gimbal/sensor drift
    gimbalPan = drift(gimbalPan, 1.5, 200, 290);
    gimbalTilt = drift(gimbalTilt, 0.5, 5, 25);
    flirZoom = drift(flirZoom, 0.1, 2.0, 6.0);
    sensorMode.textContent = `FLIR ${flirZoom.toFixed(1)}x Z${Math.round(gimbalPan)} T${Math.round(gimbalTilt)}`;

    // Weapon status
    wpnStatus.textContent = wpnCount > 0 ? `${wpnCount}xHELLF` : 'EMPTY';
  }, 1000);

  // --- GPS drift (2s) ---
  setInterval(() => {
    lat = drift(lat, 0.00005, 34.19, 34.22);
    lon = drift(lon, 0.00005, -118.26, -118.23);
    gpsCoords.textContent = `${formatDMS(lat, 'N', 'S')}  ${formatDMS(lon, 'E', 'W')}`;
  }, 2000);

  // --- Status toggles (3s) ---
  let statusCycle = 0;
  setInterval(() => {
    statusCycle++;
    if (statusCycle % 3 === 0) {
      lnkStatus.textContent = lnkStatus.textContent === 'ACTV' ? 'SYNC' : 'ACTV';
    }
    if (statusCycle % 5 === 0) {
      trkStatus.textContent = 'SCAN';
      setTimeout(() => { trkStatus.textContent = 'ENBL'; }, 800);
    }
    if (statusCycle % 7 === 0) {
      sysStatus.textContent = 'CHK';
      setTimeout(() => { sysStatus.textContent = 'ENBL'; }, 500);
    }
    // Flight mode cycle
    if (statusCycle % 4 === 0) {
      fltModeIdx = (fltModeIdx + 1) % fltModes.length;
      fltMode.textContent = fltModes[fltModeIdx];
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
  }, 3000);

  // --- Click to place target ---
  document.getElementById('hud').addEventListener('click', (e) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    reticleOffX = svgPt.x - 960;
    reticleOffY = svgPt.y - 540;
    reticle.setAttribute('transform', `translate(${reticleOffX.toFixed(0)}, ${reticleOffY.toFixed(0)})`);
    reticle.style.transformOrigin = `${960 + reticleOffX}px ${540 + reticleOffY}px`;
    tgtRng = 0.5 + (1080 - svgPt.y) / 1080 * 3;
  });

  // --- Keyboard controls ---
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
          const svg = document.getElementById('hud');
          const flash = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          flash.setAttribute('x', '0');
          flash.setAttribute('y', '0');
          flash.setAttribute('width', '1920');
          flash.setAttribute('height', '1080');
          flash.setAttribute('fill', '#ff3300');
          flash.classList.add('fire-flash');
          svg.appendChild(flash);
          flash.addEventListener('animationend', () => flash.remove());
        }
        break;
    }
  });
});
