// Pricing per model — update as OpenAI revises rates
const PRICING = {
  'whisper-1':     { perMinute: 0.006 },
  // GPT-4o
  'gpt-4o':        { input:  2.50, output: 10.00 },
  'gpt-4o-mini':   { input:  0.15, output:  0.60 },
  // o-series
  'o4-mini':       { input:  1.10, output:  4.40 },
  'o3-mini':       { input:  1.10, output:  4.40 },
  'o1-mini':       { input:  3.00, output: 12.00 },
  'o1':            { input: 15.00, output: 60.00 },
  // GPT-4 legacy
  'gpt-4-turbo':   { input: 10.00, output: 30.00 },
  'gpt-4':         { input: 30.00, output: 60.00 },
  // GPT-3.5 legacy
  'gpt-3.5-turbo': { input:  0.50, output:  1.50 },
};

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'transcribe') {
    handleTranscribe(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.action === 'prompt') {
    handlePrompt(msg).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
});

// ---- Transcription-only mode -----------------------------------------------

async function handleTranscribe(msg) {
  const { openaiApiKey, whisperLanguage, whisperPrompt } = await chrome.storage.local.get(['openaiApiKey', 'whisperLanguage', 'whisperPrompt']);
  if (!openaiApiKey) throw new Error('OpenAI API key not set — click the extension icon to add your key.');

  const text = await callWhisper(msg.audio, msg.mimeType, openaiApiKey, { language: whisperLanguage, prompt: whisperPrompt });
  const cost = +((msg.duration || 0) / 60 * PRICING['whisper-1'].perMinute).toFixed(6);

  logToSheet({ timestamp: new Date().toISOString(), mode: 'transcription', domain: msg.domain || '', inputText: text, outputText: text, model: 'whisper-1', transcriptionCost: cost, aiCost: 0, totalCost: cost });

  return { transcription: text, inputText: text, cost, model: 'whisper-1' };
}

// ---- AI Prompt mode ---------------------------------------------------------

async function handlePrompt(msg) {
  const { openaiApiKey, selectedModel, systemPrompt, whisperLanguage, whisperPrompt } = await chrome.storage.local.get(['openaiApiKey', 'selectedModel', 'systemPrompt', 'whisperLanguage', 'whisperPrompt']);
  if (!openaiApiKey) throw new Error('OpenAI API key not set — click the extension icon to add your key.');

  const model     = selectedModel || 'gpt-4o-mini';
  const sysPrompt = systemPrompt  || 'You are a helpful writing assistant. The user describes what they want written via voice. Generate well-written, concise text based on their request. Output only the text to be inserted — no commentary or explanations.';

  // Step 1 — transcribe speech
  const inputText = await callWhisper(msg.audio, msg.mimeType, openaiApiKey, { language: whisperLanguage, prompt: whisperPrompt });
  const transcriptionCost = +((msg.duration || 0) / 60 * PRICING['whisper-1'].perMinute).toFixed(6);

  // Step 2 — AI processing
  const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user',   content: inputText },
      ],
      temperature: 0.7,
    }),
  });

  if (!chatRes.ok) {
    const err = await chatRes.json().catch(() => ({}));
    if (chatRes.status === 401) throw new Error('Invalid API key (401) — update it via the extension icon.');
    if (chatRes.status === 429) throw new Error('OpenAI rate limit or quota exceeded (429).');
    throw new Error(`OpenAI error ${chatRes.status}: ${err.error?.message || chatRes.statusText}`);
  }

  const chatData   = await chatRes.json();
  const outputText = chatData.choices[0].message.content.trim();
  const usage      = chatData.usage || {};
  const pricing    = PRICING[model] || PRICING['gpt-4o-mini'];
  const aiCost     = +(((usage.prompt_tokens || 0) / 1_000_000) * pricing.input + ((usage.completion_tokens || 0) / 1_000_000) * pricing.output).toFixed(6);
  const totalCost  = +(transcriptionCost + aiCost).toFixed(6);

  logToSheet({ timestamp: new Date().toISOString(), mode: 'AI prompt', domain: msg.domain || '', inputText, outputText, model, transcriptionCost, aiCost, totalCost });

  return { transcription: outputText, inputText, cost: totalCost, model };
}

// ---- Whisper helper ---------------------------------------------------------

async function callWhisper(audioBase64, mimeType, apiKey, { language, prompt } = {}) {
  const binary = atob(audioBase64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const audioBlob = new Blob([bytes], { type: mimeType });

  const formData = new FormData();
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');
  formData.append('temperature', '0');                          // deterministic output
  if (language) formData.append('language', language.trim());   // skip auto-detect
  if (prompt)   formData.append('prompt',   prompt.trim());     // vocabulary / style hints
  formData.append('file', audioBlob, `recording.${mimeToExt(mimeType)}`);

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('Invalid API key (401) — update it via the extension icon.');
    if (res.status === 429) throw new Error('OpenAI rate limit or quota exceeded (429).');
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!data.text || data.text.trim() === '') throw new Error('Whisper returned an empty transcription.');
  return data.text.trim();
}

// ---- Google Sheets logging --------------------------------------------------

async function logToSheet(row) {
  const { sheetsWebhookUrl } = await chrome.storage.local.get('sheetsWebhookUrl');
  if (!sheetsWebhookUrl) return;
  try {
    const res = await fetch(sheetsWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      console.warn('[LPE] Sheet logger returned HTTP', res.status);
      return;
    }
    const data = await res.json();
    if (data.spreadsheetUrl) {
      await chrome.storage.local.set({ spreadsheetUrl: data.spreadsheetUrl });
      console.log('[LPE] Spreadsheet URL saved:', data.spreadsheetUrl);
    }
  } catch (err) {
    console.warn('[LPE] Sheet logging failed:', err.message);
  }
}

// ---- Helpers ----------------------------------------------------------------

function mimeToExt(mime) {
  const map = {
    'audio/webm': 'webm', 'audio/webm;codecs=opus': 'webm',
    'audio/ogg': 'ogg',   'audio/ogg;codecs=opus': 'ogg',
    'audio/mp4': 'mp4',   'audio/mpeg': 'mp3',
    'audio/wav': 'wav',   'audio/wave': 'wav', 'audio/flac': 'flac',
  };
  return map[mime] || map[mime.split(';')[0].trim()] || 'webm';
}
