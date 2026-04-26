import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

/**
 * Send a base64-encoded audio recording to an n8n webhook and return the
 * transcription text.
 *
 * Expected n8n response (any of these fields is accepted):
 *   { "transcription": "..." }
 *   { "text": "..." }
 *   { "transcript": "..." }
 *   { "result": "..." }
 * Plain-text responses are also accepted.
 */
export function sendToWebhook(
  webhookUrl: string,
  audioBase64: string,
  mimeType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(webhookUrl);
    } catch {
      reject(new Error(`Invalid webhook URL: "${webhookUrl}"`));
      return;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      reject(new Error(`Webhook URL must use http or https. Got: ${parsed.protocol}`));
      return;
    }

    const body = JSON.stringify({
      audio: audioBase64,
      mimeType,
      timestamp: new Date().toISOString(),
    });

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port
        ? Number(parsed.port)
        : parsed.protocol === 'https:' ? 443 : 80,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const lib = parsed.protocol === 'https:' ? https : http;

    const req = lib.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8').trim();

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(
            new Error(
              `Webhook returned HTTP ${res.statusCode}: ${raw.slice(0, 200)}`
            )
          );
          return;
        }

        // Try to parse JSON and pick the transcription field
        try {
          const json = JSON.parse(raw) as Record<string, unknown>;
          const transcription =
            json['transcription'] ??
            json['text'] ??
            json['transcript'] ??
            json['result'];

          if (typeof transcription === 'string' && transcription.length > 0) {
            resolve(transcription.trim());
          } else if (raw.length > 0) {
            // Fall back to raw text (non-JSON or unexpected shape)
            resolve(raw);
          } else {
            reject(new Error('Webhook returned an empty response.'));
          }
        } catch {
          // Not JSON — use the raw text directly
          if (raw.length > 0) {
            resolve(raw);
          } else {
            reject(new Error('Webhook returned an empty response.'));
          }
        }
      });
    });

    req.on('error', (err: NodeJS.ErrnoException) =>
      reject(new Error(`Network error: ${err.message}`))
    );

    req.setTimeout(60_000, () => {
      req.destroy();
      reject(new Error('Webhook request timed out after 60 seconds.'));
    });

    req.write(body);
    req.end();
  });
}
