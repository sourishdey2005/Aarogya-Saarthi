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
