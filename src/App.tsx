import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Screen, Patient, PrescriptionScan, HomeVisitTask } from './types';
import { INITIAL_PRESCRIPTION_SCANS, INITIAL_HOME_VISITS } from './data/mockData';
import {
  createPatient,
  getAuthToken,
  getSyncPending,
  listPatients,
  newClientRecordId,
  resolveApiBase,
  setAuthToken,
  type TriageAdvice,
  type TriageResult,
} from './lib/api';
import { flushQueue, queuedCount } from './lib/offlineQueue';
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
import { AuthScreen } from './screens/AuthScreen';
import { SyncScreen } from './screens/SyncScreen';
import { Sidebar } from './components/Sidebar';
import { useLang } from './i18n/LanguageContext';

/** URL path for every screen of the app. */
export const SCREEN_PATHS: Record<Screen, string> = {
  home: '/',
  registration: '/registration',
  scan: '/scan',
  referral: '/referral',
  patients: '/patients',
  sync: '/sync',
};

const PATH_TO_SCREEN: Record<string, Screen> = Object.entries(SCREEN_PATHS).reduce(
  (acc, [screen, path]) => {
    acc[path] = screen as Screen;
    return acc;
  },
  {} as Record<string, Screen>
);

/** Resolves the screen for a pathname (unknown paths fall back to home). */
export function screenFromPath(pathname: string): Screen {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PATH_TO_SCREEN[clean.toLowerCase()] ?? 'home';
}

