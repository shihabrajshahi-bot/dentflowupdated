export type UserRole = 'Owner' | 'Dentist' | 'Receptionist' | 'Cashier' | string;

export interface PracticeRoleDefinition {
  id: string;
  name: string;
  category: 'Clinical' | 'Front Desk' | 'Financial' | 'Support' | 'Administrative';
  description: string;
  isSystemRole?: boolean;
  permissions: DashboardModuleId[];
  createdAt?: string;
}

export const DEFAULT_PRACTICE_ROLES: PracticeRoleDefinition[] = [
  {
    id: 'role-owner',
    name: 'Owner',
    category: 'Administrative',
    description: 'Full clinic governance, staff management, financials, and complete administrative control.',
    isSystemRole: true,
    permissions: [
      'dashboard',
      'patients',
      'appointments',
      'prescriptions',
      'lab_orders',
      'billing',
      'expenses',
      'inventory',
      'services',
      'reports',
      'staff',
      'settings',
      'log_history',
    ],
  },
  {
    id: 'role-dentist',
    name: 'Dentist',
    category: 'Clinical',
    description: 'Diagnosis, tooth charting, prescriptions, lab orders, and patient clinical records.',
    isSystemRole: true,
    permissions: [
      'dashboard',
      'patients',
      'appointments',
      'prescriptions',
      'lab_orders',
      'inventory',
      'services',
      'reports',
    ],
  },
  {
    id: 'role-receptionist',
    name: 'Receptionist',
    category: 'Front Desk',
    description: 'Patient check-in, appointments scheduling, lab deliveries, and front-desk reception.',
    isSystemRole: true,
    permissions: [
      'dashboard',
      'patients',
      'appointments',
      'lab_orders',
      'billing',
      'services',
    ],
  },
  {
    id: 'role-cashier',
    name: 'Cashier',
    category: 'Financial',
    description: 'Payment collection, receipt issuance, invoice settlement, and clinic expenses.',
    isSystemRole: true,
    permissions: [
      'dashboard',
      'patients',
      'appointments',
      'billing',
      'expenses',
      'reports',
      'services',
    ],
  },
];

