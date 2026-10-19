import { useTranslate } from '../i18n/LanguageContext';
import React, { useState } from 'react';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (note: string) => void;
  patientName: string;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  onClose,
  onSaveNote,
  patientName
}) => {
  const tr = useTranslate();
  const [noteText, setNoteText] = useState('मरीज़ को कल रात से तेज़ कंपकंपी थी। बीपी 145/95 दर्ज हुआ।');
  const [isListening, setIsListening] = useState(false);

  if (!isOpen) return null;

  const handleStartVoice = () => {
    setIsListening(true);
    setTimeout(() => {
      setNoteText((prev) => prev + ' परिजन को 24 घंटे में PHC जाने को कहा गया है।');
      setIsListening(false);
    }, 2000);
  };

  const handleSave = () => {
    if (noteText.trim()) {
      onSaveNote(noteText.trim());
      onClose();
    }
  };

  return tr(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#ffffff] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
        <div className="w-12 h-1.5 bg-[#d9e3f6] rounded-full mx-auto mb-3 sm:hidden"></div>

        <div className="flex items-center justify-between pb-3 border-b border-[#e6eeff]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#ffdbca] text-[#9c4500] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">note_add</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-[16px] text-[#121c2a] font-bold">
                ASHA विशेष टिप्पणी
              </h3>
              <p className="text-[12px] text-[#574238]">{patientName} हेतु नोट</p>
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
          <div className="relative">
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="मरीज़ की स्थिति या विशेष निर्देश दर्ज करें..."
              className="w-full bg-[#eff4ff] p-3.5 rounded-xl border border-[#d9e3f6] text-[14px] text-[#121c2a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#e8762b]"
            />
            <button
              type="button"
              onClick={handleStartVoice}
              className={`absolute right-3 bottom-4 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all ${
                isListening
                  ? 'bg-[#ba1a1a] text-white animate-pulse'
                  : 'bg-[#ffdbca] text-[#9c4500] hover:bg-[#e8762b] hover:text-white'
              }`}
              title="बोलकर लिखें"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isListening ? 'graphic_eq' : 'mic'}
              </span>
            </button>
          </div>

          {isListening && (
            <p className="text-[12px] text-[#9c4500] font-semibold flex items-center gap-1.5 animate-pulse">
              <span className="material-symbols-outlined text-[16px]">record_voice_over</span>
              सुन रहे हैं... बोलिए
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-[#574238] font-medium w-full">तुरंत जोड़ने हेतु:</span>
            {[
              'दवा समय पर लेने को कहा',
              'तापमान 102°F था',
              'आशा सुपरवाइज़र को सूचित किया',
              'ORS घोल दिया गया'
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setNoteText((prev) => (prev ? `${prev} • ${tag}` : tag))}
                className="bg-[#eff4ff] hover:bg-[#dee9fc] text-[#121c2a] text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[#d9e3f6]"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#eff4ff] text-[#574238] font-bold text-[14px] rounded-xl hover:bg-[#dee9fc]"
          >
            रद्द करें
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-[#006d38] text-white font-bold text-[14px] rounded-xl shadow-md hover:bg-[#005229] active:scale-98 transition-all"
          >
            सुरक्षित करें (Save)
          </button>
        </div>
      </div>
    </div>
  );
};
