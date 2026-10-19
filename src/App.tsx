import { useState } from 'react';
import { Screen, Patient, PrescriptionScan, HomeVisitTask } from './types';
import { INITIAL_PATIENTS, INITIAL_PRESCRIPTION_SCANS, INITIAL_HOME_VISITS } from './data/mockData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { AshaProfileModal } from './components/AshaProfileModal';
import { HomeVisitsModal } from './components/HomeVisitsModal';
import { AddNoteModal } from './components/AddNoteModal';
import { WhatsAppShareModal } from './components/WhatsAppShareModal';
import { HomeScreen } from './screens/HomeScreen';
import { RegistrationScreen } from './screens/RegistrationScreen';
import { ScanScreen } from './screens/ScanScreen';
import { ReferralScreen } from './screens/ReferralScreen';
import { PatientsScreen } from './screens/PatientsScreen';
import { SyncScreen } from './screens/SyncScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [prescriptions, setPrescriptions] = useState<PrescriptionScan[]>(INITIAL_PRESCRIPTION_SCANS);
  const [homeVisits, setHomeVisits] = useState<HomeVisitTask[]>(INITIAL_HOME_VISITS);
  const [selectedPatient, setSelectedPatient] = useState<Patient>(INITIAL_PATIENTS[0]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHomeVisitsOpen, setIsHomeVisitsOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const unsyncedPatientsCount = patients.filter((p) => !p.isSynced).length;
  const unsyncedPrescriptionsCount = prescriptions.filter((rx) => !rx.isSynced).length;
  const totalUnsynced = unsyncedPatientsCount + unsyncedPrescriptionsCount;
  const totalSynced = patients.length + prescriptions.length - totalUnsynced;

  const handleToggleOnline = () => {
    setIsOnline((prev) => {
      const next = !prev;
      showToast(next ? 'ऑनलाइन मोड चालू: सर्वर कनेक्शन सक्रिय' : 'ऑफ़लाइन मोड: डेटा स्थानीय मेमोरी में सुरक्षित');
      return next;
    });
  };

  const handleToggleVisitComplete = (id: string) => {
    setHomeVisits((prev) =>
      prev.map((v) => (v.id === id ? { ...v, completed: !v.completed } : v))
    );
    showToast('गृह विज़िट स्थिति अपडेट की गई');
  };

  const handleSavePatientAndContinue = (patientData: Partial<Patient>) => {
    const newPatient: Patient = {
      id: `p-${Date.now()}`,
      rchId: 'RCH-' + Math.floor(1000 + Math.random() * 9000),
      nameHi: patientData.nameHi || 'कमला देवी',
      nameEn: patientData.nameEn || 'Kamla Devi',
      age: patientData.age || 42,
      gender: patientData.gender || 'female',
      ward: patientData.ward || 'रामपुर केंद्र (Ward 4)',
      photoUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDnxJqC0Pa6-pUCGC68IZUtA5T_Fa-BRxOlVdA93uTJars9feBKeZCYx1KgINB7iAxJO0gJMh236vfEjbkPo7KzHzW4dEeWlb54Bn6FOGEv2dvhJCb8LB4-Kq_83ZbWJoaD7BjMi71kbspFMZ0ZiO9G31WSXEPzgd7eVLrxT5123m_DlxPqHQLaPcL2WfCkqq24Ii1jWkoTSFkXpYIvKKeqbCKswo7fj_tQjzARu6hWoDIPKMqEJXfJHA',
      symptoms: patientData.symptoms || [],
      triageLevel: (patientData.triageLevel as 1 | 2 | 3) || 2,
      lastVisit: 'आज, सुबह 10:15 AM',
      isHighRisk: true,
      status: 'referred',
      notes: [],
      isSynced: false
    };

    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatient(newPatient);
    setCurrentScreen('referral');
    showToast('मरीज़ पंजीकृत! एआई ट्राइएज एवं रेफरल तैयार है ✓');
  };

  const handleSavePrescription = (scan: PrescriptionScan) => {
    setPrescriptions((prev) => [scan, ...prev]);
    showToast('पर्चा स्थानीय मेमोरी में सुरक्षित हुआ');
  };

  const handleSyncPatient = (id: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isSynced: true } : p))
    );
  };

  const handleSyncAll = () => {
    setPatients((prev) => prev.map((p) => ({ ...p, isSynced: true })));
    setPrescriptions((prev) => prev.map((rx) => ({ ...rx, isSynced: true })));
  };

  const handleSaveNote = (note: string) => {
    if (selectedPatient) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === selectedPatient.id
            ? { ...p, notes: [...(p.notes || []), note] }
            : p
        )
      );
      setSelectedPatient((prev) => ({
        ...prev,
        notes: [...(prev.notes || []), note]
      }));
      showToast('टिप्पणी सुरक्षित की गई: ' + note);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] flex flex-col font-sans selection:bg-[#e8762b] selection:text-white">
      {/* Fixed Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onOpenProfile={() => setIsProfileOpen(true)}
        unsyncedCount={totalUnsynced}
      />

      {/* Main Content Container with centered mobile canvas framing */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-24 pb-8">
        {currentScreen === 'home' && (
          <HomeScreen
            onNavigate={setCurrentScreen}
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            onOpenHomeVisits={() => setIsHomeVisitsOpen(true)}
            unsyncedCount={totalUnsynced}
            homeVisits={homeVisits}
          />
        )}

        {currentScreen === 'registration' && (
          <RegistrationScreen
            onSavePatientAndContinue={handleSavePatientAndContinue}
            onBack={() => setCurrentScreen('home')}
            showToast={showToast}
          />
        )}

        {currentScreen === 'scan' && (
          <ScanScreen
            onBack={() => setCurrentScreen('home')}
            onSavePrescription={handleSavePrescription}
            showToast={showToast}
          />
        )}

        {currentScreen === 'referral' && (
          <ReferralScreen
            patient={selectedPatient}
            onBack={() => setCurrentScreen('home')}
            onOpenWhatsAppModal={() => setIsWhatsAppOpen(true)}
            onOpenNoteModal={() => setIsNoteOpen(true)}
            onSyncPatient={handleSyncPatient}
            showToast={showToast}
          />
        )}

        {currentScreen === 'patients' && (
          <PatientsScreen
            patients={patients}
            onSelectPatient={(p) => {
              setSelectedPatient(p);
              setCurrentScreen('referral');
            }}
            onNavigate={setCurrentScreen}
          />
        )}

        {currentScreen === 'sync' && (
          <SyncScreen
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            patients={patients}
            prescriptions={prescriptions}
            onSyncAll={handleSyncAll}
            showToast={showToast}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        unsyncedCount={totalUnsynced}
      />

      {/* Profile Modal */}
      <AshaProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        isOnline={isOnline}
        onToggleOnline={handleToggleOnline}
        syncedCount={totalSynced}
        unsyncedCount={totalUnsynced}
      />

      {/* Home Visits Modal */}
      <HomeVisitsModal
        isOpen={isHomeVisitsOpen}
        onClose={() => setIsHomeVisitsOpen(false)}
        visits={homeVisits}
        onToggleComplete={handleToggleVisitComplete}
      />

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={isNoteOpen}
        onClose={() => setIsNoteOpen(false)}
        onSaveNote={handleSaveNote}
        patientName={selectedPatient?.nameHi || 'कमला देवी'}
      />

      {/* WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        patient={selectedPatient}
        onShared={() => showToast('व्हाट्सएप पर रामपुर PHC रेफरल पर्ची तैयार की गई')}
      />

      {/* Toast Feedback */}
      <Toast message={toastMessage} />
    </div>
  );
}
