const EXT = 'fb-reel-focus-pro';
const statusEl = document.getElementById('status');
const fbControls = document.getElementById('fb-controls');
const meetControls = document.getElementById('meet-controls');
const tiktokControls = document.getElementById('tiktok-controls');

function setStatus(text) {
  statusEl.textContent = text;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setStatus('Current tab not found.');
    return;
  }

  const url = tab.url || '';
  const isFb = /^https:\/\/(www\.|web\.|m\.)?facebook\.com\//.test(url);
  const isMeet = /^https:\/\/meet\.google\.com\//.test(url);
  const isTikTok = /^https:\/\/(www\.)?tiktok\.com\//.test(url);

  if (isFb) {
    fbControls.style.display = 'block';
    send('status', tab.id);
  } else if (isMeet) {
    meetControls.style.display = 'block';
    send('status', tab.id);
  } else if (isTikTok) {
    tiktokControls.style.display = 'block';
    send('status', tab.id);
  } else {
    setStatus('Open Facebook, Meet, or TikTok video.');
  }
}

async function send(type, tabId = null) {
  if (!tabId) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    tabId = tab.id;
  }
  
  try {
    const res = await chrome.tabs.sendMessage(tabId, { source: EXT, type });
    if (res?.ok) {
      if (res.isMeet) {
        setStatus(res.active ? 'Focus Meet active' : 'Focus Meet inactive');
      } else if (res.isTikTok) {
        setStatus(res.active ? 'TikTok gifts hidden' : 'TikTok gifts visible');
      } else {
        const zoom = res.scale ? ` · zoom ${Math.round(res.scale * 100)}%` : '';
        const audio = res.audioLock ? ' · khóa âm ON' : ' · khóa âm OFF';
        setStatus(res.active ? `Focus active (${res.fit})${zoom}${audio}` : `Focus inactive${audio}`);
      }
    } else {
      setStatus(res?.error || 'Extension not running. Reload page.');
    }
  } catch (err) {
    setStatus('Reload page then try again.');
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  send(btn.dataset.action);
});

document.addEventListener('keydown', async (e) => {
  if (!e.altKey) return;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  
  switch(e.key.toLowerCase()) {
    case 'z': send('focus-contain', tab.id); break;
    case 'x': send('close', tab.id); break;
  }
  e.preventDefault();
});

init();
