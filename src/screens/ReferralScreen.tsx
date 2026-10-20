import { useTranslate } from '../i18n/LanguageContext';
import React, { useState } from 'react';
import { Patient } from '../types';
import { playSpokenText, stopSpokenText } from '../utils/speech';
import {
 postTriage,
 type TriageResponse,
} from '../lib/api';

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
 const [triageResult, setTriageResult] = useState<TriageResponse | null>(null);
 const [isLoadingTriage, setIsLoadingTriage] = useState(false);

 const spokenAdviceText = triageResult?.triage_advice?.headline_hi || '';

 const handleTriage = async () => {
 setIsLoadingTriage(true);
 try {
 const result = await postTriage({
 symptoms: patient.symptoms?.map(s => s.nameHi).filter(Boolean),
 raw_transcript: patient.symptoms?.[0]?.nameHi
 });
 setTriageResult(result);
 setSelectedTier(
 result.triage_result === 'home_care' ? 1 : result.triage_result === 'visit_phc' ? 2 : 3
 );
 } catch {
 // Fallback to default based on selected tier
 } finally {
 setIsLoadingTriage(false);
 }
 };

 const handleToggleAudio = () => {
 if (isAudioPlaying) {
 stopSpokenText();
 setIsAudioPlaying(false);
 showToast('Audio stopped');
 } else {
 playSpokenText(
 spokenAdviceText,
 () => setIsAudioPlaying(true),
 () => setIsAudioPlaying(false)
 );
 showToast(' Playing');
 }
 };

 const handleTriggerSync = () => {
 setIsSyncing(true);
 showToast('Syncing to the dashboard...');
 setTimeout(() => {
 setIsSyncing(false);
 onSyncPatient(patient.id);
 showToast('NGO Synced! ✓');
 }, 1200);
 };

 const tierLabels = {
 1: { hi: 'Level 1: Normal', en: 'Level 1: Home Care', color: '#006d38' },
 2: { hi: 'Level 2: Referral', en: 'Level 2: Referral', color: '#e8762b' },
 3: { hi: 'Level 3: Emergency', en: 'Level 3: Emergency', color: '#ba1a1a' }
 };

 return (
 <div className="flex flex-col w-full pb-10 screen-layout">
 {/* Offline Sync Confirmation Sticky Sub-bar */}
 <div className="lg-span-2 w-full bg-[#8ff3f4]/30 px-4 py-2 rounded-xl flex items-center justify-between mb-3 shadow-sm border border-[#8ff3f4]/40">
 <div className="flex items-center gap-2">
 <span className="w-2.5 h-2.5 rounded-full bg-[#3ba965] animate-pulse"></span>
 <span className="font-label-sm text-[12px] text-[#004f51] font-semibold">
 Safe in local memory • Local Safe
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
 alt="Close-up portrait of patient"
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
 {patient.nameEn} • {patient.age} years, {patient.gender === 'female' ? 'Female' : 'Male'}
 </p>
 <p className="font-label-sm text-[11.5px] text-[#8a7266] mt-0.5 flex items-center gap-1">
 <span className="material-symbols-outlined text-[15px]">schedule</span>
 {patient.lastVisit}
 </p>
 </div>
 </div>

 {/* Symptoms Chips */}
 <div className="mt-3 pt-1 flex flex-wrap gap-1.5">
 {patient.symptoms.map((symptom, idx) => (
 <span
 key={symptom.id}
 className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ffdad6] text-[#93000a] font-label-sm text-[12px] font-semibold"
 >
 <span className="material-symbols-outlined text-[16px]">device_thermostat</span>
 {symptom.nameHi}
 </span>
 ))}
 </div>
 </section>

 {/* Safety Tiers Segmented Visual Switcher */}
 <div className="mb-4">
 <div className="flex items-center justify-between mb-1.5 px-1">
 <span className="font-label-sm text-[11.5px] text-[#574238] uppercase tracking-wider font-semibold">
 Triage safety level (SAFETY LEVEL)
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
 Level {selectedTier} active
 </span>
 </div>
 <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#e6eeff] rounded-xl border border-[#d9e3f6]">
 {/* Tier 1: Green */}
 <button
 type="button"
 onClick={async () => {
 setSelectedTier(1);
 await handleTriage();
 }}
 className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all ${
 selectedTier === 1
 ? 'bg-white text-[#006d38] shadow-sm font-bold'
 : 'bg-transparent text-[#574238] hover:bg-white/50'
 }`}
 >
 <div className="w-3.5 h-3.5 rounded-full bg-[#006d38] mb-1"></div>
 <span className="font-label-sm text-[12px] leading-tight">Level 1: Normal</span>
 <span className="font-label-sm text-[10px] opacity-80 leading-tight truncate w-full">
 Home Care
 </span>
 </button>

 {/* Tier 2: Amber */}
 <button
 type="button"
 onClick={async () => {
 setSelectedTier(2);
 await handleTriage();
 }}
 className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all ${
 selectedTier === 2
 ? 'bg-white text-[#9c4500] shadow-sm font-bold'
 : 'bg-transparent text-[#574238] hover:bg-white/50'
 }`}
 >
 <div className="w-3.5 h-3.5 rounded-full bg-[#e8762b] mb-1"></div>
 <span className="font-label-sm text-[12px] leading-tight">Level 2: Referral</span>
 <span className="font-label-sm text-[10px] opacity-80 leading-tight truncate w-full">
 Visit PHC 24h
 </span>
 </button>

 {/* Tier 3: Red */}
 <button
 type="button"
 onClick={async () => {
 setSelectedTier(3);
 await handleTriage();
 }}
 className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all ${
 selectedTier === 3
 ? 'bg-white text-[#ba1a1a] shadow-sm font-bold'
 : 'bg-transparent text-[#574238] hover:bg-white/50'
 }`}
 >
 <div className="w-3.5 h-3.5 rounded-full bg-[#ba1a1a] mb-1"></div>
 <span className="font-label-sm text-[12px] leading-tight">Level 3: Emergency</span>
 <span className="font-label-sm text-[10px] opacity-80 leading-tight truncate w-full">
 Urgent 108
 </span>
 </button>
 </div>
 </div>

 {/* 2. TRIAGE RECOMMENDATION CARD */}
 <section className="bg-white rounded-xl shadow-md p-4 mb-4 relative overflow-hidden border border-[#e6eeff]/60">
 <div className="absolute top-0 left-0 bottom-0 w-2.5">
 <div className={`h-full ${triageResult?.triage_result === 'home_care' ? 'bg-[#006d38]' : selectedTier === 2 ? 'bg-[#e8762b]' : 'bg-[#ba1a1a]'}`} />
 </div>

 <div className="pl-2">
 {/* Badge */}
 <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-1 ${
 selectedTier === 1
 ? 'bg-[#8df9ac]/40 text-[#003619]'
 : selectedTier === 2
 ? 'bg-[#ffdbca] text-[#773300]'
 : 'bg-[#ffdad6] text-[#93000a]'
 }`}>
 <span
 className="material-symbols-outlined text-[16px]"
 style={{ fontVariationSettings: "'FILL' 1" }}
 >
 {selectedTier === 3 ? 'emergency' : 'warning'}
 </span>
 <span className="font-label-sm text-[12px] font-bold">
 {triageResult?.triage_advice?.headline_hi ||
 (selectedTier === 1
 ? 'Level 1: Normal home care'
 : selectedTier === 2
 ? 'Level 2: (PHC) '
 : 'Level 3: Immediate 108 ambulance emergency')}
 </span>
 </div>

 {/* Recommendation Headline */}
 <h3 className="font-headline-md text-[20px] text-[#121c2a] mt-1 font-bold leading-snug">
 {triageResult?.triage_advice?.headline_hi ??
 (selectedTier === 1
 ? 'Give rest and fluids at home'
 : selectedTier === 2
 ? 'Take to the PHC within 24 hours'
 : 'Call the 108 ambulance immediately')}
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
 {triageResult?.triage_advice?.headline_en ??
 (selectedTier === 1
 ? ''
 : selectedTier === 2
 ? ''
 : '')}
 </p>

 {/* Audio Guidance Pill */}
 <div className="bg-[#eff4ff] rounded-xl p-2.5 flex items-center justify-between mb-4 shadow-inner border border-[#d9e3f6]/40">
 <div className="flex items-center gap-2.5">
 <button
 aria-label="Play spoken advice"
 onClick={handleToggleAudio}
 className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all ${
 isAudioPlaying ? 'bg-[#00696b] text-white animate-pulse' : 'bg-[#e8762b] text-white'
 }`}
 type="button"
 >
 <span className="material-symbols-outlined text-[26px]">
 {isAudioPlaying ? 'pause' : 'play_arrow'}
 </span>
 </button>
 <div>
 <p className="font-label-md text-[13px] font-bold text-[#121c2a]">
 Play the advice aloud for the patient
 </p>
 <p className="font-label-sm text-[11px] text-[#574238]">
 Local dialect (Hindi / Magahi Audio)
 </p>
 </div>
 </div>
 <span className="font-label-sm text-[11px] text-[#8a7266] px-2 py-1 bg-white rounded-lg border border-[#d9e3f6]">
 {isAudioPlaying ? 'Playing' : '0:38'}
 </span>
 </div>

 {/* Core Advice Paragraph */}
 <div className="space-y-1.5 mb-4">
 <div className="flex items-start gap-2">
 <span className="material-symbols-outlined text-[#9c4500] text-[20px] shrink-0 mt-0.5">
 stethoscope
 </span>
 <p className="font-body-md text-[14px] text-[#121c2a] leading-relaxed font-medium">
 {triageResult?.triage_advice?.reasoning ||
 (selectedTier === 1
 ? 'Patients 3-4 , and '
 : selectedTier === 2
 ? 'High Fever '
 : ' Patients and ')}
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
 Rampur PHC
 </p>
 <span className="px-1.5 py-0.2 rounded bg-[#8df9ac] text-[#003619] font-label-sm text-[10px] font-bold">
 Open
 </span>
 </div>
 <p className="font-label-sm text-[11px] text-[#574238] truncate">
 3.5 km away • MOIC Dr. Rajesh on duty
 </p>
 </div>
 </div>
 <a
 aria-label="Call Hospital"
 className="h-10 px-3 bg-[#00696b] text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm font-label-sm text-[12px] font-semibold active:scale-95 transition-transform hover:bg-[#004f51]"
 href="tel:108"
 >
 <span className="material-symbols-outlined text-[17px] mr-1">call</span>
 Call
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
 Call 108 immediately if breathing becomes difficult
 </h4>
 <p className="font-label-sm text-[11px] text-[#ba1a1a] font-medium">

 </p>
 </div>
 </div>
 <a
 className="h-11 px-3.5 rounded-xl bg-[#ba1a1a] text-white font-label-md text-[13px] font-bold flex items-center gap-1 shadow active:scale-95 transition-transform hover:bg-[#93000a]"
 href="tel:108"
 >
 <span className="material-symbols-outlined text-[18px]">call</span>
 108
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
 Why was this advice given?
 </h4>
 <p className="font-label-sm text-[11.5px] text-[#574238]">

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
 WHO IMCI clinical guidelines
 </p>
 <p className="font-body-md text-[12.5px] text-[#574238] mt-0.5">
 102°F and (Rash)
 (CBC) and /
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
 Potential risk analysis (Potential Risks)
 </p>
 <p className="font-body-md text-[12.5px] text-[#574238] mt-0.5">
 (Dengue), (Measles)
 (Dehydration)
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
 Patients ?
 </h4>
 <span className="font-label-sm text-[11.5px] text-[#006d38] font-bold bg-[#8df9ac]/30 px-2 py-0.5 rounded">
 ASHA Guidance
 </span>
 </div>
 <div className="grid grid-cols-2 gap-2 mt-1">
 <div className="p-3 bg-[#eff4ff] rounded-xl flex flex-col items-center text-center border border-[#d9e3f6]/40">
 <div className="w-12 h-12 rounded-full bg-[#8ff3f4] text-[#007072] flex items-center justify-center mb-1">
 <span className="material-symbols-outlined text-[24px]">water_drop</span>
 </div>
 <p className="font-label-md text-[13px] font-bold text-[#121c2a]">Give ORS</p>
 <p className="font-label-sm text-[11px] text-[#574238]"></p>
 </div>
 <div className="p-3 bg-[#eff4ff] rounded-xl flex flex-col items-center text-center border border-[#d9e3f6]/40">
 <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#93000a] flex items-center justify-center mb-1">
 <span className="material-symbols-outlined text-[24px]">block</span>
 </div>
 <p className="font-label-md text-[13px] font-bold text-[#121c2a]">Do not give any unprescribed medicine</p>
 <p className="font-label-sm text-[11px] text-[#574238]"></p>
 </div>
 </div>
 </section>

 {/* 4. Action Buttons Row */}
 <section className="flex flex-col gap-2 mb-4">
 {/* Primary WhatsApp Share Button */}
 <button
 onClick={onOpenWhatsAppModal}
 className="w-full min-h-[56px] rounded-xl bg-[#006d38] text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform hover:bg-[#005229]"
 type="button"
 >
 <span className="material-symbols-outlined text-[26px]">chat</span>
 <div className="text-left flex flex-col leading-tight">
 <span className="font-label-lg text-[15px] font-bold">
 Send the slip to the patient (WhatsApp)
 </span>
 <span className="font-label-sm text-[11px] opacity-90">

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
 <span className="font-label-md text-[13px] font-bold text-[#121c2a]">Add note</span>
 <span className="font-label-sm text-[11px] text-[#574238]"></span>
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
 {isSyncing ? 'Syncing...' : 'Sync dashboard'}
 </span>
 <span className="font-label-sm text-[11px] text-[#574238]"></span>
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
 Statutory disclaimer • Statutory Notice
 </h5>
 <p className="font-body-md text-[12px] text-[#121c2a] leading-snug mt-1">
 ⚠️ Advice Patients 108
 </p>
 <p className="font-label-sm text-[10.5px] text-[#574238] mt-1">
 This AI-assisted triage does not constitute medical diagnosis. Always consult certified healthcare personnel for definitive clinical diagnosis and treatment.
 </p>
 </div>
 </div>
 </footer>
 </div>
 );
};