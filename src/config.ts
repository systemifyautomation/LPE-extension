import * as path from 'path';
import * as dotenv from 'dotenv';
import * as vscode from 'vscode';

let loaded = false;

/**
 * Load the .env file from the extension's install directory (once).
 * Values are merged into process.env by dotenv.
 */
export function loadEnv(extensionPath: string): void {
  if (loaded) return;
  loaded = true;
  dotenv.config({ path: path.join(extensionPath, '.env') });
}

/**
 * Resolve the OpenAI API key with this priority:
 *   1. OPENAI_API_KEY environment variable / .env file
 *   2. lpeVoiceInput.openaiApiKey VS Code setting
 *
 * Returns an empty string if neither is set.
 */
export function resolveApiKey(): string {
  const envKey = (process.env['OPENAI_API_KEY'] ?? '').trim();
  if (envKey) return envKey;

  const settingsKey = vscode.workspace
    .getConfiguration('lpeVoiceInput')
    .get<string>('openaiApiKey', '')
    .trim();
  return settingsKey;
}
