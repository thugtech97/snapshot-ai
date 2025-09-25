// --- existing references kept ---
const captureBtn = document.getElementById('capture');
const clearBtn = document.getElementById('clear');
const cropBtn = document.getElementById('crop');
const downloadBtn = document.getElementById('download');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let imgDataUrl = null;
let img = new Image();

let selecting = false;
let sel = { x: 0, y: 0, w: 0, h: 0 };

const chatEl = document.getElementById('chat');
const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('send');
const loadingEl = document.getElementById('loading');

let conversation = [];

let imageAlreadySent = false;

(function initPlaceholder(){
  ctx.fillStyle = '#eef4fb';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px system-ui';
  ctx.fillText('No snapshot yet', 12, 20);
})();

captureBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, (resp) => {
    if (!resp) {
      alert('No response from background. Open Service worker console if needed.');
      return;
    }
    if (!resp.success) {
      alert('Capture failed: ' + (resp.error || 'unknown'));
      console.error('capture error', resp.error);
      return;
    }
    imgDataUrl = resp.dataUrl;
    img.src = imgDataUrl;
    img.onload = () => {
      fitCanvasToImage(img);
      sel = { x: 0, y: 0, w: 0, h: 0 };
      imageAlreadySent = false;
    };
    img.onerror = (e) => {
      console.error('Image load failed', e);
      alert('Failed to load captured image.');
    };
  });
});

clearBtn.addEventListener('click', () => {
  imgDataUrl = null;
  sel = { x: 0, y: 0, w: 0, h: 0 };
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = '#eef4fb';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px system-ui';
  ctx.fillText('No snapshot yet', 12, 20);

  conversation = [];
  chatEl.innerHTML = '';
  imageAlreadySent = false;
});

function fitCanvasToImage(image){
  const maxW = 300;
  const ratio = image.width / image.height || 1;
  const w = Math.min(image.width, maxW);
  const h = Math.round(w / ratio);
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

function redrawWithSelection(){
  if (!imgDataUrl) return;
  img.src = imgDataUrl;
  img.onload = () => {
    fitCanvasToImage(img);
    if (sel.w && sel.h) {
      ctx.strokeStyle = 'rgba(11,132,255,0.95)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
      ctx.fillStyle = 'rgba(11,132,255,0.12)';
      ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
    }
  };
}

canvas.addEventListener('mousedown', (e) => {
  if (!imgDataUrl) return;
  selecting = true;
  const r = canvas.getBoundingClientRect();
  sel.x = Math.max(0, Math.round(e.clientX - r.left));
  sel.y = Math.max(0, Math.round(e.clientY - r.top));
  sel.w = 0; sel.h = 0;
});

window.addEventListener('mousemove', (e) => {
  if (!selecting) return;
  const r = canvas.getBoundingClientRect();
  const cx = Math.max(0, Math.round(e.clientX - r.left));
  const cy = Math.max(0, Math.round(e.clientY - r.top));
  sel.w = Math.max(1, cx - sel.x);
  sel.h = Math.max(1, cy - sel.y);
  // redraw overlay
  redrawWithSelection();
});

window.addEventListener('mouseup', () => { selecting = false; });

cropBtn.addEventListener('click', () => {
  if (!imgDataUrl) return;
  if (!sel.w || !sel.h) {
    alert('Draw a selection on the image first (click-and-drag).');
    return;
  }

  const naturalW = img.naturalWidth || canvas.width;
  const naturalH = img.naturalHeight || canvas.height;
  const scaleX = naturalW / canvas.width;
  const scaleY = naturalH / canvas.height;

  const sx = Math.round(sel.x * scaleX);
  const sy = Math.round(sel.y * scaleY);
  const sw = Math.round(sel.w * scaleX);
  const sh = Math.round(sel.h * scaleY);

  const tmp = document.createElement('canvas');
  tmp.width = sw || 1;
  tmp.height = sh || 1;
  const tctx = tmp.getContext('2d');

  const source = new Image();
  source.onload = () => {
    tctx.drawImage(source, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);
    const cropped = tmp.toDataURL('image/png');
    imgDataUrl = cropped;
    sel = { x: 0, y: 0, w: 0, h: 0 };
    img.src = imgDataUrl;
    img.onload = () => fitCanvasToImage(img);
    imageAlreadySent = false;
  };
  source.onerror = (e) => {
    console.error('source load error', e);
    alert('Crop failed to load image.');
  };
  source.src = imgDataUrl;
});

function appendMessage(role, htmlContent) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message ' + (role === 'user' ? 'user' : 'assistant');

  wrapper.innerHTML = htmlContent;
  chatEl.appendChild(wrapper);
  chatEl.scrollTop = chatEl.scrollHeight;
}

