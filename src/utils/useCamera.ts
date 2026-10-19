import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'live' | 'denied' | 'unavailable';
export type FacingMode = 'environment' | 'user';

export interface CameraDevice {
  deviceId: string;
  /** Human readable name reported by the device (e.g. "HD Webcam"). */
  label: string;
  /** "front" / "back" for built in cameras, "external" for USB cameras. */
  kind: 'front' | 'back' | 'external' | 'unknown';
  isActive: boolean;
}

interface CameraCapabilities {
  torch?: boolean;
}

const MAX_STORED_WIDTH = 900;

const prettifyLabel = (label: string, index: number): string => {
  const clean = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (clean && !/^camera/i.test(clean)) return clean;
  return `कैमरा ${index + 1} (Camera ${index + 1})`;
};

/**
 * Camera hook built on the browser MediaDevices API.
 *
 * Works the same on:
 *  - phones (rear + front camera),
 *  - laptops (built in webcam),
 *  - desktops with an external USB camera plugged in.
 *
 * It enumerates every video input, lets the user pick one, remembers the
 * active device, follows hot-plug events and gracefully falls back to any
 * available camera when the preferred one is missing.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
  }, []);

  /**
   * Callback ref for the <video> element. It attaches the running stream as
   * soon as the element is mounted, so the preview works no matter whether
   * the camera was started before or after the first render.
   */
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element;
    const stream = streamRef.current;
    if (element && stream) {
      element.srcObject = stream;
      element.play().catch(() => {
        /* autoplay may be blocked until the first user gesture */
      });
    }
  }, []);

  /** Lists every connected video input (webcam, USB camera, phone camera). */
  const refreshDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((device) => device.kind === 'videoinput');
      const list: CameraDevice[] = inputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: prettifyLabel(device.label || '', index),
        kind: 'unknown',
        isActive: false,
      }));
      setDevices(list);
    } catch {
      /* enumeration is best effort */
    }
  }, []);

  const requestStream = useCallback(
    async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        const name = (err as DOMException)?.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setStatus('denied');
          setError('कैमरा अनुमति नहीं मिली (Camera permission denied)');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setStatus('unavailable');
          setError('कोई कैमरा नहीं मिला (No camera found)');
        } else {
          setStatus('unavailable');
          setError('कैमरा शुरू नहीं हो सका (Could not start camera)');
        }
        return null;
      }
    },
    []
  );

  const start = useCallback(
    async (mode: FacingMode = facingMode, deviceId?: string | null): Promise<boolean> => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable');
        setError('इस ब्राउज़र में कैमरा उपलब्ध नहीं है (Camera not supported)');
        return false;
      }

      // getUserMedia is only exposed in a secure context (https or localhost).
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setStatus('unavailable');
        setError('कैमरा के लिए HTTPS चाहिए (Camera needs a secure HTTPS connection)');
        return false;
      }

      // Always release a previous stream first (React strict mode mounts
      // effects twice, and the user can retry).
      stop();

      setStatus('requesting');
      setError(null);

      const attempts: MediaStreamConstraints[] = [];

      if (deviceId) {
        attempts.push({ video: { deviceId: { exact: deviceId } }, audio: false });
      } else {
        // Phones: prefer the rear camera. Laptops/desktops: any camera.
        attempts.push({ video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        attempts.push({ video: { facingMode: mode === 'environment' ? 'user' : 'environment' }, audio: false });
        attempts.push({ video: true, audio: false });
      }
      // Last resort: any camera at all.
      attempts.push({ video: true, audio: false });

      let stream: MediaStream | null = null;
      for (const constraints of attempts) {
        stream = await requestStream(constraints);
        if (stream) break;
        // A denied permission will not be fixed by another attempt.
        if (status === 'denied') break;
      }

      if (!stream) {
        setStatus('unavailable');
        return false;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          /* autoplay restrictions - the preview simply stays paused */
        }
      }

      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.() ?? {};
      const capabilities = (track?.getCapabilities?.() ?? {}) as CameraCapabilities;

      if (settings.deviceId) setActiveDeviceId(settings.deviceId);
      if (settings.facingMode) setFacingMode(settings.facingMode as FacingMode);
      setHasTorch(Boolean(capabilities.torch));
      setStatus('live');

      // Device labels are only exposed after the permission was granted.
      await refreshDevices();

      return true;
    },
    [facingMode, refreshDevices, requestStream, stop]
  );

  /** Captures the current video frame as a downscaled JPEG data URL. */
  const capture = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement('canvas');
    const scale = Math.min(1, MAX_STORED_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      return canvas.toDataURL('image/jpeg', 0.9);
    } catch {
      return null;
    }
  }, []);

  /** Toggles the hardware torch when the device supports it. */
  const toggleTorch = useCallback(async (on: boolean): Promise<boolean> => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return false;
    try {
      await track.applyConstraints({
        advanced: [{ torch: on } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(on);
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Switches to another connected camera (front/back, webcam, USB camera). */
  const selectDevice = useCallback(
    async (deviceId: string) => {
      setIsSwitching(true);
      const ok = await start(facingMode, deviceId);
      setIsSwitching(false);
      return ok;
    },
    [facingMode, start]
  );

  /** Cycles to the next available camera. */
  const nextDevice = useCallback(async () => {
    const list = devices;
    if (list.length === 0) return false;
    const index = list.findIndex((d) => d.deviceId === activeDeviceId);
    const next = list[(index + 1) % list.length];
    return selectDevice(next.deviceId);
  }, [activeDeviceId, devices, selectDevice]);

  /**
   * Flips between the front and the rear camera. Falls back to cycling
   * through the device list when the device does not expose a facing mode
   * (most laptop and USB webcams).
   */
  const switchCamera = useCallback(async () => {
    if (devices.length > 1) {
      return nextDevice();
    }
    const next: FacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setIsSwitching(true);
    stop();
    const ok = await start(next);
    setIsSwitching(false);
    return ok;
  }, [devices.length, facingMode, nextDevice, start, stop]);

  // Release the camera when the screen is left.
  useEffect(() => stop, [stop]);

  // Follow cameras that are plugged in or removed while the app is open.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;

    const onDeviceChange = async () => {
      await refreshDevices();

      // If the camera that was in use disappeared (unplugged) restart with
      // whatever is available now.
      const track = streamRef.current?.getVideoTracks()[0];
      if (track && track.readyState === 'ended') {
        stop();
        await start(facingMode);
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
  }, [facingMode, refreshDevices, start, stop]);

  const cameraDevices: CameraDevice[] = devices.map((device) => ({
    ...device,
    isActive: device.deviceId === activeDeviceId,
  }));

  return {
    videoRef,
    attachVideo,
    status,
    error,
    facingMode,
    hasTorch,
    torchOn,
    isSwitching,
    devices: cameraDevices,
    activeDeviceId,
    isLive: status === 'live',
    start,
    stop,
    capture,
    toggleTorch,
    switchCamera,
    selectDevice,
    nextDevice,
    refreshDevices,
  };
}
