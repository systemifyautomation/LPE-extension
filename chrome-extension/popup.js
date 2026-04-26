const apiKeyInput      = document.getElementById('apiKey');
const saveBtn          = document.getElementById('saveBtn');
const statusEl         = document.getElementById('status');
const toggleVisibility = document.getElementById('toggleVisibility');
const settingsBtn      = document.getElementById('settingsBtn');
const backBtn          = document.getElementById('backBtn');
const clearBtn         = document.getElementById('clearBtn');
const historyList      = document.getElementById('historyList');
const viewHistory      = document.getElementById('view-history');
const viewSettings     = document.getElementById('view-settings');
const aiModelSel         = document.getElementById('aiModel');
const systemPromptTA     = document.getElementById('systemPrompt');
const sheetsUrlInput     = document.getElementById('sheetsWebhookUrl');
const whisperLanguageIn  = document.getElementById('whisperLanguage');
const whisperPromptTA    = document.getElementById('whisperPrompt');

// ---- Init -------------------------------------------------------------------

const sheetLink             = document.getElementById('sheetLink');
const spreadsheetUrlDisplay = document.getElementById('spreadsheetUrlDisplay');

chrome.storage.local.get(
  ['openaiApiKey', 'transcriptionHistory', 'selectedModel', 'systemPrompt', 'sheetsWebhookUrl', 'whisperLanguage', 'whisperPrompt', 'spreadsheetUrl'],
  ({ openaiApiKey, transcriptionHistory, selectedModel, systemPrompt, sheetsWebhookUrl, whisperLanguage, whisperPrompt, spreadsheetUrl }) => {
    if (openaiApiKey)     apiKeyInput.value       = openaiApiKey;
    if (selectedModel)    aiModelSel.value         = selectedModel;
    if (systemPrompt)     systemPromptTA.value     = systemPrompt;
    if (sheetsWebhookUrl) sheetsUrlInput.value     = sheetsWebhookUrl;
    if (whisperLanguage)  whisperLanguageIn.value  = whisperLanguage;
    if (whisperPrompt)    whisperPromptTA.value    = whisperPrompt;
    if (spreadsheetUrl)   showSheetLink(spreadsheetUrl);

    if (openaiApiKey) {
      showView('history');
      renderHistory(transcriptionHistory || []);
    } else {
      showView('settings');
    }
  }
);

// ---- View switching ---------------------------------------------------------

function showView(name) {
  viewHistory.classList.toggle('active', name === 'history');
  viewSettings.classList.toggle('active', name === 'settings');
  settingsBtn.classList.toggle('hidden', name === 'settings');

  chrome.storage.local.get('openaiApiKey', ({ openaiApiKey }) => {
    backBtn.classList.toggle('hidden', name === 'history' || !openaiApiKey);
  });
}

settingsBtn.addEventListener('click', () => showView('settings'));

backBtn.addEventListener('click', () => {
  showView('history');
  chrome.storage.local.get('transcriptionHistory', ({ transcriptionHistory }) => {
    renderHistory(transcriptionHistory || []);
  });
});

// ---- History ----------------------------------------------------------------

function renderHistory(items) {
  if (!items || items.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" width="36" height="36">
          <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M19 11a7 7 0 01-14 0" stroke-linecap="round"/>
        </svg>
        <p>No transcriptions yet.<br>Click the mic on any text field to start.</p>
      </div>`;
    return;
  }

  historyList.innerHTML = items.map((item, i) => {
    const isAI    = item.mode === 'prompt';
    const modeTag = isAI
      ? `<span class="item-mode item-mode-ai">AI</span>`
      : `<span class="item-mode item-mode-t">T</span>`;
    const costTag = item.cost > 0
      ? `<span class="item-cost">$${item.cost.toFixed(4)}</span>`
      : '';
    const voiceLine = isAI && item.inputText && item.inputText !== item.text
      ? `<div class="item-voice"><strong>Voice:</strong> ${escapeHtml(item.inputText)}</div>`
      : '';

    return `
      <div class="history-item">
        <div class="item-meta">
          ${modeTag}
          <span class="item-domain">${escapeHtml(item.domain)}</span>
          <span class="item-time">${relativeTime(item.timestamp)}</span>
          ${costTag}
          <button class="copy-btn" data-index="${i}" title="Copy text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="item-text">${escapeHtml(item.text)}</div>
        ${voiceLine}
      </div>`;
  }).join('');

  historyList.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      navigator.clipboard.writeText(items[idx].text).then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1500);
      });
    });
  });
}

clearBtn.addEventListener('click', () => {
  chrome.storage.local.set({ transcriptionHistory: [] }, () => renderHistory([]));
});

// ---- Settings ---------------------------------------------------------------

toggleVisibility.addEventListener('click', () => {
  apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
});

saveBtn.addEventListener('click', () => {
  const key          = apiKeyInput.value.trim();
  const model        = aiModelSel.value;
  const sysPrompt    = systemPromptTA.value.trim();
  const sheetUrl     = sheetsUrlInput.value.trim();
  const whisperLang  = whisperLanguageIn.value.trim();
  const whisperHints = whisperPromptTA.value.trim();

  if (!key)               { setStatus('Please enter your OpenAI API key.', 'err'); return; }
  if (!key.startsWith('sk-')) { setStatus('Key should start with sk-', 'err'); return; }

  saveBtn.disabled = true;
  chrome.storage.local.set(
    { openaiApiKey: key, selectedModel: model, systemPrompt: sysPrompt, sheetsWebhookUrl: sheetUrl, whisperLanguage: whisperLang, whisperPrompt: whisperHints },
    () => {
      saveBtn.disabled = false;
      setStatus('✓ Saved', 'ok');
      setTimeout(() => {
        setStatus('');
        showView('history');
        chrome.storage.local.get('transcriptionHistory', ({ transcriptionHistory }) => {
          renderHistory(transcriptionHistory || []);
        });
      }, 1200);
    }
  );
});

apiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn.click(); });

function setStatus(text, cls = '') {
  statusEl.textContent = text;
  statusEl.className   = cls;
}

function showSheetLink(url) {
  if (!url) return;
  spreadsheetUrlDisplay.value = url;
  sheetLink.href = url;
  sheetLink.style.display = 'flex';
}

// Keep the link up-to-date whenever background.js saves a new spreadsheet URL
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.spreadsheetUrl?.newValue) {
    showSheetLink(changes.spreadsheetUrl.newValue);
  }
});

// ---- Helpers ----------------------------------------------------------------

function relativeTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
