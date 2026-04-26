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
 * Resolve the webhook URL with this priority:
 *   1. LPE_WEBHOOK_URL environment variable / .env file
 *   2. lpeVoiceInput.webhookUrl VS Code setting
 *
 * Returns an empty string if neither is set.
 */
export function resolveWebhookUrl(): string {
  const envUrl = (process.env['LPE_WEBHOOK_URL'] ?? '').trim();
  if (envUrl) return envUrl;

  const settingsUrl = vscode.workspace
    .getConfiguration('lpeVoiceInput')
    .get<string>('webhookUrl', '')
    .trim();
  return settingsUrl;
}
