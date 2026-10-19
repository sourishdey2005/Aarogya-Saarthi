import { Patient, PrescriptionScan, HomeVisitTask } from '../types';

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p-1',
    rchId: 'RCH-8492',
    nameHi: 'कमला देवी',
    nameEn: 'Kamla Devi',
    age: 42,
    gender: 'female',
    ward: 'वार्ड ४ (Ward 4)',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnxJqC0Pa6-pUCGC68IZUtA5T_Fa-BRxOlVdA93uTJars9feBKeZCYx1KgINB7iAxJO0gJMh236vfEjbkPo7KzHzW4dEeWlb54Bn6FOGEv2dvhJCb8LB4-Kq_83ZbWJoaD7BjMi71kbspFMZ0ZiO9G31WSXEPzgd7eVLrxT5123m_DlxPqHQLaPcL2WfCkqq24Ii1jWkoTSFkXpYIvKKeqbCKswo7fj_tQjzARu6hWoDIPKMqEJXfJHA',
    symptoms: [
      { id: 's-1', nameHi: 'तेज़ बुखार (102°F)', nameEn: 'High Fever (3 days)', severity: 'high' },
      { id: 's-2', nameHi: 'सूखी खांसी', nameEn: 'Dry Cough', severity: 'moderate' },
      { id: 's-3', nameHi: 'लाल दाने', nameEn: 'Skin Rash', severity: 'high' }
    ],
    triageLevel: 2,
    lastVisit: 'आज, सुबह 10:15 AM',
    isHighRisk: true,
    status: 'referred',
    notes: ['मरीज़ को कल रात से तेज़ कंपकंपी थी।', 'बीपी 145/95 दर्ज किया गया।'],
    isSynced: false
  },
  {
    id: 'p-2',
    rchId: 'RCH-7104',
    nameHi: 'गीता देवी',
    nameEn: 'Geeta Devi',
    age: 26,
    gender: 'female',
    ward: 'वार्ड ३ (Ward 3)',
    symptoms: [
      { id: 's-4', nameHi: 'हल्का सिरदर्द', nameEn: 'Mild Headache', severity: 'mild' },
      { id: 's-5', nameHi: 'कमजोरी', nameEn: 'Fatigue', severity: 'mild' }
    ],
    triageLevel: 1,
    lastVisit: 'कल, शाम 4:30 PM',
    isHighRisk: false,
    status: 'home_care',
    notes: ['आयरन फोलिक एसिड की गोलियां नियमित लेने की सलाह दी गई।'],
    isSynced: true
  },
  {
    id: 'p-3',
    rchId: 'RCH-9041',
    nameHi: 'रमेश कुमार यादव',
    nameEn: 'Ramesh Kumar Yadav',
    age: 58,
    gender: 'male',
    ward: 'वार्ड ४ (Ward 4)',
    symptoms: [
      { id: 's-6', nameHi: 'सांस लेने में भारीपन', nameEn: 'Breathlessness', severity: 'high' },
      { id: 's-7', nameHi: 'सीने में जकड़न', nameEn: 'Chest Tightness', severity: 'high' }
    ],
    triageLevel: 3,
    lastVisit: 'आज, सुबह 8:45 AM',
    isHighRisk: true,
    status: 'emergency',
    notes: ['तत्काल 108 एम्बुलेंस से जिला अस्पताल रेफर किया गया।'],
    isSynced: true
  },
  {
    id: 'p-4',
    rchId: 'RCH-6218',
    nameHi: 'पूजा कुमारी',
    nameEn: 'Pooja Kumari',
    age: 19,
    gender: 'female',
    ward: 'वार्ड २ (Ward 2)',
    symptoms: [
      { id: 's-8', nameHi: 'उल्टी और दस्त', nameEn: 'Vomiting & Diarrhea', severity: 'moderate' }
    ],
    triageLevel: 2,
    lastVisit: 'कल, दोपहर 1:00 PM',
    isHighRisk: false,
    status: 'referred',
    notes: ['ORS घोल और जिंक सिरप शुरू करवाया गया।'],
    isSynced: false
  }
];

