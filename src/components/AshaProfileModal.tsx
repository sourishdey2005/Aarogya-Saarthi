import { useTranslate } from '../i18n/LanguageContext';
import React from 'react';

interface AshaProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  syncedCount: number;
  unsyncedCount: number;
}

export const AshaProfileModal: React.FC<AshaProfileModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onToggleOnline,
  syncedCount,
  unsyncedCount
}) => {
  const tr = useTranslate();
  if (!isOpen) return null;

  return tr(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#ffffff] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-[#d9e3f6] rounded-full mx-auto mb-4 sm:hidden"></div>

        <div className="flex items-center justify-between pb-3 border-b border-[#e6eeff]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#9c4500] text-white flex items-center justify-center font-bold text-xl shadow-md">
              SD
            </div>
            <div>
              <h3 className="font-headline-sm text-[18px] text-[#121c2a] font-bold">
                सुनीता देवी (Sunita Devi)
              </h3>
              <p className="text-[12px] text-[#574238]">ASHA कार्यकर्ता • ID: ASHA-BR-4091</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#121c2a] flex items-center justify-center hover:bg-[#dee9fc]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Center Details */}
        <div className="my-4 space-y-3">
          <div className="bg-[#eff4ff] p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#00696b] text-[22px]">
                domain
              </span>
              <div>
                <p className="text-[13px] font-bold text-[#121c2a]">रामपुर प्राथमिक स्वास्थ्य केंद्र (PHC)</p>
                <p className="text-[11px] text-[#574238]">उप-केंद्र: रामपुर वार्ड ४ • जिला: समस्तीपुर</p>
              </div>
            </div>
            <span className="bg-[#8ff3f4]/40 text-[#004f51] text-[11px] font-bold px-2 py-0.5 rounded">
              सक्रिय
            </span>
          </div>

          {/* Area & Coverage Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-[#eff4ff] p-3 rounded-xl">
              <span className="text-[20px] font-bold text-[#9c4500]">४२०</span>
              <p className="text-[11px] text-[#574238] font-medium">कुल परिवार (Households)</p>
            </div>
            <div className="bg-[#eff4ff] p-3 rounded-xl">
              <span className="text-[20px] font-bold text-[#006d38]">१,८४०</span>
              <p className="text-[11px] text-[#574238] font-medium">कुल जनसंख्या (Population)</p>
            </div>
          </div>

          {/* Network Simulator Toggle */}
          <div className="bg-[#f8f9ff] border border-[#d9e3f6] p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`material-symbols-outlined text-[22px] ${
                  isOnline ? 'text-[#006d38]' : 'text-[#ba1a1a]'
                }`}
              >
                {isOnline ? 'wifi' : 'wifi_off'}
              </span>
              <div>
                <p className="text-[13px] font-bold text-[#121c2a]">
                  नेटवर्क स्थिति: {isOnline ? 'ऑनलाइन (Online)' : 'ऑफ़लाइन मोड (Offline Mode)'}
                </p>
                <p className="text-[11px] text-[#574238]">
                  ग्रामीण क्षेत्र में बिना इंटरनेट भी सुरक्षित काम करें
                </p>
              </div>
            </div>
            <button
              onClick={onToggleOnline}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isOnline
                  ? 'bg-[#006d38] text-white hover:bg-[#005229]'
                  : 'bg-[#ba1a1a] text-white hover:bg-[#93000a]'
              }`}
            >
              {isOnline ? 'बंद करें' : 'चालू करें'}
            </button>
          </div>

          {/* Offline Storage Status */}
          <div className="bg-[#eff4ff] p-3.5 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-[12px]">
              <span className="font-semibold text-[#121c2a] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00696b]">
                  sd_card
                </span>
                फ़ोन मेमोरी सुरक्षित रिकॉर्ड्स:
              </span>
              <span className="font-bold text-[#00696b]">{syncedCount + unsyncedCount} रिकॉर्ड्स</span>
            </div>
            <div className="w-full bg-[#d9e3f6] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#006d38] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((syncedCount) / Math.max(1, syncedCount + unsyncedCount)) * 100}%`
                }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-[#574238]">
              <span>सिंक पूर्ण: {syncedCount}</span>
              <span className="text-[#9c4500] font-semibold">सिंक बाकी: {unsyncedCount}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-[#e8762b] text-white rounded-xl font-bold text-[14px] shadow-md hover:brightness-105 active:scale-98 transition-all"
        >
          बंद करें (Close)
        </button>
      </div>
    </div>
  );
};
