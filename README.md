# LPE Voice Input — VS Code Extension

Record your voice directly inside VS Code, have it transcribed by **OpenAI Whisper**, and get the text inserted at your cursor — or copied to the clipboard so you can paste it into **any input field in Chrome**.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install & Build](#2-install--build)
3. [Configure the OpenAI API Key](#3-configure-the-openai-api-key)
4. [Using the Extension](#4-using-the-extension)
5. [Using Voice Input in Chrome (Clipboard Mode)](#5-using-voice-input-in-chrome-clipboard-mode)
6. [Keyboard Shortcut](#6-keyboard-shortcut)
7. [Settings Reference](#7-settings-reference)
8. [Troubleshooting](#8-troubleshooting)
9. [Packaging](#9-packaging)

---

## 1. Prerequisites

| Requirement | Version |
|---|---|
| [Node.js](https://nodejs.org) | 18 or higher |
| [Visual Studio Code](https://code.visualstudio.com) | 1.80 or higher |
| [OpenAI account](https://platform.openai.com) | API key with Whisper access |
| Google Chrome | Any modern version |

> **Microphone access** — VS Code will ask for microphone permission the first time you record. Allow it.

---

## 2. Install & Build

```bash
# 1. Clone the repository
git clone https://github.com/your-org/LPE-extension.git
cd LPE-extension

# 2. Install dependencies
npm install

# 3. Compile TypeScript
npm run compile
```

---

## 3. Configure the OpenAI API Key

Your API key is kept out of source control using a `.env` file.

### Step 1 — Get your OpenAI API key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **+ Create new secret key**
3. Copy the key (starts with `sk-…`) — you will only see it once

### Step 2 — Create your `.env` file

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

### Step 3 — Paste your API key into `.env`

```
OPENAI_API_KEY=sk-proj-...your-key-here...
```

> `.env` is listed in `.gitignore` and will **never** be committed.

### Alternative — VS Code Settings (no `.env` needed)

1. Open Settings: `Ctrl+,`
2. Search for `lpeVoiceInput.openaiApiKey`
3. Paste your API key

> The `.env` value always takes priority over the VS Code setting.

---

## 4. Using the Extension

### Step 1 — Open VS Code in the project folder

### Step 2 — Launch the Extension Development Host

Press `F5` — a new VS Code window opens with the extension active.

> For permanent installation, see [Packaging](#9-packaging).

### Step 3 — Trigger voice input

Click the **`🎤 Voice`** button in the bottom-right status bar, or press `Ctrl+Shift+V`.

### Step 4 — Record your voice

A recorder panel opens on the right side of VS Code.

| Control | Action |
|---|---|
| 🎤 (mic icon) | Start recording |
| ⏹ (stop icon) | Stop recording |
| **Send for Transcription** | Upload audio to OpenAI Whisper and receive text |
| **Cancel** | Close without sending |

A live audio visualizer and elapsed timer are shown while recording.

### Step 5 — Transcription is inserted automatically

The text appears at the cursor in your active editor the moment Whisper responds (usually 1–3 seconds).

---

## 5. Using Voice Input in Chrome (Clipboard Mode)

Chrome input fields (web apps, Gmail, forms, etc.) are outside VS Code. Use **Clipboard Mode** to bridge the two.

### Enable Clipboard Mode

1. Open Settings: `Ctrl+,`
2. Search for `lpeVoiceInput.insertTarget`
3. Change the value to **`clipboard`**

### Step-by-step workflow for Chrome

```
1.  Switch focus to VS Code          (click VS Code in the taskbar)
2.  Press Ctrl+Shift+V               ──► Recorder panel opens
3.  Click 🎤 and speak your text
4.  Click ⏹ to stop recording
5.  Click "Send for Transcription"   ──► Whisper processes the audio
6.  Transcription is copied to your clipboard automatically
7.  Switch to Chrome                 (Alt+Tab)
8.  Click the input field to focus it
9.  Paste with Ctrl+V
```

A VS Code notification confirms the text is ready:

> *"Transcription copied to clipboard — paste it where you need it."*

### Tip — Snap VS Code and Chrome side by side

Use Windows Snap (`Win+Left` / `Win+Right`) to place both windows next to each other so you can record and paste without losing context.

---

## 6. Keyboard Shortcut

| OS | Shortcut |
|---|---|
| Windows / Linux | `Ctrl+Shift+V` |
| macOS | `Cmd+Shift+V` |

**To change the shortcut:**

1. Press `Ctrl+K` then `Ctrl+S` to open Keyboard Shortcuts
2. Search for `Voice Input: Start Recording`
3. Click the pencil icon and press your preferred key combination

---

## 7. Settings Reference

| Setting | Default | Description |
|---|---|---|
| `lpeVoiceInput.openaiApiKey` | *(empty)* | OpenAI API key — prefer `.env` (`OPENAI_API_KEY`) so it is never stored in VS Code settings |
| `lpeVoiceInput.insertTarget` | `editor` | `editor` — insert at cursor · `clipboard` — copy to clipboard |

---

## 8. Troubleshooting

### "OpenAI API key not configured"

- Make sure `.env` contains `OPENAI_API_KEY=sk-…`
- Or set `lpeVoiceInput.openaiApiKey` in VS Code Settings
- Reload VS Code after editing `.env`

### "OpenAI returned HTTP 401"

- Your API key is invalid or has been revoked
- Generate a new key at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys) and update `.env`

### "OpenAI returned HTTP 429"

- You have hit your rate limit or exhausted your OpenAI quota
- Check usage at [https://platform.openai.com/usage](https://platform.openai.com/usage)

### "Microphone access denied"

- On Windows: **Settings → Privacy → Microphone** — ensure VS Code is allowed
- In VS Code: **Help → Toggle Developer Tools → Console** — look for permission errors

### Transcription is empty or cuts off

- Speak clearly and wait a moment before clicking Stop
- Check your OpenAI account has an active billing method
- Audio shorter than ~0.1 seconds is rejected by Whisper

### Audio not recording in VS Code for the Web (vscode.dev)

- Use the installed **desktop** version of VS Code — vscode.dev has limited WebAPI access inside webviews

---

## 9. Packaging

To install the extension permanently (without needing `F5` every time):

```bash
# Install the vsce packaging tool
npm install -g @vscode/vsce

# Package into a .vsix file
vsce package

# Install it in VS Code
code --install-extension lpe-voice-input-0.1.0.vsix
```

> When sharing the `.vsix`, do **not** include `.env`. Recipients should create their own `.env` from `.env.example` and add their own API key.
