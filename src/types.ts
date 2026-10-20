export type Screen = 'home' | 'registration' | 'scan' | 'referral' | 'patients' | 'sync' | 'hospitals' | 'appointments' | 'expenses';

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
 gender: 'female' | 'male' | 'other' | null;
 ward: string;
 phone: string;
 address: string;
 bloodGroup: string;
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

export interface Hospital {
  id: string;
  asha_worker_id: string;
  name: string;
  type: "govt" | "private";
  village: string | null;
  address: string | null;
  phone: string | null;
  emergency: boolean | null;
  specialties: string[] | null;
  distance_km: number | null;
}

export interface Doctor {
  id: string;
  asha_worker_id: string;
  hospital_id: string | null;
  name: string;
  specialization: string;
  phone: string | null;
  consultation_fee_rupees: number | null;
  available_days: string[] | null;
  available_times: string[] | null;
}

export interface Appointment {
  id: string;
  asha_worker_id: string;
  patient_id: string;
  doctor_id: string | null;
  hospital_id: string | null;
  doctor_name: string;
  hospital_name: string;
  appointment_date: string;
  appointment_time: string;
  consultation_fee_rupees: number | null;
  amount_paid_rupees: number | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
}

export interface Expense {
  id: string;
  asha_worker_id: string;
  patient_id: string | null;
  appointment_id: string | null;
  type: "consultation" | "medicine" | "travel" | "other";
  amount_rupees: number;
  description: string | null;
  date: string;
}

export interface ExpenseTotal {
  total_rupees: number;
}
