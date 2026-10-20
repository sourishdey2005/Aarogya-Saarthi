import React from 'react';
import { Screen } from '../types';
import { useTranslate} from '../i18n/LanguageContext';

interface BottomNavProps {
 currentScreen: Screen;
 onNavigate: (screen: Screen) => void;
 unsyncedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
 currentScreen,
 onNavigate,
 unsyncedCount
}) => {
  const tr = useTranslate();

  const tabs = [
 {
 id: 'home' as Screen,
 labelHi: 'Home',
 labelEn: 'Home',
 icon: 'cottage'
 },
 {
 id: 'patients' as Screen,
 labelHi: 'Patients',
 labelEn: 'Patients',
 icon: 'groups'
 },
 {
 id: 'scan' as Screen,
 labelHi: 'Scan',
 labelEn: 'Scan',
 icon: 'document_scanner'
 },
 {
 id: 'sync' as Screen,
 labelHi: 'Sync',
 labelEn: 'Sync',
 icon: 'sync_saved_locally',
 badge: unsyncedCount > 0 ? unsyncedCount : undefined
 }
 ];

 return tr(
 <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#f8f9ff]/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.06)] border-t border-[#e6eeff]">
 <div className="max-w-md mx-auto flex justify-around items-center h-20 px-2">
 {tabs.map((tab) => {
 const isActive = currentScreen === tab.id;
  const primary = tab.labelEn;
  const secondary = '';
 return (
 <button
 key={tab.id}
 onClick={() => onNavigate(tab.id)}
 className={`flex flex-col items-center justify-center min-w-[68px] min-h-[56px] py-1 transition-all active:scale-95 relative ${
 isActive
 ? 'text-[#9c4500] font-bold'
 : 'text-[#574238]/80 hover:text-[#121c2a]'
 }`}
 >
 <div className="relative">
 <span
 className="material-symbols-outlined text-[26px]"
 style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
 >
 {tab.icon}
 </span>
 {tab.badge && (
 <span className="absolute -top-1 -right-2 bg-[#e8762b] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
 {tab.badge}
 </span>
 )}
 </div>
 <span className="font-headline-sm text-[12px] leading-tight mt-0.5">
 {primary}
 </span>
 <span className="font-label-sm text-[10px] leading-none opacity-80">
 {secondary}
 </span>
 </button>
 );
 })}
 </div>
 </nav>
 );
};