let typingIndicator = null;
function setTyping(on){
  if (on) {
    typingIndicator = document.createElement('div');
    typingIndicator.className = 'message assistant';
    typingIndicator.textContent = 'Thinking…';
    chatEl.appendChild(typingIndicator);
    chatEl.scrollTop = chatEl.scrollHeight;
  } else {
    if (typingIndicator && typingIndicator.parentNode) {
      typingIndicator.parentNode.removeChild(typingIndicator);
    }
    typingIndicator = null;
  }
}

function stripHtml(input){
  const tmp = document.createElement('div');
  tmp.innerHTML = input;
  return tmp.textContent || tmp.innerText || '';
}

async function sendMessage() {
  const text = (promptEl.value || '').trim();
  if (!text) return;

  appendMessage('user', escapeHtml(text));
  conversation.push({ role: 'user', content: text });
  promptEl.value = '';

  loadingEl.style.display = 'inline';
  setTyping(true);

  const payload = { messages: conversation };

  if (imgDataUrl && !imageAlreadySent) {
    payload.image = imgDataUrl;
  }

  try {
    const res = await fetch('https://app.sourceu.ai/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    loadingEl.style.display = 'none';
    setTyping(false);

    if (data.result) {
      appendMessage('assistant', data.result);

      conversation.push({ role: 'assistant', content: stripHtml(data.result) });

      if (payload.image) imageAlreadySent = true;
    } else if (data.error) {
      const err = data.detail ? `${data.error}: ${data.detail}` : data.error;
      appendMessage('assistant', escapeHtml('Error: ' + err));
    } else {
      appendMessage('assistant', escapeHtml('Unknown response from server.'));
    }
  } catch (err) {
    loadingEl.style.display = 'none';
    setTyping(false);
    appendMessage('assistant', escapeHtml('Failed to send message: ' + err.message));
    console.error(err);
  }
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

sendBtn.addEventListener('click', sendMessage);
promptEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

downloadBtn.removeEventListener && downloadBtn.removeEventListener('click', () => {});
downloadBtn.addEventListener('click', async () => {
  if (!imgDataUrl) {
    appendMessage('assistant', escapeHtml('No image to send.'));
    return;
  }

  const quickPrompt = 'Please analyze the attached snapshot: what is visible, readable text, bullet points, and suggested actions.';
  appendMessage('user', escapeHtml(quickPrompt));
  conversation.push({ role: 'user', content: quickPrompt });

  loadingEl.style.display = 'inline';
  setTyping(true);

  const payload = { messages: conversation, image: (!imageAlreadySent ? imgDataUrl : undefined) };

  try {
    const res = await fetch('https://app.sourceu.ai/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    loadingEl.style.display = 'none';
    setTyping(false);

    if (data.result) {
      appendMessage('assistant', data.result);
      conversation.push({ role: 'assistant', content: stripHtml(data.result) });
      if (payload.image) imageAlreadySent = true;
    } else if (data.error) {
      const err = data.detail ? `${data.error}: ${data.detail}` : data.error;
      appendMessage('assistant', escapeHtml('Error: ' + err));
    } else {
      appendMessage('assistant', escapeHtml('Unknown response from server.'));
    }
  } catch (err) {
    loadingEl.style.display = 'none';
    setTyping(false);
    appendMessage('assistant', escapeHtml('Failed to send image: ' + err.message));
    console.error(err);
  }
});

appendMessage('assistant', 'Hi — you can ask about the snapshot. Type a question and press Send, or click "Get insights" for a quick analysis.');
conversation.push({ role: 'assistant', content: 'Hi — you can ask about the snapshot. Type a question and press Send, or click "Get insights" for a quick analysis.' });
