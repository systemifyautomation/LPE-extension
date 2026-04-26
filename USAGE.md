# Voice Auto-fill — Usage Guide

## Quick Start

1. Install the extension (see below)
2. Open any webpage with a text field (Gmail, claude.ai, Notion, etc.)
3. Click or hover over a text field — a mic button appears at the right edge
4. Click **🎤** to record, speak, then click **⏹** to stop
5. The transcription is inserted automatically

---

## Installation

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Click the puzzle-piece icon in the toolbar → pin **Voice Auto-fill**

---

## First-Time Setup

Click the **🎤 Voice Auto-fill** toolbar icon to open the popup.

### API Key (required)

1. Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Paste it into **OpenAI API Key** (starts with `sk-`)
3. Click **Save Settings**

The key is stored only in your local browser — never synced or shared.

---

## Modes

A small mode pill appears to the left of the mic button whenever a text field is active.

| Button | Mode | What happens |
|--------|------|--------------|
| Blue **T** | Transcription | Speech → text, inserted as-is |
| Orange **AI** | AI Prompt | Speech → Whisper → GPT → AI-written text inserted |

Click the pill to toggle between modes. The choice is remembered across pages.

### Transcription mode
Speaks what you say, word for word. Useful for dictating messages, notes, search queries.

### AI Prompt mode
Describe what you want written — the AI generates it for you.

**Example:** Say *"Write a polite follow-up email asking for a status update"* → the AI writes the email and it appears in the text field.

You can customise the AI behaviour via **System Prompt** in settings.

---

## Button States

| Mic button | Meaning |
|------------|---------|
| Blue 🎤 | Ready — click to start |
| Red ⏹ pulsing | Recording — click to stop and send |
| Orange spinner | Transcribing / AI processing |

A **red ✕ cancel button** appears to the left of the mic during recording and processing. Click it to abort immediately — nothing is inserted and nothing is saved.

---

## Settings

Open settings by clicking the **⚙️ gear icon** in the popup header.

| Setting | Description |
|---------|-------------|
| **OpenAI API Key** | Your `sk-…` key for Whisper and ChatGPT |
| **Model** | AI model used in AI Prompt mode (`gpt-4o-mini` recommended) |
| **System Prompt** | Instructions telling the AI how to process your voice input |
| **Google Sheets Webhook URL** | URL to log every transcription to a spreadsheet (see below) |

---

## Google Sheets Logging

Every transcription can be automatically logged to a Google Sheet with:

- Timestamp
- Mode (transcription / AI prompt)
- Domain (which website)
- Voice input (what you said)
- Output (what was inserted)
- Model used
- Whisper cost, AI cost, total cost (USD)

### Setup (one-time)

1. Go to [script.google.com](https://script.google.com) → **New project**
2. Delete any existing code and paste the contents of [`apps-script/sheets-logger.gs`](apps-script/sheets-logger.gs)
3. Click **Save** (Ctrl+S)
4. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy** → copy the web app URL
6. Paste the URL into **Google Sheets Webhook URL** in the extension settings → **Save Settings**

The spreadsheet is created automatically in your Google Drive on the first transcription — no sheet setup needed. To confirm the deployment is live, paste the URL into your browser; it should return `{"status":"ok"}`.

---

## Pricing Reference

| Service | Rate |
|---------|------|
| Whisper (transcription) | $0.006 / minute of audio |
| gpt-4o-mini | $0.15 / 1M input tokens · $0.60 / 1M output tokens |
| gpt-4o | $2.50 / 1M input tokens · $10.00 / 1M output tokens |
| gpt-3.5-turbo | $0.50 / 1M input tokens · $1.50 / 1M output tokens |

Costs are tracked per transcription and visible in the popup history and the spreadsheet.

---

## Troubleshooting

**Mic button doesn't appear**
- Make sure the extension is enabled at `chrome://extensions`
- Reload the page after installing
- Some pages use iframes — click directly on the main-page input

**Transcription not inserted into field**
- Reload the page and try again (some SPAs need a fresh load after extension install)

**"OpenAI API key not set"**
- Open the popup, enter your key, and click Save Settings

**"Invalid API key (401)"**
- Your key may have been revoked — create a new one at platform.openai.com/api-keys

**"Rate limit exceeded (429)"**
- You've hit your OpenAI quota — check usage at platform.openai.com/usage

**Microphone access denied**
- Click the lock icon in the URL bar → set Microphone to Allow → reload

---

## Reloading after code changes

1. Go to `chrome://extensions`
2. Click the **↺ refresh** icon on the Voice Auto-fill card
3. Reload the tab you're testing on
