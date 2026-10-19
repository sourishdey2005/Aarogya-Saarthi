import React from 'react';
import { Screen } from '../types';
import { useLang , useTranslate} from '../i18n/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

interface HeaderProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onOpenProfile: () => void;
  unsyncedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  onOpenProfile,
  unsyncedCount
}) => {
  const tr = useTranslate();
  const { lang, toggleLang } = useLang();
  const isSubScreen = currentScreen === 'registration' || currentScreen === 'referral';

  const getSubScreenTitle = () => {
    switch (currentScreen) {
      case 'registration':
        return 'New Registration';
      case 'referral':
        return 'Emergency Referral';
      default:
        return 'आरोग्य-सारथी';
    }
  };

  return tr(
    <header className="sticky top-0 z-50 bg-[#f8f9ff]/90 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e6eeff]/60">
      <div className="max-w-md lg:max-w-6xl mx-auto h-16 lg:h-20 px-4 flex items-center justify-between gap-2">
        {isSubScreen ? (
          <div className="flex items-center gap-1 min-w-0">
            <button
              aria-label="Go back"
              className="w-12 h-12 -ml-2 rounded-full flex items-center justify-center text-[#121c2a] hover:bg-[#d9e3f6]/40 active:scale-95 transition-all"
              onClick={() => onNavigate('home')}
            >
              <span className="material-symbols-outlined text-[28px]">arrow_back</span>
            </button>
            <div className="flex flex-col text-left min-w-0">
              <h1 className="font-headline-sm text-[18px] text-[#121c2a] leading-tight truncate max-w-[180px]">
                {getSubScreenTitle()}
              </h1>
              <span className="font-label-sm text-[12px] text-[#574238] leading-none">
                आरोग्य-सारथी • रामपुर
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => onNavigate('home')}
              className="w-11 h-11 rounded-full bg-[#9c4500] flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(156,69,0,0.2)] active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-white text-[22px]">local_hospital</span>
            </button>
            <div className="flex flex-col text-left min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-headline-sm text-[18px] text-[#121c2a] leading-tight font-bold">
                  आरोग्य-सारथी
                </span>
              </div>
              <span className="font-label-sm text-[12px] text-[#574238] leading-none">
                सुनीता देवी • रामपुर
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {unsyncedCount > 0 ? (
            <button
              onClick={() => onNavigate('sync')}
              className="flex items-center gap-1.5 bg-[#e6eeff] px-2.5 py-1.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.04)] active:scale-95 transition-all"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#e8762b] animate-pulse"></span>
              <span className="font-label-sm text-[12px] font-semibold text-[#9c4500]">
                {unsyncedCount} बाकी
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#e6eeff] px-3 py-1.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3ba965] animate-pulse"></span>
              <span className="font-label-sm text-[12px] font-semibold text-[#006d38]">
                सिंक हुआ
              </span>
            </div>
          )}

          {/* Compact language switch for phones */}
          <button
            type="button"
            onClick={toggleLang}
            title="भाषा बदलें / Change language"
            aria-label="भाषा बदलें / Change language"
            className="lg:hidden flex items-center gap-1 bg-[#e6eeff] px-2.5 py-1.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.04)] text-[#9c4500] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">language</span>
            <span className="font-label-sm text-[12px] font-bold">
              {lang === 'hi' ? 'EN' : 'हिं'}
            </span>
          </button>

          {/* Full language switch for laptops */}
          <div className="hidden lg:block">
            <LanguageToggle />
          </div>

          <button
            aria-label="Profile"
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-[#9c4500] flex items-center justify-center text-white active:scale-90 transition-transform shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
