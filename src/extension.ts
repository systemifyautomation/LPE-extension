import * as vscode from 'vscode';
import { RecorderPanel } from './recorderPanel';
import { sendToWebhook } from './webhook';
import { loadEnv, resolveWebhookUrl } from './config';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // Load .env from extension directory (no-op if file absent)
  loadEnv(context.extensionPath);

  // Status bar button
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'lpe-voice-input.startRecording';
  statusBarItem.text = '$(mic) Voice';
  statusBarItem.tooltip = 'Voice Input — click or press Ctrl+Shift+V';
  statusBarItem.show();

  const startRecording = vscode.commands.registerCommand(
    'lpe-voice-input.startRecording',
    () => {
      const config = vscode.workspace.getConfiguration('lpeVoiceInput');
      const webhookUrl = resolveWebhookUrl();

      if (!webhookUrl) {
        vscode.window
          .showWarningMessage(
            'LPE Voice Input: Webhook URL not configured.',
            'Open Settings'
          )
          .then((action) => {
            if (action === 'Open Settings') {
              vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'lpeVoiceInput.webhookUrl'
              );
            }
          });
        return;
      }

      RecorderPanel.createOrShow(
        context.extensionUri,
        async (audioBase64: string, mimeType: string) => {
          setStatus('$(sync~spin) Transcribing…');

          try {
            const transcription = await sendToWebhook(webhookUrl, audioBase64, mimeType);
            await insertTranscription(transcription, config);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            vscode.window.showErrorMessage(`Voice Input failed: ${msg}`);
          } finally {
            setStatus('$(mic) Voice');
          }
        }
      );
    }
  );

  const configure = vscode.commands.registerCommand('lpe-voice-input.configure', () => {
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      'lpeVoiceInput.webhookUrl'
    );
  });

  context.subscriptions.push(startRecording, configure, statusBarItem);
}

export function deactivate() {}

// ---------------------------------------------------------------------------

function setStatus(text: string) {
  statusBarItem.text = text;
}

async function insertTranscription(
  transcription: string,
  config: vscode.WorkspaceConfiguration
): Promise<void> {
  const target = config.get<string>('insertTarget', 'editor');
  const editor = vscode.window.activeTextEditor;

  if (target === 'editor' && editor) {
    await editor.edit((eb) => {
      // Replace selection if any, otherwise insert at cursor
      for (const sel of editor.selections) {
        eb.replace(sel, transcription);
      }
    });
    return;
  }

  // Fallback / clipboard mode
  await vscode.env.clipboard.writeText(transcription);
  vscode.window.showInformationMessage(
    `Transcription copied to clipboard — paste it where you need it.`
  );
}
