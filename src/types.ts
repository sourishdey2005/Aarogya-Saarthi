export type Screen = 'home' | 'registration' | 'scan' | 'referral' | 'patients' | 'sync';

export interface Symptom {
  id: string;
  nameHi: string;
  nameEn: string;
  severity?: 'mild' | 'moderate' | 'high';
}

export interface Patient {
  id: string;
  rchId: string;
  nameHi: string;
  nameEn: string;
  age: number;
  gender: 'female' | 'male' | 'other';
  ward: string;
  photoUrl?: string;
  symptoms: Symptom[];
  triageLevel: 1 | 2 | 3;
  lastVisit: string;
  isHighRisk?: boolean;
  status: 'pending_visit' | 'referred' | 'home_care' | 'emergency';
  notes?: string[];
  isSynced: boolean;
  /** Triage category returned by the AI service (POST /api/triage). */
  triageResult?: 'home_care' | 'visit_phc' | 'refer_immediately' | null;
  /** Advice returned by the AI service. */
  triageAdvice?: {
    headline_hi: string;
    headline_en: string;
    reasoning: string;
    source: string;
  } | null;
}

export interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  dosageHi: string;
  duration: string;
  instructions: string;
  instructionsHi: string;
}

export interface PrescriptionScan {
  id: string;
  patientName: string;
  patientAge: number;
  opdNumber: string;
  phcName: string;
  medicines: PrescriptionItem[];
  confidence: number;
  scannedAt: string;
  isSynced: boolean;
  /** Captured image (data URL or blob URL) of the scanned prescription. */
  imageUrl?: string;
  /** Where the captured image came from. */
  imageSource?: 'camera' | 'gallery';
}

export interface HomeVisitTask {
  id: string;
  familyHead: string;
  ward: string;
  reasonHi: string;
  reasonEn: string;
  dueTime: string;
  isUrgent: boolean;
  completed: boolean;
}
