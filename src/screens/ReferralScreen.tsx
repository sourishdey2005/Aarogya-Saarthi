import { useTranslate } from '../i18n/LanguageContext';
import React, { useState } from 'react';
import { Patient } from '../types';
import { playSpokenText, stopSpokenText } from '../utils/speech';

interface ReferralScreenProps {
  patient: Patient;
  onBack: () => void;
  onOpenWhatsAppModal: () => void;
  onOpenNoteModal: () => void;
  onSyncPatient: (id: string) => void;
  showToast: (msg: string) => void;
}

export const ReferralScreen: React.FC<ReferralScreenProps> = ({
  patient,
  onBack,
  onOpenWhatsAppModal,
  onOpenNoteModal,
  onSyncPatient,
  showToast
}) => {
  const tr = useTranslate();
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(patient.triageLevel || 2);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isRationaleOpen, setIsRationaleOpen] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const spokenAdviceText =
    selectedTier === 1
      ? 'कमला देवी जी, आपका बुखार सामान्य वायरल लगता है। घर पर खूब पानी और ओआरएस पिएं, आराम करें और पेरासिटामोल लें।'
      : selectedTier === 2
      ? 'कमला देवी जी, 3 दिन से 102 डिग्री बुखार और शरीर पर लाल दाने होने के कारण आज ही रामपुर प्राथमिक स्वास्थ्य केंद्र जाकर डॉ. राजेश से खून की जांच करवाएं।'
      : 'कमला देवी जी, यह गंभीर आपातकालीन स्थिति है। तत्काल 108 एम्बुलेंस बुलाकर जिला अस्पताल के इमरजेंसी वार्ड में जाएं।';

  const handleToggleAudio = () => {
    if (isAudioPlaying) {
      stopSpokenText();
      setIsAudioPlaying(false);
      showToast('ऑडियो रोक दिया गया');
    } else {
      playSpokenText(
        spokenAdviceText,
        () => setIsAudioPlaying(true),
        () => setIsAudioPlaying(false)
      );
      showToast('ऑडियो चल रहा है: "कमला देवी जी को PHC ले जाएं..."');
    }
  };

  const handleTriggerSync = () => {
    setIsSyncing(true);
    showToast('डैशबोर्ड पर सिंक शुरू हो रहा है...');
    setTimeout(() => {
      setIsSyncing(false);
      onSyncPatient(patient.id);
      showToast('NGO एवं स्वास्थ्य पोर्टल पर डेटा सिंक पूर्ण! ✓');
    }, 1200);
  };

  return tr(
    <div className="flex flex-col w-full pb-10 screen-layout">
      {/* Offline Sync Confirmation Sticky Sub-bar */}
      <div className="lg-span-2 w-full bg-[#8ff3f4]/30 px-4 py-2 rounded-xl flex items-center justify-between mb-3 shadow-sm border border-[#8ff3f4]/40">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3ba965] animate-pulse"></span>
          <span className="font-label-sm text-[12px] text-[#004f51] font-semibold">
            स्थानीय मेमोरी में सुरक्षित • Local Safe
          </span>
        </div>
        <span className="font-label-sm text-[12px] text-[#574238] font-medium">10:15 AM</span>
      </div>

      {/* 1. Patient Quick Summary Header */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4 border border-[#e6eeff]/60">
        <div className="flex items-start gap-3">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-inner bg-[#dee9fc]">
            <img
              className="w-full h-full object-cover"
              alt="Close-up portrait of Kamla Devi, a 42-year-old Indian rural woman wrapped in a warm saree"
              referrerPolicy="no-referrer"
              src={
                patient.photoUrl ||
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDnxJqC0Pa6-pUCGC68IZUtA5T_Fa-BRxOlVdA93uTJars9feBKeZCYx1KgINB7iAxJO0gJMh236vfEjbkPo7KzHzW4dEeWlb54Bn6FOGEv2dvhJCb8LB4-Kq_83ZbWJoaD7BjMi71kbspFMZ0ZiO9G31WSXEPzgd7eVLrxT5123m_DlxPqHQLaPcL2WfCkqq24Ii1jWkoTSFkXpYIvKKeqbCKswo7fj_tQjzARu6hWoDIPKMqEJXfJHA'
              }
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h2 className="font-headline-sm text-[17px] text-[#121c2a] font-bold truncate">
                {patient.nameHi}
              </h2>
              <span className="font-label-sm text-[11px] text-[#006d38] font-bold bg-[#8df9ac]/40 px-2 py-0.5 rounded-full border border-[#8df9ac]/60">
                {patient.rchId}
              </span>
            </div>
            <p className="font-label-md text-[13px] text-[#574238]">
              {patient.nameEn} • {patient.age} वर्ष, {patient.gender === 'female' ? 'महिला' : 'पुरुष'}
            </p>
            <p className="font-label-sm text-[11.5px] text-[#8a7266] mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">schedule</span>
              {patient.lastVisit}
            </p>
          </div>
        </div>

        {/* Symptoms Chips */}
        <div className="mt-3 pt-1 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ffdad6] text-[#93000a] font-label-sm text-[12px] font-semibold">
            <span className="material-symbols-outlined text-[16px]">device_thermostat</span>
            बुखार (102°F)
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#e6eeff] text-[#121c2a] font-label-sm text-[12px]">
            <span className="material-symbols-outlined text-[16px]">air</span>
            खांसी (Cough)
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ffdbca] text-[#773300] font-label-sm text-[12px] font-semibold">
            <span className="material-symbols-outlined text-[16px]">grain</span>
            लाल दाने (Skin Rash)
          </span>
        </div>
      </section>

      {/* Safety Tiers Segmented Visual Switcher */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="font-label-sm text-[11.5px] text-[#574238] uppercase tracking-wider font-semibold">
            ट्राइएज सुरक्षा स्तर (SAFETY LEVEL)
          </span>
          <span
            className={`font-label-sm text-[12px] font-bold ${
              selectedTier === 1
                ? 'text-[#006d38]'
                : selectedTier === 2
                ? 'text-[#9c4500]'
                : 'text-[#ba1a1a]'
            }`}
          >
            स्तर {selectedTier} सक्रिय
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#e6eeff] rounded-xl border border-[#d9e3f6]">
          {/* Tier 1: Green */}
          <button
            type="button"
            onClick={() => {
              setSelectedTier(1);
              showToast('स्तर 1: सामान्य गृह देखभाल दिशानिर्देश');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all ${
              selectedTier === 1
                ? 'bg-white text-[#006d38] shadow-sm font-bold'
                : 'bg-transparent text-[#574238] hover:bg-white/50'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#006d38] mb-1"></div>
            <span className="font-label-sm text-[12px] leading-tight">स्तर 1: सामान्य</span>
            <span className="font-label-sm text-[10px] opacity-80 leading-tight truncate w-full">
              Home Care
            </span>
          </button>

          {/* Tier 2: Amber (Default) */}
          <button
            type="button"
            onClick={() => {
              setSelectedTier(2);
              showToast('स्तर 2: प्राथमिक स्वास्थ्य केंद्र रेफरल सक्रिय');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all ${
              selectedTier === 2
                ? 'bg-white text-[#9c4500] shadow-sm font-bold'
                : 'bg-transparent text-[#574238] hover:bg-white/50'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#e8762b] mb-1"></div>
            <span className="font-label-sm text-[12px] leading-tight">स्तर 2: रेफरल</span>
            <span className="font-label-sm text-[10px] opacity-80 leading-tight truncate w-full">
              Visit PHC 24h
            </span>
          </button>

          {/* Tier 3: Red */}
          <button
            type="button"
            onClick={() => {
              setSelectedTier(3);
              showToast('स्तर 3: 108 एम्बुलेंस आपातकालीन कॉल मोड');
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all ${
              selectedTier === 3
                ? 'bg-white text-[#ba1a1a] shadow-sm font-bold'
                : 'bg-transparent text-[#574238] hover:bg-white/50'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#ba1a1a] mb-1"></div>
            <span className="font-label-sm text-[12px] leading-tight">स्तर 3: आपात</span>
            <span className="font-label-sm text-[10px] opacity-80 leading-tight truncate w-full">
              Urgent 108
            </span>
          </button>
        </div>
      </div>

      {/* 2. TRIAGE RECOMMENDATION CARD (Primary Focus) */}
      <section className="bg-white rounded-xl shadow-md p-4 mb-4 relative overflow-hidden border border-[#e6eeff]/60">
        {/* Accent Ribbon */}
        <div
          className={`absolute top-0 left-0 bottom-0 w-2.5 ${
            selectedTier === 1
              ? 'bg-[#006d38]'
              : selectedTier === 2
              ? 'bg-[#e8762b]'
              : 'bg-[#ba1a1a]'
          }`}
        ></div>

        <div className="pl-2">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-1 ${
              selectedTier === 1
                ? 'bg-[#8df9ac]/40 text-[#003619]'
                : selectedTier === 2
                ? 'bg-[#ffdbca] text-[#773300]'
                : 'bg-[#ffdad6] text-[#93000a]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {selectedTier === 3 ? 'emergency' : 'warning'}
            </span>
            <span className="font-label-sm text-[12px] font-bold">
              {selectedTier === 1
                ? 'स्तर 1: सामान्य गृह देखभाल'
                : selectedTier === 2
                ? 'स्तर 2: प्राथमिक स्वास्थ्य केंद्र (PHC) रेफरल'
                : 'स्तर 3: तत्काल 108 एम्बुलेंस आपातकाल'}
            </span>
          </div>

          {/* Recommendation Headline */}
          <h3 className="font-headline-md text-[20px] text-[#121c2a] mt-1 font-bold leading-snug">
            {patient.triageAdvice?.headline_hi ??

              (selectedTier === 1

                ? 'घर पर आराम एवं तरल पदार्थ दें'

                : selectedTier === 2

                ? '24 घंटे के अंदर PHC ले जाएँ'

                : 'तत्काल 108 एम्बुलेंस बुलाएं')}
          </h3>
          <p
            className={`font-label-md text-[13px] font-semibold mb-3 ${
              selectedTier === 1
                ? 'text-[#006d38]'
                : selectedTier === 2
                ? 'text-[#9c4500]'
                : 'text-[#ba1a1a]'
            }`}
          >
            {patient.triageAdvice?.headline_en ??

              (selectedTier === 1

                ? 'Hydration and Home Recovery within 48 Hours'

                : selectedTier === 2

                ? 'Visit Community Health Centre within 24 Hours'

                : 'Immediate Critical Ambulance Referral')}
          </p>

          {/* Audio Guidance Pill */}
          <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center justify-between mb-4 shadow-inner border border-[#d9e3f6]/40">
            <div className="flex items-center gap-2.5">
              <button
                aria-label="Play spoken advice"
                onClick={handleToggleAudio}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all ${
                  isAudioPlaying
                    ? 'bg-[#00696b] text-white animate-pulse'
                    : 'bg-[#e8762b] text-white'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[26px]">
                  {isAudioPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <div>
                <p className="font-label-md text-[13px] font-bold text-[#121c2a]">
                  मरीज़ को आवाज़ में सुनाएं
                </p>
                <p className="font-label-sm text-[11px] text-[#574238]">
                  स्थानीय बोली (Hindi / Magahi Audio)
                </p>
              </div>
            </div>
            <span className="font-label-sm text-[11px] text-[#8a7266] px-2 py-1 bg-white rounded-lg border border-[#d9e3f6]">
              {isAudioPlaying ? 'चल रहा है' : '0:38'}
            </span>
          </div>

          {/* Core Advice Paragraph */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#9c4500] text-[20px] shrink-0 mt-0.5">
                stethoscope
              </span>
              <p className="font-body-md text-[14px] text-[#121c2a] leading-relaxed font-medium">
                {selectedTier === 1
                  ? 'मरीज़ को दिन में 3-4 बार ओआरएस घोल पिलाएं, सादा सुपाच्य भोजन दें और पर्याप्त नींद लें।'
                  : selectedTier === 2
                  ? 'तेज़ बुखार के साथ त्वचा पर दाने संक्रामक रोग का संकेत हो सकते हैं। आज ही नजदीकी सरकारी डॉक्टर से जांच करवाएं।'
                  : 'साँस लेने में गंभीर रुकावट या दौरे पड़ने का खतरा है। मरीज़ को सीधा लिटाएं और बिना देर किए अस्पताल पहुंचाएं।'}
              </p>
            </div>
            <p className="font-label-sm text-[11.5px] text-[#574238] pl-7">
              {selectedTier === 2
                ? 'High fever coupled with persistent body rash requires mandatory clinical evaluation and blood smear.'
                : 'Follow IMCI protocol and monitor temperature every 4 hours.'}
            </p>
          </div>

          {/* Designated Facility Block */}
          <div className="bg-[#eff4ff] rounded-xl p-3 flex items-center justify-between gap-2 border border-[#d9e3f6]/40">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#00696b] shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">local_hospital</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-label-md text-[13px] font-bold text-[#121c2a] truncate">
                    रामपुर PHC (Rampur)
                  </p>
                  <span className="px-1.5 py-0.2 rounded bg-[#8df9ac] text-[#003619] font-label-sm text-[10px] font-bold">
                    खुला है
                  </span>
                </div>
                <p className="font-label-sm text-[11px] text-[#574238] truncate">
                  3.5 किमी दूर • MOIC डॉ. राजेश उपस्थित
                </p>
              </div>
            </div>
            <a
              aria-label="Call Hospital"
              href="tel:108"
              className="h-10 px-3 bg-[#00696b] text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm font-label-sm text-[12px] font-semibold active:scale-95 transition-transform hover:bg-[#004f51]"
            >
              <span className="material-symbols-outlined text-[17px] mr-1">call</span>
              कॉल
            </a>
          </div>
        </div>
      </section>

      {/* Emergency 108 Fast Call Bar */}
      <div className="bg-[#ffdad6] text-[#93000a] rounded-xl p-3 flex items-center justify-between mb-4 shadow-sm border border-[#ffdad6]">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center animate-pulse shadow-sm">
            <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
          </div>
          <div>
            <h4 className="font-label-md text-[13px] font-bold text-[#93000a] leading-tight">
              साँस फूलने पर तत्काल 108 डायल करें
            </h4>
            <p className="font-label-sm text-[11px] text-[#ba1a1a] font-medium">
              Emergency Ambulance Referral Available
            </p>
          </div>
        </div>
        <a
          className="h-11 px-3.5 rounded-xl bg-[#ba1a1a] text-white font-label-md text-[13px] font-bold flex items-center gap-1 shadow active:scale-95 transition-transform hover:bg-[#93000a]"
          href="tel:108"
        >
          <span className="material-symbols-outlined text-[18px]">call</span>
          <span>108</span>
        </a>
      </div>

      {/* 3. Clinical Rationale Accordion */}
      <div className="bg-white rounded-xl shadow-sm mb-4 overflow-hidden border border-[#e6eeff]/60">
        <button
          className="w-full p-4 flex items-center justify-between text-left focus:outline-none hover:bg-[#eff4ff]/40 transition-colors"
          onClick={() => setIsRationaleOpen(!isRationaleOpen)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#9c4500]">
              <span className="material-symbols-outlined text-[20px]">psychology_alt</span>
            </div>
            <div>
              <h4 className="font-headline-sm text-[15px] text-[#121c2a] font-bold">
                यह सलाह क्यों दी गई?
              </h4>
              <p className="font-label-sm text-[11.5px] text-[#574238]">
                Why this clinical recommendation?
              </p>
            </div>
          </div>
          <span
            className={`material-symbols-outlined text-[#8a7266] transition-transform duration-200 ${
              isRationaleOpen ? 'rotate-180' : ''
            }`}
          >
            expand_more
          </span>
        </button>

        {isRationaleOpen && (
          <div className="px-4 pb-4 space-y-2.5 pt-1 border-t border-[#e6eeff]">
            {/* Point 1 */}
            <div className="p-3 rounded-xl bg-[#eff4ff] flex items-start gap-2.5 border border-[#d9e3f6]/40">
              <span className="material-symbols-outlined text-[#00696b] text-[20px] mt-0.5 shrink-0">
                verified
              </span>
              <div>
                <p className="font-label-md text-[13px] text-[#121c2a] font-semibold">
                  WHO IMCI नैदानिक दिशानिर्देश
                </p>
                <p className="font-body-md text-[12.5px] text-[#574238] mt-0.5">
                  वयस्क में 102°F से अधिक बुखार और एक साथ दाने (Rash) निकलने पर अनिवार्य रूप से सीबीसी
                  (CBC) और मलेरिया/डेंगू किट जांच की आवश्यकता होती है।
                </p>
              </div>
            </div>
            {/* Point 2 */}
            <div className="p-3 rounded-xl bg-[#eff4ff] flex items-start gap-2.5 border border-[#d9e3f6]/40">
              <span className="material-symbols-outlined text-[#9c4500] text-[20px] mt-0.5 shrink-0">
                clinical_notes
              </span>
              <div>
                <p className="font-label-md text-[13px] text-[#121c2a] font-semibold">
                  संभावित जोखिम विश्लेषण (Potential Risks)
                </p>
                <p className="font-body-md text-[12.5px] text-[#574238] mt-0.5">
                  डेंगू (Dengue), खसरा (Measles) अथवा तीव्र वायरल संक्रमण की संभावना। निर्जलीकरण
                  (Dehydration) की निगरानी रखें।
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Educational Visual Card for Family */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4 border border-[#e6eeff]/60">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-headline-sm text-[15px] text-[#121c2a] font-bold">
            मरीज़ के परिजन को क्या बताएं?
          </h4>
          <span className="font-label-sm text-[11.5px] text-[#006d38] font-bold bg-[#8df9ac]/30 px-2 py-0.5 rounded">
            ASHA गाइडेंस
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="p-3 bg-[#eff4ff] rounded-xl flex flex-col items-center text-center border border-[#d9e3f6]/40">
            <div className="w-12 h-12 rounded-full bg-[#8ff3f4] text-[#007072] flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-[24px]">water_drop</span>
            </div>
            <p className="font-label-md text-[13px] font-bold text-[#121c2a]">ORS घोल दें</p>
            <p className="font-label-sm text-[11px] text-[#574238]">Give frequent fluids</p>
          </div>
          <div className="p-3 bg-[#eff4ff] rounded-xl flex flex-col items-center text-center border border-[#d9e3f6]/40">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#93000a] flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-[24px]">block</span>
            </div>
            <p className="font-label-md text-[13px] font-bold text-[#121c2a]">बिना पर्ची दवा न दें</p>
            <p className="font-label-sm text-[11px] text-[#574238]">No unprescribed pills</p>
          </div>
        </div>
      </section>

      {/* 4. Action Buttons Row */}
      <section className="flex flex-col gap-2 mb-4">
        {/* Primary WhatsApp Share Button (56px touch target mandate) */}
        <button
          onClick={onOpenWhatsAppModal}
          className="w-full min-h-[56px] rounded-xl bg-[#006d38] text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform hover:bg-[#005229]"
          type="button"
        >
          <span className="material-symbols-outlined text-[26px]">chat</span>
          <div className="text-left flex flex-col leading-tight">
            <span className="font-label-lg text-[15px] font-bold">
              मरीज़ को पर्ची भेजें (WhatsApp)
            </span>
            <span className="font-label-sm text-[11px] opacity-90">
              Send Digital Referral Slip
            </span>
          </div>
        </button>

        {/* Secondary and Sync Action Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Note Button */}
          <button
            onClick={onOpenNoteModal}
            className="min-h-[56px] rounded-xl bg-white text-[#00696b] shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all p-2 border border-[#e6eeff]/60 hover:bg-[#eff4ff]"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">note_add</span>
            <div className="text-left flex flex-col leading-tight">
              <span className="font-label-md text-[13px] font-bold text-[#121c2a]">नोट जोड़ें</span>
              <span className="font-label-sm text-[11px] text-[#574238]">Add ASHA Note</span>
            </div>
          </button>

          {/* Sync to NGO Button */}
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="min-h-[56px] rounded-xl bg-white text-[#9c4500] shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all p-2 border border-[#e6eeff]/60 hover:bg-[#eff4ff]"
            type="button"
          >
            <span
              className={`material-symbols-outlined text-[22px] ${
                isSyncing ? 'animate-spin text-[#e8762b]' : ''
              }`}
            >
              cloud_sync
            </span>
            <div className="text-left flex flex-col leading-tight">
              <span className="font-label-md text-[13px] font-bold text-[#121c2a]">
                {isSyncing ? 'सिंक जारी...' : 'डैशबोर्ड सिंक'}
              </span>
              <span className="font-label-sm text-[11px] text-[#574238]">Push to Portal</span>
            </div>
          </button>
        </div>
      </section>

      {/* 5. MANDATORY STATUTORY SAFETY FOOTER */}
      <footer className="lg-span-2 rounded-xl bg-[#dee9fc] p-4 mb-2 shadow-inner border border-[#d9e3f6]">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[20px]">emergency_home</span>
          </div>
          <div>
            <h5 className="font-label-md text-[13px] font-bold text-[#121c2a] flex items-center gap-1">
              वैधानिक अस्वीकरण • Statutory Notice
            </h5>
            <p className="font-body-md text-[12px] text-[#121c2a] leading-snug mt-1">
              ⚠️ यह एआई सलाह किसी प्रमाणित डॉक्टर की जगह नहीं लेती। यह केवल प्राथमिक ट्राइएज एवं सहायता
              हेतु है। मरीज़ की हालत बिगड़ने पर तुरंत 108 बुलाएं अथवा नजदीकी अस्पताल ले जाएं।
            </p>
            <p className="font-label-sm text-[10.5px] text-[#574238] mt-1">
              This AI-assisted triage does not constitute medical diagnosis. Always consult
              certified healthcare personnel for definitive clinical diagnosis and treatment.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
