import { UserRole } from '../types/dental';

export interface StaffPreset {
  id: string;
  name: string;
  role: string;
  systemRole: UserRole;
  email: string;
  initials: string;
  badge: string;
  description: string;
  specialty?: string;
  licenseNumber?: string;
  initialPassword?: string;
}

export const STAFF_PRESETS: StaffPreset[] = [
  {
    id: 'shihab',
    name: 'Dr. Shihab Hossain',
    role: 'Clinic Owner',
    systemRole: 'Owner',
    email: 'dr.shihab@apex-dental.com',
    initials: 'SH',
    badge: 'Full Practice Control',
    description: 'Executive practice oversight, clinical surgery, financials, staff RBAC',
    specialty: 'Lead Implantologist & Dental Surgeon',
    licenseNumber: 'BMDC/DC-7841',
    initialPassword: 'DentFlow123!',
  },
  {
    id: 'ayesha',
    name: 'Dr. Ayesha Siddiqa',
    role: 'Dentist',
    systemRole: 'Dentist',
    email: 'dr.ayesha@apex-dental.com',
    initials: 'AS',
    badge: 'Clinical & Charting',
    description: 'Assigned patient care, odontogram, treatment plans, prescriptions & lab orders',
    specialty: 'Associate Dental Surgeon (BDS, PGT)',
    licenseNumber: 'BMDC/DC-8921',
    initialPassword: 'DentFlow123!',
  },
  {
    id: 'marcus',
    name: 'Marcus Vance',
    role: 'Receptionist',
    systemRole: 'Receptionist',
    email: 'marcus.reception@apex-dental.com',
    initials: 'MV',
    badge: 'Front Desk & Scheduling',
    description: 'Patient check-in, appointments calendar, contact info, queue routing',
    initialPassword: 'DentFlow123!',
  },
  {
    id: 'rachel',
    name: 'Rachel Bennett',
    role: 'Cashier',
    systemRole: 'Cashier',
    email: 'rachel.billing@apex-dental.com',
    initials: 'RB',
    badge: 'Billing & Cashier',
    description: 'Point-of-sale, invoices, receipts, payment tracking, financial logs',
    initialPassword: 'DentFlow123!',
  },
];

// Development-only testing credentials (guarded by import.meta.env.DEV)
export const DEV_TEST_PASSWORD = 'DentFlow123!';
