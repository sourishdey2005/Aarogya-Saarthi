/*
 * Camera end-to-end tests.
 *
 * Scenario A - single camera (phone / laptop webcam / USB camera):
 *   live preview, real JPEG capture, retake, gallery import.
 *
 * Scenario B - several cameras (laptop webcam + external USB camera):
 *   the device list is enumerated, the picker lists every camera and
 *   selecting a different device restarts the stream with that device.
 *
 * Headless Chrome is used with a fake video device, so no physical hardware
 * is required.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = process.argv[2] ?? 'http://localhost:5173/scan';
const PORT = 9222;

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aarogya-chrome-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    '--window-size=1280,900',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      /* browser not ready yet */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools target not found');
}

const consoleErrors = [];
const exceptions = [];

function connect(url) {
  const ws = new WebSocket(url);
  let msgId = 0;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(
        msg.params.exceptionDetails.exception?.description ??
          msg.params.exceptionDetails.text
      );
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  return { ws, send, open: new Promise((r) => ws.addEventListener('open', r, { once: true })) };
}

const evaluate = async (send, expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  const raw = result?.result?.value;
  if (typeof raw === 'string') return JSON.parse(raw);
  if (raw && Object.keys(raw).length) return raw;
  if (result?.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed');
  }
  return raw;
};

