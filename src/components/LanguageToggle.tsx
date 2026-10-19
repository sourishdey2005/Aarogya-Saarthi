import React from 'react';
import { useLang, type Language } from '../i18n/LanguageContext';

const OPTIONS: { id: Language; label: string; sub: string }[] = [
  { id: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { id: 'en', label: 'English', sub: 'English' },
];

/**
 * Bilingual language switcher. The two options always keep their own script
 * labels so the control stays readable in either language.
 */
export const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang } = useLang();

  return (
    <div
      role="group"
      aria-label="Language / भाषा"
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-[#e6eeff] border border-[#d9e3f6] ${className}`}
    >
      {OPTIONS.map((option) => {
        const active = lang === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setLang(option.id)}
            aria-pressed={active}
            title={`${option.label} / ${option.sub}`}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all active:scale-95 ${
              active
                ? 'bg-[#e8762b] text-white shadow-sm'
                : 'bg-transparent text-[#574238] hover:bg-white'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
