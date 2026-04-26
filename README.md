# Voice Auto-fill — Chrome Extension

Add a voice button to **any text input** on any webpage. Click the mic, speak, and the transcription (powered by **OpenAI Whisper**) is inserted automatically — no copy-paste needed.

---

## Table of Contents

1. [How It Works](#1-how-it-works)
2. [Prerequisites](#2-prerequisites)
3. [Load the Extension in Chrome](#3-load-the-extension-in-chrome)
4. [Add Your OpenAI API Key](#4-add-your-openai-api-key)
5. [Using the Extension](#5-using-the-extension)
6. [Settings Reference](#6-settings-reference)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. How It Works

```
Focus any <input> or <textarea> on any webpage
        ↓
A small 🎤 button appears at the right edge of that field
        ↓
Click 🎤 → speak → click ⏹ to stop
        ↓
Audio is sent to OpenAI Whisper via the background service worker
        ↓
Transcription is inserted directly into the focused field
```

No copy-paste. No page reload. Works on Gmail, Google Docs, Notion, Slack,  
web forms — anywhere Chrome runs.

---

## 2. Prerequisites

| Requirement | Notes |
|---|---|
| Google Chrome | Version 109 or newer (Manifest V3 support) |
| [OpenAI account](https://platform.openai.com) | API key with Whisper access |

---

## 3. Load the Extension in Chrome

The extension is loaded as an **unpacked extension** — no Chrome Web Store required.

### Step 1 — Open Chrome Extensions

In the Chrome address bar, go to:
```
chrome://extensions
```

### Step 2 — Enable Developer Mode

Toggle **Developer mode** on (top-right corner).

### Step 3 — Load Unpacked

Click **Load unpacked** and select the `chrome-extension` folder inside this repository:

```
LPE-extension/
└── chrome-extension/   ← select this folder
```

The extension now appears in your extensions list with the 🎤 icon in the toolbar.

---

## 4. Add Your OpenAI API Key

### Step 1 — Get your key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **+ Create new secret key**
3. Copy the key — it starts with `sk-` and you only see it once

### Step 2 — Open the extension popup

Click the **🎤 Voice Auto-fill** icon in the Chrome toolbar  
(pin it first via the puzzle-piece Extensions menu if it's hidden).

### Step 3 — Paste and save

Paste your key into the **OpenAI API Key** field and click **Save**.

> The key is stored only in your local browser storage (`chrome.storage.local`) and is only ever sent to `api.openai.com`. It is never committed to disk or synced to the cloud.

---

## 5. Using the Extension

### Basic usage

1. **Click any text field** on a webpage (input, textarea, search box, compose window, etc.)
2. A small **blue 🎤 button** appears at the right edge of the field
3. **Click 🎤** — Chrome will ask for microphone permission the first time (allow it)
4. **Speak** — the button turns red and pulses while recording
5. **Click ⏹** to stop recording
6. The button turns orange while Whisper processes the audio (1–3 seconds)
7. The transcription is **inserted directly into the field** at the cursor position

### Visual indicators

| Button state | Meaning |
|---|---|
| Blue 🎤 | Ready — click to start |
| Red ⏹ pulsing | Recording in progress — click to stop |
| Orange spinner | Sending to Whisper, waiting for result |

### Notifications

A small toast notification appears in the bottom-right corner:

| Message | Meaning |
|---|---|
| ✓ Transcription inserted | Success |
| Microphone access denied | Browser blocked mic — see Troubleshooting |
| OpenAI API key not set | Click the toolbar icon to add your key |
| OpenAI error 401 | Invalid key — update it in the popup |
| OpenAI error 429 | Rate limit hit — wait a moment and retry |

---

## 6. Settings Reference

All settings are in the extension popup (click the toolbar icon).

| Setting | Where | Description |
|---|---|---|
| OpenAI API Key | Popup | `sk-…` key for Whisper API calls |

---

## 7. Troubleshooting

### Mic button doesn't appear

- Make sure the extension is enabled at `chrome://extensions`
- Reload the page after installing the extension
- Some pages using iframes may not show the button inside the iframe — click directly on the main page input

### Microphone permission denied

1. Click the lock/info icon to the left of the URL bar
2. Find **Microphone** and set it to **Allow**
3. Reload the page

### "OpenAI API key not set"

- Click the 🎤 toolbar icon and save your key in the popup

### "Invalid API key (401)"

- Your key may have expired or been revoked
- Create a new one at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Paste the new key into the popup and save

### "Rate limit exceeded (429)"

- You've hit your OpenAI API quota
- Check usage at [https://platform.openai.com/usage](https://platform.openai.com/usage)
- Add billing credits or wait for the quota to reset

### Transcription text not accepted by the input (React/Vue apps)

The content script uses native value setters and dispatches both `input` and `change` events, which is compatible with React, Vue, and Angular controlled inputs. If a specific app still doesn't pick up the text, try clicking inside the field and typing a character first, then triggering the voice input.

### Extension stops working after Chrome update

Go to `chrome://extensions` and click **Update** to reload the extension files.

---

## Reloading after code changes

If you edit any file in the `chrome-extension/` folder:

1. Go to `chrome://extensions`
2. Click the **↺ refresh** icon on the Voice Auto-fill card
3. Reload the tab you are using
