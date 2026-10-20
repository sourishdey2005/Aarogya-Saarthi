import React from 'react';
import { Screen } from '../types';
import { useTranslate} from '../i18n/LanguageContext';
import { workerDisplayId, type AuthWorker } from '../lib/api';

interface SidebarProps {
 currentScreen: Screen;
 onNavigate: (screen: Screen) => void;
 onOpenProfile: () => void;
 onSignOut: () => void;
 isOnline: boolean;
 onToggleOnline: () => void;
 unsyncedCount: number;
 worker?: AuthWorker | null;
}

const NAV_ITEMS: {
 id: Screen;
 icon: string;
 hi: string;
 en: string;
}[] = [
 { id: 'home', icon: 'cottage', hi: 'Home', en: 'Home' },
 { id: 'patients', icon: 'groups', hi: 'Patients', en: 'Patients' },
 { id: 'scan', icon: 'document_scanner', hi: 'Scan', en: 'Scan' },
 { id: 'sync', icon: 'sync_saved_locally', hi: 'Sync', en: 'Sync' },
];

/**
 * Persistent navigation rail for laptop / desktop viewports. On phones the
 * bottom tab bar is used instead.
 */
export const Sidebar: React.FC<SidebarProps> = ({
 currentScreen,
 onNavigate,
 onOpenProfile,
 onSignOut,
 isOnline,
 onToggleOnline,
 unsyncedCount,
 worker,
}) => {
  const tr = useTranslate();

  return tr(
 <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 lg:self-start border-r border-[#e6eeff] bg-white/70 backdrop-blur-xl">
 <div className="flex items-center gap-3 px-5 pt-6 pb-4">
 <div className="w-11 h-11 rounded-full bg-[#9c4500] flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(156,69,0,0.2)]">
 <span className="material-symbols-outlined text-white text-[22px]">local_hospital</span>
 </div>
 <div className="flex flex-col text-left">
 <span className="font-headline-sm text-[18px] text-[#121c2a] leading-tight font-bold">
 Aarogya Sarathi
 </span>
 <span className="font-label-sm text-[12px] text-[#574238] leading-none">
 {worker?.name ?? 'Aarogya Sarathi'}
 {worker?.village ? ` • ${worker.village}` : ''}
 </span>
 </div>
 </div>



 <nav className="flex-1 px-3 space-y-1">
 {NAV_ITEMS.map((item) => {
 const active = currentScreen === item.id;
 return (
 <button
 key={item.id}
 type="button"
 onClick={() => onNavigate(item.id)}
 className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all active:scale-[0.98] ${
 active
 ? 'bg-[#e8762b] text-white shadow-md'
 : 'text-[#574238] hover:bg-[#eff4ff]'
 }`}
 >
 <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
 <span className="flex flex-col leading-tight">
  <span className="font-headline-sm text-[14px] font-semibold">
  {item.en}
  </span>
  <span className="font-label-sm text-[11px] opacity-80">
  </span>
 </span>
 {item.id === 'sync' && unsyncedCount > 0 && (
 <span className="ml-auto bg-[#9c4500] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
 {unsyncedCount}
 </span>
 )}
 </button>
 );
 })}

 <button
 type="button"
 onClick={() => onNavigate('registration')}
 className="w-full mt-3 min-h-[48px] rounded-xl bg-[#e8762b] text-white font-bold flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-95 transition-all"
 >
 <span className="material-symbols-outlined text-[20px]">mic</span>
 <span className="flex flex-col items-start leading-tight">
 <span className="font-headline-sm text-[14px]">Add New Patient</span>
 <span className="font-label-sm text-[10.5px] opacity-90">Add New Patient</span>
 </span>
 </button>
 </nav>

 <div className="px-4 py-4 space-y-3 border-t border-[#e6eeff]">
 <button
 type="button"
 onClick={onToggleOnline}
 className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all ${
 isOnline ? 'bg-[#eff4ff] text-[#006d38]' : 'bg-[#ffdad6] text-[#ba1a1a]'
 }`}
 >
 <span className="material-symbols-outlined text-[20px]">
 {isOnline ? 'wifi' : 'wifi_off'}
 </span>
 <span className="flex flex-col leading-tight">
 <span className="font-label-md text-[13px] font-bold">
 {isOnline ? 'Online' : ''}
 </span>
 <span className="font-label-sm text-[11px] opacity-80">
 {isOnline ? 'Online' : 'Offline'}
 </span>
 </span>
 </button>

 <button
 type="button"
 onClick={onSignOut}
 className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dee9fc] transition-all text-left"
 >
 <span className="material-symbols-outlined text-[20px] text-[#9c4500]">logout</span>
 <span className="flex flex-col leading-tight">
 <span className="font-label-md text-[13px] font-bold text-[#121c2a]">
 (Sign out)
 </span>
 <span className="font-label-sm text-[11px] text-[#574238]">Sign out of this device</span>
 </span>
 </button>

 <button
 type="button"
 onClick={onOpenProfile}
 className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#f8f9ff] hover:bg-[#eff4ff] transition-all text-left"
 >
 <div className="w-8 h-8 rounded-full bg-[#9c4500] text-white flex items-center justify-center flex-shrink-0">
 <span className="material-symbols-outlined text-[18px]">person</span>
 </div>
 <span className="flex flex-col leading-tight">
 <span className="font-label-md text-[13px] font-bold text-[#121c2a]">
 {worker?.name ?? 'ASHA Worker'}
 </span>
 <span className="font-label-sm text-[11px] text-[#574238]">
 {workerDisplayId(worker) || 'ASHA'}
 {worker?.village ? ` • ${worker.village}` : ''}
 </span>
 </span>
 </button>
 </div>
 </aside>
 );
};
