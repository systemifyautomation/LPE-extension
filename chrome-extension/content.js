(() => {
  'use strict';

  // ---- State ---------------------------------------------------------------
  let micButton    = null;
  let chevronBtn   = null;
  let dropdownEl   = null;
  let cancelButton = null;
  let activeInput  = null;
  let activeStream = null;
  let mediaRecorder   = null;
  let audioChunks     = [];
  let isRecording     = false;
  let isProcessing    = false;
  let cancelled       = false;
  let dropdownVisible = false;
  let recordingMimeType  = '';
  let recordingStartTime = 0;
  let hideTimer = null;
  let voiceMode = 'transcription'; // 'transcription' | 'prompt'

  // ---- Extension context guard --------------------------------------------

  function isContextValid() {
    try { return !!chrome.runtime?.id; } catch (_) { return false; }
  }

  function assertContext() {
    if (!isContextValid()) {
      showToast('Extension reloaded — please refresh this page.', 'error');
      throw new Error('Extension context invalidated.');
    }
  }

  // Load persisted mode
  try {
    chrome.storage.local.get({ voiceMode: 'transcription' }, ({ voiceMode: stored }) => {
      voiceMode = stored;
      updateDropdownItems();
    });
  } catch (_) {}

  // ---- Mic button ----------------------------------------------------------

  function createMicButton() {
    const btn = document.createElement('button');
    btn.className = 'lpe-mic-btn';
    btn.title = 'Voice Input';
    btn.setAttribute('aria-label', 'Start voice input');
    btn.innerHTML = iconMic();
    btn.style.zIndex = '2147483647';
    btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    btn.addEventListener('click', handleMicClick);
    btn.addEventListener('mouseenter', cancelHideTimer);
    btn.addEventListener('mouseleave', () => { if (!isRecording && !isProcessing) scheduleHide(); });
    (document.documentElement || document.body).appendChild(btn);
    return btn;
  }

  // ---- Chevron button ------------------------------------------------------

  function createChevronBtn() {
    const btn = document.createElement('button');
    btn.className = 'lpe-chevron-btn';
    btn.title = 'Change mode';
    btn.innerHTML = iconChevron();
    btn.style.zIndex = '2147483647';
    btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    btn.addEventListener('click', handleChevronClick);
    btn.addEventListener('mouseenter', cancelHideTimer);
    btn.addEventListener('mouseleave', () => { if (!isRecording && !isProcessing) scheduleHide(); });
    (document.documentElement || document.body).appendChild(btn);
    return btn;
  }

  function handleChevronClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dropdownVisible) hideDropdown();
    else showDropdown();
  }

  // ---- Dropdown ------------------------------------------------------------

  function createDropdown() {
    const el = document.createElement('div');
    el.className = 'lpe-dropdown';
    el.style.zIndex = '2147483646';
    el.style.display = 'none';

    [
      { value: 'transcription', label: 'Transcription' },
      { value: 'prompt',        label: 'Instruction'   },
    ].forEach(opt => {
      const item = document.createElement('button');
      item.className = 'lpe-dropdown-item';
      item.dataset.value = opt.value;
      item.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      item.addEventListener('click', () => {
        voiceMode = opt.value;
        try { chrome.storage.local.set({ voiceMode }); } catch (_) {}
        updateDropdownItems();
        hideDropdown();
      });
      el.appendChild(item);
    });

    (document.documentElement || document.body).appendChild(el);
    return el;
  }

  function updateDropdownItems() {
    if (!dropdownEl) return;
    dropdownEl.querySelectorAll('.lpe-dropdown-item').forEach(item => {
      const active = item.dataset.value === voiceMode;
      item.className = 'lpe-dropdown-item' + (active ? ' lpe-dropdown-item-active' : '');
      const labels = { transcription: 'Transcription', prompt: 'Instruction' };
      item.textContent = (active ? '✓  ' : '     ') + labels[item.dataset.value];
    });
  }

  function showDropdown() {
    if (!dropdownEl || !chevronBtn) return;
    updateDropdownItems();
    const cr = chevronBtn.getBoundingClientRect();
    const mb = micButton.getBoundingClientRect();
    dropdownEl.style.top     = `${cr.bottom + 6}px`;
    dropdownEl.style.left    = `${mb.left}px`;
    dropdownEl.style.display = 'block';
    dropdownVisible = true;
  }

  function hideDropdown() {
    if (!dropdownEl) return;
    dropdownEl.style.display = 'none';
    dropdownVisible = false;
  }

  // Close dropdown on outside click, then schedule hide if mouse is away
  document.addEventListener('click', e => {
    if (!dropdownVisible) return;
    if (dropdownEl && dropdownEl.contains(e.target)) return;
    if (chevronBtn && chevronBtn.contains(e.target)) return;
    hideDropdown();
    scheduleHide();
  }, true);

  // ---- Cancel button -------------------------------------------------------

  function createCancelButton() {
    const btn = document.createElement('button');
    btn.className = 'lpe-cancel-btn';
    btn.title = 'Cancel';
    btn.setAttribute('aria-label', 'Cancel');
    btn.innerHTML = iconX();
    btn.style.zIndex = '2147483647';
    btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    btn.addEventListener('click', handleCancel);
    btn.addEventListener('mouseenter', cancelHideTimer);
    (document.documentElement || document.body).appendChild(btn);
    return btn;
  }

  function handleCancel(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording) {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = () => { if (activeStream) activeStream.getTracks().forEach(t => t.stop()); };
        mediaRecorder.stop();
      }
      isRecording = false;
    }
    if (isProcessing) {
      cancelled    = true;
      isProcessing = false;
    }
    resetMicButton();
    setActiveState(false);
  }

  // ---- Icons ---------------------------------------------------------------

  function iconMic() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
      <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z"/>
      <path d="M19 11a1 1 0 00-2 0 5 5 0 01-10 0 1 1 0 00-2 0 7 7 0 006 6.92V20H9a1 1 0 000 2h6a1 1 0 000-2h-2v-2.08A7 7 0 0019 11z"/>
    </svg>`;
  }

  function iconStop() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2"/>
    </svg>`;
  }

  function iconSpinner() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        width="14" height="14" class="lpe-spin" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10" stroke-linecap="round"/>
    </svg>`;
  }

  function iconChevron() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function iconX() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/>
    </svg>`;
  }

  // ---- Positioning ---------------------------------------------------------

  const MIC_W      = 28;
  const CHEVRON_W  = 16;
  const CANCEL_W   = 28;
  const BTN_H      = 28;
  const GAP        = 5;
  const MARGIN     = 4;

  function positionButtons(input) {
    if (!micButton) return;
    const rect = input.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const active    = isRecording || isProcessing;
    const totalW    = active ? MIC_W : MIC_W + CHEVRON_W;
    const top       = rect.top + (rect.height - BTN_H) / 2;
    const micLeft   = Math.min(rect.right - totalW - MARGIN, window.innerWidth - totalW - 4);

    micButton.style.top     = `${top}px`;
    micButton.style.left    = `${micLeft}px`;
    micButton.style.display = 'flex';

    if (chevronBtn) {
      chevronBtn.style.top     = `${top}px`;
      chevronBtn.style.left    = `${micLeft + MIC_W}px`;
      chevronBtn.style.display = active ? 'none' : 'flex';
    }

    if (cancelButton) {
      cancelButton.style.top     = `${top}px`;
      cancelButton.style.left    = `${micLeft - CANCEL_W - GAP}px`;
      cancelButton.style.display = active ? 'flex' : 'none';
    }
  }

  function cancelHideTimer() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (!isRecording && !isProcessing && !dropdownVisible) {
        if (micButton)    micButton.style.display    = 'none';
        if (chevronBtn)   chevronBtn.style.display   = 'none';
        if (cancelButton) cancelButton.style.display = 'none';
        activeInput = null;
      }
      hideTimer = null;
    }, 250);
  }

  // Show/hide the active (recording/processing) state
  function setActiveState(active) {
    if (chevronBtn)   chevronBtn.style.display   = active ? 'none' : 'flex';
    if (cancelButton) cancelButton.style.display = active ? 'flex' : 'none';
    if (active) hideDropdown();
  }

  // ---- Input detection -----------------------------------------------------

  function isTextInput(el) {
    if (!el || typeof el.tagName !== 'string') return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      return ['text', 'search', 'email', 'url', 'tel', 'password', ''].includes(type);
    }
    if (el.isContentEditable && el.getAttribute('contenteditable') !== 'false') return true;
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;
    return false;
  }

  function getComposedTarget(e) {
    if (e.composedPath) {
      const path = e.composedPath();
      if (path && path.length > 0) return path[0];
    }
    return e.target;
  }

  // ---- Focus / hover tracking ----------------------------------------------

  function ensureButtons() {
    if (!micButton)    micButton    = createMicButton();
    if (!chevronBtn)   chevronBtn   = createChevronBtn();
    if (!dropdownEl)   dropdownEl   = createDropdown();
    if (!cancelButton) cancelButton = createCancelButton();
  }

  document.addEventListener('focusin', e => {
    const target = getComposedTarget(e);
    if (!isTextInput(target)) return;
    cancelHideTimer();
    activeInput = target;
    ensureButtons();
    positionButtons(activeInput);
  }, true);

  document.addEventListener('focusout', () => {
    if (isRecording || isProcessing) return;
    scheduleHide();
  }, true);

  document.addEventListener('mouseover', e => {
    if (isRecording) return;
    const target = getComposedTarget(e);
    if (!isTextInput(target)) return;
    cancelHideTimer();
    activeInput = target;
    ensureButtons();
    positionButtons(activeInput);
  }, true);

  document.addEventListener('mouseout', e => {
    if (isRecording) return;
    const rel = e.relatedTarget;
    if (rel && (
      (micButton    && micButton.contains(rel))    ||
      (chevronBtn   && chevronBtn.contains(rel))   ||
      (cancelButton && cancelButton.contains(rel)) ||
      (dropdownEl   && dropdownEl.contains(rel))
    )) return;
    scheduleHide();
  }, true);

  ['scroll', 'resize'].forEach(ev => {
    window.addEventListener(ev, () => {
      if (activeInput && micButton && micButton.style.display !== 'none') positionButtons(activeInput);
    }, { passive: true });
  });

  // ---- Recording -----------------------------------------------------------

  async function handleMicClick(e) {
    e.preventDefault();
    e.stopPropagation();
    hideDropdown();
    if (isRecording) stopRecording();
    else await startRecording();
  }

  async function startRecording() {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
          channelCount: 1,
          sampleRate: 16000,
        },
        video: false,
      });
    } catch (err) {
      showToast('Microphone access denied: ' + err.message, 'error');
      return;
    }

    audioChunks     = [];
    activeStream    = stream;
    recordingStartTime = Date.now();
    cancelled       = false;
    recordingMimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
      MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' : '';

    mediaRecorder = new MediaRecorder(stream, recordingMimeType ? { mimeType: recordingMimeType } : undefined);
    mediaRecorder.ondataavailable = ev => { if (ev.data.size > 0) audioChunks.push(ev.data); };
    mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); processRecording(); };
    mediaRecorder.start(100);

    isRecording = true;
    micButton.classList.add('lpe-recording');
    micButton.innerHTML = iconStop();
    micButton.title = 'Stop recording';
    micButton.setAttribute('aria-label', 'Stop recording');
    setActiveState(true);
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    mediaRecorder.stop();
    isRecording = false;
    micButton.classList.remove('lpe-recording');
    micButton.classList.add('lpe-processing');
    micButton.innerHTML = iconSpinner();
    micButton.title = voiceMode === 'prompt' ? 'Processing with AI…' : 'Transcribing…';
  }

  function processRecording() {
    const targetInput = activeInput;
    const currentMode = voiceMode;
    const duration    = (Date.now() - recordingStartTime) / 1000;
    isProcessing = true;

    const mimeType = recordingMimeType || 'audio/webm';
    const blob     = new Blob(audioChunks, { type: mimeType });

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const action = currentMode === 'prompt' ? 'prompt' : 'transcribe';

      try { assertContext(); } catch (_) {
        isProcessing = false;
        resetMicButton();
        setActiveState(false);
        return;
      }

      chrome.runtime.sendMessage(
        { action, audio: base64, mimeType, duration, domain: location.hostname },
        response => {
          isProcessing = false;
          resetMicButton();
          setActiveState(false);

          if (cancelled) { cancelled = false; return; }

          if (chrome.runtime.lastError) {
            showToast('Extension error: ' + chrome.runtime.lastError.message, 'error');
            return;
          }
          if (response.error) {
            showToast(response.error, 'error');
            return;
          }
          insertText(response.transcription, targetInput);
          saveToHistory(response.transcription, {
            mode:      currentMode,
            cost:      response.cost,
            model:     response.model,
            inputText: response.inputText,
          });
          showToast('✓ Inserted', 'success');
        }
      );
    };
    reader.readAsDataURL(blob);
  }

  function resetMicButton() {
    if (!micButton) return;
    micButton.classList.remove('lpe-recording', 'lpe-processing');
    micButton.innerHTML = iconMic();
    micButton.title = 'Voice Input';
    micButton.setAttribute('aria-label', 'Start voice input');
  }

  // ---- Text insertion ------------------------------------------------------

  function insertText(text, target) {
    const el = target || activeInput;
    if (!el) return;
    el.focus();

    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const inserted = document.execCommand('insertText', false, text);
      if (!inserted) {
        sel.deleteFromDocument();
        sel.getRangeAt(0).insertNode(document.createTextNode(text));
        sel.collapseToEnd();
        el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, data: text, inputType: 'insertText' }));
      }
      return;
    }

    const proto = el.tagName.toLowerCase() === 'textarea'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    const start    = el.selectionStart ?? el.value.length;
    const end      = el.selectionEnd   ?? el.value.length;
    const newValue = el.value.slice(0, start) + text + el.value.slice(end);
    if (nativeSetter) nativeSetter.call(el, newValue);
    else el.value = newValue;
    el.dispatchEvent(new Event('input',  { bubbles: true, composed: true }));
    el.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    el.setSelectionRange(start + text.length, start + text.length);
  }

  // ---- History -------------------------------------------------------------

  function saveToHistory(text, { mode, cost, model, inputText } = {}) {
    if (!isContextValid()) return;
    chrome.storage.local.get({ transcriptionHistory: [] }, ({ transcriptionHistory }) => {
      const entry = {
        text,
        inputText: inputText || text,
        domain:    location.hostname,
        timestamp: Date.now(),
        mode:      mode  || 'transcription',
        cost:      cost  || 0,
        model:     model || 'whisper-1',
      };
      const updated = [entry, ...transcriptionHistory].slice(0, 50);
      chrome.storage.local.set({ transcriptionHistory: updated });
    });
  }

  // ---- Popup recording relay -----------------------------------------------

  let popupStream    = null;
  let popupRecorder  = null;
  let popupChunks    = [];
  let popupStartTime = 0;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'popup-record-start') {
      startPopupRecording().then(sendResponse);
      return true;
    }
    if (msg.action === 'popup-record-stop') {
      stopPopupRecording().then(sendResponse);
      return true;
    }
  });

  async function startPopupRecording() {
    try {
      popupStream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      popupChunks    = [];
      popupStartTime = Date.now();
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      popupRecorder  = new MediaRecorder(popupStream, { mimeType });
      popupRecorder.ondataavailable = e => { if (e.data.size > 0) popupChunks.push(e.data); };
      popupRecorder.start();
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  function stopPopupRecording() {
    return new Promise(resolve => {
      if (!popupRecorder || popupRecorder.state === 'inactive') {
        resolve({ error: 'No active recording' });
        return;
      }
      popupRecorder.onstop = () => {
        if (popupStream) { popupStream.getTracks().forEach(t => t.stop()); popupStream = null; }
        const duration = (Date.now() - popupStartTime) / 1000;
        const mimeType = popupRecorder.mimeType;
        const blob     = new Blob(popupChunks, { type: mimeType });
        const reader   = new FileReader();
        reader.onload  = () => resolve({ audio: reader.result.split(',')[1], mimeType, duration });
        reader.readAsDataURL(blob);
      };
      popupRecorder.stop();
    });
  }

  // ---- Toast ---------------------------------------------------------------

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `lpe-toast lpe-toast-${type}`;
    toast.textContent = message;
    (document.documentElement || document.body).appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('lpe-toast-visible')));
    setTimeout(() => {
      toast.classList.remove('lpe-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
})();
