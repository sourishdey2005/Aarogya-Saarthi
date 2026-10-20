import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Screen, Patient, PrescriptionScan, HomeVisitTask } from './types';
import { INITIAL_PRESCRIPTION_SCANS, INITIAL_HOME_VISITS } from './data/mockData';
import {
 createPatient,
 getAuthToken,
 getMe,
 getStoredWorker,
 setStoredWorker,
 getSyncPending,
 listPatients,
 newClientRecordId,
 resolveApiBase,
 setAuthToken,
 type AuthWorker,
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
 gender: null,
 ward: '',
 phone: '',
 address: '',
 bloodGroup: '',
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
 const [worker, setWorker] = useState<AuthWorker | null>(() => getStoredWorker());
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
 home: { hi: '', en: 'Dashboard' },
 registration: { hi: ' ', en: 'New Registration' },
 scan: { hi: ' Scan', en: '' },
 referral: { hi: ' ', en: 'Triage & Referral' },
 patients: { hi: 'Patients ', en: 'Patient Directory' },
 sync: { hi: 'Sync', en: 'Sync' },
 };
 document.title = `Aarogya Sarathi • ${titles[currentScreen][lang]}`;
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

 // Refresh the signed-in worker so the header always shows the real owner
 // of this account (never a hardcoded demo name).
 const me = await getMe();
 if (!cancelled && me) {
 setWorker(me);
 setStoredWorker(me);
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
 gender: remote.gender ?? null,
 ward: remote.village ?? '',
 phone: remote.phone ?? '',
 address: remote.address ?? '',
 bloodGroup: remote.blood_group ?? '',
 photoUrl: '',
 symptoms: [],
 triageLevel: (remote.triage_result === 'refer_immediately'
 ? 3
 : remote.triage_result === 'visit_phc'
 ? 2
 : 1) as 1 | 2 | 3,
 lastVisit: remote.last_captured_at ?? new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
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
 showToast(next ? 'Online : active' : ' : ');
 return next;
 });
 };

 const handleToggleVisitComplete = (id: string) => {
 setHomeVisits((prev) =>
 prev.map((v) => (v.id === id ? { ...v, completed: !v.completed } : v))
 );
 showToast(' ');
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
 nameHi: patientData.nameHi || '',
 nameEn: patientData.nameEn || '',
 age: patientData.age ?? 0,
 gender: patientData.gender ?? null,
 ward: patientData.ward || '',
 phone: patientData.phone || '',
 address: patientData.address || '',
 bloodGroup: patientData.bloodGroup || '',
 photoUrl: patientData.photoUrl || '',
 symptoms: patientData.symptoms || [],
 triageLevel: (patientData.triageLevel as 1 | 2 | 3) || 2,
 lastVisit: new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
 isHighRisk: false,
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
 phone: newPatient.phone,
 address: newPatient.address,
 blood_group: newPatient.bloodGroup,
 client_id: clientId,
 });
 if (result.queued) {
 showToast(': Patients , Sync ');
 } else {
 void refreshPendingCount();
 }
 } catch {
 showToast('Patients (Could not save the patient)');
 }

 setCurrentScreen('referral');
 showToast('Patients ! ✓');

 return newPatient;
 };

 const handleSavePrescription = (scan: PrescriptionScan) => {
 setPrescriptions((prev) => [scan, ...prev]);
 showToast(' ');
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
 ? `✓ ${result.flushed} Sync (${result.flushed} records synced)`
 : ' Sync (All records already synced)'
 );
 };

 const handleSignOut = () => {
 setAuthToken(null);
 setStoredWorker(null);
 setWorker(null);
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
 showToast(' : ' + note);
 }
 };

 if (!isAuthenticated) {
 return (
 <AuthScreen
 onBack={() => {}}
 onSignedIn={(signedInWorker) => {
 setWorker(signedInWorker);
 setStoredWorker(signedInWorker);
 setIsAuthenticated(true);
 }}
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
 worker={worker}
 />

 <div className="flex-1 min-w-0 flex flex-col">
 {/* Fixed Header */}
 <Header
 currentScreen={currentScreen}
 onNavigate={setCurrentScreen}
 onOpenProfile={() => setIsProfileOpen(true)}
 unsyncedCount={totalUnsynced}
 worker={worker}
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
 worker={worker}
 />
 )}

 {currentScreen === 'registration' && (
 <RegistrationScreen
 onSavePatientAndContinue={handleSavePatientAndContinue}
 onBack={() => setCurrentScreen('home')}
 showToast={showToast}
 worker={worker}
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
 worker={worker}
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
 patientName={selectedPatient?.nameHi || 'Kamla Devi'}
 />

 {/* WhatsApp Share Modal */}
 <WhatsAppShareModal
 isOpen={isWhatsAppOpen}
 onClose={() => setIsWhatsAppOpen(false)}
 patient={selectedPatient}
 worker={worker}
 onShared={() => showToast(' PHC ')}
 />

 {/* Toast Feedback */}
 <Toast message={toastMessage} />
 </div>
 );
}
