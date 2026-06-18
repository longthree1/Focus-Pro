const EXT = 'focus-pro';
let hideInterval = null;
let isFocusMeet = false;
let customStyle = null;
let debounceTimer = null;
let storedSelfVideoTile = null; // Direct reference to self-video element
let storedTopBar = null; // Cache for the top bar element

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.source !== EXT) return;
  try {
    if (msg.type === 'status') {
      sendResponse({ ok: true, active: isFocusMeet, isMeet: true });
    } else if (msg.type === 'meet-focus') {
      focusMeetVideo();
      sendResponse({ ok: true, active: true, isMeet: true });
    } else if (msg.type === 'meet-close') {
      unfocusMeetVideo();
      sendResponse({ ok: true, active: false, isMeet: true });
    }
  } catch (err) {
    console.error('[Focus Pro] Meet message handler error:', err);
    sendResponse({ ok: false, error: String(err?.message || err) });
  }
});

/**
 * Detects the self-video webcam tile in Google Meet.
 *
 * Uses multi-strategy detection for robustness:
 * - Strategy 1: data-self-view attribute (most reliable when present)
 * - Strategy 2: aria-label heuristics + active video/canvas detection
 * - Strategy 3: Smallest muted video tile (fallback for UI variations)
 *
 * @returns {HTMLElement|null} The self-video tile element, or null if not found
 */

function findSelfVideoTile() {
  const allTiles = document.querySelectorAll('div[data-participant-id]');

  // Strategy: Find tile with an ACTIVE video stream (has srcObject or visible video/canvas)
  // This is more reliable than relying on Google Meet's internal attributes

  let bestCandidate = null;
  let bestScore = 0;

  allTiles.forEach(tile => {
    let score = 0;

    // Check for video element
    const video = tile.querySelector('video');
    if (video) {
      // Check if video is loaded
      if (video.readyState >= 2) score += 5;
      // Higher score if has video dimensions
      if (video.videoWidth > 0 && video.videoHeight > 0) score += 5;
      // Higher score if not paused
      if (!video.paused) score += 3;
      // Higher score if muted (self video is typically muted)
      if (video.muted) score += 2;
    }

    // Check for canvas element (Google Meet sometimes renders video as canvas)
    const canvas = tile.querySelector('canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 50) score += 8;
    }

    // Check for self-identifying attributes (bonus points, not required)
    const ariaLabel = (tile.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('you') || ariaLabel.includes('self') || ariaLabel.includes('bạn')) score += 5;

    const dataSelfView = tile.getAttribute('data-self-view');
    if (dataSelfView === 'true') score += 10;

    // Track best candidate
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = tile;
    }
  });

  // Return best candidate if it has meaningful score (has video/canvas)
  if (bestScore >= 5) {
    return bestCandidate;
  }

  // === Strategy 3: Fallback - Find smallest muted video tile ===
  // Self-view is typically the smallest tile and is muted by default
  try {
    const allVideos = document.querySelectorAll('video');
    if (allVideos.length > 1) {
      const videoArray = Array.from(allVideos);
      // Sort by rendered size (smallest first)
      const sortedBySize = videoArray.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return (rectA.width * rectA.height) - (rectB.width * rectB.height);
      });

      // Check if smallest video is muted (typical for self-view)
      for (const video of sortedBySize) {
        if (video.muted) {
          const tile = video.closest('div[data-participant-id]');
          if (tile) {
            return tile;
          }
        }
      }

      // Last resort: return parent tile of smallest video
      const smallestVideo = sortedBySize[0];
      const tile = smallestVideo.closest('div[data-participant-id]');
      if (tile) {
        return tile;
      }
    }
  } catch (err) {
    // Silent fail - Strategy 3 is a fallback only
  }

  return null;
}

