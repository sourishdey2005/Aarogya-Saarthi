import React, { useState } from 'react';
import { Patient, PrescriptionScan } from '../types';

interface SyncScreenProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  patients: Patient[];
  prescriptions: PrescriptionScan[];
  onSyncAll: () => void;
  showToast: (msg: string) => void;
}

export const SyncScreen: React.FC<SyncScreenProps> = ({
  isOnline,
  onToggleOnline,
  patients,
  prescriptions,
  onSyncAll,
  showToast
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('आज, 09:45 AM');

  const unsyncedPatients = patients.filter((p) => !p.isSynced);
  const unsyncedPrescriptions = prescriptions.filter((rx) => !rx.isSynced);
  const totalUnsynced = unsyncedPatients.length + unsyncedPrescriptions.length;

  const handleStartSync = () => {
    if (!isOnline) {
      showToast('⚠️ आप ऑफ़लाइन हैं! सिंक करने के लिए ऑनलाइन मोड चालू करें।');
      return;
    }

    if (totalUnsynced === 0) {
      showToast('सभी रिकॉर्ड्स पहले से सिंक हैं!');
      return;
    }

    setIsSyncing(true);
    showToast('PHC सर्वर से कनेक्ट किया जा रहा है...');

    setTimeout(() => {
      onSyncAll();
      setIsSyncing(false);
      setLastSyncTime('अभी-अभी (' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ')');
      showToast('✓ सभी रिकॉर्ड्स PHC पोर्टल पर सफलतापूर्वक सिंक हो गए!');
    }, 1800);
  };

  return (
    <div className="flex flex-col w-full gap-4 pb-28">
      {/* Network Status Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e6eeff]/60">
        <div className="flex items-center justify-between pb-3 border-b border-[#e6eeff]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOnline
                  ? 'bg-[#8df9ac]/40 text-[#006d38]'
                  : 'bg-[#ffdad6] text-[#ba1a1a]'
              }`}
            >
              <span className="material-symbols-outlined text-[24px]">
                {isOnline ? 'wifi' : 'wifi_off'}
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-[16px] text-[#121c2a] font-bold">
                {isOnline ? 'इंटरनेट कनेक्टेड (Online)' : 'ऑफ़लाइन मोड सक्रिय (Offline)'}
              </h2>
              <p className="text-[12px] text-[#574238]">
                {isOnline
                  ? 'रामपुर PHC सर्वर से सीधा संपर्क उपलब्ध'
                  : 'डेटा स्थानीय मेमोरी में सुरक्षित रूप से जमा हो रहा है'}
              </p>
            </div>
          </div>

          <button
            onClick={onToggleOnline}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
              isOnline
                ? 'bg-[#006d38] text-white'
                : 'bg-[#ba1a1a] text-white'
            }`}
          >
            {isOnline ? 'ऑनलाइन' : 'ऑफ़लाइन'}
          </button>
        </div>

        {/* Sync Summary Row */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-center">
          <div className="bg-[#eff4ff] p-3 rounded-xl border border-[#d9e3f6]/40">
            <span className="text-[20px] font-bold text-[#e8762b]">{totalUnsynced}</span>
            <p className="text-[11px] text-[#574238]">सिंक होने बाकी रिकॉर्ड्स</p>
          </div>
          <div className="bg-[#eff4ff] p-3 rounded-xl border border-[#d9e3f6]/40">
            <span className="text-[20px] font-bold text-[#006d38]">
              {patients.length + prescriptions.length - totalUnsynced}
            </span>
            <p className="text-[11px] text-[#574238]">PHC सर्वर पर सुरक्षित</p>
          </div>
        </div>

        {/* Primary Sync Button */}
        <button
          onClick={handleStartSync}
          disabled={isSyncing}
          className={`w-full mt-4 min-h-[56px] rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-md transition-all ${
            isSyncing
              ? 'bg-[#8a7266] text-white cursor-wait'
              : totalUnsynced === 0
              ? 'bg-[#006d38] text-white'
              : 'bg-[#e8762b] text-white hover:brightness-105 active:scale-98'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[24px] ${
              isSyncing ? 'animate-spin' : ''
            }`}
          >
            {isSyncing ? 'sync' : totalUnsynced === 0 ? 'check_circle' : 'cloud_sync'}
          </span>
          <div className="flex flex-col text-left">
            <span className="leading-tight">
              {isSyncing
                ? 'PHC सर्वर पर अपलोड हो रहा है...'
                : totalUnsynced === 0
                ? 'सिंक पूर्ण है (All Synced)'
                : 'अभी सभी सिंक करें (Sync All Now)'}
            </span>
            <span className="text-[10.5px] opacity-90 leading-none">
              अंतिम सिंक: {lastSyncTime}
            </span>
          </div>
        </button>
      </div>

      {/* Unsynced Queue List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-headline-sm text-[16px] text-[#121c2a] font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#e8762b] text-[20px]">
              pending_actions
            </span>
            <span>कतार में लंबित रिकॉर्ड्स (Sync Queue)</span>
          </h3>
          <span className="text-[12px] text-[#574238]">{totalUnsynced} लंबित</span>
        </div>

        {totalUnsynced === 0 ? (
          <div className="bg-white p-6 rounded-xl text-center border border-[#e6eeff]/60">
            <div className="w-12 h-12 rounded-full bg-[#8df9ac]/40 text-[#006d38] mx-auto flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[28px]">done_all</span>
            </div>
            <p className="text-[15px] font-bold text-[#121c2a]">कोई नया डेटा लंबित नहीं है</p>
            <p className="text-[12px] text-[#574238] mt-0.5">
              आपके द्वारा दर्ज सभी मरीज़ और पर्चे PHC पोर्टल पर सुरक्षित पहुँच चुके हैं।
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Unsynced Patients */}
            {unsyncedPatients.map((p) => (
              <div
                key={p.id}
                className="bg-white p-3.5 rounded-xl border border-[#ffdbca] shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#ffdbca] text-[#9c4500] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-[#121c2a]">
                      मरीज़ पंजीकरण: {p.nameHi}
                    </p>
                    <p className="text-[11px] text-[#574238]">
                      {p.rchId} • {p.ward}
                    </p>
                  </div>
                </div>
                <span className="bg-[#ffdbca] text-[#773300] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  लंबित
                </span>
              </div>
            ))}

            {/* Unsynced Prescriptions */}
            {unsyncedPrescriptions.map((rx) => (
              <div
                key={rx.id}
                className="bg-white p-3.5 rounded-xl border border-[#ffdbca] shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#8ff3f4] text-[#00696b] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">document_scanner</span>
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-[#121c2a]">
                      पर्चा स्कैन: {rx.patientName}
                    </p>
                    <p className="text-[11px] text-[#574238]">
                      {rx.opdNumber} • {rx.medicines.length} दवाइयां
                    </p>
                  </div>
                </div>
                <span className="bg-[#ffdbca] text-[#773300] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  लंबित
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Safety & Encryption Guarantee */}
      <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#d9e3f6] flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[#00696b] text-[20px] mt-0.5">
          lock
        </span>
        <div className="text-[12px] text-[#574238] leading-snug">
          <p className="font-semibold text-[#121c2a]">२५६-बिट सुरक्षित डेटा एन्क्रिप्शन</p>
          <p className="mt-0.5">
            ग्रामीण स्वास्थ्य डेटा राष्ट्रीय स्वास्थ्य मिशन (NHM) एवं राज्य स्वास्थ्य समिति के मानकों
            के अनुसार एन्क्रिप्टेड है।
          </p>
        </div>
      </div>
    </div>
  );
};
