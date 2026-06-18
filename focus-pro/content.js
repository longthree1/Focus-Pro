(() => {
  'use strict';

  const FLAG = '__FOCUS_PRO__';
  if (window[FLAG]) return;
  window[FLAG] = true;

  const EXT = 'focus-pro';
  const Z = 2147483646;
  const HIDE_DELAY = 3000;

  const state = {
    activeVideo: null,
    placeholder: null,
    shell: null,
    ui: null,
    toastEl: null,
    fit: 'contain',
    scale: 1,
    oldAttrs: null,
    oldParent: null,
    oldNext: null,
    lastError: '',

    audioLock: true, // Always enabled by default, no toggle needed
    desiredVolume: 0.85,
    audioRepairTimeouts: null,
    mediaHandlers: null,
    videoObserver: null,
    videoRemovalObserver: null,

    controlsVisible: true,
    hideTimer: 0,
    progressTimer: 0,
    isDraggingProgress: false,
    lastKnownPlaying: false,
    lastMouseMove: 0,
    lastPointerX: null,
    lastPointerY: null,
    playbackRate: 1,
  };

  const isTypingTarget = (el) => {
    if (!el) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const m = Math.floor((sec / 60) % 60).toString();
    const h = Math.floor(sec / 3600);
    return h > 0 ? `${h}:${m.padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  function injectCss() {
    if (document.getElementById(`${EXT}-style`)) return;
    const style = document.createElement('style');
    style.id = `${EXT}-style`;
    style.textContent = `
      html.${EXT}-locked,
      html.${EXT}-locked body {
        overflow: hidden !important;
        overscroll-behavior: none !important;
        background: #000 !important;
      }

      #${EXT}-shell,
      #${EXT}-shell * {
        box-sizing: border-box !important;
      }

      #${EXT}-shell {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: ${Z} !important;
        background: #000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
        isolation: isolate !important;
        contain: layout style paint !important;
        touch-action: manipulation !important;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: geometricPrecision !important;
      }

      #${EXT}-shell.${EXT}-controls-hidden {
        cursor: none !important;
      }

      #${EXT}-shell video.${EXT}-video {
        display: block !important;
        position: relative !important;
        z-index: 1 !important;
        width: 100vw !important;
        height: 100vh !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        inset: auto !important;
        object-fit: var(--fbfp-fit, contain) !important;
        transform: translateZ(0) scale(var(--fbfp-scale, 1)) !important;
        transform-origin: center center !important;
        background: #000 !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        filter: none !important;
        will-change: transform !important;
      }

      #${EXT}-ui {
        position: fixed !important;
        inset: 0 !important;
        z-index: ${Z + 1} !important;
        pointer-events: none !important;
        color: #fff !important;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif !important;
        transition: opacity .18s ease, transform .18s ease !important;
        opacity: 1 !important;
        transform: translateY(0) !important;
      }

      #${EXT}-shell.${EXT}-controls-hidden #${EXT}-ui {
        opacity: 0 !important;
        transform: translateY(10px) !important;
        pointer-events: none !important;
      }

      #${EXT}-bottom {
        position: absolute !important;
        left: max(14px, env(safe-area-inset-left)) !important;
        right: max(14px, env(safe-area-inset-right)) !important;
        bottom: max(16px, env(safe-area-inset-bottom)) !important;
        pointer-events: auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .${EXT}-panel {
        width: min(670px, 100%) !important;
        margin: 0 auto !important;
        padding: 8px 10px 9px !important;
        border-radius: 20px !important;
        border: 1px solid rgba(255,255,255,.12) !important;
        background: linear-gradient(180deg, rgba(18,20,26,.56), rgba(8,9,12,.46)) !important;
        box-shadow: 0 18px 70px rgba(0,0,0,.40) !important;
        backdrop-filter: blur(20px) saturate(1.25) !important;
        -webkit-backdrop-filter: blur(20px) saturate(1.25) !important;
      }

      .${EXT}-progress-row {
        display: grid !important;
        grid-template-columns: 44px 1fr 44px !important;
        align-items: center !important;
        gap: 8px !important;
        margin: 0 2px 6px !important;
      }

      .${EXT}-time {
        color: rgba(255,255,255,.72) !important;
        font-size: 11px !important;
        line-height: 1 !important;
        font-weight: 700 !important;
        font-variant-numeric: tabular-nums !important;
        text-align: center !important;
        user-select: none !important;
      }

      #${EXT}-progress {
        appearance: none !important;
        -webkit-appearance: none !important;
        width: 100% !important;
        height: 18px !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        cursor: pointer !important;
        outline: none !important;
      }
      #${EXT}-progress::-webkit-slider-runnable-track {
        height: 4px !important;
        border-radius: 999px !important;
        background: linear-gradient(90deg, rgba(255,255,255,.96) var(--fbfp-progress, 0%), rgba(255,255,255,.22) var(--fbfp-progress, 0%)) !important;
      }
      #${EXT}-progress::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        width: 12px !important;
        height: 12px !important;
        margin-top: -4px !important;
        border-radius: 999px !important;
        background: #fff !important;
        box-shadow: 0 2px 10px rgba(0,0,0,.35) !important;
      }
      #${EXT}-progress::-moz-range-track {
        height: 4px !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,.22) !important;
      }
      #${EXT}-progress::-moz-range-progress {
        height: 4px !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,.96) !important;
      }
      #${EXT}-progress::-moz-range-thumb {
        width: 12px !important;
        height: 12px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: #fff !important;
      }

      .${EXT}-control-row {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-wrap: nowrap !important;
        gap: 6px !important;
      }

      #${EXT}-ui button {
        appearance: none !important;
        width: 38px !important;
        height: 34px !important;
        min-width: 38px !important;
        min-height: 34px !important;
        border: 1px solid rgba(255,255,255,.11) !important;
        background: rgba(255,255,255,.08) !important;
        color: #fff !important;
        border-radius: 13px !important;
        padding: 0 !important;
        cursor: pointer !important;
        display: inline-grid !important;
        place-items: center !important;
        user-select: none !important;
        transition: transform .12s ease, background .12s ease, border-color .12s ease, opacity .12s ease !important;
      }
      #${EXT}-ui button svg {
        width: 18px !important;
        height: 18px !important;
        display: block !important;
        fill: none !important;
        stroke: currentColor !important;
        stroke-width: 2.15 !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        pointer-events: none !important;
      }
      #${EXT}-ui button svg [fill="currentColor"] {
        fill: currentColor !important;
        stroke: none !important;
      }
      #${EXT}-ui button svg [stroke="none"] {
        stroke: none !important;
      }
      #${EXT}-ui button:hover {
        background: rgba(255,255,255,.17) !important;
        border-color: rgba(255,255,255,.22) !important;
        transform: translateY(-1px) !important;
      }
      #${EXT}-ui button:active {
        transform: translateY(0) scale(.96) !important;
      }
      #${EXT}-ui button.${EXT}-primary {
        width: 42px !important;
        min-width: 42px !important;
        background: rgba(255,255,255,.16) !important;
      }
      #${EXT}-ui button.${EXT}-on {
        background: rgba(50, 213, 131, .17) !important;
        border-color: rgba(50, 213, 131, .58) !important;
      }
      #${EXT}-ui button.${EXT}-danger {
        background: rgba(255, 60, 84, .13) !important;
        border-color: rgba(255, 255, 255, .10) !important;
      }

      #${EXT}-toast {
        position: fixed !important;
        left: 50% !important;
        bottom: 76px !important;
        transform: translateX(-50%) translateY(8px) !important;
        z-index: ${Z + 2} !important;
        padding: 9px 12px !important;
        border-radius: 999px !important;
        border: 1px solid rgba(255,255,255,.12) !important;
        background: rgba(8,10,14,.72) !important;
        color: #fff !important;
        font: 750 12px/1 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, "Noto Sans", sans-serif !important;
        box-shadow: 0 18px 60px rgba(0,0,0,.42) !important;
        backdrop-filter: blur(14px) !important;
        -webkit-backdrop-filter: blur(14px) !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transition: opacity .15s ease, transform .15s ease !important;
        user-select: none !important;
        white-space: nowrap !important;
      }
      #${EXT}-toast.show {
        opacity: 1 !important;
        transform: translateX(-50%) translateY(0) !important;
      }

      #${EXT}-speed-menu {
        position: absolute !important;
        bottom: calc(100% + 12px) !important;
        right: 46px !important;
        background: linear-gradient(180deg, rgba(28,30,36,.86), rgba(18,19,22,.76)) !important;
        border: 1px solid rgba(255,255,255,.12) !important;
        border-radius: 14px !important;
        padding: 6px !important;
        display: flex !important;
        flex-direction: column-reverse !important;
        gap: 2px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,.5) !important;
        backdrop-filter: blur(20px) saturate(1.25) !important;
        -webkit-backdrop-filter: blur(20px) saturate(1.25) !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transform: translateY(10px) scale(0.95) !important;
        transition: opacity .15s ease, transform .15s ease !important;
        z-index: ${Z + 2} !important;
      }
      #${EXT}-speed-menu.show {
        pointer-events: auto !important;
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }
      #${EXT}-speed-menu button {
        width: 100% !important;
        min-width: 60px !important;
        height: 28px !important;
        min-height: 28px !important;
        background: transparent !important;
        border: none !important;
        border-radius: 8px !important;
        color: rgba(255,255,255,.8) !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        text-align: center !important;
        padding: 0 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      #${EXT}-speed-menu button:hover {
        background: rgba(255,255,255,.12) !important;
        color: #fff !important;
        transform: translateY(0) !important;
      }
      #${EXT}-speed-menu button.${EXT}-active-speed {
        color: #fff !important;
        background: rgba(255,255,255,.16) !important;
      }

      @media (max-width: 560px) {
        .${EXT}-panel { width: min(96vw, 670px) !important; padding: 7px 8px 8px !important; }
        .${EXT}-progress-row { grid-template-columns: 38px 1fr 38px !important; gap: 6px !important; }
        .${EXT}-time { font-size: 10px !important; }
        .${EXT}-control-row { gap: 4px !important; overflow-x: auto !important; justify-content: flex-start !important; scrollbar-width: none !important; }
        .${EXT}-control-row::-webkit-scrollbar { display: none !important; }
        #${EXT}-ui button { width: 34px !important; min-width: 34px !important; height: 32px !important; min-height: 32px !important; border-radius: 12px !important; }
        #${EXT}-ui button.${EXT}-primary { width: 38px !important; min-width: 38px !important; }
        #${EXT}-ui button svg { width: 17px !important; height: 17px !important; }
      }
    `;
    document.documentElement.appendChild(style);
  }

  function toast(message, ms = 1100) {
    injectCss();
    let el = state.toastEl || document.getElementById(`${EXT}-toast`);
    if (!el) {
      el = document.createElement('div');
      el.id = `${EXT}-toast`;
      document.documentElement.appendChild(el);
      state.toastEl = el;
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el.__timer);
    el.__timer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function visibleRectScore(video) {
    const r = video.getBoundingClientRect();
    if (r.width < 80 || r.height < 80) return 0;
    const style = getComputedStyle(video);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return 0;

    const x1 = Math.max(0, r.left);
    const y1 = Math.max(0, r.top);
    const x2 = Math.min(window.innerWidth, r.right);
    const y2 = Math.min(window.innerHeight, r.bottom);
    const visibleArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area = r.width * r.height;
    if (visibleArea <= 0) return 0;

    let score = visibleArea;
    if (!video.paused) score *= 3;
    if (video.currentTime > 0) score *= 1.5;
    if (video.duration && Number.isFinite(video.duration)) score *= 1.1;
    if (!video.muted && video.volume > 0) score *= 1.2;
    if (area > visibleArea * 2.2) score *= 0.75;
    return score;
  }

  function findBestVideo() {
    const videos = [...document.querySelectorAll('video')]
      .filter(v => v && v.isConnected && v.readyState >= 1)
      .map(v => ({ v, score: visibleRectScore(v) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return videos[0]?.v || null;
  }

  function saveOld(video) {
    state.oldAttrs = {
      style: video.getAttribute('style'),
      class: video.getAttribute('class'),
      controls: video.controls,
      muted: video.muted,
      defaultMuted: video.defaultMuted,
      volume: video.volume,
      tabIndex: video.getAttribute('tabindex')
    };
    state.oldParent = video.parentNode;
    state.oldNext = video.nextSibling;
  }

  function restoreOld(video) {
    if (!video) return;
    const old = state.oldAttrs;
    video.classList.remove(`${EXT}-video`);
    if (old) {
      if (old.style === null) video.removeAttribute('style'); else video.setAttribute('style', old.style);
      if (old.class === null) video.removeAttribute('class'); else video.setAttribute('class', old.class);
      video.controls = Boolean(old.controls);
      video.defaultMuted = Boolean(old.defaultMuted);
      video.muted = Boolean(old.muted);
      if (typeof old.volume === 'number') video.volume = clamp(old.volume, 0, 1);
      if (old.tabIndex === null) video.removeAttribute('tabindex'); else video.setAttribute('tabindex', old.tabIndex);
    }
    video.playbackRate = 1;
  }

  function iconSvg(name) {
    const icons = {
      back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 7 6 12l5 5"/><path d="M6 12h11"/><path d="M20 8v8"/></svg>',
      forward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 7 5 5-5 5"/><path d="M6 12h12"/><path d="M4 8v8"/></svg>',
      play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/></svg>',
      pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/></svg>',
      crop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 6v12M16 6v12" opacity=".55"/></svg>',
      contain: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><rect x="7" y="8" width="10" height="8" rx="1" opacity=".65"/></svg>',
      zoomIn: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/><path d="M10.5 8v5M8 10.5h5"/></svg>',
      zoomOut: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/><path d="M8 10.5h5"/></svg>',
      audioLock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="M16 10.5v-1.2a2.8 2.8 0 0 1 5.6 0v1.2"/><rect x="15" y="10.5" width="7" height="6.5" rx="1.5"/></svg>',
      audioUnlock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="M16 10.5v-1.2a2.8 2.8 0 0 1 4.9-1.8"/><rect x="15" y="10.5" width="7" height="6.5" rx="1.5"/></svg>',
      fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4"/></svg>',
      fullscreenExit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5"/></svg>',
      close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
      speed: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/><text x="12" y="21" text-anchor="middle" font-size="6" font-weight="700" fill="currentColor" stroke="none"></text></svg>'
    };
    return icons[name] || icons.play;
  }

  function makeButton(act, iconName, title = '', cls = '') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.act = act;
    btn.innerHTML = iconSvg(iconName);
    if (title) {
      btn.title = title;
      btn.setAttribute('aria-label', title);
    } else {
      btn.setAttribute('aria-label', act);
    }
    if (cls) btn.className = cls;
    return btn;
  }

  function setButtonIcon(act, iconName, title = '') {
    const btn = state.ui?.querySelector(`button[data-act="${act}"]`) || document.querySelector(`#${EXT}-ui button[data-act="${act}"]`);
    if (!btn) return;
    btn.innerHTML = iconSvg(iconName);
    if (title) {
      btn.title = title;
      btn.setAttribute('aria-label', title);
    }
  }

  function makeUi() {
    const ui = document.createElement('div');
    ui.id = `${EXT}-ui`;

    const bottom = document.createElement('div');
    bottom.id = `${EXT}-bottom`;
    const panel = document.createElement('div');
    panel.className = `${EXT}-panel`;

    const progressRow = document.createElement('div');
    progressRow.className = `${EXT}-progress-row`;
    const cur = document.createElement('span');
    cur.className = `${EXT}-time`;
    cur.id = `${EXT}-current`;
    cur.textContent = '0:00';
    const progress = document.createElement('input');
    progress.id = `${EXT}-progress`;
    progress.type = 'range';
    progress.min = '0';
    progress.max = '1000';
    progress.value = '0';
    progress.step = '1';
    progress.title = 'Kéo để tua';
    progress.setAttribute('aria-label', 'Thanh tua video');
    const dur = document.createElement('span');
    dur.className = `${EXT}-time`;
    dur.id = `${EXT}-duration`;
    dur.textContent = '0:00';
    progressRow.append(cur, progress, dur);

    const controlRow = document.createElement('div');
    controlRow.className = `${EXT}-control-row`;
    controlRow.append(
      makeButton('seek-back', 'back', 'Lùi 10 giây'),
      makeButton('play', 'play', 'Dừng/phát', `${EXT}-primary`),
      makeButton('seek-forward', 'forward', 'Tới 10 giây'),
      makeButton('fit-contain', 'contain', 'Vừa màn'),
      makeButton('zoom-out', 'zoomOut', 'Thu nhỏ'),
      makeButton('zoom-in', 'zoomIn', 'Phóng to'),
      makeButton('speed', 'speed', 'Tốc độ phát'),
      makeButton('fullscreen', 'fullscreen', 'Toàn màn hình'),
      makeButton('close', 'close', 'Tắt Focus', `${EXT}-danger`)
    );

    const speedMenu = document.createElement('div');
    speedMenu.id = `${EXT}-speed-menu`;
    const speedSteps = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    speedSteps.forEach(rate => {
      const btn = document.createElement('button');
      btn.textContent = rate === 1 ? 'Chuẩn' : `${rate}x`;
      btn.dataset.speed = rate;
      if (rate === state.playbackRate) btn.classList.add(`${EXT}-active-speed`);
      speedMenu.appendChild(btn);
    });

    panel.style.position = 'relative';
    panel.append(speedMenu, progressRow, controlRow);
    bottom.append(panel);
    ui.append(bottom);

    ui.addEventListener('pointerenter', () => showControls('ui-enter'));
    ui.addEventListener('pointermove', () => showControls('ui-move'));
    ui.addEventListener('pointerleave', () => scheduleHideControls());

    ui.addEventListener('click', (e) => {
      const speedBtn = e.target.closest(`#${EXT}-speed-menu button`);
      if (speedBtn) {
        e.preventDefault();
        e.stopPropagation();
        const rate = parseFloat(speedBtn.dataset.speed);
        setSpeed(rate, { preserveVisibility: true });
        const menu = state.ui.querySelector(`#${EXT}-speed-menu`);
        if (menu) menu.classList.remove('show');
        return;
      }

      const btn = e.target.closest('button[data-act]');
      if (!btn) {
        const menu = state.ui?.querySelector(`#${EXT}-speed-menu`);
        if (menu && menu.classList.contains('show')) {
          menu.classList.remove('show');
        }
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      const act = btn.dataset.act;
      const menu = state.ui.querySelector(`#${EXT}-speed-menu`);

      if (act === 'seek-back') seekBy(-10, { preserveVisibility: true });
      if (act === 'seek-forward') seekBy(10, { preserveVisibility: true });
      if (act === 'play') togglePlay({ preserveVisibility: true });
      if (act === 'fit-contain') setFit('contain', { preserveVisibility: true });
      if (act === 'zoom-in') zoomBy(0.1, { preserveVisibility: true });
      if (act === 'zoom-out') zoomBy(-0.1, { preserveVisibility: true });
      if (act === 'audio-lock') toggleAudioLock({ preserveVisibility: true });
      if (act === 'speed') {
        if (menu) menu.classList.toggle('show');
      } else {
        if (menu) menu.classList.remove('show');
      }
      if (act === 'fullscreen') requestFullscreenSafe({ preserveVisibility: true });
      if (act === 'close') deactivate();
      if (act !== 'close') showControls('button');
    });

    progress.addEventListener('pointerdown', () => {
      state.isDraggingProgress = true;
      showControls('progress-down');
    }, true);
    progress.addEventListener('input', () => {
      state.isDraggingProgress = true;
      seekToProgress();
      updateProgressUi();
      showControls('progress-input');
    });
    progress.addEventListener('change', () => {
      seekToProgress();
      state.isDraggingProgress = false;
      showControls('progress-change');
    });
    progress.addEventListener('pointerup', () => {
      state.isDraggingProgress = false;
      showControls('progress-up');
    }, true);

    state.ui = ui;
    updateUiLabels();
    return ui;
  }

  function showControls(reason = 'show', delay = HIDE_DELAY) {
    if (!state.shell) return;
    state.controlsVisible = true;
    state.shell.classList.remove(`${EXT}-controls-hidden`);
    clearTimeout(state.hideTimer);
    if (delay > 0) scheduleHideControls(delay);
  }

  function hideControls() {
    if (!state.shell) return;

    // v1.4: Ẩn theo “idle timer” thật sự. Không kiểm tra :hover trên UI toàn màn hình nữa,
    // vì overlay fixed inset:0 có thể luôn bị xem là đang hover nên timer không bao giờ ẩn.
    if (state.isDraggingProgress) {
      scheduleHideControls(900);
      return;
    }

    state.controlsVisible = false;
    state.shell.classList.add(`${EXT}-controls-hidden`);
  }

  function scheduleHideControls(delay = HIDE_DELAY) {
    clearTimeout(state.hideTimer);
    state.hideTimer = setTimeout(hideControls, delay);
  }

  function forceHideControls() {
    if (!state.shell) return;
    clearTimeout(state.hideTimer);
    state.controlsVisible = false;
    state.shell.classList.add(`${EXT}-controls-hidden`);
  }

  function preserveControlVisibility(wasVisible) {
    if (wasVisible) showControls('preserve-visible');
    else forceHideControls();
  }

  function updateUiLabels() {
    const v = state.activeVideo;
    const isPlaying = Boolean(v && !v.paused);

    setButtonIcon('play', isPlaying ? 'pause' : 'play', isPlaying ? 'Tạm dừng' : 'Phát');
    setButtonIcon('audio-lock', state.audioLock ? 'audioLock' : 'audioUnlock', state.audioLock ? 'Khóa âm đang bật' : 'Khóa âm đang tắt');
    setButtonIcon('fullscreen', document.fullscreenElement ? 'fullscreenExit' : 'fullscreen', document.fullscreenElement ? 'Thoát fullscreen' : 'Fullscreen');

    const audioBtn = state.ui?.querySelector('button[data-act="audio-lock"]') || document.querySelector(`#${EXT}-ui button[data-act="audio-lock"]`);
    if (audioBtn) audioBtn.classList.toggle(`${EXT}-on`, Boolean(state.audioLock));

    const containBtn = state.ui?.querySelector('button[data-act="fit-contain"]');
    if (containBtn) containBtn.classList.toggle(`${EXT}-on`, state.fit === 'contain');

    // Update speed button label
    const speedBtn = state.ui?.querySelector('button[data-act="speed"]') || document.querySelector(`#${EXT}-ui button[data-act="speed"]`);
    if (speedBtn) {
      const rate = v ? (v.playbackRate || 1) : 1;
      speedBtn.innerHTML = `<span style="font-size:11px;font-weight:700;pointer-events:none;">${rate}×</span>`;
      speedBtn.title = `Tốc độ ×${rate}`;
      speedBtn.setAttribute('aria-label', `Tốc độ ×${rate}`);
      speedBtn.classList.toggle(`${EXT}-on`, rate !== 1);
    }

    // Update speed menu active item
    const speedMenuBtns = state.ui?.querySelectorAll(`#${EXT}-speed-menu button`);
    if (speedMenuBtns) {
      const rate = v ? (v.playbackRate || 1) : 1;
      speedMenuBtns.forEach(b => {
        b.classList.toggle(`${EXT}-active-speed`, parseFloat(b.dataset.speed) === rate);
      });
    }
  }

  function updateProgressUi() {
    const v = state.activeVideo;
    const progress = document.getElementById(`${EXT}-progress`);
    const cur = document.getElementById(`${EXT}-current`);
    const dur = document.getElementById(`${EXT}-duration`);
    if (!v || !progress || !cur || !dur) return;

    const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
    const current = Number.isFinite(v.currentTime) ? v.currentTime : 0;
    if (!state.isDraggingProgress) {
      progress.value = duration ? String(Math.round((current / duration) * 1000)) : '0';
    }
    const pct = duration ? clamp((Number(progress.value) / 1000) * 100, 0, 100) : 0;
    progress.style.setProperty('--fbfp-progress', `${pct}%`);
    cur.textContent = formatTime(current);
    dur.textContent = duration ? formatTime(duration) : '0:00';
    updateUiLabels();
  }

  function startProgressLoop() {
    stopProgressLoop();
    state.progressTimer = window.setInterval(updateProgressUi, 250);
  }

  function stopProgressLoop() {
    if (state.progressTimer) clearInterval(state.progressTimer);
    state.progressTimer = 0;
  }

  function seekToProgress() {
    const v = state.activeVideo;
    const progress = document.getElementById(`${EXT}-progress`);
    if (!v || !progress || !Number.isFinite(v.duration) || v.duration <= 0) return;
    v.currentTime = clamp((Number(progress.value) / 1000) * v.duration, 0, v.duration);
    scheduleAudioRepair('progress-seek');
  }

  function applyVideoStyle() {
    if (!state.activeVideo) return;
    state.activeVideo.style.setProperty('--fbfp-fit', state.fit);
    state.activeVideo.style.setProperty('--fbfp-scale', String(state.scale));
    state.activeVideo.style.width = '100vw';
    state.activeVideo.style.height = '100vh';
    state.activeVideo.style.objectFit = state.fit;
    state.activeVideo.style.transform = `translateZ(0) scale(${state.scale})`;
    updateUiLabels();
    updateProgressUi();
  }

  function repairAudio(reason = 'repair') {
    const video = state.activeVideo;
    if (!video || !state.audioLock) return;

    try {
      const currentVolume = Number.isFinite(video.volume) ? video.volume : state.desiredVolume;
      if (currentVolume > 0.02) state.desiredVolume = clamp(currentVolume, 0.05, 1);
      const safeVolume = clamp(state.desiredVolume || 0.85, 0.05, 1);

      if (video.defaultMuted) video.defaultMuted = false;
      if (video.hasAttribute('muted')) video.removeAttribute('muted');
      if (video.muted) video.muted = false;
      if (!Number.isFinite(video.volume) || video.volume <= 0.02) video.volume = safeVolume;
    } catch (err) {
      state.lastError = `audio:${String(err?.message || err)}`;
    }
  }

  function scheduleAudioRepair(reason = 'schedule') {
    if (!state.audioLock || !state.activeVideo) return;

    // Clear previous timeouts to prevent race condition
    if (state.audioRepairTimeouts) {
      state.audioRepairTimeouts.forEach(id => clearTimeout(id));
    }

    // Faster, more aggressive audio repair - immediate response
    state.audioRepairTimeouts = [0, 10, 50, 100, 200].map(delay =>
      setTimeout(() => {
        if (state.activeVideo) repairAudio(reason);
      }, delay)
    );
  }

  function cleanupGuards() {
    const video = state.activeVideo;
    if (video && state.mediaHandlers) {
      Object.entries(state.mediaHandlers).forEach(([eventName, handler]) => {
        video.removeEventListener(eventName, handler, true);
      });
    }
    state.mediaHandlers = null;

    if (state.videoObserver) {
      state.videoObserver.disconnect();
      state.videoObserver = null;
    }
    if (state.fullscreenHandler) {
      document.removeEventListener('fullscreenchange', state.fullscreenHandler, true);
      document.removeEventListener('webkitfullscreenchange', state.fullscreenHandler, true);
      state.fullscreenHandler = null;
    }
    if (state.videoRemovalObserver) {
      state.videoRemovalObserver.disconnect();
      state.videoRemovalObserver = null;
    }
    stopProgressLoop();
    clearTimeout(state.hideTimer);
  }

  function attachGuards(video) {
    cleanupGuards();

    state.mediaHandlers = {
      volumechange: () => { scheduleAudioRepair('volumechange'); updateUiLabels(); },
      pause: () => { state.lastKnownPlaying = false; scheduleAudioRepair('pause'); updateUiLabels(); updateProgressUi(); },
      play: () => { state.lastKnownPlaying = true; scheduleAudioRepair('play'); updateUiLabels(); },
      playing: () => { state.lastKnownPlaying = true; scheduleAudioRepair('playing'); updateUiLabels(); },
      loadedmetadata: () => { scheduleAudioRepair('loadedmetadata'); updateProgressUi(); },
      durationchange: () => updateProgressUi(),
      timeupdate: () => updateProgressUi(),
      click: () => scheduleAudioRepair('click')
    };
    Object.entries(state.mediaHandlers).forEach(([eventName, handler]) => video.addEventListener(eventName, handler, true));

    state.videoObserver = new MutationObserver((mutations) => {
      if (mutations.some(m => m.type === 'attributes' && m.attributeName === 'muted')) scheduleAudioRepair('muted-attribute');
    });
    state.videoObserver.observe(video, { attributes: true, attributeFilter: ['muted'] });

    state.fullscreenHandler = () => {
      applyVideoStyle();
      scheduleAudioRepair('fullscreenchange');
      showControls('fullscreenchange');
    };
    document.addEventListener('fullscreenchange', state.fullscreenHandler, true);
    document.addEventListener('webkitfullscreenchange', state.fullscreenHandler, true);
    startProgressLoop();

    // Monitor for video removal from DOM
    state.videoRemovalObserver = new MutationObserver(() => {
      if (state.activeVideo && !state.activeVideo.isConnected) {
        deactivate(false);
      }
    });
    // Observe the entire document for childList changes
    state.videoRemovalObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function activate(options = {}) {
    injectCss();

    const video = options.video || state.activeVideo || findBestVideo();
    if (!video) {
      toast('Chưa thấy video. Bấm Play rồi nhấn Alt+Z lại nhé.', 2200);
      return false;
    }

    if (state.activeVideo && state.activeVideo !== video) deactivate(false);

    const wasPaused = video.paused;
    const currentVolume = Number.isFinite(video.volume) ? video.volume : 0.85;
    if (currentVolume > 0.02) state.desiredVolume = clamp(currentVolume, 0.05, 1);
    
    // Auto unmute when focusing
    video.muted = false;
    video.defaultMuted = false;
    if (video.hasAttribute('muted')) video.removeAttribute('muted');
    if (video.volume <= 0.02) video.volume = state.desiredVolume || 0.85;

    if (!state.shell) {
      saveOld(video);

      const placeholder = document.createComment('FOCUS_PRO_PLACEHOLDER');
      if (video.parentNode) video.parentNode.insertBefore(placeholder, video);
      state.placeholder = placeholder;

      const shell = document.createElement('div');
      shell.id = `${EXT}-shell`;
      state.shell = shell;

      video.classList.add(`${EXT}-video`);
      video.controls = false;
      video.setAttribute('tabindex', '-1');
      shell.appendChild(video);
      shell.appendChild(makeUi());
      document.documentElement.appendChild(shell);
      document.documentElement.classList.add(`${EXT}-locked`);
      state.activeVideo = video;
      attachGuards(video);

      shell.addEventListener('pointermove', (e) => {
        if (!state.activeVideo) return;
        const now = performance.now();
        const x = Number(e.clientX);
        const y = Number(e.clientY);

        // Chỉ tính là hoạt động khi chuột di chuyển thật, tránh một số trang/video bắn
        // pointermove lặt vặt khiến control không bao giờ tự ẩn.
        const movedEnough = state.lastPointerX === null || state.lastPointerY === null ||
          Math.abs(x - state.lastPointerX) + Math.abs(y - state.lastPointerY) >= 6;
        if (!movedEnough || now - state.lastMouseMove < 70) return;

        state.lastPointerX = x;
        state.lastPointerY = y;
        state.lastMouseMove = now;
        showControls('pointer-move');
      }, { passive: true });

      shell.addEventListener('pointerdown', (e) => {
        if (e.target.closest?.(`#${EXT}-ui`)) return;
        showControls('pointer-down');
      }, true);

      shell.addEventListener('dblclick', (e) => {
        if (e.target.closest?.(`#${EXT}-ui`)) return;
        e.preventDefault();
        requestFullscreenSafe({ preserveVisibility: true });
      }, true);

      shell.addEventListener('click', (e) => {
        if (e.target.closest?.(`#${EXT}-ui`)) return;
        e.preventDefault();
        togglePlay({ preserveVisibility: true });
      }, true);

      scheduleAudioRepair('activate');
      if (!wasPaused) setTimeout(() => video.play().catch(() => {}), 30);
    } else {
      // Always keep native video controls off; custom controls are smoother and can truly auto-hide.
      state.activeVideo.controls = false;
      scheduleAudioRepair('reactivate');
    }

    state.fit = options.fit || state.fit || 'cover';
    if (typeof options.scale === 'number') state.scale = clamp(options.scale, 0.7, 3);
    applyVideoStyle();
    showControls('activate');
    toast(state.fit === 'cover' ? 'Đã phóng đầy màn' : 'Đã phóng vừa màn');
    return true;
  }

  function deactivate(showToast = true) {
    const video = state.activeVideo;
    cleanupGuards();

    if (video) {
      try {
        const targetParent = state.placeholder?.parentNode || state.oldParent || document.body;
        if (state.placeholder?.parentNode) {
          targetParent.insertBefore(video, state.placeholder);
          state.placeholder.remove();
        } else if (state.oldNext?.parentNode) {
          state.oldNext.parentNode.insertBefore(video, state.oldNext);
        } else if (state.oldParent) {
          state.oldParent.appendChild(video);
        }
        restoreOld(video);
      } catch (err) {
        state.lastError = String(err?.message || err);
      }
    }

    if (state.shell?.parentNode) state.shell.remove();
    document.documentElement.classList.remove(`${EXT}-locked`);
    state.activeVideo = null;
    state.placeholder = null;
    state.shell = null;
    state.ui = null;
    state.oldAttrs = null;
    state.oldParent = null;
    state.oldNext = null;
    state.scale = 1;
    state.playbackRate = 1;
    state.audioRepairTimeouts = null;
    state.controlsVisible = true;
    state.isDraggingProgress = false;
    if (showToast) toast('Đã tắt Focus Mode');
  }

  function setFit(fit, options = {}) {
    const wasVisible = state.controlsVisible;
    if (!activate({ fit })) return;
    state.fit = fit;
    applyVideoStyle();
    scheduleAudioRepair('setFit');
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
    toast(fit === 'cover' ? 'Đầy màn: có thể cắt nhẹ mép' : 'Vừa màn: không cắt hình');
  }

  function zoomBy(delta, options = {}) {
    const wasVisible = state.controlsVisible;
    if (!activate({ fit: state.fit || 'cover' })) return;
    state.scale = clamp(Math.round((state.scale + delta) * 10) / 10, 0.7, 3);
    applyVideoStyle();
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
    toast(`Zoom ${Math.round(state.scale * 100)}%`);
  }

  function resetZoom(options = {}) {
    const wasVisible = state.controlsVisible;
    if (!activate({ fit: state.fit || 'cover', scale: 1 })) return;
    state.scale = 1;
    applyVideoStyle();
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
    toast('Zoom 100%');
  }

  function toggleAudioLock(options = {}) {
    const wasVisible = state.controlsVisible;
    state.audioLock = !state.audioLock;
    updateUiLabels();
    if (state.audioLock) {
      scheduleAudioRepair('audio-lock-on');
      toast('Khóa âm ON');
    } else {
      toast('Khóa âm OFF');
    }
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
  }

  async function requestFullscreenSafe(options = {}) {
    const wasVisible = state.controlsVisible;
    if (!state.shell) activate({ fit: 'cover' });
    const target = state.shell || state.activeVideo || document.documentElement;
    try {
      scheduleAudioRepair('before-fullscreen');
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        toast('Đã thoát fullscreen');
      } else {
        await target.requestFullscreen({ navigationUI: 'hide' });
        applyVideoStyle();
        scheduleAudioRepair('after-fullscreen');
        toast('Fullscreen sạch');
      }
      preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
    } catch (err) {
      state.lastError = String(err?.message || err);
      toast('Fullscreen bị trình duyệt chặn. Bấm Alt+F ngay trên trang.', 2600);
    }
  }

  function togglePlay(options = {}) {
    const wasVisible = state.controlsVisible;
    const v = state.activeVideo || findBestVideo();
    if (!v) return;
    if (v.paused) {
      scheduleAudioRepair('before-play');
      v.play().catch(() => {});
      scheduleAudioRepair('after-play');
    } else {
      v.pause();
      scheduleAudioRepair('after-pause');
    }
    updateUiLabels();
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
  }

  function seekBy(seconds, options = {}) {
    const wasVisible = state.controlsVisible;
    const v = state.activeVideo || findBestVideo();
    if (!v || !Number.isFinite(v.currentTime)) return;
    const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : Infinity;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + seconds));
    scheduleAudioRepair('seek');
    updateProgressUi();

    // Quan trọng: nếu control đang ẩn, phím tua chỉ tua, không tự hiện UI.
    // Nếu control đang hiện, phím tua giữ UI hiện và reset bộ đếm 3 giây.
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
  }

  function changeVolume(delta, options = {}) {
    const wasVisible = state.controlsVisible;
    const v = state.activeVideo || findBestVideo();
    if (!v) return;
    const next = clamp((Number.isFinite(v.volume) ? v.volume : state.desiredVolume) + delta, 0, 1);
    v.volume = next;
    state.desiredVolume = clamp(next || 0.05, 0.05, 1);
    if (next > 0) {
      state.audioLock = true;
      v.muted = false;
      v.defaultMuted = false;
      if (v.hasAttribute('muted')) v.removeAttribute('muted');
    }
    updateUiLabels();
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
    toast(`Âm lượng ${Math.round(next * 100)}%`);
  }

  function toggleMuteManual(options = {}) {
    const wasVisible = state.controlsVisible;
    const v = state.activeVideo || findBestVideo();
    if (!v) return;
    if (!v.muted && v.volume > 0.02) {
      state.audioLock = false;
      v.muted = true;
      updateUiLabels();
      toast('Đã tắt tiếng thủ công. Alt+A để khóa âm lại.');
    } else {
      state.audioLock = true;
      if (v.volume <= 0.02) v.volume = state.desiredVolume || 0.85;
      scheduleAudioRepair('manual-unmute');
      updateUiLabels();
      toast('Đã bật tiếng + khóa âm');
    }
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
  }

  const SPEED_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  function cycleSpeed(options = {}) {
    const v = state.activeVideo || findBestVideo();
    if (!v) return;
    const currentRate = v.playbackRate || 1;
    const idx = SPEED_STEPS.indexOf(currentRate);
    const nextRate = SPEED_STEPS[(idx + 1) % SPEED_STEPS.length];
    setSpeed(nextRate, options);
  }

  function setSpeed(rate, options = {}) {
    const wasVisible = state.controlsVisible;
    const v = state.activeVideo || findBestVideo();
    if (!v) return;
    v.playbackRate = rate;
    state.playbackRate = rate;
    updateUiLabels();
    preserveControlVisibility(options.preserveVisibility ? true : wasVisible);
    toast(`Tốc độ ${rate === 1 ? 'chuẩn' : rate + 'x'}`);
  }

  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e.target)) return;

    if (e.altKey && e.code === 'KeyZ') {
      e.preventDefault();
      setFit('contain', { preserveVisibility: true });
      return;
    }
    if (e.altKey && e.code === 'KeyV') {
      e.preventDefault();
      setFit('cover', { preserveVisibility: true });
      return;
    }
    if (e.altKey && e.code === 'KeyF') {
      e.preventDefault();
      requestFullscreenSafe({ preserveVisibility: true });
      return;
    }

    if (e.altKey && e.code === 'KeyS') {
      e.preventDefault();
      if (!state.activeVideo) activate({ fit: state.fit || 'cover' });
      cycleSpeed({ preserveVisibility: true });
      return;
    }
    if (e.altKey && e.code === 'KeyX') {
      e.preventDefault();
      deactivate();
      return;
    }

    if (!state.activeVideo) return;

    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomBy(0.1);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomBy(-0.1);
    } else if (e.key === '0') {
      e.preventDefault();
      resetZoom();
    } else if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      seekBy(5);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      seekBy(-5);
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      changeVolume(0.05);
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      changeVolume(-0.05);
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      toggleMuteManual();
    }
  }, true);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.source !== EXT) return;
    try {
      if (message.type === 'focus-cover') activate({ fit: 'cover', scale: 1 });
      if (message.type === 'focus-contain') activate({ fit: 'contain', scale: 1 });
      if (message.type === 'zoom-in') zoomBy(0.1, { preserveVisibility: true });
      if (message.type === 'zoom-out') zoomBy(-0.1, { preserveVisibility: true });
      if (message.type === 'reset-zoom') resetZoom({ preserveVisibility: true });
      if (message.type === 'toggle-audio-lock') {
        if (!state.activeVideo) activate({ fit: state.fit || 'cover' });
        toggleAudioLock({ preserveVisibility: true });
      }
      if (message.type === 'fullscreen') requestFullscreenSafe({ preserveVisibility: true });
      if (message.type === 'close') deactivate();
      
      sendResponse({ ok: true, active: Boolean(state.activeVideo), fit: state.fit, scale: state.scale, audioLock: state.audioLock, controlsVisible: state.controlsVisible, lastError: state.lastError });
    } catch (err) {
      state.lastError = String(err?.message || err);
      sendResponse({ ok: false, error: state.lastError });
    }
  });

  // Cleanup handlers to prevent memory leaks on navigation
  function cleanup() {
    cleanupGuards();
    if (state.activeVideo) {
      deactivate(false);
    }
  }

  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('pagehide', cleanup, { once: true });

  toast('Focus sẵn sàng: Alt+Z phóng đầy màn');
})();