function isSelfWebcamActive(selfTile) {
  if (!selfTile) return false;

  // Find video or canvas element
  const video = selfTile.querySelector('video');
  const canvas = selfTile.querySelector('canvas');

  if (!video && !canvas) return false;

  // Video check
  if (video) {
    // Determine visibility since hidden videos mean cam is off
    const style = window.getComputedStyle(video);
    if (style.display === 'none' || style.visibility === 'hidden') return false;

    const isReady = video.readyState >= 2;
    const hasDimensions = video.videoWidth > 0 && video.videoHeight > 0;
    const isNotPaused = !video.paused;

    // Active if has dimensions OR (not paused and has data)
    return hasDimensions || (isNotPaused && isReady);
  }

  // Canvas fallback
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 50 && rect.height > 50;
  }

  return false;
}

function focusMeetVideo() {
  if (isFocusMeet) return;
  isFocusMeet = true;

  // Reset stored references
  storedSelfVideoTile = null;
  storedTopBar = null;

  if (!customStyle) {
    customStyle = document.createElement('style');
    customStyle.id = 'focus-pro-meet-style';
    customStyle.textContent = `
      /* 1. HIDE CHAT PANELS & MESSAGES */
      div[aria-label*="chat" i][role="dialog"],
      div[aria-label*="message" i][role="dialog"],
      div[aria-label*="tin nhắn" i][role="dialog"],
      [data-tab-id="chat"] {
        display: none !important;
      }

      /* 2. HIDE REACTIONS, EMOJIS, FLYING ANIMATIONS */
      button[aria-label*="emoji" i],
      button[aria-label*="reaction" i],
      button[aria-label*="react" i],
      [aria-label*="gửi phản ứng" i],
      [aria-label*="send reaction" i],
      div[class*="reaction" i],
      div[aria-label*="reactions" i],
      div[role="dialog"][aria-label*="reaction" i],
      div[role="dialog"][aria-label*="emoji" i] {
        display: none !important;
      }

      /* 3. HIDE HAND RAISE BUTTONS */
      button[aria-label*="hand" i],
      button[aria-label*="raise" i],
      button[aria-label*="giơ tay" i],
      button[aria-label*="tay" i],
      button[aria-label*="lower hand" i],
      button[aria-label*="hạ tay" i] {
        display: none !important;
      }
    `;
    document.head.appendChild(customStyle);
  }

  // Bắt đầu vòng lặp quét nhẹ nhàng (200ms)
  // Các thành phần UI nhiễu đã được ẩn tĩnh bằng CSS
  hideInterval = setInterval(applyHeuristics, 200);
  applyHeuristics();
}

