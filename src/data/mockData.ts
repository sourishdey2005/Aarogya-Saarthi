import { Patient, PrescriptionScan, HomeVisitTask } from '../types';

export const INITIAL_PATIENTS: Patient[] = [
 {
 id: 'p-1',
 rchId: 'RCH-8492',
 nameHi: 'Kamla Devi',
 nameEn: 'Kamla Devi',
 age: 42,
 gender: 'female',
 ward: 'Ward 4',
 phone: '9876543210',
 address: ' , ',
 bloodGroup: 'B+',
 photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnxJqC0Pa6-pUCGC68IZUtA5T_Fa-BRxOlVdA93uTJars9feBKeZCYx1KgINB7iAxJO0gJMh236vfEjbkPo7KzHzW4dEeWlb54Bn6FOGEv2dvhJCb8LB4-Kq_83ZbWJoaD7BjMi71kbspFMZ0ZiO9G31WSXEPzgd7eVLrxT5123m_DlxPqHQLaPcL2WfCkqq24Ii1jWkoTSFkXpYIvKKeqbCKswo7fj_tQjzARu6hWoDIPKMqEJXfJHA',
 symptoms: [
 { id: 's-1', nameHi: 'High fever (102°F)', nameEn: 'High Fever (3 days)', severity: 'high' },
 { id: 's-2', nameHi: 'Dry Cough', nameEn: 'Dry Cough', severity: 'moderate' },
 { id: 's-3', nameHi: 'Skin Rash', nameEn: 'Skin Rash', severity: 'high' }
 ],
 triageLevel: 2,
 lastVisit: 'Today, 10:15 AM',
 isHighRisk: true,
 status: 'referred',
 notes: ['Patients ', 'BP 145/95 was recorded.'],
 isSynced: false
 },
 {
 id: 'p-2',
 rchId: 'RCH-7104',
 nameHi: 'Geeta Devi',
 nameEn: 'Geeta Devi',
 age: 26,
 gender: 'female',
 ward: 'Ward 3',
 phone: '9123456780',
 address: ' , 3',
 bloodGroup: 'O+',
 symptoms: [
 { id: 's-4', nameHi: 'Mild Headache', nameEn: 'Mild Headache', severity: 'mild' },
 { id: 's-5', nameHi: 'Fatigue', nameEn: 'Fatigue', severity: 'mild' }
 ],
 triageLevel: 1,
 lastVisit: 'Yesterday, 4:30 PM',
 isHighRisk: false,
 status: 'home_care',
 notes: [' Advice '],
 isSynced: true
 },
 {
 id: 'p-3',
 rchId: 'RCH-9041',
 nameHi: 'Ramesh Kumar Yadav',
 nameEn: 'Ramesh Kumar Yadav',
 age: 58,
 gender: 'male',
 ward: 'Ward 4',
 phone: '9988776655',
 address: ' , 4',
 bloodGroup: 'A-',
 symptoms: [
 { id: 's-6', nameHi: 'Breathlessness', nameEn: 'Breathlessness', severity: 'high' },
 { id: 's-7', nameHi: 'Chest Tightness', nameEn: 'Chest Tightness', severity: 'high' }
 ],
 triageLevel: 3,
 lastVisit: 'Today, 8:45 AM',
 isHighRisk: true,
 status: 'emergency',
 notes: [' 108 '],
 isSynced: true
 },
 {
 id: 'p-4',
 rchId: 'RCH-6218',
 nameHi: 'Pooja Kumari',
 nameEn: 'Pooja Kumari',
 age: 19,
 gender: 'female',
 ward: 'Ward 2',
 phone: '9011223344',
 address: ' , 2',
 bloodGroup: 'AB+',
 symptoms: [
 { id: 's-8', nameHi: 'Vomiting & Diarrhea', nameEn: 'Vomiting & Diarrhea', severity: 'moderate' }
 ],
 triageLevel: 2,
 lastVisit: 'Yesterday, 1:00 PM',
 isHighRisk: false,
 status: 'referred',
 notes: ['ORS sachet and zinc syrup were started.'],
 isSynced: false
 }
];

export const INITIAL_PRESCRIPTION_SCANS: PrescriptionScan[] = [
 {
 id: 'rx-1',
 patientName: 'Kamla Devi',
 patientAge: 48,
 opdNumber: 'OPD #4092',
 phcName: 'PHC Rampur',
 confidence: 94,
 scannedAt: 'Today, 09:30 AM',
 isSynced: false,
 medicines: [
 {
 id: 'm-1',
 medicineName: 'Paracetamol 500mg',
 dosage: '1 Tab',
 dosageHi: '3 times a day • 3 days',
 duration: '3 days',
 instructions: 'After food with water',
 instructionsHi: 'Take with water after food'
 },
 {
 id: 'm-2',
 medicineName: 'Cetirizine 10mg',
 dosage: '1 Tab',
 dosageHi: 'Once at night',
 duration: '5 days',
 instructions: 'Take at night before sleep',
 instructionsHi: 'Take at night before sleep'
 },
 {
 id: 'm-3',
 medicineName: 'ORS sachet',
 dosage: '1 Packet',
 dosageHi: 'With water (Mix in 1L water)',
 duration: '2 days',
 instructions: 'Mix 1 sachet in 1 liter clean boiled water',
 instructionsHi: '1 - '
 }
 ]
 },
 {
 id: 'rx-2',
 patientName: 'Suresh Manjhi',
 patientAge: 52,
 opdNumber: 'OPD #3988',
 phcName: 'PHC Rampur',
 confidence: 91,
 scannedAt: 'Yesterday, 03:15 PM',
 isSynced: false,
 medicines: [
 {
 id: 'm-4',
 medicineName: 'Amoxicillin 500mg',
 dosage: '1 Cap',
 dosageHi: 'Twice a day (Morning & Evening)',
 duration: '5 days',
 instructions: 'Complete full course',
 instructionsHi: 'Completing the full course is essential'
 },
 {
 id: 'm-5',
 medicineName: 'Vitamin B-Complex',
 dosage: '1 Tab',
 dosageHi: 'Once daily',
 duration: '10 days',
 instructions: 'After lunch',
 instructionsHi: 'After lunch'
 }
 ]
 }
];

export const INITIAL_HOME_VISITS: HomeVisitTask[] = [
 {
 id: 'hv-1',
 familyHead: 'Rameshwar Pandit',
 ward: 'Ward 4',
 reasonHi: 'Routine Neonatal Care (Day 7 Visit)',
 reasonEn: 'Routine Neonatal Care - Weight & Cord Check',
 dueTime: 'Today 11:30 AM',
 isUrgent: false,
 completed: false
 },
 {
 id: 'hv-2',
 familyHead: 'Dinesh Mahto',
 ward: 'Ward 4',
 reasonHi: ' and ',
 reasonEn: 'ANC 3rd Trimester Weight & BP follow-up',
 dueTime: 'Today 1:00 PM',
 isUrgent: true,
 completed: false
 },
 {
 id: 'hv-3',
 familyHead: 'Surendra Paswan',
 ward: 'Ward 4',
 reasonHi: 'Immunization Drop-out Follow-up',
 reasonEn: 'Immunization Drop-out Follow-up',
 dueTime: 'Today 2:30 PM',
 isUrgent: false,
 completed: false
 }
];
