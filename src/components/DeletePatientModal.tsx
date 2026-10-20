import React from 'react';

interface DeletePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  patientName: string;
}

export const DeletePatientModal: React.FC<DeletePatientModalProps> = ({
  isOpen,
  onClose,
  onDelete,
  patientName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#ffffff] w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl">
        <div className="w-12 h-1.5 bg-[#d9e3f6] rounded-full mx-auto mb-3 sm:hidden"></div>

        <div className="flex items-center justify-between pb-3 border-b border-[#e6eeff]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#ffdbca] text-[#ba1a1a] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">delete</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-[16px] text-[#121c2a] font-bold">
                Delete patient
              </h3>
              <p className="text-[12px] text-[#574238]">
                {patientName}
              </p>
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
          <p className="text-[13px] text-[#475569] leading-relaxed">
            Deleting this patient will also remove all their symptom logs and
            prescriptions. This cannot be undone.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-[#eff4ff] text-[#574238] font-bold text-[14px] rounded-xl hover:bg-[#dee9fc]"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            className="flex-1 py-3 bg-[#ba1a1a] text-white font-bold text-[14px] rounded-xl shadow-md hover:bg-[#991b1b] active:scale-98 transition-all"
          >
            Delete patient
          </button>
        </div>
      </div>
    </div>
  );
};
