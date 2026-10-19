import React, { useState, useEffect } from 'react';
import { Patient, Symptom } from '../types';
import { playSpokenText } from '../utils/speech';

interface RegistrationScreenProps {
  onSavePatientAndContinue: (patient: Partial<Patient>) => void;
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({
  onSavePatientAndContinue,
  onBack,
  showToast
}) => {
  const [name, setName] = useState('कमला देवी (Kamla Devi)');
  const [age, setAge] = useState('42 वर्ष (Years)');
  const [gender, setGender] = useState<'female' | 'male' | 'other'>('female');
  const [isRecording, setIsRecording] = useState(true);
  const [isManualType, setIsManualType] = useState(false);
  const [transcribedText, setTranscribedText] = useState(
    '“कमला देवी को 3 दिन से तेज़ बुखार है, सूखी खांसी है और शरीर पर लाल दाने निकल रहे हैं...”'
  );
  const [detectedSymptoms, setDetectedSymptoms] = useState<Symptom[]>([
    { id: 'sym-1', nameHi: 'तेज़ बुखार', nameEn: 'High Fever (3 days)', severity: 'high' },
    { id: 'sym-2', nameHi: 'सूखी खांसी', nameEn: 'Dry Cough', severity: 'moderate' },
    { id: 'sym-3', nameHi: 'लाल दाने', nameEn: 'Skin Rash', severity: 'high' }
  ]);
  const [showAddSymptom, setShowAddSymptom] = useState(false);

  // Auto-simulate speech recognition waveform or start Web Speech Recognition if available
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && isRecording) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          if (transcript) {
            setTranscribedText(`“${transcript}”`);
          }
        };
        recognition.start();
        return () => {
          recognition.stop();
        };
      } catch {
        // Fall back gracefully
      }
    }
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      showToast('आवाज़ रिकॉर्डिंग रोक दी गई');
    } else {
      setIsRecording(true);
      showToast('बोलिए... आवाज़ रिकॉर्ड की जा रही है');
    }
  };

  const handleSpeakName = () => {
    playSpokenText('कमला देवी, उम्र बयालीस वर्ष');
    showToast('नाम और उम्र सुनाई जा रही है');
  };

  const handleRemoveSymptom = (id: string) => {
    setDetectedSymptoms((prev) => prev.filter((s) => s.id !== id));
    showToast('लक्षण हटाया गया');
  };

  const handleAddSymptom = (nameHi: string, nameEn: string) => {
    const newSym: Symptom = {
      id: `sym-${Date.now()}`,
      nameHi,
      nameEn,
      severity: 'moderate'
    };
    setDetectedSymptoms((prev) => [...prev, newSym]);
    setShowAddSymptom(false);
    showToast(`${nameHi} लक्षण जोड़ा गया`);
  };

  const handleReplayVoice = () => {
    setTranscribedText('“कमला देवी को 3 दिन से तेज़ बुखार है, सूखी खांसी है और शरीर पर लाल दाने निकल रहे हैं...”');
    setIsRecording(true);
    showToast('माइक्रोफोन फिर से सक्रिय है, बोलिए...');
  };

  const handleConfirmVoice = () => {
    setIsRecording(false);
    showToast('आवाज़ और लक्षण सत्यापित किए गए ✓');
  };

  const handleContinue = () => {
    onSavePatientAndContinue({
      nameHi: 'कमला देवी',
      nameEn: 'Kamla Devi',
      age: 42,
      gender,
      ward: 'रामपुर केंद्र (Ward 4)',
      symptoms: detectedSymptoms,
      triageLevel: 2,
      lastVisit: 'आज, सुबह 10:15 AM'
    });
  };

  return (
    <div className="flex flex-col w-full pb-32">
      {/* Persistent Sync & Location Status Bar */}
      <div className="mb-4 bg-[#8ff3f4]/30 px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm border border-[#8ff3f4]/40">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#3ba965] animate-pulse"></span>
          <div className="flex flex-col">
            <span className="font-label-sm text-[13px] text-[#121c2a] font-semibold leading-tight">
              ● ऑफ़लाइन सुरक्षित (Offline Safe)
            </span>
            <span className="font-label-sm text-[11px] text-[#574238] leading-none">
              सुनीता देवी • रामपुर केंद्र (Ward 4)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-full text-[#00696b] shadow-sm">
          <span className="material-symbols-outlined text-[16px]">cloud_done</span>
          <span className="font-label-sm text-[11px] font-bold">स्थानीय सुरक्षित</span>
        </div>
      </div>

      {/* 1. Patient Identity Card (मरीज़ की पहचान) */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4 flex flex-col gap-4 border border-[#e6eeff]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#9c4500]/10 flex items-center justify-center text-[#9c4500]">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-[17px] text-[#121c2a] leading-tight font-bold">
                मरीज़ की पहचान
              </h2>
              <span className="font-label-sm text-[12px] text-[#574238]">Patient Details</span>
            </div>
          </div>
          <button
            onClick={() => {
              setName('कमला देवी (Kamla Devi)');
              setAge('42 वर्ष (Years)');
              showToast('पुराना डेटा लोड किया गया: RCH-8492');
            }}
            className="flex items-center gap-1 text-[#00696b] font-label-md text-[13px] px-3 py-1.5 rounded-lg hover:bg-[#8ff3f4]/20 transition-all font-semibold"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>पुराना मरीज़</span>
          </button>
        </div>

        {/* Inputs Row */}
        <div className="grid grid-cols-1 gap-3">
          {/* Name Field with Mic Assist */}
          <div className="relative bg-[#eff4ff] rounded-xl px-3.5 py-2 flex flex-col focus-within:bg-white focus-within:ring-2 focus-within:ring-[#e8762b] transition-all">
            <div className="flex justify-between items-center">
              <label className="font-label-sm text-[12px] text-[#574238] font-medium">
                नाम / Name
              </label>
              <span className="font-label-sm text-[11px] text-[#9c4500] font-semibold">
                अनिवार्य *
              </span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <input
                className="bg-transparent font-headline-sm text-[16px] text-[#121c2a] w-full focus:outline-none"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                aria-label="बोलकर नाम भरें"
                onClick={handleSpeakName}
                className="w-10 h-10 rounded-full bg-[#d9e3f6] flex items-center justify-center text-[#9c4500] active:scale-90 transition-transform hover:bg-[#ffdbca]"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">mic</span>
              </button>
            </div>
          </div>

          {/* Age Field */}
          <div className="relative bg-[#eff4ff] rounded-xl px-3.5 py-2 flex flex-col focus-within:bg-white focus-within:ring-2 focus-within:ring-[#e8762b] transition-all">
            <div className="flex justify-between items-center">
              <label className="font-label-sm text-[12px] text-[#574238] font-medium">
                उम्र / Age
              </label>
              <span className="font-label-sm text-[11px] text-[#9c4500]">अपेक्षित वर्ष</span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <input
                className="bg-transparent font-headline-sm text-[16px] text-[#121c2a] w-full focus:outline-none"
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              <div className="flex items-center gap-1 text-[#574238]">
                <span className="material-symbols-outlined text-[20px]">cake</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gender Segmented Buttons (min 56dp height per ASHA guidelines) */}
        <div className="flex flex-col gap-1.5">
          <span className="font-label-sm text-[12px] text-[#574238] font-medium">
            लिंग / Gender
          </span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {/* Female */}
            <button
              aria-checked={gender === 'female'}
              onClick={() => setGender('female')}
              className={`h-14 rounded-xl flex flex-col items-center justify-center active:scale-95 transition-all ${
                gender === 'female'
                  ? 'bg-[#e8762b] text-white shadow-md'
                  : 'bg-[#eff4ff] text-[#121c2a] hover:bg-[#dee9fc]'
              }`}
              role="radio"
              type="button"
            >
              <div className="flex items-center gap-1 font-headline-sm text-[15px] font-bold">
                {gender === 'female' && (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                )}
                <span>महिला</span>
              </div>
              <span className="font-label-sm text-[11px] tracking-wide opacity-90 leading-none">
                Female
              </span>
            </button>

            {/* Male */}
            <button
              aria-checked={gender === 'male'}
              onClick={() => setGender('male')}
              className={`h-14 rounded-xl flex flex-col items-center justify-center active:scale-95 transition-all ${
                gender === 'male'
                  ? 'bg-[#e8762b] text-white shadow-md'
                  : 'bg-[#eff4ff] text-[#121c2a] hover:bg-[#dee9fc]'
              }`}
              role="radio"
              type="button"
            >
              <span className="font-headline-sm text-[15px] font-bold">पुरुष</span>
              <span className="font-label-sm text-[11px] text-[#574238] leading-none">
                Male
              </span>
            </button>

            {/* Other */}
            <button
              aria-checked={gender === 'other'}
              onClick={() => setGender('other')}
              className={`h-14 rounded-xl flex flex-col items-center justify-center active:scale-95 transition-all ${
                gender === 'other'
                  ? 'bg-[#e8762b] text-white shadow-md'
                  : 'bg-[#eff4ff] text-[#121c2a] hover:bg-[#dee9fc]'
              }`}
              role="radio"
              type="button"
            >
              <span className="font-headline-sm text-[15px] font-bold">अन्य</span>
              <span className="font-label-sm text-[11px] text-[#574238] leading-none">
                Other
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. THE HERO VOICE AREA */}
      <section className="bg-gradient-to-b from-[#e6eeff] to-white rounded-xl p-5 shadow-sm mb-4 text-center flex flex-col items-center relative overflow-hidden border border-[#d9e3f6]">
        {/* Subtle sound waves background graphic */}
        <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
          <svg className="w-full h-full text-[#9c4500]" fill="currentColor" viewBox="0 0 400 200">
            <path
              d="M10 100 Q 50 20, 100 100 T 200 100 T 300 100 T 400 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            ></path>
            <path
              d="M10 100 Q 60 170, 110 100 T 210 100 T 310 100 T 410 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            ></path>
          </svg>
        </div>

        {/* Title & Dialect Reassurance */}
        <div className="flex items-center gap-2 mb-1 relative z-10">
          <span className="material-symbols-outlined text-[#9c4500] text-[22px]">
            record_voice_over
          </span>
          <h3 className="font-headline-md text-[20px] text-[#121c2a] font-bold">
            अपनी भाषा में बोलें
          </h3>
        </div>
        <p className="font-body-md text-[14px] text-[#574238] max-w-[280px] mb-4 relative z-10">
          हिन्दी या भोजपुरी में मरीज़ की तकलीफ़ बताएं (Speak naturally)
        </p>

        {/* Concentric Pulsing Microphone Anchor (140dp diameter circle) */}
        <div className="relative w-44 h-44 flex items-center justify-center mb-3">
          {/* Outer expanding pulse ring 1 */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-[#e8762b]/20 animate-ping opacity-75"></span>
              <span className="absolute w-40 h-40 rounded-full bg-[#e8762b]/30 animate-pulse"></span>
            </>
          )}
          <div className="absolute w-36 h-36 rounded-full bg-[#e8762b]/30 flex items-center justify-center"></div>

          {/* Main Interactive Mic Center Button */}
          <button
            aria-label="आवाज़ रिकॉर्डिंग शुरू या बंद करें"
            onClick={toggleRecording}
            className={`relative z-10 w-32 h-32 rounded-full text-white flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all ${
              isRecording ? 'bg-[#e8762b]' : 'bg-[#8a7266]'
            }`}
            type="button"
          >
            {/* Animated Voice Waveform bars */}
            <div className="flex items-center gap-1 mb-1.5 h-6">
              <span
                className={`w-1 bg-white rounded-full ${
                  isRecording ? 'animate-bounce h-3' : 'h-1.5'
                }`}
              ></span>
              <span
                className={`w-1 bg-white rounded-full ${
                  isRecording ? 'animate-bounce h-6 [animation-delay:0.15s]' : 'h-3'
                }`}
              ></span>
              <span
                className={`w-1 bg-white rounded-full ${
                  isRecording ? 'animate-bounce h-5 [animation-delay:0.3s]' : 'h-2'
                }`}
              ></span>
              <span
                className={`w-1 bg-white rounded-full ${
                  isRecording ? 'animate-bounce h-2 [animation-delay:0.2s]' : 'h-1.5'
                }`}
              ></span>
            </div>
            <span className="material-symbols-outlined text-[38px] leading-none mb-1">
              mic
            </span>
            <span className="font-label-sm text-[12px] font-extrabold tracking-wider uppercase">
              {isRecording ? 'रिकॉर्ड हो रहा है' : 'टैप करके बोलें'}
            </span>
          </button>
        </div>

        {/* Live prompt subtext */}
        <div className="flex items-center gap-2 bg-[#dee9fc] px-4 py-1.5 rounded-full mb-3 shadow-sm relative z-10">
          <span
            className={`material-symbols-outlined text-[18px] ${
              isRecording ? 'text-[#006d38] animate-spin' : 'text-[#8a7266]'
            }`}
          >
            graphic_eq
          </span>
          <span className="font-label-md text-[13px] text-[#121c2a] font-semibold">
            {isRecording
              ? 'बोलिए... हम सुन रहे हैं (Listening)'
              : 'माइक्रोफोन रुका है (Paused)'}
          </span>
        </div>

        {/* Secondary noisy environment toggle */}
        <button
          onClick={() => setIsManualType(!isManualType)}
          className="flex items-center gap-1.5 text-[#00696b] font-label-md text-[13px] px-4 py-2 rounded-xl hover:bg-[#8ff3f4]/20 active:scale-95 transition-all relative z-10"
          type="button"
        >
          <span className="text-[18px]">⌨️</span>
          <span className="font-bold underline decoration-[#00696b]">
            {isManualType ? 'टाइपिंग बंद करें' : 'टाइप करें (Type instead if noisy)'}
          </span>
        </button>

        {isManualType && (
          <div className="w-full mt-3 relative z-10">
            <textarea
              rows={2}
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              className="w-full p-3 rounded-xl bg-white border border-[#d9e3f6] text-[13px] focus:ring-2 focus:ring-[#e8762b] focus:outline-none"
              placeholder="यहाँ मरीज़ की तकलीफ़ टाइप करें..."
            />
          </div>
        )}
      </section>

      {/* 3. Live Voice Transcription Box (सुनी हुई बात) */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4 flex flex-col gap-3 border border-[#e6eeff]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00696b] text-[20px]">
              subtitles
            </span>
            <h4 className="font-headline-sm text-[16px] text-[#121c2a] font-bold">
              सुनी हुई बात (Voice Note)
            </h4>
          </div>
          <span className="bg-[#8ff3f4] text-[#007072] font-label-sm text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
            ऑटो-ट्रांसक्राइब
          </span>
        </div>

        {/* Dynamic transcribed quote card */}
        <div className="bg-[#eff4ff] rounded-xl p-3.5 shadow-inner flex flex-col gap-2 border border-[#d9e3f6]/40">
          <p className="font-body-lg text-[15px] text-[#121c2a] italic leading-relaxed">
            {transcribedText}
          </p>
          <div className="flex items-center gap-2 text-[#574238] font-label-sm text-[12px]">
            <span className="material-symbols-outlined text-[16px] text-[#006d38]">
              check_circle
            </span>
            <span>भाषा पहचानी: भोजपुरी-मिश्रित हिन्दी (Bhojpuri/Hindi)</span>
          </div>
        </div>

        {/* Confirmation action row */}
        <div className="flex items-center justify-between pt-1 gap-2">
          <span className="font-label-md text-[13px] text-[#121c2a] font-semibold">
            क्या यह सही है?
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReplayVoice}
              className="h-11 px-3.5 bg-[#e6eeff] text-[#ba1a1a] rounded-xl font-label-md text-[13px] flex items-center gap-1 hover:bg-[#ffdad6]/40 active:scale-95 transition-all font-semibold"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">replay</span>
              <span>फिर बोलें</span>
            </button>
            <button
              onClick={handleConfirmVoice}
              className="h-11 px-4 bg-[#3ba965] text-white rounded-xl font-label-md text-[13px] flex items-center gap-1 shadow-sm active:scale-95 transition-all font-bold"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] font-bold">
                done_all
              </span>
              <span>सही है</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4. Detected Symptom Chips (पहचाने गए लक्षण) */}
      <section className="bg-white rounded-xl p-4 shadow-sm mb-4 flex flex-col gap-3 border border-[#e6eeff]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#9c4500] text-[20px]">
              medical_services
            </span>
            <h4 className="font-headline-sm text-[16px] text-[#121c2a] font-bold">
              पहचाने गए लक्षण
            </h4>
          </div>
          <span className="font-label-sm text-[12px] text-[#574238]">
            {detectedSymptoms.length} लक्षण मिले
          </span>
        </div>

        {/* Saffron & Teal Dismissible Chips */}
        <div className="flex flex-wrap gap-2 pt-1" id="symptoms-list">
          {detectedSymptoms.map((sym) => (
            <div
              key={sym.id}
              className="inline-flex items-center gap-1.5 bg-[#8ff3f4]/60 text-[#004f51] px-3.5 py-2 rounded-xl shadow-sm min-h-[44px] border border-[#72d6d8]"
            >
              <span className="material-symbols-outlined text-[18px] text-[#00696b]">
                {sym.nameEn.toLowerCase().includes('fever')
                  ? 'thermostat'
                  : sym.nameEn.toLowerCase().includes('cough')
                  ? 'air'
                  : sym.nameEn.toLowerCase().includes('rash')
                  ? 'dermatology'
                  : 'healing'}
              </span>
              <div className="flex flex-col text-left">
                <span className="font-label-md text-[13px] font-bold leading-tight">
                  {sym.nameHi}
                </span>
                <span className="font-label-sm text-[10.5px] leading-none opacity-80">
                  {sym.nameEn}
                </span>
              </div>
              <button
                className="w-6 h-6 ml-1 rounded-full hover:bg-[#8ff3f4] flex items-center justify-center text-[#004f51] active:scale-90"
                onClick={() => handleRemoveSymptom(sym.id)}
                type="button"
                aria-label="लक्षण हटाएं"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}

          {/* Add Symptom Button */}
          <button
            onClick={() => setShowAddSymptom(!showAddSymptom)}
            className="inline-flex items-center gap-1 bg-[#e6eeff] text-[#121c2a] px-3 py-2 rounded-xl hover:bg-[#dee9fc] transition-colors min-h-[44px] border border-[#d9e3f6]"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="font-label-sm text-[13px] font-semibold">+ अन्य लक्षण</span>
          </button>
        </div>

        {/* Quick add dropdown menu */}
        {showAddSymptom && (
          <div className="p-3 bg-[#eff4ff] rounded-xl border border-[#d9e3f6] flex flex-wrap gap-1.5 mt-2 animate-in fade-in duration-150">
            {[
              { hi: 'उल्टी होना', en: 'Vomiting' },
              { hi: 'चक्कर आना', en: 'Dizziness' },
              { hi: 'सांस फूलना', en: 'Shortness of Breath' },
              { hi: 'पेट दर्द', en: 'Abdominal Pain' },
              { hi: 'दस्त (Loose Motion)', en: 'Diarrhea' }
            ].map((item) => (
              <button
                key={item.en}
                type="button"
                onClick={() => handleAddSymptom(item.hi, item.en)}
                className="bg-white px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#121c2a] border border-[#d9e3f6] hover:bg-[#dee9fc]"
              >
                + {item.hi} ({item.en})
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 5. STICKY BOTTOM ACTION BAR */}
      <aside className="fixed bottom-0 inset-x-0 bg-[#f8f9ff]/95 backdrop-blur-md px-4 py-3 z-40 shadow-xl border-t border-[#e6eeff] flex flex-col gap-1.5">
        <div className="max-w-md mx-auto w-full">
          <button
            onClick={handleContinue}
            className="w-full h-14 bg-[#e8762b] text-white rounded-xl flex items-center justify-center gap-2 shadow-lg hover:brightness-105 active:scale-[0.98] transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[24px]">smart_toy</span>
            <div className="flex flex-col text-left">
              <span className="font-headline-sm text-[16px] font-bold leading-tight">
                आगे बढ़ें (एआई सलाह लें)
              </span>
              <span className="font-label-sm text-[11px] opacity-90 leading-none">
                Continue to Triage &amp; Prescription →
              </span>
            </div>
          </button>
          {/* Subtext Offline Indicator Guarantee */}
          <div className="flex items-center justify-center gap-1 text-[#574238] pt-1.5">
            <span className="material-symbols-outlined text-[15px] text-[#00696b]">
              cloud_queue
            </span>
            <span className="font-label-sm text-[12px]">
              फ़ोन में सुरक्षित • इंटरनेट आने पर अपने आप सिंक होगा
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
};
