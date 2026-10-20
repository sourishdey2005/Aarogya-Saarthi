import { useTranslate } from '../i18n/LanguageContext';
import React, { useState } from 'react';
import { Patient, Screen, Symptom } from '../types';
import { playSpokenText, stopSpokenText } from '../utils/speech';
import type { AuthWorker } from '../lib/api';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  onOpenHomeVisits: () => void;
  unsyncedCount: number;
  patients: Patient[];
  worker?: AuthWorker | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  isOnline,
  onToggleOnline,
  onOpenHomeVisits,
  unsyncedCount,
  patients,
  worker
}) => {
  const tr = useTranslate();
  const [isPlayingTip, setIsPlayingTip] = useState(false);

  // Compute task counts from patient data
  const pendingVisitsCount = patients.filter(
    (p) => p.triageLevel === 1 || p.triageLevel === 2
  ).length;
  const unsyncedPrescriptionsCount = patients.filter(
    (p) => !p.isSynced
  ).length;

  const handleToggleTipAudio = () => {
    if (isPlayingTip) {
      stopSpokenText();
      setIsPlayingTip(false);
    } else {
      const tipText =
        'दस्त होने पर तुरंत ओआरएस का घोल और जिंक की गोली शुरू करवाएं। इससे डिहाइड्रेशन का गंभीर खतरा टल जाता है। साफ़ उबले पानी में ओआरएस घोलें।';
      playSpokenText(
        tipText,
        () => setIsPlayingTip(true),
        () => setIsPlayingTip(false)
      );
    }
  };

  return tr(
    <div className="flex flex-col w-full gap-4 pb-28 screen-layout">
      {/* Offline/Online Persistent Reassurance Pill Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl shadow-sm border border-[#e6eeff]/60">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full animate-pulse ${
              unsyncedCount > 0 ? 'bg-[#e8762b]' : 'bg-[#3ba965]'
            }`}
          ></span>
          <div className="flex flex-col">
            <span className="font-headline-sm text-[14px] text-[#121c2a]">
              {unsyncedCount > 0
                ? `${unsyncedCount} रिकॉर्ड सिंक बाकी • स्थानीय सुरक्षित`
                : 'सिंक पूर्ण • सुरक्षित डेटा'}
            </span>
            <span className="font-label-sm text-[11px] text-[#574238] leading-none">
              {unsyncedCount > 0
                ? 'Queued in local storage • ready to push'
                : 'All records synced to PHC server'}
            </span>
          </div>
        </div>

        <button
          onClick={onToggleOnline}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            isOnline
              ? 'bg-[#dee9fc] text-[#00696b] hover:bg-[#d9e3f6]'
              : 'bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffdad6]/80'
          }`}
          title="टैप करके ऑनलाइन/ऑफलाइन बदलें"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isOnline ? 'wifi' : 'wifi_off'}
          </span>
          <span>{isOnline ? 'ऑनलाइन' : 'ऑफलाइन'}</span>
        </button>
      </div>

      {/* 1. Big Warm Welcome Card */}
      <div className="relative overflow-hidden bg-white rounded-xl p-4 shadow-sm border border-[#e6eeff]/60">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#ffdbca]/30 pointer-events-none blur-xl"></div>
        <div className="flex items-start justify-between relative z-10">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-headline-md text-[22px] text-[#121c2a] font-bold">
                नमस्ते {worker?.name || 'ASHA कार्यकर्ता'} जी
              </span>
              <span className="text-xl">🙏</span>
            </div>
            <span className="font-label-sm text-[13px] text-[#574238]">
              आज की तारीख: २४ अक्टूबर २०२४ • गुरुवार
            </span>
          </div>
          <div className="flex items-center gap-1 bg-[#ffdbca] text-[#331200] px-3 py-1.5 rounded-full shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-[#9c4500]">
              schedule
            </span>
            <span className="font-label-sm text-[13px] font-bold">
              ${unsyncedPrescriptionsCount} पर्चे सिंक होने बाकी
            </span>
          </div>
        </div>

        {/* Mini Progress / Daily Target Bar */}
        <div className="mt-4 pt-1 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[#574238]">
            <span className="font-label-sm text-[12px] font-medium">
              आज का लक्ष्य (Daily Goal)
            </span>
            <span className="font-label-sm text-[12px] font-semibold text-[#9c4500]">
              {pendingVisitsCount} में से ${Math.min(pendingVisitsCount + 2, 6)} पूर्ण
              (${pendingVisitsCount + 2}/6 Done)
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#dee9fc] rounded-full overflow-hidden">
            <div className="h-full bg-[#e8762b] rounded-full w-1/3 transition-all duration-500"></div>
          </div>
        </div>
      </div>

      {/* 2. Today's Tasks Strip */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#9c4500] text-[20px]">
              assignment_turned_in
            </span>
            <h2 className="font-headline-sm text-[18px] text-[#121c2a] font-bold">
              आज के मुख्य कार्य
            </h2>
            <span className="font-label-sm text-[13px] text-[#574238]">
              (Today's Tasks)
            </span>
          </div>
          <span className="bg-[#ffdad6] text-[#93000a] font-label-sm text-[12px] font-bold px-2 py-0.5 rounded-full">
            {pendingVisitsCount > 0 ? pendingVisitsCount : '०'} ज़रूरी
          </span>
        </div>

        {/* Task 1: Due Home Visits (Teal theme) */}
        <div className="relative flex items-center justify-between bg-white rounded-xl p-3.5 shadow-sm overflow-hidden min-h-[72px] border border-[#e6eeff]/60">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#00696b]"></div>
          <div className="flex items-center gap-3 pl-2 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#8ff3f4]/40 flex items-center justify-center flex-shrink-0 text-[#007072]">
              <span className="material-symbols-outlined text-[26px]">home_health</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-[15px] leading-tight text-[#121c2a] font-semibold truncate">
                {pendingVisitsCount} घरों में विज़िट बाकी
              </span>
              <span className="font-label-sm text-[12px] text-[#574238] truncate">
                वार्ड ४ • नियमित नवजात देखभाल
              </span>
            </div>
          </div>
          <button
            onClick={onOpenHomeVisits}
            className="flex-shrink-0 min-h-[48px] min-w-[72px] px-3 py-2 bg-[#00696b] text-white rounded-lg font-headline-sm text-[14px] flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-sm hover:bg-[#004f51]"
            type="button"
          >
            <span>देखें</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {/* Task 2: High-Risk Follow-up (Vermilion / Error theme) */}
        <div className="relative flex items-center justify-between bg-white rounded-xl p-3.5 shadow-sm overflow-hidden min-h-[72px] border border-[#e6eeff]/60">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#ba1a1a]"></div>
          <div className="flex items-center gap-3 pl-2 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#ffdad6] flex items-center justify-center flex-shrink-0 text-[#93000a]">
              <span
                className="material-symbols-outlined text-[26px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-[15px] leading-tight text-[#ba1a1a] font-bold truncate">
                  १ हाई-रिस्क गर्भवती
                </span>
                <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping"></span>
              </div>
              <span className="font-label-sm text-[12px] text-[#574238] truncate">
                कमला देवी • उच्च रक्तचाप फॉलो-अप
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('referral')}
            className="flex-shrink-0 min-h-[48px] min-w-[72px] px-3 py-2 bg-[#ba1a1a] text-white rounded-lg font-headline-sm text-[14px] flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-sm hover:bg-[#93000a]"
            type="button"
          >
            <span>जाएँ</span>
            <span className="material-symbols-outlined text-[16px]">emergency</span>
          </button>
        </div>

        {/* Task 3: Unsynced Prescriptions (Amber / Primary theme) */}
        <div className="relative flex items-center justify-between bg-white rounded-xl p-3.5 shadow-sm overflow-hidden min-h-[72px] border border-[#e6eeff]/60">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#e8762b]"></div>
          <div className="flex items-center gap-3 pl-2 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#ffdbca] flex items-center justify-center flex-shrink-0 text-[#773300]">
              <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-[15px] leading-tight text-[#121c2a] font-semibold truncate">
                {unsyncedPrescriptionsCount > 0 ? `${unsyncedPrescriptionsCount} पर्चे सिंक होने बाकी` : 'सभी पर्चे सिंक हैं'}
              </span>
              <span className="font-label-sm text-[12px] text-[#574238] truncate">
                स्थानीय डेटा • ऑफ़लाइन सहेजा गया
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('scan')}
            className="flex-shrink-0 min-h-[48px] min-w-[72px] px-3 py-2 bg-[#e8762b] text-white rounded-lg font-headline-sm text-[14px] flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-sm hover:bg-[#9c4500]"
            type="button"
          >
            <span>सिंक</span>
            <span className="material-symbols-outlined text-[16px]">sync</span>
          </button>
        </div>
      </div>

      {/* 3. PRIMARY HERO ACTION CARD (Massive Saffron Card #E8762B - Voice First) */}
      <div
        onClick={() => onNavigate('registration')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onNavigate('registration');
          }
        }}
        className="relative overflow-hidden bg-[#e8762b] text-white rounded-2xl p-4 shadow-md min-h-[170px] flex flex-col justify-between active:scale-[0.99] transition-transform cursor-pointer group hover:shadow-lg"
      >
        {/* Decorative ripple background circles */}
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 pointer-events-none"></div>
        <div className="absolute -right-2 -bottom-6 w-32 h-32 rounded-full bg-black/10 pointer-events-none"></div>

        <div className="flex items-center justify-between relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white">
            <span className="material-symbols-outlined text-[16px] animate-pulse">mic</span>
            <span className="font-label-sm text-[12px] font-bold tracking-wider uppercase">
              आवाज़ से काम करें • Voice First
            </span>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-white">record_voice_over</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 relative z-10">
          <div className="flex flex-col">
            <h3 className="font-headline-lg-mobile text-[24px] text-white leading-tight font-bold drop-shadow-sm">
              नया मरीज़ जोड़ें
            </h3>
            <p className="font-label-md text-[14px] text-white/90 font-medium mt-0.5">
              Add New Patient Registration
            </p>
            <div className="flex items-center gap-1 text-white/95 mt-2 bg-black/15 w-fit px-2.5 py-1 rounded-lg">
              <span className="text-sm">👉</span>
              <span className="font-headline-sm text-[13px] font-bold">
                बोलकर शुरू करें (Tap & Speak)
              </span>
            </div>
          </div>

          {/* Massive Mic Floating Button inside Hero Card */}
          <div className="w-16 h-16 rounded-full bg-white text-[#e8762b] flex items-center justify-center shadow-lg flex-shrink-0 animate-bounce group-hover:scale-105 transition-transform">
            <span
              className="material-symbols-outlined text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mic
            </span>
          </div>
        </div>
      </div>

      {/* 4. Quick Action Row (2 balanced cards side-by-side) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Quick Action Left: Scan Prescription */}
        <button
          onClick={() => onNavigate('scan')}
          className="min-h-[110px] bg-white rounded-xl p-4 shadow-sm flex flex-col justify-between text-left active:scale-95 transition-all group border border-[#e6eeff]/60 hover:border-[#8ff3f4]"
          type="button"
        >
          <div className="w-12 h-12 rounded-xl bg-[#8ff3f4] flex items-center justify-center text-[#004f51] shadow-sm">
            <span className="material-symbols-outlined text-[28px]">document_scanner</span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="font-headline-sm text-[15px] text-[#121c2a] font-bold leading-snug group-hover:text-[#00696b]">
              पर्चा स्कैन करें
            </span>
            <span className="font-label-sm text-[12px] text-[#574238]">
              Scan Prescription
            </span>
          </div>
        </button>

        {/* Quick Action Right: View Patients Directory */}
        <button
          onClick={() => onNavigate('patients')}
          className="min-h-[110px] bg-white rounded-xl p-4 shadow-sm flex flex-col justify-between text-left active:scale-95 transition-all group border border-[#e6eeff]/60 hover:border-[#8df9ac]"
          type="button"
        >
          <div className="w-12 h-12 rounded-xl bg-[#8df9ac] flex items-center justify-center text-[#005229] shadow-sm">
            <span className="material-symbols-outlined text-[28px]">groups</span>
          </div>
          <div className="flex flex-col mt-2">
            <span className="font-headline-sm text-[15px] text-[#121c2a] font-bold leading-snug group-hover:text-[#006d38]">
              मरीज़ देखें
            </span>
            <span className="font-label-sm text-[12px] text-[#574238]">
              View Patient List
            </span>
          </div>
        </button>
      </div>

      {/* 5. AI Health Tip of the Day card (Audio Visual Learning Card) */}
      <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-2 relative overflow-hidden border border-[#e6eeff]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-[#8ff3f4] flex items-center justify-center text-[#007072]">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </div>
            <span className="font-headline-sm text-[15px] font-bold text-[#121c2a]">
              AI सलाह: आज की स्वास्थ्य सीख
            </span>
          </div>
          <button
            onClick={handleToggleTipAudio}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-label-sm text-[12px] font-semibold active:scale-95 transition-all shadow-sm ${
              isPlayingTip
                ? 'bg-[#00696b] text-white animate-pulse'
                : 'bg-[#eff4ff] text-[#121c2a] hover:bg-[#dee9fc]'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-[#00696b]">
              {isPlayingTip ? 'graphic_eq' : 'volume_up'}
            </span>
            <span>{isPlayingTip ? 'सुन रहे हैं...' : 'सुनें (Play)'}</span>
          </button>
        </div>

        {/* Cultural / Educational illustrative block with hotlinked image */}
        <div className="flex gap-3 items-start mt-1 bg-[#eff4ff] p-3 rounded-lg border border-[#d9e3f6]/40">
          <img
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 shadow-sm"
            alt="An Indian female village healthcare worker counseling a rural mother gently in a bright courtyard, showing an ORS sachet and clean water cup"
            referrerPolicy="no-referrer"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtAZBopfnnWB_VThtP1TK4rkSe2_dcCew0vQPRtHsZQmRhBfm4ThjJyZRCRxWDHOTT6I0ZgI3F6AYkoyzYQgk5TLRSz23-c-3POwMKCKUL5evKjxIEwcheQHvnJwkjlxV9lMlnzEzfONCrVdCeZpfX6lxRch9NlRkfRTMYTyDFkQL8PEEZhd-S1cKmEFoj-04YVMo0uYQeMQPQgtrUESMkCdiyVmu4FV_XMRuDzVosUW2A1ckx8oncUw"
          />
          <div className="flex flex-col min-w-0">
            <p className="font-body-md text-[13.5px] text-[#121c2a] leading-snug font-medium">
              दस्त होने पर तुरंत <span className="font-bold text-[#00696b]">ORS का घोल</span> और{' '}
              <span className="font-bold text-[#9c4500]">जिंक की गोली</span> शुरू करवाएं।
            </p>
            <span className="font-label-sm text-[11px] text-[#574238] mt-1">
              इससे डिहाइड्रेशन का गंभीर खतरा टल जाता है।
            </span>
          </div>
        </div>
      </div>

      {/* Micro-Floating Action Audio Trigger helper for instant voice note */}
      <div className="pt-1 pb-2 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#574238] font-label-sm text-[12.5px] bg-[#eff4ff] px-3 py-1.5 rounded-full border border-[#d9e3f6]">
          <span className="material-symbols-outlined text-[17px] text-[#9c4500]">hearing</span>
          <span>सुझाव: 'नया मरीज़' बोलने पर सीधे फॉर्म खुलता है</span>
        </div>
      </div>
    </div>
  );
};
