import { useTranslate } from '../i18n/LanguageContext';
import React, { useState } from 'react';
import { Patient, Screen } from '../types';

interface PatientsScreenProps {
 patients: Patient[];
 onSelectPatient: (patient: Patient) => void;
 onNavigate: (screen: Screen) => void;
}

export const PatientsScreen: React.FC<PatientsScreenProps> = ({
 patients,
 onSelectPatient,
 onNavigate
}) => {
 const tr = useTranslate();
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedFilter, setSelectedFilter] = useState<'all' | 'high_risk' | 'pending' | 'synced'>('all');

 const filteredPatients = patients.filter((patient) => {
 const matchesSearch =
 patient.nameHi.toLowerCase().includes(searchTerm.toLowerCase()) ||
 patient.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
 patient.rchId.toLowerCase().includes(searchTerm.toLowerCase());

 if (!matchesSearch) return false;

 if (selectedFilter === 'high_risk') return patient.isHighRisk;
 if (selectedFilter === 'pending') return !patient.isSynced;
 if (selectedFilter === 'synced') return patient.isSynced;
 return true;
 });

 return tr(
 <div className="flex flex-col w-full gap-4 pb-28 screen-layout">
 {/* Header bar */}
 <div className="lg-span-2 bg-white p-4 rounded-xl shadow-sm border border-[#e6eeff]/60">
 <div className="flex items-center justify-between mb-3">
 <div>
 <h2 className="font-headline-md text-[20px] text-[#121c2a] font-bold">
 Patient Directory
 </h2>
 <p className="font-label-sm text-[12px] text-[#574238]">
 Rampur sub-centre • Total {patients.length} registered patients
 </p>
 </div>
 <button
 onClick={() => onNavigate('registration')}
 className="px-3.5 py-2 bg-[#e8762b] text-white rounded-xl text-[12px] font-bold flex items-center gap-1 shadow-sm hover:brightness-105 active:scale-95 transition-all"
 >
 <span className="material-symbols-outlined text-[18px]">add</span>
 <span>New patient</span>
 </button>
 </div>

 {/* Search input */}
 <div className="relative">
 <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8a7266] text-[20px]">
 search
 </span>
 <input
 type="text"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 placeholder="Search by name or RCH number..."
 className="w-full bg-[#eff4ff] pl-10 pr-4 py-2.5 rounded-xl text-[14px] text-[#121c2a] placeholder-[#8a7266] border border-[#d9e3f6] focus:outline-none focus:ring-2 focus:ring-[#e8762b] focus:bg-white"
 />
 {searchTerm && (
 <button
 onClick={() => setSearchTerm('')}
 className="absolute right-3 top-2.5 text-[#8a7266]"
 >
 <span className="material-symbols-outlined text-[18px]">close</span>
 </button>
 )}
 </div>

 {/* Filter buttons */}
 <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
 {[
 { id: 'all' as const, label: 'All' },
 { id: 'high_risk' as const, label: '⚠️ High Risk' },
 { id: 'pending' as const, label: 'Pending Sync' },
 { id: 'synced' as const, label: '✓ Synced' }
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setSelectedFilter(tab.id)}
 className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all ${
 selectedFilter === tab.id
 ? 'bg-[#00696b] text-white shadow-sm'
 : 'bg-[#eff4ff] text-[#574238] hover:bg-[#dee9fc]'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>
 </div>

 {/* Patients List */}
 <div className="space-y-3">
 {filteredPatients.length === 0 ? (
 <div className="bg-white p-8 rounded-xl text-center border border-[#e6eeff]/60">
 <span className="material-symbols-outlined text-[44px] text-[#8a7266] mb-2">
 person_search
 </span>
 <p className="text-[15px] font-bold text-[#121c2a]">No patient found</p>
 <p className="text-[12px] text-[#574238] mt-1">
 Please try another name or filter.
 </p>
 </div>
 ) : (
 filteredPatients.map((patient) => (
 <div
 key={patient.id}
 onClick={() => onSelectPatient(patient)}
 className="bg-white rounded-xl p-4 shadow-sm border border-[#e6eeff]/60 hover:border-[#8ff3f4] active:scale-[0.99] transition-all cursor-pointer flex flex-col gap-2.5 relative overflow-hidden"
 >
 {patient.isHighRisk && (
 <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#ba1a1a]"></div>
 )}

 <div className="flex items-start justify-between gap-3 pl-1">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#dee9fc] flex-shrink-0 flex items-center justify-center shadow-inner">
 {patient.photoUrl ? (
 <img
 src={patient.photoUrl}
 alt={patient.nameEn}
 className="w-full h-full object-cover"
 referrerPolicy="no-referrer"
 />
 ) : (
 <span className="material-symbols-outlined text-[#00696b] text-[26px]">
 person
 </span>
 )}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="font-headline-sm text-[16px] text-[#121c2a] font-bold">
 {patient.nameHi}
 </h3>
 {patient.isHighRisk && (
 <span className="bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold px-1.5 py-0.2 rounded-full">
 High Risk
 </span>
 )}
 </div>
 <p className="text-[12px] text-[#574238]">
 {patient.nameEn} • {patient.age} years • {patient.ward}
 </p>
 </div>
 </div>

 <div className="text-right flex flex-col items-end">
 <span className="text-[11px] font-bold bg-[#eff4ff] text-[#00696b] px-2 py-0.5 rounded border border-[#d9e3f6]">
 {patient.rchId}
 </span>
 <span className="text-[10px] text-[#8a7266] mt-1">{patient.lastVisit}</span>
 </div>
 </div>

 {/* Symptoms badges */}
 <div className="flex flex-wrap gap-1.5 pl-1">
 {patient.symptoms.map((s) => (
 <span
 key={s.id}
 className="text-[11px] bg-[#eff4ff] text-[#121c2a] px-2 py-0.5 rounded-lg border border-[#d9e3f6]/40"
 >
 {s.nameHi}
 </span>
 ))}
 </div>

 {/* Card Footer Action */}
 <div className="flex items-center justify-between pt-2 border-t border-[#e6eeff] pl-1">
 <div className="flex items-center gap-1.5">
 <span
 className={`w-2 h-2 rounded-full ${
 patient.isSynced ? 'bg-[#006d38]' : 'bg-[#e8762b] animate-pulse'
 }`}
 ></span>
 <span className="text-[11px] text-[#574238]">
 {patient.isSynced ? 'Synced' : 'Saved offline'}
 </span>
 </div>

 <div className="flex items-center gap-1 text-[#00696b] text-[12px] font-bold">
 <span>View triage & referral</span>
 <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
};