export interface ClinicExpense {
  id: string;
  clinicId: string;
  title: string;
  category:
    | 'Rent & Facility'
    | 'Utilities'
    | 'Dental Supplies & Lab'
    | 'Staff Salaries'
    | 'Equipment & Maintenance'
    | 'Marketing'
    | 'Office & Admin'
    | 'Other';
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DashboardModuleId =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'prescriptions'
  | 'lab_orders'
  | 'billing'
  | 'expenses'
  | 'inventory'
  | 'services'
  | 'reports'
  | 'staff'
  | 'settings'
  | 'log_history';

export type LabOrderStatus = 'Dispatched' | 'In Fabrication' | 'Try-In Ready' | 'Completed' | 'Cancelled';

export interface LabOrder {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  labName: string;
  prosthesisType:
    | 'Zirconia Crown'
    | 'PFM Crown'
    | 'E-Max Veneer / Crown'
    | 'Fixed Partial Denture (Bridge)'
    | 'Implant Abutment & Crown'
    | 'Complete / Acrylic Denture'
    | 'Flexible RPD (Valplast)'
    | 'Night Guard / Occlusal Splint'
    | 'Clear Aligner / Retainer'
    | 'Surgical Guide';
  toothNumbers: string;
  shade: string;
  sentDate: string;
  dueDate: string;
  cost: number;
  status: LabOrderStatus;
  instructions?: string;
  expenseRecorded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, DashboardModuleId[]> = {
  Owner: [
    'dashboard',
    'patients',
    'appointments',
    'prescriptions',
    'lab_orders',
    'billing',
    'expenses',
    'inventory',
    'services',
    'reports',
    'staff',
    'settings',
    'log_history',
  ],
  Dentist: [
    'dashboard',
    'patients',
    'appointments',
    'prescriptions',
    'lab_orders',
    'inventory',
    'services',
    'reports',
  ],
  Receptionist: [
    'dashboard',
    'patients',
    'appointments',
    'lab_orders',
    'billing',
    'services',
  ],
  Cashier: [
    'dashboard',
    'patients',
    'appointments',
    'billing',
    'expenses',
    'reports',
    'services',
  ],
};

export interface DashboardModuleDefinition {
  id: DashboardModuleId;
  name: string;
  category: 'Core' | 'Clinical' | 'Financial' | 'Owner Control';
  description: string;
  ownerOnly?: boolean;
}

export const DASHBOARD_MODULE_DEFINITIONS: DashboardModuleDefinition[] = [
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    category: 'Core',
    description: 'Operational summary, patient waiting queue, and clinical alerts',
  },
  {
    id: 'patients',
    name: 'Patient Records',
    category: 'Clinical',
    description: 'Patient medical directory, contact info, medical alerts & allergy histories',
  },
  {
    id: 'appointments',
    name: 'Appointments & Chair Schedule',
    category: 'Core',
    description: 'Operatory calendar, appointment booking, check-in queue, and waiting room',
  },
  {
    id: 'prescriptions',
    name: 'e-Prescriptions (Rx) & SOAP Notes',
    category: 'Clinical',
    description: 'Digital prescription writer, medication dosage templates, and clinical SOAP notes',
  },
  {
    id: 'lab_orders',
    name: 'Dental Lab & Prosthodontics',
    category: 'Clinical',
    description: 'Track crowns, bridges, implants, VITA shades, lab vendors, and delivery dates',
  },
  {
    id: 'billing',
    name: 'Invoices & Payments POS',
    category: 'Financial',
    description: 'Point-of-sale invoicing, balances, payment receipts, and collection slips',
  },
  {
    id: 'expenses',
    name: 'Expenses & Practice Net Margin',
    category: 'Financial',
    description: 'Overhead expenses, lab fees, utilities, and clinic net operating profit',
  },
  {
    id: 'inventory',
    name: 'Inventory & Dental Supplies',
    category: 'Core',
    description: 'Dental stock levels, batch numbers, expiry dates, and low-stock alerts',
  },
  {
    id: 'services',
    name: 'Procedures Catalog',
    category: 'Clinical',
    description: 'Standard procedure price list, fee schedule, categories, and duration',
  },
  {
    id: 'reports',
    name: 'Reports & Analytics PDF',
    category: 'Financial',
    description: 'Practice metrics, monthly statistics, and executive PDF downloads',
  },
  {
    id: 'staff',
    name: 'Staff Accounts & Permissions',
    category: 'Owner Control',
    description: 'Manage staff profiles, custom access permissions, and account lifecycle',
    ownerOnly: true,
  },
  {
    id: 'settings',
    name: 'Clinic Settings',
    category: 'Owner Control',
    description: 'Practice branding, currency, tax rates, and operating hours',
    ownerOnly: true,
  },
  {
    id: 'log_history',
    name: 'Log History & Audit Trail',
    category: 'Owner Control',
    description: 'Track staff logins, terminal locations, device access, and account handover history',
    ownerOnly: true,
  },
];

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  clinicId: string;
  phone?: string;
  specialty?: string;
  licenseNumber?: string;
  permissions?: DashboardModuleId[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffAccountHistoryItem {
  id?: string;
  employeeName: string;
  employeeEmail?: string;
  employeePhone?: string;
  licenseNumber?: string;
  role?: UserRole;
  startDate: string;
  endDate?: string;
  reassignedBy?: string;
  reassignedReason?: string;
  notes?: string;
  note?: string;
}

export interface StaffAccount {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  title?: string;
  specialty?: string;
  licenseNumber?: string;
  phone?: string;
  status: 'active' | 'suspended';
  initialPassword?: string;
  permissions?: DashboardModuleId[];
  currentEmployeeSince?: string;
  accountHistory?: StaffAccountHistoryItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AuditActivityType =
  | 'User Login'
  | 'Payment Edited'
  | 'Patient Deleted'
  | 'Payment Collected'
  | 'Invoice Created'
  | 'Staff Account Reassigned'
  | 'Role Changed'
  | 'Prescription Issued'
  | 'Clinical Note Saved'
  | 'Clinic Settings Updated'
  | 'Data Exported'
  | string;

export interface StaffLoginLog {
  id: string;
  clinicId: string;
  staffAccountId?: string;
  userId: string;
  staffName: string;
  staffEmail: string;
  staffRole: UserRole;
  loginTimestamp: string;
  deviceInfo: string;
  ipOrLocation: string;
  sessionStatus: 'Active' | 'Logged Out' | 'Success' | 'Terminated' | string;
  accountReassigned?: boolean;
  previousStaffName?: string;
  notes?: string;
  action?: string;
  activityType?: AuditActivityType;
  targetResource?: string;
  details?: string;
  createdAt: string;
}


export interface ClinicSettings {
  id: string;
  name: string;
  brandName?: string;
  slogan?: string;
  badgeText?: string;
  logoUrl?: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  currency: string;
  currencySymbol: string;
  defaultAppointmentDuration: number;
  taxRate: number;
  invoicePrefix: string;
  ownerId: string;
  openingHours?: {
    [day: string]: { open: string; close: string; closed: boolean };
  };
  treatmentRooms?: string[];
  // Customizable Invoice Footer Fields
  invoiceNotes?: string[];
  invoiceThankYouMessage?: string;
  invoiceFollowUpMessage?: string;
  invoiceFooterClinicName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  clinicId: string;
  patientIdNumber: string; // e.g. "DF-1001"
  fullName: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  medicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  medicalAlerts?: string; // e.g. "Bleeding Disorder, Diabetes, Cardiac"
  dentalHistory?: string;
  consentGiven: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Checked In'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  dentistId: string;
  dentistName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  type: string;
  reason?: string;
  status: AppointmentStatus;
  room?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ToothCondition =
  | 'Healthy'
  | 'Caries'
  | 'Filling'
  | 'Crown'
  | 'Missing'
  | 'Implant'
  | 'Root Canal'
  | 'Extraction'
  | 'Periodontal'
  | 'Other';

export type ToothSurface = 'O' | 'M' | 'D' | 'B' | 'L' | 'I' | 'All';

export interface DentalChartEntry {
  id: string;
  clinicId: string;
  patientId: string;
  toothNumber: number; // FDI notation e.g. 11, 18, 48, etc.
  toothType: 'permanent' | 'primary';
  surface?: ToothSurface | string;
  condition: ToothCondition;
  procedureStatus: 'existing' | 'planned' | 'completed';
  notes?: string;
  examinedBy: string;
  examinedDate: string;
  createdAt: string;
  updatedAt: string;
}

export type TreatmentPlanStatus =
  | 'Planned'
  | 'Accepted'
  | 'In Progress'
  | 'Completed'
  | 'Declined'
  | 'Cancelled';

export interface TreatmentPlan {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  title: string;
  affectedTeeth: string;
  procedures: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  estimatedCost: number;
  phases?: string;
  status: TreatmentPlanStatus;
  notes?: string;
  dentistId: string;
  dentistName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalNote {
  id: string;
  clinicId: string;
  patientId: string;
  date: string;
  presentingComplaint: string;
  examinationFindings: string;
  diagnosis: string;
  treatmentPerformed: string;
  clinicalRecommendations?: string;
  followUpInstructions?: string;
  dentistId: string;
  dentistName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  route: string; // Oral, Topical, Sublingual
  frequency: string; // e.g., 1-0-1, TDS, QDS
  duration: string; // e.g. 5 days
  instructions: string; // Before meals, After meals, At bedtime
}

export interface Prescription {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  patientAge?: string;
  date: string;
  medications: MedicationItem[];
  allergyWarnings?: string;
  notes?: string;
  dentistId: string;
  dentistName: string;
  licenseNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'Draft' | 'Issued' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  toothOrArea?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Mobile Financial Service';

export interface Payment {
  id: string;
  clinicId: string;
  invoiceId: string;
  patientId: string;
  patientName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  date: string;
  receivedBy: string;
  notes?: string;
  createdAt: string;
}

export interface DentalService {
  id: string;
  clinicId: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  clinicId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  purchaseCost: number;
  supplier?: string;
  batchNumber?: string;
  expiryDate?: string;
  reorderThreshold: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Expired';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  clinicId: string;
  action: string;
  module: string;
  recordId: string;
  userId: string;
  userName: string;
  userRole: string;
  details: string;
  timestamp: string;
}