/** Placeholder shown before the signed-in worker's first patient is loaded. */
const EMPTY_PATIENT: Patient = {
  id: '',
  rchId: '',
  nameHi: '',
  nameEn: '',
  age: 0,
  gender: 'female',
  ward: '',
  symptoms: [],
  triageLevel: 1,
  lastVisit: '',
  status: 'home_care',
  notes: [],
  isSynced: true,
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentScreen = screenFromPath(location.pathname);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionScan[]>(INITIAL_PRESCRIPTION_SCANS);
  const [homeVisits, setHomeVisits] = useState<HomeVisitTask[]>(INITIAL_HOME_VISITS);
  const [selectedPatient, setSelectedPatient] = useState<Patient>(EMPTY_PATIENT);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Live counters coming from GET /api/sync/pending (null = backend not reached).
  const [serverPendingCount, setServerPendingCount] = useState<number | null>(null);
  const [localQueueCount, setLocalQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const setCurrentScreen = (screen: Screen) => {
    const path = SCREEN_PATHS[screen] ?? '/';
    if (path !== location.pathname) {
      navigate(path);
    }
  };

  // Keep the document title in sync with the active screen and language.
  const { lang } = useLang();
  useEffect(() => {
    const titles: Record<Screen, { hi: string; en: string }> = {
      home: { hi: 'डैशबोर्ड', en: 'Dashboard' },
      registration: { hi: 'नया पंजीकरण', en: 'New Registration' },
      scan: { hi: 'पर्चा स्कैन', en: 'Scan Prescription' },
      referral: { hi: 'ट्राइएज एवं रेफरल', en: 'Triage & Referral' },
      patients: { hi: 'मरीज़ सूची', en: 'Patient Directory' },
      sync: { hi: 'सिंक', en: 'Sync' },
    };
    document.title = `आरोग्य-सारथी • ${titles[currentScreen][lang]}`;
  }, [currentScreen, lang]);

  // Modals state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => Boolean(getAuthToken())
  );
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
  const localUnsynced = unsyncedPatientsCount + unsyncedPrescriptionsCount;
  // The server is the source of truth when it can be reached; the local
  // counters are the fallback for a device that is offline.
  const totalUnsynced = serverPendingCount ?? localUnsynced + localQueueCount;
  const totalSynced = patients.length + prescriptions.length - totalUnsynced;

  /* ---------------------------------------------------------------------
   * Backend wiring
   * ------------------------------------------------------------------- */
  const refreshPendingCount = useCallback(async () => {
    try {
      const status = await getSyncPending();
      setServerPendingCount(status.pending_count);
    } catch {
      setServerPendingCount(null);
    }
    setLocalQueueCount(await queuedCount());
  }, []);

  /** Replays the offline queue and refreshes the counters. */
  const flushOfflineQueue = useCallback(async () => {
    const baseUrl = await resolveApiBase();
    const result = await flushQueue(async (url, method, body) => {
      try {
        const response = await fetch(`${baseUrl}${url}`, {
          method,
          headers: {
            'content-type': 'application/json',
            ...(getAuthToken() ? { authorization: `Bearer ${getAuthToken()}` } : {}),
          },
          body,
        });
        return { ok: response.ok, status: response.status };
      } catch {
        return { ok: false, status: 0 };
      }
    });
    await refreshPendingCount();
    return result;
  }, [refreshPendingCount]);

  // On boot: replay anything that was queued while offline, then load the
  // patients and the pending counters from the API.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const boot = async () => {
      // The queue flush must never block the rest of the boot sequence.
      try {
        await flushOfflineQueue();
      } catch (error) {
        console.warn('[api] offline queue could not be flushed', error);
      }

      try {
        const remotePatients = await listPatients();

        if (cancelled) return;
        if (remotePatients.length === 0) {
          setPatients([]);
        } else {
          setPatients(
            remotePatients.map((remote) => ({
              id: remote.id,
              rchId: remote.id.slice(0, 8).toUpperCase(),
              nameHi: remote.name,
              nameEn: remote.name,
              age: remote.age ?? 0,
              gender: remote.gender ?? 'female',
              ward: remote.village ?? '',
              photoUrl:
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDnxJqC0Pa6-pUCGC68IZUtA5T_Fa-BRxOlVdA93uTJars9feBKeZCYx1KgINB7iAxJO0gJMh236vfEjbkPo7KzHzW4dEeWlb54Bn6FOGEv2dvhJCb8LB4-Kq_83ZbWJoaD7BjMi71kbspFMZ0ZiO9G31WSXEPzgd7eVLrxT5123m_DlxPqHQLaPcL2WfCkqq24Ii1jWkoTSFkXpYIvKKeqbCKswo7fj_tQjzARu6hWoDIPKMqEJXfJHA',
              symptoms: [],
              triageLevel: (remote.triage_result === 'refer_immediately'
                ? 3
                : remote.triage_result === 'visit_phc'
                ? 2
                : 1) as 1 | 2 | 3,
              lastVisit: remote.last_captured_at ?? 'आज, सुबह 10:15 AM',
              isHighRisk: remote.triage_result === 'refer_immediately',
              status: 'referred',
              notes: [],
              isSynced: true,
            }))
          );
          setSelectedPatient((prev) => {
            const match = remotePatients.find((p) => p.id === prev.id);
            return match ? { ...prev, id: match.id } : prev;
          });
        }
      } catch (error) {
        // Backend unreachable - the app keeps working on the local cache.
        console.warn('[api] patients could not be loaded from the server', error);
      }

      try {
        if (!cancelled) await refreshPendingCount();
      } catch {
        /* the counters fall back to the local values */
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [flushOfflineQueue, refreshPendingCount, isAuthenticated]);

  // Replay the queue as soon as the device is online again.
  useEffect(() => {
    const onOnline = () => {
      void flushOfflineQueue();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushOfflineQueue]);

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

  const handleSavePatientAndContinue = async (
    patientData: Partial<Patient> & {
      triageResult?: TriageResult | null;
      triageAdvice?: TriageAdvice | null;
    }
  ): Promise<Patient> => {
    // The patient id is generated on the device so the record can be created
    // while offline and synced later without changing the id.
    const clientId = patientData.id && patientData.id.length === 36
      ? patientData.id
      : newClientRecordId();

    const newPatient: Patient = {
      id: clientId,
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
      isSynced: false,
      triageResult: patientData.triageResult ?? null,
      triageAdvice: patientData.triageAdvice ?? null
    };

    setPatients((prev) => [newPatient, ...prev]);
    setSelectedPatient(newPatient);

    // Persist the patient on the server (queued automatically when offline).
    try {
      const result = await createPatient({
        name: newPatient.nameHi,
        age: newPatient.age,
        gender: newPatient.gender,
        village: newPatient.ward,
        client_id: clientId,
      });
      if (result.queued) {
        showToast('ऑफ़लाइन: मरीज़ सुरक्षित सहेजा गया, बाद में सिंक होगा');
      } else {
        void refreshPendingCount();
      }
    } catch {
      showToast('मरीज़ सेव नहीं हो सका (Could not save the patient)');
    }

    setCurrentScreen('referral');
    showToast('मरीज़ पंजीकृत! एआई ट्राइएज एवं रेफरल तैयार है ✓');

    return newPatient;
  };

  const handleSavePrescription = (scan: PrescriptionScan) => {
    setPrescriptions((prev) => [scan, ...prev]);
    showToast('पर्चा स्थानीय मेमोरी में सुरक्षित हुआ');
    void refreshPendingCount();
  };

  const handleSyncPatient = (id: string) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isSynced: true } : p))
    );
  };

  /** Pushes everything that is waiting on the device to the server. */
  const handleSyncAll = async () => {
    setIsSyncing(true);
    const result = await flushOfflineQueue();
    setPatients((prev) => prev.map((p) => ({ ...p, isSynced: true })));
    setPrescriptions((prev) => prev.map((rx) => ({ ...rx, isSynced: true })));
    setIsSyncing(false);
    showToast(
      result.flushed > 0
        ? `✓ ${result.flushed} रिकॉर्ड सिंक हो गए (${result.flushed} records synced)`
        : 'सभी रिकॉर्ड पहले से सिंक हैं (All records already synced)'
    );
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setIsAuthenticated(false);
    setPatients([]);
    setSelectedPatient(EMPTY_PATIENT);
    setServerPendingCount(null);
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

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onBack={() => {}}
        onSignedIn={() => setIsAuthenticated(true)}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#121c2a] flex flex-col lg:flex-row font-sans selection:bg-[#e8762b] selection:text-white">
      {/* Desktop navigation rail (laptop / desktop viewports) */}
          <Sidebar
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
            onOpenProfile={() => setIsProfileOpen(true)}
            isOnline={isOnline}
            onToggleOnline={handleToggleOnline}
            unsyncedCount={totalUnsynced}
            onSignOut={handleSignOut}
          />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Fixed Header */}
        <Header
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          onOpenProfile={() => setIsProfileOpen(true)}
          unsyncedCount={totalUnsynced}
        />

        {/* Main Content Container - mobile canvas on phones, wide dashboard on laptops */}
        <main className="flex-1 w-full max-w-md lg:max-w-6xl mx-auto px-4 pt-4 pb-24 lg:pt-6 lg:pb-10">
          {currentScreen === 'home' && (
            <HomeScreen
              onNavigate={setCurrentScreen}
              isOnline={isOnline}
              onToggleOnline={handleToggleOnline}
              onOpenHomeVisits={() => setIsHomeVisitsOpen(true)}
              unsyncedCount={totalUnsynced}
              patients={patients}
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
              patientId={selectedPatient?.id ?? ''}
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
              serverPendingCount={serverPendingCount}
            />
          )}
        </main>
      </div>

      {/* Bottom Navigation (phones and tablets) */}
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