function applyHeuristics() {
  if (!isFocusMeet) return;

  // === STEP 0: DETECT SELF-VIDEO WEBCAM STATE ===
  const isStoredTileActive = storedSelfVideoTile && isSelfWebcamActive(storedSelfVideoTile);

  if (storedSelfVideoTile && isStoredTileActive) {
    // Stored tile is still active → keep showing it
    requestAnimationFrame(() => {
      if (storedSelfVideoTile && isFocusMeet) {
        storedSelfVideoTile.style.display = '';
        storedSelfVideoTile.classList.remove('fb-hidden-tile');
      }
    });
  } else if (storedSelfVideoTile && !isStoredTileActive) {
    // Stored tile exists but stream is gone → clear it
    storedSelfVideoTile = null;
  }

  // Find self-tile for first-time detection
  let selfTile = null;
  if (!storedSelfVideoTile) {
    selfTile = findSelfVideoTile();
    const isSelfWebcamOn = isSelfWebcamActive(selfTile);

    if (selfTile && isSelfWebcamOn) {
      storedSelfVideoTile = selfTile;
      requestAnimationFrame(() => {
        if (storedSelfVideoTile && isFocusMeet) {
          storedSelfVideoTile.style.display = '';
          storedSelfVideoTile.classList.remove('fb-hidden-tile');
        }
      });
    } else if (selfTile && !isSelfWebcamOn) {
      selfTile.style.display = 'none';
      selfTile.classList.add('fb-hidden-tile');
    }
  }

  // --- 1. TÌM TILE CHÍNH (THUYẾT TRÌNH) ---
  const allTiles = Array.from(document.querySelectorAll('div[data-participant-id], div[data-allocation-index]'));
  let mainTile = null;
  let maxArea = window.innerWidth * window.innerHeight * 0.1;

  allTiles.forEach(tile => {
    if (tile === selfTile) return;
    const rect = tile.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > maxArea && rect.width > 0) {
      maxArea = area;
      mainTile = tile;
    }
  });

  // --- 2. ẨN TẤT CẢ CÁC TILE KHÁC ---
  allTiles.forEach(tile => {
    if (tile === mainTile) {
      tile.style.display = '';
      tile.classList.remove('fb-hidden-tile');
    } else if (tile === selfTile && storedSelfVideoTile) {
      // Self tile with webcam ON - keep it
    } else {
      tile.style.display = 'none';
      tile.classList.add('fb-hidden-tile');
    }
  });

  // --- 3. DỌN SẠCH TILE CHÍNH (Ẩn tên, icon ghim) ---
  if (mainTile) {
    const innerDivs = mainTile.querySelectorAll('div');
    innerDivs.forEach(div => {
      const rect = div.getBoundingClientRect();
      if (rect.width > 0 && rect.width < 350 && rect.height > 0 && rect.height < 60) {
        if (!div.querySelector('video') && !div.querySelector('canvas')) {
          div.style.display = 'none';
          div.classList.add('fb-hidden-overlay');
        }
      }
    });
  }

  // --- 4. DIỆT BONG BÓNG TEXT BAY LÊN ---
  const topDivs = document.querySelectorAll('body > div');
  topDivs.forEach(div => {
    if (div.style.display === 'none') return;
    const style = window.getComputedStyle(div);
    if (style.pointerEvents === 'none' && style.position === 'absolute') {
      div.style.display = 'none';
      div.classList.add('fb-hidden-reaction');
    }
  });

  // --- 5. ẨN TOP BAR (Có Caching) ---
  if (storedTopBar && document.body.contains(storedTopBar)) {
    // Đã ẩn rồi, bỏ qua
  } else {
    storedTopBar = null;
    const bodyDivs = document.querySelectorAll('body > div');
    for (const div of bodyDivs) {
      const rect = div.getBoundingClientRect();
      if (rect.top === 0 && rect.height > 20 && rect.height < 100 && rect.width > window.innerWidth * 0.8) {
        const text = div.innerText || '';
        if (text.match(/\d{1,2}:\d{2}/) || text.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/)) {
          div.style.display = 'none';
          div.classList.add('fb-hidden-topbar');
          storedTopBar = div;
          break;
        }
      }
    }
  }
}

function unfocusMeetVideo() {
  if (!isFocusMeet) return;
  isFocusMeet = false;
  
  if (hideInterval) clearInterval(hideInterval);
  
  if (customStyle) {
    customStyle.remove();
    customStyle = null;
  }

  // Reset stored self-video reference
  storedSelfVideoTile = null;

  const hiddenElements = document.querySelectorAll('.fb-hidden-tile, .fb-hidden-topbar, .fb-hidden-overlay, .fb-hidden-reaction, .fb-hidden-sidebar');
  hiddenElements.forEach(el => {
    el.style.display = '';
    el.classList.remove('fb-hidden-tile', 'fb-hidden-topbar', 'fb-hidden-overlay', 'fb-hidden-reaction', 'fb-hidden-sidebar');
  });
}

const isTypingTarget = (el) => {
  if (!el) return false;
  const tag = (el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
};

document.addEventListener('keydown', (e) => {
  if (isTypingTarget(e.target)) return;
  if (e.altKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (!isFocusMeet) focusMeetVideo();
  }
  if (e.altKey && e.key.toLowerCase() === 'x') {
    e.preventDefault();
    if (isFocusMeet) unfocusMeetVideo();
  }
});

// Phản ứng tức thì khi có sự kiện từ video (bật/tắt camera, nhận data mới)
['play', 'playing', 'pause', 'loadeddata', 'loadedmetadata'].forEach(evt => {
  document.addEventListener(evt, (e) => {
    if (isFocusMeet && e.target && e.target.tagName === 'VIDEO') {
      if (!debounceTimer) {
        debounceTimer = setTimeout(() => {
          applyHeuristics();
          debounceTimer = null;
        }, 20);
      }
    }
  }, true);
});
