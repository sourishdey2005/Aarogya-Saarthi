import React, { useState, useEffect } from 'react';
import { Patient, Symptom } from '../types';
import { playSpokenText } from '../utils/speech';
import { useLang , useTranslate} from '../i18n/LanguageContext';
import {
 postSymptomLog,
 postTriage,
 type AuthWorker,
 type TriageAdvice,
 type TriageResponse,
} from '../lib/api';

interface RegistrationScreenProps {
 onSavePatientAndContinue: (
 patient: Partial<Patient> & { triageResult?: TriageResponse['triage_result'] | null; triageAdvice?: TriageAdvice | null }
 ) => Promise<Patient> | void;
 onBack: () => void;
 showToast: (msg: string) => void;
 worker?: AuthWorker | null;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/**
 * Conservative triage used when the AI service cannot be reached. It matches
 * the fallback of POST /api/triage so the advice never differs between the
 * online and the offline case.
 */
function localFallbackTriage(): TriageResponse {
 return {
 triage_result: 'visit_phc',
 triage_advice: {
 headline_hi: 'PHC Go',
 headline_en: 'Visit the PHC',
 reasoning: 'AI service unavailable. Conservative referral.',
 source: 'fallback',
 },
 };
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({
 onSavePatientAndContinue,
 onBack,
 showToast,
 worker
}) => {
 const tr = useTranslate();
 const { lang } = useLang();
 const [name, setName] = useState('');
 const [age, setAge] = useState('');
 const [gender, setGender] = useState<'female' | 'male' | 'other' | null>(null);
 const [phone, setPhone] = useState('');
 const [address, setAddress] = useState('');
 const [bloodGroup, setBloodGroup] = useState('');
 const [ward, setWard] = useState('');
 const [isRecording, setIsRecording] = useState(false);
 const [isManualType, setIsManualType] = useState(false);
 const [transcribedText, setTranscribedText] = useState('');
 const [detectedSymptoms, setDetectedSymptoms] = useState<Symptom[]>([]);
 const [showAddSymptom, setShowAddSymptom] = useState(false);
 const [isSaving, setIsSaving] = useState(false);

 // Auto-simulate speech recognition waveform or start Web Speech Recognition if available
 useEffect(() => {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
 if (SpeechRecognition && isRecording) {
 try {
 const recognition = new SpeechRecognition();
 recognition.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
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
 }, [isRecording, lang]);

 const toggleRecording = () => {
 if (isRecording) {
 setIsRecording(false);
 showToast('Voice recording stopped');
 } else {
 setIsRecording(true);
 showToast('Speak... voice is being recorded');
 }
 };

 const handleSpeakName = () => {
 playSpokenText(' Patients and ');
 showToast(' and ');
 };

 const handleRemoveSymptom = (id: string) => {
 setDetectedSymptoms((prev) => prev.filter((s) => s.id !== id));
 showToast('Symptom removed');
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
 showToast(`${nameHi} symptom added`);
 };

 const handleReplayVoice = () => {
 setIsRecording(true);
 showToast('Microphone is active again, speak...');
 };

 const handleConfirmVoice = () => {
 setIsRecording(false);
 showToast('Voice and symptoms verified ✓');
 };

 /**
 * The full offline-safe flow:
 * 1. AI triage (falls back to a conservative referral when offline)
 * 2. create the patient (queued on the device when offline)
 * 3. store the symptom log with the triage result
 */
 const handleContinue = async () => {
 if (isSaving) return;
 if (!name.trim()) {
 showToast('Patients (Please enter the patient name)');
 return;
 }
 setIsSaving(true);

 const symptomNames = detectedSymptoms.map((symptom) => symptom.nameEn);

 let triage: TriageResponse = localFallbackTriage();
 try {
 triage = await postTriage({
 symptoms: symptomNames,
 raw_transcript: transcribedText,
 });
 } catch {
 // Offline or the AI service is down - keep the conservative advice.
 }

 const triageLevel =
 triage.triage_result === 'refer_immediately' ? 3 : triage.triage_result === 'home_care' ? 1 : 2;

 try {
 const patientName = name.trim();
 const ageDigits = age.match(/\d+/);
 const patientAge = ageDigits ? parseInt(ageDigits[0], 10) : 0;

 const patient = await onSavePatientAndContinue({
 nameHi: patientName,
 nameEn: patientName,
 age: patientAge,
 gender,
 ward,
 phone,
 address,
 bloodGroup,
 symptoms: detectedSymptoms,
 triageLevel,
 triageResult: triage.triage_result,
 triageAdvice: triage.triage_advice,
 });

 const patientId = patient?.id;
 if (patientId) {
 const result = await postSymptomLog({
 patient_id: patientId,
 raw_transcript: transcribedText,
 symptoms: symptomNames,
 captured_at: new Date().toISOString(),
 triage_result: triage.triage_result,
 triage_advice: triage.triage_advice,
 });
 if (result.queued) {
 showToast(': , Sync ');
 }
 }
 } catch (error) {
 showToast(
 error instanceof Error
 ? ` : ${error.message}`
 : ' (Could not save)'
 );
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <div className="flex flex-col w-full gap-6 pb-8 screen-layout">
 {/* Header */}
 <div className="flex items-center justify-between bg-white border-b border-[#e2e8f0] px-5 py-3 sticky top-0 z-20 shadow-sm">
 <button
 onClick={onBack}
 className="w-9 h-9 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] transition-colors"
 type="button"
 aria-label="Back"
 >
 <span className="material-symbols-outlined text-[20px]">arrow_back</span>
 </button>
 <div>
 <h1 className="font-semibold text-[16px] text-[#0f172a]">New patient </h1>
 <p className="text-[12px] text-[#64748b]">Patient Registration</p>
 </div>
 <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[#475569] hover:bg-[#f1f5f9] transition-colors">
 <span className="material-symbols-outlined text-[20px]">help</span>
 </div>
 </div>

 <form onSubmit={(e) => e.preventDefault()} className="space-y-4 p-5 max-w-[720px] mx-auto w-full">
 {/* Section: */}
 <section className="space-y-3">
 <div className="flex items-center gap-2 px-2">
 <span className="w-0.5 h-4 rounded-full bg-[#0f5257]"></span>
 <h2 className="font-semibold text-[14px] text-[#0f172a] uppercase tracking-wider"></h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 <div className="col-span-full md:col-span-2">
 <label className="block text-[12px] font-semibold text-[#475569] mb-1.5">Full Name <span className="text-[#dc2626]">*</span></label>
 <div className="relative">
 <input
 className="w-full h-10 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[14px] focus:ring-2 focus:ring-[#0f5257] focus:border-[#0f5257] outline-none transition-all"
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Enter patient full name"
 autoComplete="off"
 />
 <button
 aria-label="Speak name"
 onClick={handleSpeakName}
 className="absolute right-2 top-1/2 -translate-y-1/2 text-[#0f5257] hover:text-[#0e4549] transition-colors"
 type="button"
 >
 <span className="material-symbols-outlined text-[18px]">mic</span>
 </button>
 </div>
 </div>

 <div>
 <label className="block text-[12px] font-semibold text-[#475569] mb-1.5">Age (years)</label>
 <input
 className="w-full h-10 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[14px] focus:ring-2 focus:ring-[#0f5257] focus:border-[#0f5257] outline-none transition-all"
 type="text"
 value={age}
 onChange={(e) => setAge(e.target.value)}
 placeholder="e.g. 42"
 autoComplete="off"
 />
 </div>

 <div>
 <label className="block text-[12px] font-semibold text-[#475569] mb-1.5">Phone</label>
 <input
 className="w-full h-10 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[14px] focus:ring-2 focus:ring-[#0f5257] focus:border-[#0f5257] outline-none transition-all"
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="+91 XXXXX XXXXX"
 autoComplete="off"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 <div className="col-span-full md:col-span-2">
 <label className="block text-[12px] font-semibold text-[#475569] mb-1.5">Address / Village</label>
 <input
 className="w-full h-10 rounded-lg border border-[#cbd5e1] bg-white text-[#0f172a] px-3 text-[14px] focus:ring-2 focus:ring-[#0f5257] focus:border-[#0f5257] outline-none transition-all"
 type="text"
 value={ward}
 onChange={(e) => setWard(e.target.value)}
 placeholder="Enter address or village"
 autoComplete="off"
 />
 </div>

 <div>
 <label className="block text-[12px] font-semibold text-[#475569] mb-1.5">Blood Group</label>
 <div className="grid grid-cols-4 gap-1.5">
 {BLOOD_GROUPS.map((bg) => (
 <button
 key={bg}
 type="button"
 aria-pressed={bloodGroup === bg}
 onClick={() => setBloodGroup(bg)}
 className={`h-9 rounded-lg border text-[13px] font-medium transition-all flex items-center justify-center ${
 bloodGroup === bg
 ? 'bg-[#0f5257] border-[#0f5257] text-white shadow-sm'
 : 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#94a3b8]'
 }`}
 >
 {bg}
 </button>
 ))}
 </div>
 </div>
 </div>

 <div>
 <label className="block text-[12px] font-semibold text-[#475569] mb-2">Gender <span className="text-[#dc2626]">*</span></label>
 <div className="grid grid-cols-3 gap-2" role="radiogroup">
 {[
 { value: 'female', label: 'Female', hi: 'Female' },
 { value: 'male', label: 'Male', hi: 'Male' },
 { value: 'other', label: 'Other', hi: 'Other' },
 ].map((g) => (
 <button
 key={g.value}
 type="button"
 role="radio"
 aria-checked={gender === g.value}
 onClick={() => setGender(g.value as 'female' | 'male' | 'other')}
 className={`h-11 rounded-lg border flex flex-col items-center justify-center gap-1 text-[13px] transition-all ${
 gender === g.value
 ? 'bg-[#0f5257] border-[#0f5257] text-white shadow-sm'
 : 'bg-white border-[#cbd5e1] text-[#475569] hover:border-[#94a3b8]'
 }`}
 >
 <span className="font-medium">{g.hi}</span>
 <span className="text-[11px] opacity-80">{g.label}</span>
 </button>
 ))}
 </div>
 {gender === null && (
 <p className="text-[11px] text-[#dc2626] mt-1">Please select a gender</p>
 )}
 </div>
 </section>

 {/* Section: Symptoms */}
 <section className="space-y-3">
 <div className="flex items-center gap-2 px-2">
 <span className="w-0.5 h-4 rounded-full bg-[#0f5257]"></span>
 <h2 className="font-semibold text-[14px] text-[#0f172a] uppercase tracking-wider">Symptoms</h2>
 </div>

 {/* Voice note */}
 <div className="border border-[#cbd5e1] rounded-lg p-3 bg-[#f8fafc]">
 <div className="flex items-center gap-2 mb-2">
 <span className="material-symbols-outlined text-[#0f5257] text-[18px]">record_voice_over</span>
 <span className="text-[12px] font-semibold text-[#0f172a]">Voice description</span>
 <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${
 isRecording ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#e2e8f0] text-[#64748b]'
 }`}>
 {isRecording ? 'Listening' : 'Idle'}
 </span>
 </div>
 <button
 onClick={toggleRecording}
 className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all ${
 isRecording ? 'bg-[#dc2626]' : 'bg-[#0f5257]'
 }`}
 type="button"
 aria-label={isRecording ? 'Stop recording' : 'Start recording'}
 >
 <span className="material-symbols-outlined text-[22px] leading-none">mic</span>
 </button>
 <p className="text-[11px] text-[#64748b] mt-2">
 {isRecording ? 'Speak now... the patient\'s symptoms are being recorded.' : 'Tap the microphone to record the patient\'s symptoms.'}
 </p>
 {transcribedText && (
 <div className="mt-3 p-2.5 rounded-lg bg-white border border-[#e2e8f0]">
 <p className="text-[13px] text-[#0f172a] italic">“{transcribedText}”</p>
 <div className="flex items-center gap-2 mt-2">
 <button
 onClick={handleReplayVoice}
 className="flex items-center gap-1 text-[11px] text-[#dc2626] font-medium hover:underline"
 type="button"
 >
 <span className="material-symbols-outlined text-[14px]">replay</span> Record again
 </button>
 <button
 onClick={handleConfirmVoice}
 className="flex items-center gap-1 text-[11px] text-[#166534] font-medium hover:underline"
 type="button"
 >
 <span className="material-symbols-outlined text-[14px]">done_all</span> Confirm
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Symptom chips */}
 <div>
 <div className="flex items-center justify-between mb-2">
 <span className="text-[11px] font-semibold text-[#475569] uppercase">Identified symptoms</span>
 <span className="text-[11px] text-[#64748b]">{detectedSymptoms.length}</span>
 </div>
 <div className="flex flex-wrap gap-2" id="symptoms-list">
 {detectedSymptoms.map((sym) => (
 <div key={sym.id} className="inline-flex items-center gap-1.5 bg-[#e0f2f1] text-[#004d40] px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[#80cbc4] min-h-[36px]">
 <span className="material-symbols-outlined text-[15px] text-[#00695c]">healing</span>
 <span className="font-semibold">{sym.nameHi}</span>
 <span className="text-[10px] opacity-70 ml-1">({sym.nameEn})</span>
 <button
 className="w-5 h-5 rounded-full bg-white text-[#004d40] flex items-center justify-center text-[10px] hover:bg-[#b2dfdb] active:scale-90"
 onClick={() => handleRemoveSymptom(sym.id)}
 type="button"
 aria-label={`Remove ${sym.nameHi}`}
 >
 <span className="material-symbols-outlined text-[12px]">close</span>
 </button>
 </div>
 ))}
 <button
 onClick={() => setShowAddSymptom(!showAddSymptom)}
 className="inline-flex items-center gap-1.5 bg-[#f1f5f9] text-[#334155] px-3 py-1.5 rounded-lg text-[12px] font-medium border border-[#cbd5e1] hover:bg-[#e2e8f0] min-h-[36px]"
 type="button"
 >
 <span className="material-symbols-outlined text-[15px]">add</span> + Add symptom
 </button>
 </div>

 {showAddSymptom && (
 <div className="mt-2 p-2.5 rounded-lg bg-[#f8fafc] border border-[#cbd5e1] flex flex-wrap gap-1.5 animate-in fade-in duration-150">
 {[
 { hi: 'High Fever', en: 'High Fever' },
 { hi: 'Dry Cough', en: 'Dry Cough' },
 { hi: 'Skin Rash', en: 'Skin Rash' },
 { hi: 'Vomiting', en: 'Vomiting' },
 { hi: 'Dizziness', en: 'Dizziness' },
 { hi: 'Shortness of Breath', en: 'Shortness of Breath' },
 { hi: 'Abdominal Pain', en: 'Abdominal Pain' },
 { hi: '', en: 'Diarrhea' }
 ].map((item) => (
 <button
 key={item.en}
 type="button"
 onClick={() => handleAddSymptom(item.hi, item.en)}
 className="bg-white px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#0f172a] border border-[#cbd5e1] hover:bg-[#f1f5f9] transition-colors"
 >
 {item.hi} ({item.en})
 </button>
 ))}
 </div>
 )}
 </div>
 </section>

 {/* Action Bar */}
 <aside className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-[#e2e8f0] px-5 py-3 z-30 shadow-lg">
 <button
 onClick={handleContinue}
 disabled={isSaving || !name.trim() || gender === null}
 className="w-full h-11 rounded-lg bg-[#0f5257] text-white flex items-center justify-center gap-2 font-semibold text-[14px] shadow-md hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 type="button"
 >
 <span className={`material-symbols-outlined text-[20px] ${isSaving ? 'animate-spin' : ''}`}>
 {isSaving ? 'sync' : 'person_add'}
 </span>
 <span>{isSaving ? 'Saving...' : 'Register Patient'}</span>
 </button>
 <p className="text-[11px] text-[#64748b] text-center mt-2">
 Record saved on device • syncs automatically when online
 </p>
 </aside>
 </form>
 </div>
 );
};