async function main() {
  const target = await getTarget();
  const { ws, send, open } = connect(target.webSocketDebuggerUrl);
  await open;

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  /* ------------------------------------------------------------------
   * Scenario A - one camera
   * ------------------------------------------------------------------ */
  await send('Page.navigate', { url: APP_URL });
  await sleep(3000);

  const single = await evaluate(
    send,
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const out = {};

      out.secureContext = window.isSecureContext;
      out.hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      let video = null;
      for (let i = 0; i < 60; i += 1) {
        video = document.querySelector('video');
        if (video && video.videoWidth > 0) break;
        await sleep(250);
      }
      out.livePreview = !!video && video.videoWidth > 0;
      out.videoSize = video ? video.videoWidth + 'x' + video.videoHeight : null;
      out.videoPlaying = video ? !video.paused : false;

      // how many cameras does the system report?
      const devices = await navigator.mediaDevices.enumerateDevices();
      out.videoInputCount = devices.filter((d) => d.kind === 'videoinput').length;
      out.deviceLabelsPresent = devices.some((d) => d.kind === 'videoinput' && d.label);

      // the camera chooser button must be visible and list the cameras
      const picker = Array.from(document.querySelectorAll('button'))
        .find((b) => b.getAttribute('aria-label') === 'Choose camera');
      out.pickerButtonFound = !!picker;
      if (picker) {
        picker.click();
        await sleep(500);
      }
      out.pickerListRendered = document.body.innerText.includes('कैमरा चुनें')
        || document.body.innerText.includes('Choose camera');
      const listed = Array.from(document.querySelectorAll('button'))
        .filter((b) => (b.innerText || '').includes('कैमरा') || (b.innerText || '').includes('Camera'));
      out.listedDeviceButtons = listed.length;
      // close the picker again
      if (picker) { picker.click(); await sleep(300); }

      // shutter -> real JPEG
      const shutter = Array.from(document.querySelectorAll('button'))
        .find((b) => b.getAttribute('aria-label') === 'Take picture');
      out.shutterFound = !!shutter;
      shutter.click();
      await sleep(2000);
      const shot = document.querySelector('img[alt="Captured prescription"]');
      out.capturedImage = !!shot;
      out.isJpegDataUrl = shot ? shot.src.startsWith('data:image/jpeg') : false;
      out.capturedBytes = shot ? shot.src.length : 0;
      out.drawerThumbnail = !!document.querySelector('img[alt="Scanned prescription"]');

      // retake
      const retake = Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').includes('फिर से') || (b.innerText || '').includes('Retake'));
      out.retakeFound = !!retake;
      if (retake) {
        retake.click();
        await sleep(1200);
        const v2 = document.querySelector('video');
        out.liveAgainAfterRetake = !!v2 && v2.videoWidth > 0;
        out.capturedCleared = !document.querySelector('img[alt="Captured prescription"]');
      }

      // gallery import
      const input = document.querySelector('input[type=file]');
      out.galleryInputFound = !!input;
      if (input) {
        const dt = new DataTransfer();
        const blob = await (await fetch('/favicon.svg')).blob();
        dt.items.add(new File([blob], 'prescription.svg', { type: 'image/svg+xml' }));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(2000);
      }
      const galleryShot = document.querySelector('img[alt="Captured prescription"]');
      out.galleryImported = !!galleryShot;
      out.galleryIsBlobUrl = galleryShot ? galleryShot.src.startsWith('blob:') : false;
      out.galleryLabel =
        document.body.innerText.includes('गैलरी से फोटो') ||
        document.body.innerText.includes('Photo from gallery');

      return JSON.stringify(out);
    })()`
  );

  console.log('--- scenario A: single camera (phone / laptop / USB) ---');
  console.log(JSON.stringify(single, null, 2));

  /* ------------------------------------------------------------------
   * Scenario B - several cameras (webcam + external USB camera)
   * ------------------------------------------------------------------ */
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      (() => {
        // Simulates a laptop webcam + an external USB camera.
        const proto = Object.getPrototypeOf(navigator.mediaDevices);
        const fakeDevices = [
          { deviceId: 'fake-builtin', kind: 'videoinput', label: 'HD Webcam', groupId: 'g1' },
          { deviceId: 'fake-usb', kind: 'videoinput', label: 'USB Camera Pro', groupId: 'g2' },
        ];

        navigator.mediaDevices.enumerateDevices = async () => {
          const real = await proto.enumerateDevices.call(navigator.mediaDevices);
          return [...real.filter((d) => d.kind !== 'videoinput'), ...fakeDevices];
        };

        const realGetUserMedia = proto.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          const stream = await realGetUserMedia({ video: true, audio: false });
          const video = constraints && constraints.video;
          if (video && typeof video === 'object' && video.deviceId && video.deviceId.exact) {
            const track = stream.getVideoTracks()[0];
            const original = track.getSettings.bind(track);
            track.getSettings = () => ({ ...original(), deviceId: video.deviceId.exact });
          }
          return stream;
        };
      })();
    `,
  });

  await send('Page.navigate', { url: APP_URL });
  await sleep(3500);

  const multi = await evaluate(
    send,
    `(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const out = {};

      let video = null;
      for (let i = 0; i < 60; i += 1) {
        video = document.querySelector('video');
        if (video && video.videoWidth > 0) break;
        await sleep(250);
      }
      out.livePreview = !!video && video.videoWidth > 0;

      const picker = Array.from(document.querySelectorAll('button'))
        .find((b) => b.getAttribute('aria-label') === 'Choose camera');
      out.pickerButtonFound = !!picker;
      if (picker) { picker.click(); await sleep(600); }

      const labels = Array.from(document.querySelectorAll('button'))
        .map((b) => (b.innerText || '').trim())
        .filter((t) => t.includes('Webcam') || t.includes('USB') || t.includes('Camera'));
      out.deviceLabels = labels;
      out.deviceCount = labels.length;

      // pick the external USB camera
      const usb = Array.from(document.querySelectorAll('button'))
        .find((b) => (b.innerText || '').includes('USB'));
      out.usbOptionFound = !!usb;
      if (usb) {
        usb.click();
        await sleep(2000);
        const v2 = document.querySelector('video');
        out.liveAfterSwitch = !!v2 && v2.videoWidth > 0;
        // the picker button now shows the selected camera
        const pickerBtn = Array.from(document.querySelectorAll('button'))
          .find((b) => b.getAttribute('aria-label') === 'Choose camera');
        out.selectedLabelShown = !!(pickerBtn && (pickerBtn.innerText || '').includes('USB'));

        // reopen the picker: the selected camera must be flagged as active
        if (pickerBtn) { pickerBtn.click(); await sleep(600); }
        const panel = pickerBtn
          ? pickerBtn.parentElement.querySelector('div.absolute')
          : null;
        const panelText = panel ? panel.innerText : '';
        out.activeMarker = panelText.includes('चालू') || panelText.includes('Active');
        out.usbMarkedActive =
          panelText.includes('USB') && out.activeMarker;
        out.panelText = panelText;
        if (pickerBtn) { pickerBtn.click(); await sleep(300); }
      }

      // capture still works on the switched camera
      const shutter = Array.from(document.querySelectorAll('button'))
        .find((b) => b.getAttribute('aria-label') === 'Take picture');
      shutter.click();
      await sleep(2000);
      const shot = document.querySelector('img[alt="Captured prescription"]');
      out.captureAfterSwitch = !!shot && shot.src.startsWith('data:image/jpeg');

      return JSON.stringify(out);
    })()`
  );

  console.log('--- scenario B: webcam + external USB camera ---');
  console.log(JSON.stringify(multi, null, 2));

  console.log('console errors :', consoleErrors.length ? consoleErrors : 'none');
  console.log('exceptions     :', exceptions.length ? exceptions : 'none');

  const ok =
    single.livePreview &&
    single.videoPlaying &&
    single.videoInputCount >= 1 &&
    single.pickerButtonFound &&
    single.pickerListRendered &&
    single.capturedImage &&
    single.isJpegDataUrl &&
    single.capturedBytes > 1000 &&
    single.drawerThumbnail &&
    single.retakeFound &&
    single.liveAgainAfterRetake &&
    single.capturedCleared &&
    single.galleryImported &&
    single.galleryIsBlobUrl &&
    single.galleryLabel &&
    multi.livePreview &&
    multi.deviceCount >= 2 &&
    multi.usbOptionFound &&
    multi.liveAfterSwitch &&
    multi.activeMarker &&
    multi.usbMarkedActive &&
    multi.captureAfterSwitch &&
    consoleErrors.length === 0 &&
    exceptions.length === 0;

  console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL');

  ws.close();
  chrome.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    /* chrome still closing */
  }
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('test error:', err);
  chrome.kill();
  process.exit(1);
});
