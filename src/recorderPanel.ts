import * as vscode from 'vscode';

export type AudioReadyCallback = (audioBase64: string, mimeType: string) => void;

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export class RecorderPanel {
  public static currentPanel: RecorderPanel | undefined;

  private readonly _panel: vscode.WebviewPanel;
  private _callback: AudioReadyCallback;
  private readonly _disposables: vscode.Disposable[] = [];

  // -------------------------------------------------------------------------

  public static createOrShow(
    extensionUri: vscode.Uri,
    callback: AudioReadyCallback
  ): void {
    if (RecorderPanel.currentPanel) {
      RecorderPanel.currentPanel._callback = callback;
      RecorderPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'lpeVoiceRecorder',
      'Voice Input',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: false,
      }
    );

    RecorderPanel.currentPanel = new RecorderPanel(panel, callback);
  }

  // -------------------------------------------------------------------------

  private constructor(panel: vscode.WebviewPanel, callback: AudioReadyCallback) {
    this._panel = panel;
    this._callback = callback;

    this._panel.webview.html = this._buildHtml(this._panel.webview);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message: { command: string; audioData?: string; mimeType?: string }) => {
        switch (message.command) {
          case 'audioReady':
            if (message.audioData && message.mimeType) {
              this._callback(message.audioData, message.mimeType);
            }
            this._panel.dispose();
            break;

          case 'cancel':
            this._panel.dispose();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose(): void {
    RecorderPanel.currentPanel = undefined;
    this._panel.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
  }

  // -------------------------------------------------------------------------

  private _buildHtml(webview: vscode.Webview): string {
    const nonce = getNonce();
    // CSP: scripts only from our nonce; allow inline styles; allow mediastream blobs
    const csp = [
      `default-src 'none'`,
      `script-src 'nonce-${nonce}'`,
      `style-src 'unsafe-inline'`,
      `media-src mediastream: blob:`,
    ].join('; ');

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Voice Input</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 20px;
      padding: 32px 24px;
    }

    h1 {
      font-size: 15px;
      font-weight: 600;
      opacity: 0.85;
    }

    /* ---- Mic button ---- */
    .mic-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pulse {
      position: absolute;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: var(--vscode-button-background, #0078d4);
      opacity: 0;
    }
    .pulse.active {
      animation: pulse 1.4s ease-out infinite;
    }
    @keyframes pulse {
      0%   { transform: scale(0.85); opacity: 0.45; }
      100% { transform: scale(1.9);  opacity: 0; }
    }

    #recordBtn {
      position: relative;
      z-index: 1;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      border: none;
      background: var(--vscode-button-background, #0078d4);
      color: var(--vscode-button-foreground, #fff);
      font-size: 30px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, transform 0.1s;
      line-height: 1;
    }
    #recordBtn:hover  { background: var(--vscode-button-hoverBackground, #005a9e); transform: scale(1.06); }
    #recordBtn.active { background: #c62828; }
    #recordBtn.active:hover { background: #b71c1c; }

    /* ---- Visualizer ---- */
    canvas {
      border-radius: 4px;
      opacity: 0;
      transition: opacity 0.3s;
      width: 240px;
      height: 48px;
    }
    canvas.visible { opacity: 1; }

    /* ---- Timer ---- */
    #timer {
      font-size: 26px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      letter-spacing: 1px;
      min-height: 32px;
    }

    /* ---- Status ---- */
    #status {
      font-size: 12px;
      opacity: 0.7;
      min-height: 18px;
      text-align: center;
      max-width: 280px;
    }
    #status.error { color: #f44336; opacity: 1; }
    #status.recording { color: #ef5350; opacity: 1; }

    /* ---- Buttons ---- */
    .actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

    button.action {
      padding: 7px 18px;
      border: none;
      border-radius: 3px;
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    #sendBtn {
      background: var(--vscode-button-background, #0078d4);
      color: var(--vscode-button-foreground, #fff);
      display: none;
    }
    #sendBtn:hover   { background: var(--vscode-button-hoverBackground, #005a9e); }
    #sendBtn:disabled { opacity: 0.5; cursor: default; }

    #cancelBtn {
      background: var(--vscode-button-secondaryBackground, #3c3c3c);
      color: var(--vscode-button-secondaryForeground, #ccc);
    }
    #cancelBtn:hover { background: var(--vscode-button-secondaryHoverBackground, #4c4c4c); }
  </style>
</head>
<body>
  <h1>Voice Input</h1>

  <div class="mic-wrap">
    <div class="pulse" id="pulse"></div>
    <button id="recordBtn" title="Start recording">🎤</button>
  </div>

  <canvas id="viz" width="240" height="48"></canvas>
  <div id="timer"></div>
  <div id="status">Click the microphone to start recording</div>

  <div class="actions">
    <button id="sendBtn"   class="action">Send for Transcription</button>
    <button id="cancelBtn" class="action">Cancel</button>
  </div>

<script nonce="${nonce}">
(function () {
  'use strict';

  const vscode     = acquireVsCodeApi();
  const recordBtn  = document.getElementById('recordBtn');
  const sendBtn    = document.getElementById('sendBtn');
  const cancelBtn  = document.getElementById('cancelBtn');
  const statusEl   = document.getElementById('status');
  const timerEl    = document.getElementById('timer');
  const pulseEl    = document.getElementById('pulse');
  const canvas     = document.getElementById('viz');
  const ctx        = canvas.getContext('2d');

  let mediaRecorder = null;
  let audioChunks   = [];
  let audioBlob     = null;
  let isRecording   = false;
  let timerHandle   = null;
  let rafHandle     = null;
  let analyser      = null;
  let elapsed       = 0;

  // ---------- record toggle ----------
  recordBtn.addEventListener('click', () => {
    if (isRecording) stopRecording();
    else startRecording();
  });

  sendBtn.addEventListener('click', () => {
    if (!audioBlob) return;
    sendBtn.disabled = true;
    setStatus('Sending…');
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result.split(',')[1];
      vscode.postMessage({ command: 'audioReady', audioData: b64, mimeType: audioBlob.type });
    };
    reader.readAsDataURL(audioBlob);
  });

  cancelBtn.addEventListener('click', () => {
    stopRecording();
    vscode.postMessage({ command: 'cancel' });
  });

  // ---------- helpers ----------
  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className   = cls || '';
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  // ---------- recording ----------
  async function startRecording() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      setStatus('Microphone access denied: ' + e.message, 'error');
      return;
    }

    audioChunks = [];
    audioBlob   = null;
    sendBtn.style.display = 'none';

    // Visualizer
    const audioCtx = new AudioContext();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);

    // Choose MIME
    const mime =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
      MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' :
      MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus' :
                                                                 '';

    mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const finalMime = mime || 'audio/webm';
      audioBlob = new Blob(audioChunks, { type: finalMime });
      stream.getTracks().forEach(t => t.stop());
      sendBtn.style.display = 'inline-block';
    };
    mediaRecorder.start(100);

    isRecording = true;
    recordBtn.classList.add('active');
    recordBtn.textContent = '⏹';
    recordBtn.title = 'Stop recording';
    pulseEl.classList.add('active');
    canvas.classList.add('visible');
    setStatus('Recording…', 'recording');

    elapsed = 0;
    timerEl.textContent = formatTime(0);
    timerHandle = setInterval(() => { timerEl.textContent = formatTime(++elapsed); }, 1000);

    drawViz();
  }

  function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    if (mediaRecorder) mediaRecorder.stop();
    clearInterval(timerHandle);
    if (rafHandle) cancelAnimationFrame(rafHandle);
    rafHandle = null;
    analyser  = null;

    recordBtn.classList.remove('active');
    recordBtn.textContent = '🎤';
    recordBtn.title = 'Start recording';
    pulseEl.classList.remove('active');
    canvas.classList.remove('visible');
    clearCanvas();
    setStatus('Done — click "Send for Transcription" or re-record.');
  }

  // ---------- visualizer ----------
  function drawViz() {
    if (!analyser) return;
    rafHandle = requestAnimationFrame(drawViz);

    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buf);
    clearCanvas();

    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue('--vscode-button-background') || '#0078d4';
    const bw = (canvas.width / buf.length) * 2.5;
    let x = 0;
    for (let i = 0; i < buf.length; i++) {
      const h = (buf[i] / 255) * canvas.height;
      ctx.fillStyle = accent;
      ctx.fillRect(x, canvas.height - h, bw, h);
      x += bw + 1;
    }
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
})();
</script>
</body>
</html>`;
  }
}
