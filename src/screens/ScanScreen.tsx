import { useTranslate } from '../i18n/LanguageContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PrescriptionScan } from '../types';
import { playSpokenText } from '../utils/speech';
import { useCamera } from '../utils/useCamera';
import { ocrPrescription, postPrescription, type OcrMedicine } from '../lib/api';

interface ScanScreenProps {
  onBack: () => void;
  onSavePrescription: (scan: PrescriptionScan) => void;
  showToast: (msg: string) => void;
  /** The patient the prescription belongs to (id from the API). */
  patientId?: string;
}

/**
 * Resizes an image to at most 1024px wide and encodes it as a JPEG data URL.
 * Keeping the payload small matters for the free tier storage.
 */
async function imageToBase64(source: string, maxWidth = 1024): Promise<string> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not read the image'));
    image.src = source;
  });

  const scale = Math.min(1, maxWidth / (image.naturalWidth || maxWidth));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((image.naturalWidth || maxWidth) * scale);
  canvas.height = Math.round((image.naturalHeight || maxWidth) * scale);

  const context = canvas.getContext('2d');
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Prescription text must stay legible, so OCR gets a larger image than the
 * archived copy. Fall back to smaller widths to keep the request under Convex's
 * argument size limit.
 */
async function imageToBase64ForOcr(source: string): Promise<string> {
  for (const width of [1400, 1200, 1000]) {
    const encoded = await imageToBase64(source, width);
    if (encoded.length <= 650_000) return encoded;
  }
  return imageToBase64(source, 900);
}

interface ScannedMedicine {
  id: string;
  name: string;
  dosageHi: string;
  spokenHi: string;
}

