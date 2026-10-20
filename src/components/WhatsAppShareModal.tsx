import { useTranslate } from '../i18n/LanguageContext';
import React, { useState } from 'react';
import { Patient } from '../types';
import type { AuthWorker } from '../lib/api';

interface WhatsAppShareModalProps {
 isOpen: boolean;
 onClose: () => void;
 patient: Patient;
 onShared: () => void;
 worker?: AuthWorker | null;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
 isOpen,
 onClose,
 patient,
 onShared,
 worker
}) => {
 const tr = useTranslate();
 const [copied, setCopied] = useState(false);

 if (!isOpen) return null;

 const referralText = `🏥 *Aarogya Sarathi digital referral slip (Digital Referral Slip)*
-----------------------------------
📋 *Patient details*:
• Name: ${patient.nameHi} (${patient.nameEn})
• RCH ID: ${patient.rchId}
• Age/Gender: ${patient.age} years, ${patient.gender === 'female' ? 'Female' : 'Male'}
• Ward: ${patient.ward}

⚠️ *Symptoms*:
${patient.symptoms.map((s) => `• ${s.nameHi} (${s.nameEn})`).join('\n')}

🚨 *Triage level*: Level ( )
📍 *Referral centre*: Rampur Primary Health Centre (PHC)
⏱️ *Advice*: MOIC .
📞 Emergency: dial 108.

👩‍⚕️ *ASHA worker*: ${worker?.name ?? 'ASHA Worker'}${worker?.village ? ` (${worker.village})` : ''}
-----------------------------------
(: - )`;

 const handleCopy = () => {
 navigator.clipboard.writeText(referralText);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const handleOpenWhatsApp = () => {
 const encoded = encodeURIComponent(referralText);
 window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
 onShared();
 onClose();
 };

 return tr(
 <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
 <div className="bg-[#ffffff] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
 <div className="w-12 h-1.5 bg-[#d9e3f6] rounded-full mx-auto mb-3 sm:hidden"></div>

 <div className="flex items-center justify-between pb-3 border-b border-[#e6eeff]">
 <div className="flex items-center gap-2">
 <div className="w-10 h-10 rounded-xl bg-[#8df9ac]/40 text-[#006d38] flex items-center justify-center">
 <span className="material-symbols-outlined text-[24px]">share</span>
 </div>
 <div>
 <h3 className="font-headline-sm text-[16px] text-[#121c2a] font-bold">
 WhatsApp referral slip
 </h3>
 <p className="text-[12px] text-[#574238]">Send it directly to the patient or family</p>
 </div>
 </div>
 <button
 onClick={onClose}
 className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#121c2a] flex items-center justify-center"
 >
 <span className="material-symbols-outlined text-[20px]">close</span>
 </button>
 </div>

 <div className="my-4 space-y-3">
 <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#d9e3f6] font-mono text-[12px] text-[#121c2a] whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
 {referralText}
 </div>

 <div className="flex items-center justify-between text-[12px] text-[#574238] px-1">
 <span>✓ Optimised for mobile and SMS</span>
 <button
 onClick={handleCopy}
 className="text-[#00696b] font-bold flex items-center gap-1 hover:underline"
 >
 <span className="material-symbols-outlined text-[16px]">
 {copied ? 'check' : 'content_copy'}
 </span>
 {copied ? 'Copied!' : 'Copy text'}
 </button>
 </div>
 </div>

 <div className="space-y-2">
 <button
 onClick={handleOpenWhatsApp}
 className="w-full py-3.5 bg-[#25D366] text-white font-bold text-[15px] rounded-xl flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-98 transition-all"
 >
 <span className="material-symbols-outlined text-[20px]">send</span>
 <span>Send on WhatsApp</span>
 </button>
 <button
 onClick={handleCopy}
 className="w-full py-2.5 bg-[#eff4ff] text-[#121c2a] font-semibold text-[13px] rounded-xl hover:bg-[#dee9fc]"
 >
 {copied ? '✓ Copied to clipboard' : 'Copy prescription text'}
 </button>
 </div>
 </div>
 </div>
 );
};
