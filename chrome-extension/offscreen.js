let recorder  = null;
let stream    = null;
let chunks    = [];
let startTime = 0;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== 'offscreen') return false;

  if (msg.action === 'start-recording') {
    startRecording().then(sendResponse);
    return true;
  }
  if (msg.action === 'stop-recording') {
    stopRecording().then(sendResponse);
    return true;
  }
});

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    chunks    = [];
    startTime = Date.now();
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.start();
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

function stopRecording() {
  return new Promise(resolve => {
    if (!recorder || recorder.state === 'inactive') {
      resolve({ error: 'No active recording' });
      return;
    }
    recorder.onstop = async () => {
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      const duration = (Date.now() - startTime) / 1000;
      const mimeType = recorder.mimeType;
      const blob     = new Blob(chunks, { type: mimeType });
      const buffer   = await blob.arrayBuffer();
      const bytes    = new Uint8Array(buffer);
      let binary     = '';
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      resolve({ audio: btoa(binary), mimeType, duration });
    };
    recorder.stop();
  });
}
