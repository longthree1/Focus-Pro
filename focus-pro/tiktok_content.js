const EXT = 'fb-reel-focus-pro';
let cleanInterval = null;
let isCleanTikTok = false;
let customStyle = null;
let observer = null;
let debounceTimer = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.source !== EXT) return;
  
  if (msg.type === 'status') {
    sendResponse({ ok: true, active: isCleanTikTok, isTikTok: true });
    return true;
  }
  if (msg.type === 'tiktok-clean') {
    cleanTikTokLive();
    sendResponse({ ok: true, active: true, isTikTok: true });
    return true;
  }
  if (msg.type === 'tiktok-restore') {
    restoreTikTokLive();
    sendResponse({ ok: true, active: false, isTikTok: true });
    return true;
  }
});

function cleanTikTokLive() {
  if (isCleanTikTok) return;
  isCleanTikTok = true;

  if (!customStyle) {
    customStyle = document.createElement('style');
    customStyle.id = 'fb-focus-tiktok-style';
    customStyle.textContent = `
      /* CSS ẨN CÁC PHẦN TỬ LIÊN QUAN ĐẾN QUÀ TẶNG (GIFTS) VÀ ĐỒ BAY TRÊN TIKTOK LIVE */
      
      /* Ẩn bảng tặng quà dưới cùng của khung video (chỉ chọn class bắt đầu bằng DivGift hoặc DivBottomGift để tránh nhầm controls) */
      div[class*="DivGiftSlot"],
      div[class*="DivGiftContainer"],
      div[class*="DivGiftBar"],
      div[class*="DivGiftSelectContainer"],
      div[class*="DivGiftPanel"],
      div[class*="DivBottomGift"],
      
      /* Ẩn nút "Tặng quà" (Gift Button) kế bên ô nhập chat */
      button[class*="GiftButton"],
      button[class*="GiftIcon"],
      div[class*="GiftButton"],
      div[class*="DivGiftIcon"],
      div[class*="gift-icon"],
      button[aria-label*="quà" i],
      button[aria-label*="gift" i],
      
      /* Ẩn hiệu ứng quà tặng bay nhảy (Combo, Animation) trên màn hình stream */
      div[class*="DivGiftAnimation"],
      div[class*="DivGiftCombo"],
      div[class*="WebcastGift"],
      div[class*="webcast-gift"],
      
      /* Ẩn thanh chạy ngang thông báo "X đã gửi Rose cho Y" */
      div[class*="DivGiftNotification"],
      div[class*="webcast-notification"],
      div[class*="DivSystemMessage"] {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
      
      /* Đánh dấu phần tử ẩn bằng class để dễ khôi phục */
      .fb-hidden-tiktok-el {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(customStyle);
  }

  // Lắng nghe thay đổi DOM để ẩn tức thì các bảng quà hoặc thông báo mới bay lên
  if (!observer) {
    observer = new MutationObserver(() => {
      if (isCleanTikTok && !debounceTimer) {
        debounceTimer = setTimeout(() => {
          applyTikTokHeuristics();
          debounceTimer = null;
        }, 50);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  cleanInterval = setInterval(applyTikTokHeuristics, 600);
  applyTikTokHeuristics();
}

function applyTikTokHeuristics() {
  if (!isCleanTikTok) return;

  // --- 1. TÌM VÀ ẨN BẰNG JAVASCRIPT CÁC ELEMENT BẢNG QUÀ / NẠP TIỀN BỊ OBFUSCATE CLASS ---
  const allElements = document.querySelectorAll('div, button, span, p');
  allElements.forEach(el => {
    if (el.classList.contains('fb-hidden-tiktok-el')) return;

    const text = (el.textContent || '').trim();
    
    // Chỉ khớp với cụm từ đặc thù của nút Nạp/Recharge trong bảng quà
    if (
      text === 'Recharge' || 
      text === 'Recharge ^' || 
      text === 'Nạp xu' || 
      text === 'Nạp tiền' ||
      text === 'Nạp xu ^'
    ) {
      let p = el.parentElement;
      for (let i = 0; i < 5; i++) {
        if (p && p.tagName.toLowerCase() === 'div') {
          const rect = p.getBoundingClientRect();
          // Bảng quà tặng nằm ngang dưới cùng thường có chiều rộng lớn và chiều cao vừa phải
          if (rect.width > 280 && rect.height > 35 && rect.height < 180) {
            
            // KIỂM TRA ĐỀ PHÒNG 1: Đảm bảo không ẩn nhầm thanh điều khiển của trình phát video
            const className = (p.className || '').toLowerCase();
            const hasPlayButton = p.querySelector('svg[class*="play" i], button[class*="play" i], button[aria-label*="Play" i], button[aria-label*="Dừng" i], [class*="play" i]');
            const hasVolume = p.querySelector('svg[class*="volume" i], button[class*="volume" i], button[aria-label*="Volume" i], button[aria-label*="Âm lượng" i], [class*="volume" i]');
            const hasFullscreen = p.querySelector('svg[class*="fullscreen" i], button[class*="fullscreen" i], button[aria-label*="Fullscreen" i], button[aria-label*="Toàn màn hình" i]');
            
            if (hasPlayButton || hasVolume || hasFullscreen) {
              p = p.parentElement;
              continue;
            }
            
            if (
              (className.includes('control') || className.includes('player') || className.includes('video') || className.includes('volume') || className.includes('progress')) &&
              !className.includes('gift')
            ) {
              p = p.parentElement;
              continue;
            }

            // KIỂM TRA ĐỀ PHÒNG 2: Nếu container chứa một thẻ <video> ngay cạnh (sibling) -> chắc chắn là bộ controls của video, không ẩn!
            const hasVideoSibling = p.parentElement && Array.from(p.parentElement.children).some(child => child.tagName.toLowerCase() === 'video');
            if (hasVideoSibling) {
              p = p.parentElement;
              continue;
            }

            // KIỂM TRA ĐỀ PHÒNG 3: Nếu text chứa ký tự thời gian dạng 00:00 (ví dụ 0:34:12) -> chắc chắn là thanh controls, không ẩn!
            if (p.textContent && /\d{1,2}:\d{2}/.test(p.textContent)) {
              p = p.parentElement;
              continue;
            }

            console.log('[TikTok Clean] Hiding gift bar container:', p, 'due to text:', text);
            p.style.display = 'none';
            p.classList.add('fb-hidden-tiktok-el');
            break;
          }
        }
        p = p?.parentElement;
      }
    }
    
    // Ẩn các banner, bảng combo hoặc khung thông báo bay lên trên video có chữ "sent" hoặc "đã gửi"
    if (
      (text.includes('sent') || text.includes('đã gửi')) && 
      (text.includes('Rose') || text.includes('Hoa hồng') || text.includes('tặng') || text.includes('gift'))
    ) {
      let p = el;
      if (p.offsetWidth < 450 && p.offsetHeight < 120) {
        // Tìm div tổ hợp ngoài cùng chứa thông báo đó, dừng lại nếu chạm đến thanh điều khiển hoặc video
        while (p.parentElement && p.parentElement.offsetWidth < 480 && p.parentElement.offsetHeight < 130 && p.parentElement !== document.body) {
          const parentClass = (p.parentElement.className || '').toLowerCase();
          const hasPlay = p.parentElement.querySelector('button[class*="play" i], svg[class*="play" i]');
          const hasVideoSibling = p.parentElement.parentElement && Array.from(p.parentElement.parentElement.children).some(child => child.tagName.toLowerCase() === 'video');
          
          if (parentClass.includes('control') || parentClass.includes('player') || hasPlay || hasVideoSibling) {
            break;
          }
          p = p.parentElement;
        }
        // Chỉ ẩn nếu không phải là thanh điều khiển video
        const finalClass = (p.className || '').toLowerCase();
        const hasTime = p.textContent && /\d{1,2}:\d{2}/.test(p.textContent);
        if (!finalClass.includes('control') && !finalClass.includes('player') && !hasTime) {
          console.log('[TikTok Clean] Hiding gift notification:', p, 'due to text:', text);
          p.style.display = 'none';
          p.classList.add('fb-hidden-tiktok-el');
        }
      }
    }
  });
}

function restoreTikTokLive() {
  if (!isCleanTikTok) return;
  isCleanTikTok = false;

  if (cleanInterval) clearInterval(cleanInterval);
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (customStyle) {
    customStyle.remove();
    customStyle = null;
  }

  // Khôi phục lại các element bị ẩn bởi JS
  const hiddenElements = document.querySelectorAll('.fb-hidden-tiktok-el');
  hiddenElements.forEach(el => {
    el.style.display = '';
    el.classList.remove('fb-hidden-tiktok-el');
  });
}

// Phím tắt nhanh Alt+X để tắt chế độ ẩn quà tặng
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key.toLowerCase() === 'x') {
    if (isCleanTikTok) restoreTikTokLive();
  }
});
