import React, { useState, useRef } from 'react';
import { PrescriptionScan } from '../types';
import { playSpokenText } from '../utils/speech';

interface ScanScreenProps {
  onBack: () => void;
  onSavePrescription: (scan: PrescriptionScan) => void;
  showToast: (msg: string) => void;
}

export const ScanScreen: React.FC<ScanScreenProps> = ({
  onBack,
  onSavePrescription,
  showToast
}) => {
  const [flashMode, setFlashMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeSpeakingMedId, setActiveSpeakingMedId] = useState<string | null>(null);
  const [isAudioGuideActive, setIsAudioGuideActive] = useState(false);
  const [scanConfidence, setScanConfidence] = useState(94);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [medicines, setMedicines] = useState([
    {
      id: 'm-1',
      name: 'Paracetamol 500mg',
      dosageHi: 'दिन में 3 बार (3 times a day) • 3 दिन',
      spokenHi: 'पैरासिटामोल पांच सौ मिलीग्राम, दिन में तीन बार, तीन दिन तक खाना खाने के बाद लें।'
    },
    {
      id: 'm-2',
      name: 'Cetirizine 10mg',
      dosageHi: 'रात में 1 बार (Once at night)',
      spokenHi: 'सिट्रीजीन दस मिलीग्राम, रात में एक बार सोने से पहले लें।'
    },
    {
      id: 'm-3',
      name: 'ORS घोल',
      dosageHi: 'पानी के साथ (Mix in 1L water)',
      spokenHi: 'ओआरएस घोल, एक लीटर साफ उबले हुए ठंडे पानी में पूरा पैकेट मिलाकर थोड़ा-थोड़ा पिएं।'
    }
  ]);

  const handleToggleFlash = () => {
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
    setIsCapturing(true);
    showToast('पर्चा स्कैन हो रहा है...');

    setTimeout(() => {
      setIsCapturing(false);
      setScanConfidence(96);
      showToast('पर्चे से ३ दवाइयां सफलतापूर्वक पहचानी गईं ✓');
      drawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 600);
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
      const url = URL.createObjectURL(file);
      setCustomImage(url);
      handleCapture();
    }
  };

  const handleSave = () => {
    const newScan: PrescriptionScan = {
      id: `rx-${Date.now()}`,
      patientName: 'कमला देवी (Kamla Devi)',
      patientAge: 48,
      opdNumber: 'OPD #4092',
      phcName: 'PHC रामपुर (Rampur)',
      confidence: scanConfidence,
      scannedAt: 'आज, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSynced: false,
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
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-28">
      {/* Internal Navigation Header Bar */}
      <div className="flex items-center justify-between bg-[#eff4ff] px-4 py-2.5 rounded-xl shadow-sm border border-[#d9e3f6]">
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
          <span className="font-label-sm text-[12px] font-bold text-[#006d38]">ऑफ़लाइन OCR</span>
        </div>
      </div>

      {/* Camera Viewfinder Section (~360px height) */}
      <div
        className={`relative w-full h-[360px] bg-[#27313f] rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between p-4 transition-all ${
          flashMode === 'on' ? 'ring-4 ring-amber-300' : ''
        }`}
      >
        {/* Camera Mock Background / Simulated Prescription Sheet */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{
            backgroundImage: `url('${
              customImage ||
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDbOawMHsUSZEEQtoiRa363H1t-x_XmQvCjyS0Vfdv20RtQvWEi7-wOze5XjH22W9iBiVzGL84DIJ7DQZsVqIU2O6DX6GYo5fvmc29cGkvaBQajCd2FXne-ZvEXAswuquyUfCNbpUllJ0SqTxS7EmCa6rC3BRKNTVoukJwCTxvW8lhih69PmUb1_5pokMhCb7_f4jYKfULzkcxrLiK3NCfzM10ZFr9aB0IcWZRUHPKaXN1bs-mgB1EKHw'
            }')`
          }}
        ></div>

        {/* Shutter flash effect */}
        {isCapturing && (
          <div className="absolute inset-0 bg-white z-30 opacity-80 animate-ping"></div>
        )}

        {/* Glowing Scan Line Laser Overlay */}
        <div className="absolute inset-x-4 h-1 bg-gradient-to-r from-transparent via-[#e8762b] to-transparent shadow-[0_0_12px_#e8762b] animate-bounce pointer-events-none top-1/3 z-20"></div>

        {/* Top Guide Floating Pill */}
        <div className="relative z-10 flex justify-center w-full">
          <div className="bg-[#27313f]/85 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm text-white border border-white/10">
            <span className="material-symbols-outlined text-[#ffdbca] text-[18px]">
              center_focus_strong
            </span>
            <div className="flex flex-col text-center">
              <span className="font-headline-sm text-[13px] leading-tight font-semibold text-white">
                पर्चे को फ्रेम में रखें
              </span>
              <span className="font-label-sm text-[10px] text-[#d0dbed]">
                Keep slip inside frame
              </span>
            </div>
          </div>
        </div>

        {/* Viewfinder Reticle Framing Box */}
        <div className="relative z-10 mx-auto w-11/12 h-56 flex flex-col justify-between pointer-events-none">
          {/* Corners Top */}
          <div className="flex justify-between w-full">
            <div className="w-7 h-7 border-t-4 border-l-4 border-[#e8762b] rounded-tl-lg"></div>
            <div className="w-7 h-7 border-t-4 border-r-4 border-[#e8762b] rounded-tr-lg"></div>
          </div>

          {/* Live Simulated Prescription Slip Preview inside Target Frame */}
          <div className="bg-white/95 backdrop-blur-sm mx-2 p-3 rounded-xl shadow-md text-[#121c2a] flex flex-col gap-1 pointer-events-auto border border-black/5">
            <div className="flex items-center justify-between pb-1 border-b border-[#e6eeff]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#9c4500] text-[18px]">
                  local_hospital
                </span>
                <span className="font-headline-sm text-[12px] font-bold text-[#9c4500]">
                  PHC रामपुर (Rampur)
                </span>
              </div>
              <span className="font-label-sm text-[11px] font-semibold bg-[#dee9fc] px-2 py-0.5 rounded text-[#574238]">
                OPD #4092
              </span>
            </div>
            <div className="flex justify-between items-center text-[12px] text-[#574238] font-medium pt-0.5">
              <span>
                मरीज: <b className="text-[#121c2a]">कमला देवी (Kamla Devi)</b>
              </span>
              <span>उम्र: 48 वर्ष</span>
            </div>
            <div className="mt-1 bg-[#eff4ff] p-2 rounded-lg text-[11px] font-mono text-[#121c2a] flex flex-col gap-0.5 border border-[#d9e3f6]">
              <span className="font-bold text-[#e8762b] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">prescriptions</span>
                Rx (नुस्खा):
              </span>
              <span>• Tab Paracetamol 500mg TDS x 3d</span>
              <span>• Tab Cetirizine 10mg HS</span>
              <span>• ORS घोल (Oral Rehydration Salts)</span>
            </div>
          </div>

          {/* Corners Bottom */}
          <div className="flex justify-between w-full">
            <div className="w-7 h-7 border-b-4 border-l-4 border-[#e8762b] rounded-bl-lg"></div>
            <div className="w-7 h-7 border-b-4 border-r-4 border-[#e8762b] rounded-tr-lg"></div>
          </div>
        </div>

        {/* Bottom Viewfinder Status Row */}
        <div className="relative z-10 flex items-center justify-between px-2">
          <div className="flex items-center gap-1.5 bg-[#27313f]/80 px-3 py-1 rounded-full text-white">
            <span className="w-2 h-2 rounded-full bg-[#3ba965] animate-ping"></span>
            <span className="font-label-sm text-[11.5px] text-[#8df9ac]">
              ऑटो फोकस सक्रिय (Auto-focus)
            </span>
          </div>
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
            className="relative w-[84px] h-[84px] rounded-full bg-white p-1.5 shadow-[0_4px_16px_rgba(232,118,43,0.35)] active:scale-90 transition-transform"
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
        className="flex flex-col bg-white rounded-2xl p-4 shadow-md gap-3 border border-[#e6eeff]/60"
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
              {scanConfidence}% भरोसा
            </span>
          </div>
        </div>

        {/* Parsed Medicine Rows with Audio Cue and Clear Visual Tags */}
        <div className="flex flex-col gap-2">
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
            className="w-full min-h-[56px] rounded-xl bg-[#006d38] text-white font-bold flex items-center justify-center gap-2 px-4 shadow-md hover:bg-[#005229] active:scale-98 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">task_alt</span>
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
            onClick={handleCapture}
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