function toScannedMedicine(medicine: OcrMedicine, index: number): ScannedMedicine {
  const dosageParts = [medicine.frequency, medicine.duration, medicine.instructions].filter(
    Boolean
  );
  const name = [medicine.name, medicine.strength].filter(Boolean).join(' ');
  const dosageHi = dosageParts.join(' • ') || 'खुराक पर्चे पर देखें (Check the slip)';

  return {
    id: `ocr-${Date.now()}-${index}`,
    name,
    dosageHi,
    spokenHi: `${medicine.name}${medicine.strength ? `, ${medicine.strength}` : ''}. ${dosageHi}`,
  };
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  onBack,
  onSavePrescription,
  showToast,
  patientId = ''
}) => {
  const tr = useTranslate();
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeSpeakingMedId, setActiveSpeakingMedId] = useState<string | null>(null);
  const [isAudioGuideActive, setIsAudioGuideActive] = useState(false);
  const [scanConfidence, setScanConfidence] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'camera' | 'gallery' | null>(null);
  const [isDevicePickerOpen, setIsDevicePickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [medicines, setMedicines] = useState<ScannedMedicine[]>([]);
  const [ocrText, setOcrText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const camera = useCamera();
  const { status: cameraStatus, error: cameraError, devices: cameraDevices } = camera;
  const activeDevice = cameraDevices.find((d) => d.isActive);

  // Ask for camera access as soon as the scan screen opens.
  useEffect(() => {
    camera.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Release object URLs of gallery images when the screen is left.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const runOcr = useCallback(
    async (image: string | null, source: 'camera' | 'gallery') => {
      setCapturedImage(image);
      setImageSource(source);

      if (!image) {
        showToast('फोटो नहीं मिली — गैलरी से पर्चा चुनें (No photo captured)');
        return;
      }

      setIsCapturing(true);
      setMedicines([]);
      setOcrText('');
      setScanConfidence(0);
      showToast('पर्चा पढ़ा जा रहा है... (Reading prescription)');

      try {
        const imageBase64 = await imageToBase64ForOcr(image);
        const result = await ocrPrescription({
          image_base64: imageBase64,
          mime_type: 'image/jpeg',
        });

        const scanned = result.medicines.map(toScannedMedicine);
        setMedicines(scanned);
        setOcrText(result.ocr_text);
        setScanConfidence(result.ocr_confidence);
        showToast(`पर्चे से ${scanned.length} दवाइयां पहचानी गईं ✓`);

        window.setTimeout(() => {
          drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
      } catch (error) {
        setScanConfidence(0);
        showToast(
          error instanceof Error
            ? `स्कैन विफल: ${error.message}`
            : 'स्कैन विफल (Scan failed)'
        );
      } finally {
        setIsCapturing(false);
      }
    },
    [showToast]
  );

  const handleToggleFlash = async () => {
    // Use the real torch when the device exposes one.
    if (camera.hasTorch) {
      const next = flashMode !== 'on';
      const applied = await camera.toggleTorch(next);
      if (applied) {
        setFlashMode(next ? 'on' : 'off');
        showToast(next ? 'फ्लैश: हमेशा चालू (Flash ON)' : 'फ्लैश: बंद (Flash OFF)');
        return;
      }
    }

    if (flashMode === 'auto') {
      setFlashMode('on');
      showToast('फ्लैश: हमेशा चालू (Flash ON)');
    } else if (flashMode === 'on') {
      setFlashMode('off');
      showToast('फ्लैश: बंद (Flash OFF)');
    } else {
      setFlashMode('auto');
      showToast('फ्लैश: ऑटो (Flash Auto)');
    }
  };

  const handleCapture = () => {
    const shot = camera.capture();
    if (shot) {
      void runOcr(shot, 'camera');
      return;
    }

    // No live camera (desktop / permission denied) - ask for a gallery photo.
    showToast('कैमरा उपलब्ध नहीं — गैलरी से पर्चा चुनें (Pick from gallery)');
    fileInputRef.current?.click();
  };

  const handleRetake = async () => {
    setCapturedImage(null);
    setImageSource(null);
    setScanConfidence(0);
    setMedicines([]);
    setOcrText('');
    setIsCapturing(false);
    if (!camera.isLive) {
      await camera.start();
    }
  };

  const handlePlayMedicineAudio = (med: (typeof medicines)[0]) => {
    if (activeSpeakingMedId === med.id) {
      setActiveSpeakingMedId(null);
    } else {
      setActiveSpeakingMedId(med.id);
      playSpokenText(
        med.spokenHi,
        () => setActiveSpeakingMedId(med.id),
        () => setActiveSpeakingMedId(null)
      );
      showToast(`${med.name} के निर्देश आवाज़ में`);
    }
  };

  const handleToggleAudioGuide = () => {
    if (isAudioGuideActive) {
      setIsAudioGuideActive(false);
    } else {
      setIsAudioGuideActive(true);
      playSpokenText(
        'कृपया पर्चे को चौकोर फ्रेम के बीच में सीधा रखें, और पर्याप्त रोशनी सुनिश्चित करें।',
        () => setIsAudioGuideActive(true),
        () => setIsAudioGuideActive(false)
      );
      showToast('स्कैन गाइडेंस ऑडियो चल रहा है');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      void runOcr(url, 'gallery');
    }
    // Allow selecting the same file again.
    e.target.value = '';
  };

  const handleSave = async () => {
    if (medicines.length === 0) {
      showToast('पहले पर्चा स्कैन करें (Scan a prescription first)');
      return;
    }

    const newScan: PrescriptionScan = {
      id: `rx-${Date.now()}`,
      patientName: 'कमला देवी (Kamla Devi)',
      patientAge: 48,
      opdNumber: 'OPD #4092',
      phcName: 'PHC रामपुर (Rampur)',
      confidence: scanConfidence,
      scannedAt: 'आज, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSynced: false,
      imageUrl: capturedImage ?? undefined,
      imageSource: imageSource ?? undefined,
      medicines: medicines.map((m) => ({
        id: m.id,
        medicineName: m.name,
        dosage: '1 Tab',
        dosageHi: m.dosageHi,
        duration: '3 days',
        instructions: m.dosageHi,
        instructionsHi: m.spokenHi
      }))
    };
    onSavePrescription(newScan);
    showToast('पर्चा रिकॉर्ड सुरक्षित सहेजा गया ✓');
    await handleUpload();
  };

  /**
   * Uploads the scan to the backend. The image is resized to 1024px wide and
   * encoded as JPEG before it is sent, so the free tier storage is not
   * wasted on huge photos. When the device is offline the request is queued
   * on the device and replayed later.
   */
  const handleUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      if (!patientId) {
        showToast('पहले मरीज़ पंजीकृत करें या चुनें (Register or select a patient first)');
        return;
      }

      const imageBase64 = capturedImage ? await imageToBase64(capturedImage) : null;
      const ocrTextValue =
        ocrText ||
        medicines.map((medicine) => `${medicine.name} - ${medicine.dosageHi}`).join('\n');

      const result = await postPrescription({
        patient_id: patientId,
        image_base64: imageBase64,
        ocr_text: ocrTextValue,
        ocr_confidence: scanConfidence,
        captured_at: new Date().toISOString(),
      });

      showToast(
        result.queued
          ? 'ऑफ़लाइन: पर्चा सुरक्षित सहेजा गया, बाद में सिंक होगा'
          : 'पर्चा सर्वर पर सुरक्षित ✓ (Prescription saved to the server)'
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? `अपलोड विफल: ${error.message}`
          : 'अपलोड विफल (Upload failed)'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return tr(
    <div className="flex flex-col w-full gap-4 pb-28 screen-layout">
      {/* Internal Navigation Header Bar */}
      <div className="lg-span-2 flex items-center justify-between bg-[#eff4ff] px-4 py-2.5 rounded-xl shadow-sm border border-[#d9e3f6]">
        <div className="flex items-center gap-3">
          <button
            aria-label="Go back"
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white hover:bg-[#dee9fc] active:scale-95 transition-all text-[#121c2a] shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex flex-col text-left">
            <span className="font-headline-sm text-[16px] text-[#121c2a] leading-tight font-bold">
              पर्चा स्कैन करें
            </span>
            <span className="font-label-sm text-[12px] text-[#574238]">Scan Prescription</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#8df9ac]/30 px-3 py-1.5 rounded-full border border-[#8df9ac]">
          <span className="w-2 h-2 rounded-full bg-[#006d38] animate-pulse"></span>
          <span className="font-label-sm text-[12px] font-bold text-[#006d38]">AI OCR</span>
        </div>
      </div>

      {/* Camera Viewfinder Section (~360px height) */}
      <div
        className={`relative w-full h-[360px] bg-[#27313f] rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between p-4 transition-all ${
          flashMode === 'on' ? 'ring-4 ring-amber-300' : ''
        }`}
      >
        {/* Live camera preview - always mounted so the stream can attach */}
        <video
          ref={camera.attachVideo}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: camera.isLive && !capturedImage ? 1 : 0 }}
        />

        {/* Captured still (from camera or gallery) */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured prescription"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Neutral backdrop when no camera is available */}
        {!camera.isLive && !capturedImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#27313f] via-[#1d2530] to-[#27313f] flex items-center justify-center">
            <div className="flex flex-col items-center text-center px-8 text-white/50">
              <span className="material-symbols-outlined text-[44px] mb-2">photo_camera</span>
              <span className="font-label-md text-[13px] font-semibold">
                कैमरा शुरू नहीं हो सका (Camera not running)
              </span>
              <span className="font-label-sm text-[11px] mt-1">
                गैलरी से फोटो चुनें (Pick a photo from the gallery)
              </span>
            </div>
          </div>
        )}

        {/* Shutter flash effect */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white/20 z-30 animate-pulse"></div>
        )}

        {/* Glowing Scan Line Laser Overlay */}
        <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-[#e8762b] to-transparent shadow-[0_0_12px_#e8762b] animate-bounce pointer-events-none top-1/3 z-20"></div>

        {/* Top Guide Floating Pill */}
        <div className="relative z-10 flex justify-center w-full">
          <div className="bg-[#27313f]/85 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-sm text-white border border-white/10">
            <span className="material-symbols-outlined text-[#ffdbca] text-[18px]">
              center_focus_strong
            </span>
            <div className="flex flex-col text-center">
              {capturedImage ? (
                <>
                  <span className="font-headline-sm text-[13px] leading-tight font-semibold text-white">
                    फोटो ली गई (Photo captured)
                  </span>
                  <span className="font-label-sm text-[10px] text-[#d0dbed]">
                    {imageSource === 'gallery' ? 'From gallery' : 'From camera'}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-headline-sm text-[13px] leading-tight font-semibold text-white">
                    पर्चे को फ्रेम में रखें
                  </span>
                  <span className="font-label-sm text-[10px] text-[#d0dbed]">
                    Keep slip inside frame
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Camera status / error message */}
        {(cameraStatus === 'denied' || cameraStatus === 'unavailable') && !capturedImage && (
          <div className="relative z-10 mx-2 mb-2 rounded-xl bg-[#ffdad6]/95 text-[#93000a] px-3 py-2 text-center shadow-md">
            <p className="font-label-md text-[12px] font-bold">
              {cameraError ?? 'कैमरा उपलब्ध नहीं (Camera unavailable)'}
            </p>
            <p className="font-label-sm text-[11px] mt-0.5">
              गैलरी से फोटो चुनें (Choose a photo from the gallery instead)
            </p>
            <button
              type="button"
              onClick={() => camera.start()}
              className="mt-2 px-3 py-1.5 rounded-lg bg-[#ba1a1a] text-white text-[12px] font-bold active:scale-95 transition-all"
            >
              फिर से कोशिश करें (Try again)
            </button>
          </div>
        )}

        {/* Viewfinder Reticle Framing Box */}
        <div className="relative z-10 mx-auto w-11/12 h-56 flex flex-col justify-between pointer-events-none">
          {/* Corners Top */}
          <div className="flex justify-between w-full">
            <div className="w-7 h-7 border-t-4 border-l-4 border-[#e8762b] rounded-tl-lg"></div>
            <div className="w-7 h-7 border-t-4 border-r-4 border-[#e8762b] rounded-tr-lg"></div>
          </div>

          {/* Corners Bottom */}
          <div className="flex justify-between w-full">
            <div className="w-7 h-7 border-b-4 border-l-4 border-[#e8762b] rounded-bl-lg"></div>
            <div className="w-7 h-7 border-b-4 border-r-4 border-[#e8762b] rounded-br-lg"></div>
          </div>
        </div>

        {/* Bottom Viewfinder Status Row */}
        <div className="relative z-10 flex items-center justify-between px-2">
          <div className="flex items-center gap-1.5 bg-[#27313f]/80 px-3 py-1 rounded-full text-white">
            <span
              className={`w-2 h-2 rounded-full ${
                camera.isLive ? 'bg-[#3ba965] animate-ping' : 'bg-[#ffb68e]'
              }`}
            ></span>
            <span className="font-label-sm text-[11.5px] text-[#8df9ac]">
              {camera.isLive
                ? 'ऑटो फोकस सक्रिय (Auto-focus)'
                : cameraStatus === 'requesting'
                ? 'कैमरा शुरू हो रहा है (Starting camera)'
                : 'डेमो दृश्य (Demo view)'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {capturedImage ? (
              <button
                type="button"
                onClick={handleRetake}
                className="h-9 px-3 rounded-full bg-[#e8762b] text-white flex items-center gap-1 shadow-sm active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
                <span className="font-label-sm text-[11px] font-bold">फिर से (Retake)</span>
              </button>
            ) : (
              <>
                {/* Camera chooser - phone front/back, laptop webcam, USB camera */}
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Choose camera"
                    onClick={() => setIsDevicePickerOpen((open) => !open)}
                    disabled={!camera.isLive}
                    className="h-9 px-2.5 rounded-full bg-[#27313f]/85 text-[#ffb68e] hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">videocam</span>
                    <span className="font-label-sm text-[10.5px] font-semibold max-w-[92px] truncate">
                      {activeDevice?.label ?? 'कैमरा (Camera)'}
                    </span>
                  </button>

                  {isDevicePickerOpen && cameraDevices.length > 0 && (
                    <div className="absolute right-0 bottom-11 w-60 rounded-xl bg-[#27313f]/97 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden z-30">
                      <div className="px-3 py-2 border-b border-white/10">
                        <span className="font-label-sm text-[11px] font-bold text-white">
                          कैमरा चुनें (Choose camera)
                        </span>
                      </div>
                      {cameraDevices.map((device) => (
                        <button
                          key={device.deviceId}
                          type="button"
                          onClick={async () => {
                            setIsDevicePickerOpen(false);
                            await camera.selectDevice(device.deviceId);
                          }}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${
                            device.isActive ? 'bg-[#e8762b]/25' : 'hover:bg-white/10'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              device.isActive ? 'text-[#ffb68e]' : 'text-white/70'
                            }`}
                          >
                            {device.isActive ? 'check_circle' : 'videocam'}
                          </span>
                          <span className="flex flex-col">
                            <span className="font-label-sm text-[12px] text-white font-semibold truncate">
                              {device.label}
                            </span>
                            {device.isActive && (
                              <span className="font-label-sm text-[10px] text-[#8df9ac]">
                                चालू (Active)
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  aria-label="Switch camera"
                  onClick={camera.switchCamera}
                  disabled={!camera.isLive || camera.isSwitching}
                  className="w-9 h-9 rounded-full bg-[#27313f]/85 flex items-center justify-center text-[#ffb68e] hover:text-white transition-colors disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">cameraswitch</span>
                </button>
              </>
            )}
            <button
              aria-label="Toggle voice guidance"
              onClick={handleToggleAudioGuide}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isAudioGuideActive
                  ? 'bg-[#e8762b] text-white animate-pulse'
                  : 'bg-[#27313f]/85 text-[#ffb68e] hover:text-white'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">volume_up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Capture Guidelines Row: 3 Touch-Friendly Educational Tips */}
      <div className="grid grid-cols-3 gap-2">
        {/* Tip 1 */}
        <div className="flex flex-col items-center text-center bg-white p-2.5 rounded-xl shadow-sm border border-[#e6eeff]/60">
          <div className="w-10 h-10 rounded-full bg-[#ffdbca] flex items-center justify-center text-[#9c4500] mb-1">
            <span className="material-symbols-outlined text-[20px]">lightbulb</span>
          </div>
          <span className="font-headline-sm text-[12px] text-[#121c2a] font-semibold leading-tight">
            अच्छी रोशनी
          </span>
          <span className="font-label-sm text-[10px] text-[#574238]">Good Light</span>
        </div>
        {/* Tip 2 */}
        <div className="flex flex-col items-center text-center bg-white p-2.5 rounded-xl shadow-sm border border-[#e6eeff]/60">
          <div className="w-10 h-10 rounded-full bg-[#8ff3f4] flex items-center justify-center text-[#00696b] mb-1">
            <span className="material-symbols-outlined text-[20px]">crop_free</span>
          </div>
          <span className="font-headline-sm text-[12px] text-[#121c2a] font-semibold leading-tight">
            सीधा रखें
          </span>
          <span className="font-label-sm text-[10px] text-[#574238]">Keep Flat</span>
        </div>
        {/* Tip 3 */}
        <div className="flex flex-col items-center text-center bg-white p-2.5 rounded-xl shadow-sm border border-[#e6eeff]/60">
          <div className="w-10 h-10 rounded-full bg-[#dee9fc] flex items-center justify-center text-[#121c2a] mb-1">
            <span className="material-symbols-outlined text-[20px]">document_scanner</span>
          </div>
          <span className="font-headline-sm text-[12px] text-[#121c2a] font-semibold leading-tight">
            पूरा दिखे
          </span>
          <span className="font-label-sm text-[10px] text-[#574238]">Full Slip</span>
        </div>
      </div>

      {/* Large Camera Shutter Controls Bar */}
      <div className="flex items-center justify-around bg-white p-3 rounded-2xl shadow-sm border border-[#e6eeff]/60">
        {/* Flash Toggle */}
        <button
          onClick={handleToggleFlash}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-xl hover:bg-[#eff4ff] active:scale-95 transition-all text-[#574238]"
          type="button"
        >
          <div className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center mb-1 text-[#e8762b]">
            <span className="material-symbols-outlined text-[22px]">
              {flashMode === 'auto'
                ? 'flash_auto'
                : flashMode === 'on'
                ? 'flash_on'
                : 'flash_off'}
            </span>
          </div>
          <span className="font-headline-sm text-[11px] leading-tight">फ्लैश</span>
          <span className="font-label-sm text-[9px] text-[#574238]">
            {flashMode === 'auto' ? 'Auto' : flashMode === 'on' ? 'On' : 'Off'}
          </span>
        </button>

        {/* Central High-Tactility 88dp Circular Shutter Button */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-1.5 rounded-full bg-[#e8762b]/20 animate-pulse"></div>
          <button
            aria-label="Take picture"
            onClick={handleCapture}
            disabled={cameraStatus === 'requesting' || isCapturing}
            className="relative w-[84px] h-[84px] rounded-full bg-white p-1.5 shadow-[0_4px_16px_rgba(232,118,43,0.35)] active:scale-90 transition-transform disabled:opacity-60"
            type="button"
          >
            <div className="w-full h-full rounded-full bg-[#e8762b] flex items-center justify-center text-white">
              <span
                className="material-symbols-outlined text-[36px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                photo_camera
              </span>
            </div>
          </button>
        </div>

        {/* Gallery Import */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center w-16 h-16 rounded-xl hover:bg-[#eff4ff] active:scale-95 transition-all text-[#574238]"
          type="button"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-[#eff4ff] flex items-center justify-center mb-1 text-[#00696b]">
            <span className="material-symbols-outlined text-[22px]">photo_library</span>
          </div>
          <span className="font-headline-sm text-[11px] leading-tight">गैलरी</span>
          <span className="font-label-sm text-[9px] text-[#574238]">Gallery</span>
        </button>
      </div>

      {/* Extracted OCR Preview Drawer / Bottom Verification Card */}
      <div
        ref={drawerRef}
        className="lg-span-2 flex flex-col bg-white rounded-2xl p-4 shadow-md gap-3 border border-[#e6eeff]/60"
      >
        {/* Header of Drawer with Confidence Indicator */}
        <div className="flex items-center justify-between pb-2 border-b border-[#e6eeff]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#8df9ac] flex items-center justify-center text-[#003619]">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-[16px] text-[#121c2a] leading-tight font-bold">
                पढ़ा गया पर्चा
              </span>
              <span className="font-label-sm text-[12px] text-[#574238]">
                Extracted OCR Record
              </span>
            </div>
          </div>
          {/* Confidence Badge */}
          <div className="flex items-center gap-1.5 bg-[#8df9ac]/20 text-[#006d38] px-3 py-1 rounded-full border border-[#8df9ac]/40">
            <span className="material-symbols-outlined text-[16px] text-[#006d38]">
              check_circle
            </span>
            <span className="font-label-sm text-[12px] font-bold">
              {medicines.length > 0 ? `${scanConfidence}% भरोसा` : '—'}
            </span>
          </div>
        </div>

        {/* Captured image thumbnail */}
        {capturedImage && (
          <div className="flex items-center gap-3 rounded-xl bg-[#eff4ff] p-2.5 border border-[#d9e3f6]/40">
            <img
              src={capturedImage}
              alt="Scanned prescription"
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-label-md text-[13px] font-bold text-[#121c2a]">
                {imageSource === 'gallery' ? 'गैलरी से फोटो (Photo from gallery)' : 'कैमरा से फोटो (Photo from camera)'}
              </span>
              <span className="font-label-sm text-[11px] text-[#574238]">
                फोटो सुरक्षित सहेजी गई (Image stored locally)
              </span>
            </div>
          </div>
        )}

        {/* Parsed Medicine Rows with Audio Cue and Clear Visual Tags */}
        <div className="flex flex-col gap-2">
          {medicines.length === 0 && (
            <div className="flex flex-col items-center text-center gap-1 rounded-xl bg-[#eff4ff] border border-dashed border-[#d9e3f6] px-4 py-6">
              <span className="material-symbols-outlined text-[28px] text-[#8a97a8]">
                document_scanner
              </span>
              <span className="font-label-md text-[13px] font-semibold text-[#574238]">
                अभी कोई पर्चा नहीं पढ़ा गया
              </span>
              <span className="font-label-sm text-[11px] text-[#8a97a8]">
                Take a photo or pick one from the gallery to extract medicines
              </span>
            </div>
          )}
          {medicines.map((med, idx) => (
            <div
              key={med.id}
              className="flex items-center justify-between bg-[#eff4ff] p-3 rounded-xl border border-[#d9e3f6]/40"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${
                    idx === 0
                      ? 'bg-[#ffdbca] text-[#9c4500]'
                      : idx === 1
                      ? 'bg-[#8ff3f4] text-[#00696b]'
                      : 'bg-[#8df9ac] text-[#006d38]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {idx === 0 ? 'medication' : idx === 1 ? 'pill' : 'water_bottle'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-[14px] text-[#121c2a] font-bold">
                    दवा {idx + 1}: {med.name}
                  </span>
                  <span className="font-body-md text-[12.5px] text-[#574238]">
                    {med.dosageHi}
                  </span>
                </div>
              </div>
              <button
                aria-label={`Play audio instructions for ${med.name}`}
                onClick={() => handlePlayMedicineAudio(med)}
                className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all ${
                  activeSpeakingMedId === med.id
                    ? 'bg-[#e8762b] text-white animate-pulse'
                    : 'bg-white text-[#e8762b] hover:bg-[#ffdbca]'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {activeSpeakingMedId === med.id ? 'graphic_eq' : 'volume_up'}
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons (Confirm vs Rescan) */}
        <div className="flex flex-col gap-2 mt-1">
          {/* Primary Save Button: Minimum height 56px */}
          <button
            onClick={handleSave}
            disabled={isUploading}
            className="w-full min-h-[56px] rounded-xl bg-[#006d38] text-white font-bold flex items-center justify-center gap-2 px-4 shadow-md hover:bg-[#005229] active:scale-98 transition-all disabled:opacity-70"
            type="button"
          >
            <span className={`material-symbols-outlined text-[24px] ${isUploading ? 'animate-spin' : ''}`}>
              {isUploading ? 'sync' : 'task_alt'}
            </span>
            <div className="flex flex-col text-left">
              <span className="font-headline-sm text-[16px] text-white leading-tight">
                ✓ सही है, सेव करें
              </span>
              <span className="font-label-sm text-[11px] text-[#8df9ac] leading-none">
                Confirm &amp; Save Record
              </span>
            </div>
          </button>

          {/* Secondary Rescan Button */}
          <button
            onClick={handleRetake}
            className="w-full min-h-[48px] rounded-xl bg-[#eff4ff] text-[#121c2a] font-semibold flex items-center justify-center gap-2 px-4 hover:bg-[#dee9fc] active:scale-98 transition-all border border-[#d9e3f6]"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-[#574238]">
              replay
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-headline-sm text-[14px]">↻ दोबारा स्कैन करें</span>
              <span className="font-label-sm text-[12px] text-[#574238]">(Rescan)</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
