import { useTranslate } from '../i18n/LanguageContext';
import React from 'react';
import { HomeVisitTask } from '../types';

interface HomeVisitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visits: HomeVisitTask[];
  onToggleComplete: (id: string) => void;
}

export const HomeVisitsModal: React.FC<HomeVisitsModalProps> = ({
  isOpen,
  onClose,
  visits,
  onToggleComplete
}) => {
  const tr = useTranslate();
  if (!isOpen) return null;

  return tr(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#ffffff] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-[#d9e3f6] rounded-full mx-auto mb-3 sm:hidden"></div>

        <div className="flex items-center justify-between pb-3 border-b border-[#e6eeff]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#8ff3f4]/40 text-[#00696b] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">home_health</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-[17px] text-[#121c2a] font-bold">
                वार्ड ४ - आज की गृह विज़िट
              </h3>
              <p className="text-[12px] text-[#574238]">३ परिवारों में फॉलो-अप आवश्यक</p>
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
          {visits.map((visit) => (
            <div
              key={visit.id}
              className={`p-3.5 rounded-xl border transition-all ${
                visit.completed
                  ? 'bg-[#eff4ff]/60 border-[#d9e3f6] opacity-75'
                  : visit.isUrgent
                  ? 'bg-[#ffdad6]/20 border-[#ffdad6]'
                  : 'bg-[#eff4ff] border-transparent shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => onToggleComplete(visit.id)}
                    className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center border transition-all ${
                      visit.completed
                        ? 'bg-[#006d38] border-[#006d38] text-white'
                        : 'border-[#8a7266] bg-white text-transparent hover:border-[#006d38]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </button>
                  <div>
                    <h4
                      className={`text-[15px] font-bold ${
                        visit.completed
                          ? 'line-through text-[#574238]'
                          : 'text-[#121c2a]'
                      }`}
                    >
                      {visit.familyHead}
                    </h4>
                    <p className="text-[12px] text-[#00696b] font-medium mt-0.5">
                      {visit.reasonHi}
                    </p>
                    <p className="text-[11px] text-[#574238] mt-0.5">{visit.reasonEn}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-[#d9e3f6] text-[#574238] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        {visit.dueTime}
                      </span>
                      <span className="text-[11px] text-[#574238]">{visit.ward}</span>
                    </div>
                  </div>
                </div>

                {visit.isUrgent && !visit.completed && (
                  <span className="bg-[#ba1a1a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                    ज़रूरी
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-[#00696b] text-white rounded-xl font-bold text-[14px] shadow-md hover:bg-[#004f51] active:scale-98 transition-all"
        >
          ठीक है, समझ गए (Done)
        </button>
      </div>
    </div>
  );
};