export const INITIAL_PRESCRIPTION_SCANS: PrescriptionScan[] = [
  {
    id: 'rx-1',
    patientName: 'कमला देवी (Kamla Devi)',
    patientAge: 48,
    opdNumber: 'OPD #4092',
    phcName: 'PHC रामपुर (Rampur)',
    confidence: 94,
    scannedAt: 'आज, 09:30 AM',
    isSynced: false,
    medicines: [
      {
        id: 'm-1',
        medicineName: 'Paracetamol 500mg',
        dosage: '1 Tab',
        dosageHi: 'दिन में 3 बार (3 times a day) • 3 दिन',
        duration: '3 days',
        instructions: 'After food with water',
        instructionsHi: 'खाना खाने के बाद पानी से लें'
      },
      {
        id: 'm-2',
        medicineName: 'Cetirizine 10mg',
        dosage: '1 Tab',
        dosageHi: 'रात में 1 बार (Once at night)',
        duration: '5 days',
        instructions: 'Take at night before sleep',
        instructionsHi: 'रात को सोने से पहले लें'
      },
      {
        id: 'm-3',
        medicineName: 'ORS घोल',
        dosage: '1 Packet',
        dosageHi: 'पानी के साथ (Mix in 1L water)',
        duration: '2 days',
        instructions: 'Mix 1 sachet in 1 liter clean boiled water',
        instructionsHi: '1 लीटर साफ उबले पानी में मिलाकर थोड़ा-थोड़ा पिएं'
      }
    ]
  },
  {
    id: 'rx-2',
    patientName: 'सुरेश मांझी (Suresh Manjhi)',
    patientAge: 52,
    opdNumber: 'OPD #3988',
    phcName: 'PHC रामपुर (Rampur)',
    confidence: 91,
    scannedAt: 'कल, 03:15 PM',
    isSynced: false,
    medicines: [
      {
        id: 'm-4',
        medicineName: 'Amoxicillin 500mg',
        dosage: '1 Cap',
        dosageHi: 'दिन में 2 बार (Morning & Evening)',
        duration: '5 days',
        instructions: 'Complete full course',
        instructionsHi: 'कोर्स पूरा करना अनिवार्य है'
      },
      {
        id: 'm-5',
        medicineName: 'Vitamin B-Complex',
        dosage: '1 Tab',
        dosageHi: 'दिन में 1 बार (Once daily)',
        duration: '10 days',
        instructions: 'After lunch',
        instructionsHi: 'दोपहर के भोजन के बाद'
      }
    ]
  }
];

export const INITIAL_HOME_VISITS: HomeVisitTask[] = [
  {
    id: 'hv-1',
    familyHead: 'रामेश्वर पंडित (Rameshwar Pandit)',
    ward: 'वार्ड ४ (Ward 4)',
    reasonHi: 'नियमित नवजात शिशु देखभाल (Day 7 Visit)',
    reasonEn: 'Routine Neonatal Care - Weight & Cord Check',
    dueTime: 'आज सुबह 11:30 AM',
    isUrgent: false,
    completed: false
  },
  {
    id: 'hv-2',
    familyHead: 'दिनेश महतो (Dinesh Mahto)',
    ward: 'वार्ड ४ (Ward 4)',
    reasonHi: 'गर्भवती तीसरी तिमाही वजन और बीपी जांच',
    reasonEn: 'ANC 3rd Trimester Weight & BP follow-up',
    dueTime: 'आज दोपहर 01:00 PM',
    isUrgent: true,
    completed: false
  },
  {
    id: 'hv-3',
    familyHead: 'सुरेन्द्र पासवान (Surendra Paswan)',
    ward: 'वार्ड ४ (Ward 4)',
    reasonHi: 'टीकाकरण छूटा हुआ बच्चा (Pentavalent-2)',
    reasonEn: 'Immunization Drop-out Follow-up',
    dueTime: 'आज दोपहर 02:30 PM',
    isUrgent: false,
    completed: false
  }
];
