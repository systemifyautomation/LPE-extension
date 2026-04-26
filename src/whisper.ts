import * as https from 'https';

const WHISPER_ENDPOINT = 'api.openai.com';
const WHISPER_PATH = '/v1/audio/transcriptions';

/**
 * Send a base64-encoded audio buffer to OpenAI Whisper and return the
 * transcription text.
 *
 * @param apiKey   OpenAI API key (sk-…)
 * @param audioBase64  Base64-encoded audio data
 * @param mimeType     MIME type reported by the browser recorder (e.g. audio/webm)
 */
export function transcribeAudio(
  apiKey: string,
  audioBase64: string,
  mimeType: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const audioBuf = Buffer.from(audioBase64, 'base64');

    // Derive a sensible file extension from the MIME type so Whisper
    // can identify the codec (webm, ogg, mp4, wav, etc.)
    const ext = mimeTypeToExt(mimeType);
    const filename = `recording.${ext}`;

    // Build multipart/form-data body manually — no extra dependencies needed.
    const boundary = `----WhisperBoundary${Date.now().toString(16)}`;
    const CRLF = '\r\n';

    const preamble = Buffer.from(
      `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="model"${CRLF}${CRLF}` +
        `whisper-1${CRLF}` +
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="response_format"${CRLF}${CRLF}` +
        `json${CRLF}` +
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}` +
        `Content-Type: ${mimeType}${CRLF}${CRLF}`
    );

    const epilogue = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
    const body = Buffer.concat([preamble, audioBuf, epilogue]);

    const options: https.RequestOptions = {
      hostname: WHISPER_ENDPOINT,
      path: WHISPER_PATH,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8').trim();

        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          let hint = '';
          if (res.statusCode === 401) hint = ' — check your API key.';
          else if (res.statusCode === 429) hint = ' — rate limit or quota exceeded.';
          reject(
            new Error(`OpenAI returned HTTP ${res.statusCode}${hint}\n${raw.slice(0, 300)}`)
          );
          return;
        }

        try {
          const json = JSON.parse(raw) as { text?: string; error?: { message: string } };
          if (json.error?.message) {
            reject(new Error(`OpenAI error: ${json.error.message}`));
            return;
          }
          if (typeof json.text === 'string' && json.text.trim().length > 0) {
            resolve(json.text.trim());
          } else {
            reject(new Error('Whisper returned an empty transcription.'));
          }
        } catch {
          reject(new Error(`Unexpected response from OpenAI: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', (err: NodeJS.ErrnoException) =>
      reject(new Error(`Network error: ${err.message}`))
    );

    req.setTimeout(120_000, () => {
      req.destroy();
      reject(new Error('OpenAI Whisper request timed out after 120 seconds.'));
    });

    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------

function mimeTypeToExt(mime: string): string {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/ogg': 'ogg',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/flac': 'flac',
  };
  // Strip parameters for lookup if exact match fails
  const base = mime.split(';')[0].trim().toLowerCase();
  return map[mime.toLowerCase()] ?? map[base] ?? 'webm';
}
