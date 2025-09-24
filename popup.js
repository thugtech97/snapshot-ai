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
  };
  source.onerror = (e) => {
    console.error('source load error', e);
    alert('Crop failed to load image.');
  };
  source.src = imgDataUrl;
});

/*
downloadBtn.addEventListener('click', () => {
  if (!imgDataUrl) return alert('No image to download');
  const a = document.createElement('a');
  a.href = imgDataUrl;
  a.download = 'snapshot.png';
  a.click();
});
*/

downloadBtn.addEventListener('click', () => {
  if (!imgDataUrl) {
    document.getElementById("result").textContent = 'No image to send.';
    return;
  }
  
  document.getElementById("loading").style.display = 'block';
  document.getElementById("result").textContent = '';

  fetch('https://app.sourceu.ai/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imgDataUrl, // Send the Base64 image string
    }),
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById("loading").style.display = 'none';
    
    if (data.result) {
      document.getElementById("result").innerHTML = data.result;
    } else if (data.error) {
      const errorMessage = data.detail ? `${data.error}: ${data.detail}` : data.error;
      document.getElementById("result").textContent = 'Error: ' + errorMessage;
    }
  })
  .catch(error => {
    console.error('Error:', error);
    document.getElementById("loading").style.display = 'none';
    document.getElementById("result").textContent = 'Failed to send image to the backend';
  });
});
