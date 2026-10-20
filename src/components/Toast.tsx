import { useTranslate } from '../i18n/LanguageContext';
import React from 'react';

interface ToastProps {
 message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
 const tr = useTranslate();
 if (!message) return null;

 return tr(
 <div className="fixed bottom-24 inset-x-4 max-w-sm mx-auto z-50 bg-[#27313f] text-[#eaf1ff] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 border border-white/10">
 <span className="material-symbols-outlined text-[#8df9ac] text-[22px] flex-shrink-0">
 task_alt
 </span>
 <span className="font-label-md text-[13px] font-semibold leading-tight">
 {message}
 </span>
 </div>
 );
};
