import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import {
  UserProfile,
  UserRole,
  ClinicSettings,
  StaffAccount,
  DashboardModuleId,
  DEFAULT_ROLE_PERMISSIONS,
  AuditActivityType,
} from '../types/dental';
import { STAFF_PRESETS, DEV_TEST_PASSWORD, StaffPreset } from '../config/staffPresets';

export const ROLE_PRESETS: Record<
  UserRole,
  { email: string; name: string; title: string; defaultPass: string }
> = {
  Owner: {
    email: 'owner@dentflow.com',
    name: 'Dr. Shihab Hossain (Clinic Owner)',
    title: 'Managing Director & Lead Implantologist',
    defaultPass: 'DentFlow123!',
  },
  Dentist: {
    email: 'dentist@dentflow.com',
    name: 'Dr. Ayesha Siddiqa (Dentist)',
    title: 'Associate Dental Surgeon (BDS, PGT)',
    defaultPass: 'DentFlow123!',
  },
  Receptionist: {
    email: 'reception@dentflow.com',
    name: 'Tania Akter (Receptionist)',
    title: 'Front Desk & Patient Coordinator',
    defaultPass: 'DentFlow123!',
  },
  Cashier: {
    email: 'cashier@dentflow.com',
    name: 'Kamrul Islam (Cashier)',
    title: 'Clinic Accountant & Cashier',
    defaultPass: 'DentFlow123!',
  },
};

interface AuthContextType {
  currentUser: any | null;
  userProfile: UserProfile | null;
  activeRole: UserRole;
  clinic: ClinicSettings | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signInAsRole: (role: UserRole) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  switchActiveRole: (role: UserRole) => void;
  updateClinic: (data: Partial<ClinicSettings>) => Promise<void>;
  seedInitialDataIfEmpty: () => Promise<void>;
  hasPermission: (allowedRoles: UserRole[]) => boolean;
  canAccessModule: (moduleId: string) => boolean;
  activePermissions: DashboardModuleId[];
  clearError: () => void;
  recordStaffLoginLog: (data: {
    staffAccountId?: string;
    userId: string;
    staffName: string;
    staffEmail: string;
    staffRole: UserRole;
    previousStaffName?: string;
    accountReassigned?: boolean;
    notes?: string;
    action?: string;
    activityType?: AuditActivityType;
    details?: string;
    targetResource?: string;
  }) => Promise<void>;
  recordAuditLog: (event: {
    activityType: AuditActivityType;
    details: string;
    notes?: string;
    targetResource?: string;
    staffName?: string;
    staffRole?: UserRole;
    staffEmail?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEFAULT_CLINIC_ID = 'dentflow-main-clinic';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>('Owner');
  const [clinic, setClinic] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Initialize or fetch clinic record
  const loadOrCreateClinic = async (ownerUid: string): Promise<ClinicSettings> => {
    const clinicRef = doc(db, 'clinics', DEFAULT_CLINIC_ID);
    try {
      const snap = await getDoc(clinicRef);
      if (snap.exists()) {
        const data = snap.data() as ClinicSettings;
        setClinic(data);
        return data;
      } else {
        const initialClinic: ClinicSettings = {
          id: DEFAULT_CLINIC_ID,
          name: 'Apex Dental Care & Implant Center',
          brandName: 'DentFlow',
          slogan: 'Apex Dental & Implant Centre',
          badgeText: 'CLINICAL SUITE',
          logoUrl: '',
          email: 'contact@apexdentalcare.com',
          phone: '+880 1711-234567',
          address: 'House 42, Road 11, Banani, Dhaka, Bangladesh',
          currency: 'BDT',
          currencySymbol: '৳',
          defaultAppointmentDuration: 30,
          taxRate: 5,
          invoicePrefix: 'ADC',
          ownerId: ownerUid,
          treatmentRooms: ['Operatory 1 (General)', 'Operatory 2 (Surgery)', 'Operatory 3 (Hygiene)'],
          openingHours: {
            Monday: { open: '09:00', close: '20:00', closed: false },
            Tuesday: { open: '09:00', close: '20:00', closed: false },
            Wednesday: { open: '09:00', close: '20:00', closed: false },
            Thursday: { open: '09:00', close: '20:00', closed: false },
            Friday: { open: '15:00', close: '21:00', closed: false },
            Saturday: { open: '10:00', close: '19:00', closed: false },
            Sunday: { open: '00:00', close: '00:00', closed: true },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(clinicRef, initialClinic);
        setClinic(initialClinic);
        return initialClinic;
      }
    } catch (err) {
      console.warn('Clinic load error:', err);
      const fallbackClinic: ClinicSettings = {
        id: DEFAULT_CLINIC_ID,
        name: 'Apex Dental Care & Implant Center',
        email: 'contact@apexdentalcare.com',
        phone: '+880 1711-234567',
        address: 'House 42, Road 11, Banani, Dhaka, Bangladesh',
        currency: 'BDT',
        currencySymbol: '৳',
        defaultAppointmentDuration: 30,
        taxRate: 5,
        invoicePrefix: 'ADC',
        ownerId: ownerUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setClinic(fallbackClinic);
      return fallbackClinic;
    }
  };

  // Sync user profile from Firestore or create on first sign-in
  const syncUserProfile = async (user: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const isDefaultOwnerEmail =
        user.email === 'shihab.rajshahi@gmail.com' ||
        user.email === 'owner@dentflow.com' ||
        user.email?.includes('owner');

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setUserProfile(data);
        setActiveRole(data.role || (isDefaultOwnerEmail ? 'Owner' : 'Dentist'));
      } else {
        let detectedRole: UserRole = 'Dentist';
        if (isDefaultOwnerEmail) detectedRole = 'Owner';
        else if (user.email?.includes('reception')) detectedRole = 'Receptionist';
        else if (user.email?.includes('cashier')) detectedRole = 'Cashier';

        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Dental Practitioner',
          role: detectedRole,
          clinicId: DEFAULT_CLINIC_ID,
          specialty: 'General & Cosmetic Dentistry',
          licenseNumber: 'BMDC/DC-7841',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, initialProfile);
        setUserProfile(initialProfile);
        setActiveRole(initialProfile.role);
      }

      await loadOrCreateClinic(user.uid);
    } catch (err) {
      console.error('Error syncing user profile:', err);
      const fallback: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Clinical Staff',
        role: 'Owner',
        clinicId: DEFAULT_CLINIC_ID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(fallback);
      setActiveRole('Owner');
    }
  };

  useEffect(() => {
    // 1. Restore local session immediately if present
    try {
      const stored = localStorage.getItem('dentflow_session');
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        if (parsed && parsed.role) {
          setCurrentUser(parsed);
          setUserProfile(parsed);
          setActiveRole(parsed.role);
          loadOrCreateClinic(parsed.uid);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn('Storage read note:', e);
    }

    // 2. Fetch clinic branding so landing page and navigation always have custom branding
    getDoc(doc(db, 'clinics', DEFAULT_CLINIC_ID))
      .then((snap) => {
        if (snap.exists()) {
          setClinic(snap.data() as ClinicSettings);
        }
      })
      .catch((e) => console.warn('Public clinic branding load warning:', e));

    // 3. Also listen for Firebase Auth if active
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await syncUserProfile(user);
      } else {
        const stored = localStorage.getItem('dentflow_session');
        if (!stored) {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    // Ensure initial staff roster is seeded into Firestore clinics/{clinicId}/staff if empty
    seedStaffIfEmpty(DEFAULT_CLINIC_ID);

    return () => unsubscribe();
  }, []);

  const seedStaffIfEmpty = async (clinicId: string = DEFAULT_CLINIC_ID) => {
    try {
      const staffRef = collection(db, 'clinics', clinicId, 'staff');
      const snap = await getDocs(query(staffRef, limit(1)));
      if (snap.empty) {
        const now = new Date().toISOString();
        for (const preset of STAFF_PRESETS) {
          const docRef = doc(staffRef, `preset-${preset.id}`);
          const isAyesha = preset.id === 'ayesha';
          await setDoc(docRef, {
            id: `preset-${preset.id}`,
            uid: `uid-${preset.id}`,
            name: preset.name,
            email: preset.email,
            role: preset.systemRole,
            title: preset.role,
            specialty: preset.specialty || '',
            licenseNumber: preset.licenseNumber || '',
            status: 'active',
            initialPassword: preset.initialPassword || DEV_TEST_PASSWORD,
            permissions: DEFAULT_ROLE_PERMISSIONS[preset.systemRole] || [],
            createdAt: now,
            updatedAt: now,
            createdBy: 'system-seed',
            currentEmployeeSince: isAyesha ? '2025-02-15T09:00:00.000Z' : now,
            accountHistory: isAyesha
              ? [
                  {
                    id: 'hist-ayesha-predecessor',
                    employeeName: 'Dr. Sarah Khan',
                    employeeEmail: 'dr.sarah.khan@apex-dental.com',
                    employeePhone: '+880 1712-443322',
                    licenseNumber: 'BMDC-A-41209',
                    role: 'Dentist' as UserRole,
                    startDate: '2023-01-10T09:00:00.000Z',
                    endDate: '2025-02-14T18:00:00.000Z',
                    reassignedBy: 'Dr. Shihab Hossain (Clinic Owner)',
                    reassignedReason: 'Relocated abroad for post-graduate residency; clinical handover to Dr. Ayesha Siddiqa',
                    note: 'Associate Dentist seat successfully transferred. Historical patient records remain intact.',
                  },
                ]
              : [],
          });
        }
      }
    } catch (e) {
      console.warn('Staff seeding note:', e);
    }
  };

  const recordStaffLoginLog = async (data: {
    staffAccountId?: string;
    userId: string;
    staffName: string;
    staffEmail: string;
    staffRole: UserRole;
    previousStaffName?: string;
    accountReassigned?: boolean;
    notes?: string;
    action?: string;
    activityType?: AuditActivityType;
    details?: string;
    targetResource?: string;
  }) => {
    try {
      const targetClinicId = clinic?.id || DEFAULT_CLINIC_ID;
      const logsCol = collection(db, 'clinics', targetClinicId, 'staff_login_logs');
      const newDoc = doc(logsCol);

      let browser = 'Chrome';
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';

      let os = 'Windows 11';
      if (ua.includes('Macintosh')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      const deviceInfo = `${browser} on ${os}`;
      const ipOrLocation = 'Clinic Workstation (Banani Practice LAN)';

      await setDoc(newDoc, {
        id: newDoc.id,
        clinicId: targetClinicId,
        staffAccountId: data.staffAccountId || '',
        userId: data.userId,
        staffName: data.staffName,
        staffEmail: data.staffEmail,
        staffRole: data.staffRole,
        loginTimestamp: new Date().toISOString(),
        deviceInfo,
        ipOrLocation,
        sessionStatus: 'Active',
        accountReassigned: data.accountReassigned || false,
        previousStaffName: data.previousStaffName || '',
        notes: data.notes || 'Authenticated via staff login portal',
        action: data.action || 'login',
        activityType: data.activityType || 'User Login',
        details: data.details || 'Staff account login authenticated',
        targetResource: data.targetResource || '',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Staff login audit logging note:', err);
    }
  };

  const recordAuditLog = async (event: {
    activityType: AuditActivityType;
    details: string;
    notes?: string;
    targetResource?: string;
    staffName?: string;
    staffRole?: UserRole;
    staffEmail?: string;
  }) => {
    try {
      const targetClinicId = clinic?.id || DEFAULT_CLINIC_ID;
      const logsCol = collection(db, 'clinics', targetClinicId, 'staff_login_logs');
      const newDoc = doc(logsCol);

      let browser = 'Chrome';
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Edge')) browser = 'Edge';

      let os = 'Windows 11';
      if (ua.includes('Macintosh')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      const deviceInfo = `${browser} on ${os}`;
      const ipOrLocation = 'Clinic Workstation (Banani Practice LAN)';

      await setDoc(newDoc, {
        id: newDoc.id,
        clinicId: targetClinicId,
        staffAccountId: '',
        userId: currentUser?.uid || 'user-active',
        staffName: event.staffName || userProfile?.displayName || (activeRole === 'Owner' ? 'Dr. Shihab Hossain' : activeRole),
        staffEmail: event.staffEmail || userProfile?.email || (activeRole === 'Owner' ? 'owner@dentflow.com' : `${activeRole.toLowerCase()}@dentflow.com`),
        staffRole: event.staffRole || activeRole || 'Owner',
        loginTimestamp: new Date().toISOString(),
        deviceInfo,
        ipOrLocation,
        sessionStatus: 'Success',
        accountReassigned: false,
        previousStaffName: '',
        notes: event.notes || event.details,
        action: event.activityType.toLowerCase().replace(/\s+/g, '_'),
        activityType: event.activityType,
        details: event.details,
        targetResource: event.targetResource || '',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Audit trail logging note:', err);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = pass.trim();

    // 1. Validation of required inputs
    if (!trimmedEmail) {
      const msg = 'Please enter your staff email address.';
      setError(msg);
      throw new Error(msg);
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = 'Please enter a valid clinic email address.';
      setError(msg);
      throw new Error(msg);
    }
    if (!trimmedPass) {
      const msg = 'Password is required to authenticate.';
      setError(msg);
      throw new Error(msg);
    }

    // 2. Attempt real Firebase Auth credentials if account registered
    let firebaseUser: FirebaseUser | null = null;
    try {
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPass);
      firebaseUser = cred.user;
    } catch {
      // Proceed to verify staff in Firestore clinic staff collection
    }

    if (firebaseUser) {
      setCurrentUser(firebaseUser);
      await syncUserProfile(firebaseUser);
      await recordStaffLoginLog({
        userId: firebaseUser.uid,
        staffName: firebaseUser.displayName || 'Authenticated Staff',
        staffEmail: firebaseUser.email || trimmedEmail,
        staffRole: activeRole || 'Dentist',
      });
      return;
    }

    // 3. Match against dynamic Firestore clinic staff collection (active accounts only)
    const targetClinicId = clinic?.id || DEFAULT_CLINIC_ID;
    let dynamicStaff: StaffAccount | null = null;

    try {
      const staffQuery = query(
        collection(db, 'clinics', targetClinicId, 'staff'),
        where('email', '==', trimmedEmail)
      );
      const snap = await getDocs(staffQuery);
      if (!snap.empty) {
        dynamicStaff = { id: snap.docs[0].id, ...snap.docs[0].data() } as StaffAccount;
      }
    } catch (err) {
      console.warn('Dynamic staff lookup note:', err);
    }

    if (dynamicStaff) {
      if (dynamicStaff.status === 'suspended') {
        const msg = 'This staff account has been suspended by the Clinic Owner. Access denied.';
        setError(msg);
        throw new Error(msg);
      }

      const matchesCustom =
        dynamicStaff.initialPassword && trimmedPass === dynamicStaff.initialPassword;
      const matchesDev = trimmedPass === DEV_TEST_PASSWORD || trimmedPass === 'DentFlow123!';

      if (!matchesCustom && !matchesDev) {
        const msg = 'Invalid password for staff account. Please verify credentials or reset password.';
        setError(msg);
        throw new Error(msg);
      }

      const staffUser: UserProfile = {
        uid: dynamicStaff.uid || `staff-${dynamicStaff.id}`,
        email: dynamicStaff.email,
        displayName: dynamicStaff.name,
        role: dynamicStaff.role,
        clinicId: targetClinicId,
        specialty: dynamicStaff.specialty,
        licenseNumber: dynamicStaff.licenseNumber,
        phone: dynamicStaff.phone,
        permissions: dynamicStaff.permissions,
        createdAt: dynamicStaff.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCurrentUser(staffUser);
      setUserProfile(staffUser);
      setActiveRole(dynamicStaff.role);

      // Record in staff login logs (tracking previous employee if reassigned)
      const hasHistory = Boolean(
        dynamicStaff.accountHistory && dynamicStaff.accountHistory.length > 0
      );
      const previousName = hasHistory
        ? dynamicStaff.accountHistory![dynamicStaff.accountHistory!.length - 1].employeeName
        : undefined;

      await recordStaffLoginLog({
        staffAccountId: dynamicStaff.id,
        userId: staffUser.uid,
        staffName: dynamicStaff.name,
        staffEmail: dynamicStaff.email,
        staffRole: dynamicStaff.role,
        accountReassigned: hasHistory,
        previousStaffName: previousName,
      });

      try {
        localStorage.setItem('dentflow_session', JSON.stringify(staffUser));
        await setDoc(doc(db, 'users', staffUser.uid), staffUser, { merge: true });
        await loadOrCreateClinic(staffUser.uid);
        await seedInitialDataIfEmpty();
      } catch (e) {
        console.warn('Session sync note:', e);
      }
      return;
    }

    // 4. Match against configured fallback Staff Presets
    const preset = STAFF_PRESETS.find(
      (p) => p.email.toLowerCase() === trimmedEmail
    );

    let legacyRole: UserRole | null = null;
    if (trimmedEmail === 'owner@dentflow.com' || trimmedEmail === 'dr.shihab@apex-dental.com') legacyRole = 'Owner';
    else if (trimmedEmail === 'dentist@dentflow.com' || trimmedEmail === 'dr.ayesha@apex-dental.com') legacyRole = 'Dentist';
    else if (trimmedEmail === 'reception@dentflow.com' || trimmedEmail === 'marcus.reception@apex-dental.com') legacyRole = 'Receptionist';
    else if (trimmedEmail === 'cashier@dentflow.com' || trimmedEmail === 'rachel.billing@apex-dental.com') legacyRole = 'Cashier';

    const isDevPassValid = trimmedPass === DEV_TEST_PASSWORD || trimmedPass === 'DentFlow123!';

    if (!preset && !legacyRole) {
      const msg = 'Invalid staff credentials. Email address is not registered in this clinic.';
      setError(msg);
      throw new Error(msg);
    }

    // Preset found: verify password
    if (!isDevPassValid) {
      const msg = 'Invalid password for staff account. Please verify credentials or reset password.';
      setError(msg);
      throw new Error(msg);
    }

    // Success: activate authenticated staff session with trusted role
    const assignedRole = preset ? preset.systemRole : (legacyRole || 'Dentist');
    const staffName = preset ? preset.name : trimmedEmail.split('@')[0];

    const staffUser: UserProfile = {
      uid: `staff-${preset ? preset.id : assignedRole.toLowerCase()}`,
      email: trimmedEmail,
      displayName: staffName,
      role: assignedRole,
      clinicId: DEFAULT_CLINIC_ID,
      specialty: preset?.specialty,
      licenseNumber: preset?.licenseNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(staffUser);
    setUserProfile(staffUser);
    setActiveRole(assignedRole);

    await recordStaffLoginLog({
      staffAccountId: preset ? preset.id : undefined,
      userId: staffUser.uid,
      staffName: staffUser.displayName,
      staffEmail: staffUser.email,
      staffRole: assignedRole,
    });

    try {
      localStorage.setItem('dentflow_session', JSON.stringify(staffUser));
      await setDoc(doc(db, 'users', staffUser.uid), staffUser, { merge: true });
      await loadOrCreateClinic(staffUser.uid);
      await seedInitialDataIfEmpty();
    } catch (e) {
      console.warn('Session sync note:', e);
    }
  };

  // Sign in as a specific role directly via portal preset
  const signInAsRole = async (targetRole: UserRole) => {
    setError(null);
    const preset = ROLE_PRESETS[targetRole];

    const staffUser: UserProfile = {
      uid: `staff-${targetRole.toLowerCase()}`,
      email: preset.email,
      displayName: preset.name,
      role: targetRole,
      clinicId: DEFAULT_CLINIC_ID,
      specialty: targetRole === 'Dentist' ? 'Associate Dental Surgeon (BDS, PGT)' : undefined,
      licenseNumber: targetRole === 'Dentist' ? 'BMDC/DC-8921' : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Instant user session activation
    setCurrentUser(staffUser);
    setUserProfile(staffUser);
    setActiveRole(targetRole);

    await recordStaffLoginLog({
      userId: staffUser.uid,
      staffName: staffUser.displayName,
      staffEmail: staffUser.email,
      staffRole: targetRole,
    });

    try {
      localStorage.setItem('dentflow_session', JSON.stringify(staffUser));
      await setDoc(doc(db, 'users', staffUser.uid), staffUser, { merge: true });
      await loadOrCreateClinic(staffUser.uid);
      await seedInitialDataIfEmpty();
    } catch (err) {
      console.warn('Background sync note:', err);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
    role: UserRole = 'Dentist'
  ) => {
    setError(null);
    const staffUser: UserProfile = {
      uid: `user-${Date.now().toString(36)}`,
      email: email.trim(),
      displayName: name.trim() || 'Staff Member',
      role,
      clinicId: DEFAULT_CLINIC_ID,
      licenseNumber: role === 'Dentist' ? 'BMDC/DC-8921' : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(staffUser);
    setUserProfile(staffUser);
    setActiveRole(role);

    try {
      localStorage.setItem('dentflow_session', JSON.stringify(staffUser));
      await setDoc(doc(db, 'users', staffUser.uid), staffUser, { merge: true });
      await loadOrCreateClinic(staffUser.uid);
      await seedInitialDataIfEmpty();
    } catch (err: unknown) {
      console.warn('Registration note:', err);
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('dentflow_session');
      await firebaseSignOut(auth).catch(() => {});
    } catch (err) {
      console.warn('Sign out notice:', err);
    } finally {
      setCurrentUser(null);
      setUserProfile(null);
      setActiveRole('Owner');
    }
  };

  const sendPasswordReset = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: unknown) {
      // Graceful fallback confirmation
      console.warn('Password reset note:', err);
    }
  };

  const switchActiveRole = (role: UserRole) => {
    setActiveRole(role);
    if (userProfile) {
      const updated = { ...userProfile, role };
      setUserProfile(updated);
      try {
        localStorage.setItem('dentflow_session', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  const updateClinic = async (data: Partial<ClinicSettings>) => {
    if (!clinic) return;
    try {
      const clinicRef = doc(db, 'clinics', clinic.id);
      const updated = {
        ...clinic,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(clinicRef, updated);
      setClinic(updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `clinics/${clinic.id}`);
    }
  };

  // Seed standard services, initial dental records and sample expenses if fresh
  const seedInitialDataIfEmpty = async () => {
    if (!currentUser) return;
    const servicesRef = collection(db, 'clinics', DEFAULT_CLINIC_ID, 'services');
    try {
      const q = query(servicesRef, limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        // Seed default procedures
        const defaultServices = [
          { name: 'Comprehensive Oral Examination', code: 'D0150', category: 'Diagnostic', price: 1000, durationMinutes: 30, isActive: true },
          { name: 'Full Mouth Scaling & Polishing', code: 'D1110', category: 'Preventative', price: 2500, durationMinutes: 45, isActive: true },
          { name: 'Dental Composite Filling (Single Surface)', code: 'D2330', category: 'Restorative', price: 2000, durationMinutes: 40, isActive: true },
          { name: 'Root Canal Therapy (Molar)', code: 'D3330', category: 'Endodontics', price: 8500, durationMinutes: 60, isActive: true },
          { name: 'Dental Extraction (Simple)', code: 'D7140', category: 'Oral Surgery', price: 1500, durationMinutes: 30, isActive: true },
          { name: 'Surgical Extraction / Impaction', code: 'D7210', category: 'Oral Surgery', price: 6000, durationMinutes: 60, isActive: true },
          { name: 'Porcelain-Fused-to-Metal (PFM) Crown', code: 'D2750', category: 'Prosthodontics', price: 7000, durationMinutes: 45, isActive: true },
          { name: 'Zirconia Aesthetic Crown', code: 'D2740', category: 'Prosthodontics', price: 12000, durationMinutes: 45, isActive: true },
          { name: 'In-Office Dental Whitening', code: 'D9972', category: 'Cosmetic', price: 15000, durationMinutes: 60, isActive: true },
          { name: 'Dental Implant Placement (Fixture)', code: 'D6010', category: 'Implantology', price: 45000, durationMinutes: 90, isActive: true },
        ];

        for (const s of defaultServices) {
          const docRef = doc(servicesRef);
          await setDoc(docRef, {
            ...s,
            id: docRef.id,
            clinicId: DEFAULT_CLINIC_ID,
            createdAt: new Date().toISOString(),
          });
        }

        // Seed initial demo patients if patient collection is empty
        const patientsRef = collection(db, 'clinics', DEFAULT_CLINIC_ID, 'patients');
        const pSnap = await getDocs(query(patientsRef, limit(1)));
        if (pSnap.empty) {
          const demoPatients = [
            {
              patientIdNumber: 'DF-1001',
              fullName: 'Rahim Chowdhury',
              dateOfBirth: '1988-04-12',
              gender: 'Male',
              phone: '+880 1819-554433',
              email: 'rahim.c@example.com',
              address: 'Gulshan 2, Dhaka',
              emergencyContactName: 'Farhana Chowdhury (Wife)',
              emergencyContactPhone: '+880 1712-998877',
              medicalHistory: 'Hypertension controlled with medication. No prior surgical complications.',
              allergies: 'Penicillin (mild rash)',
              currentMedications: 'Amlodipine 5mg OD',
              medicalAlerts: 'Allergic to Penicillin; Mild Hypertension',
              dentalHistory: 'Regular checkups; previously had composite filling in tooth 16.',
              consentGiven: true,
              notes: 'Prefers morning appointments.',
              createdBy: currentUser.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              patientIdNumber: 'DF-1002',
              fullName: 'Nusrat Jahan',
              dateOfBirth: '1995-09-22',
              gender: 'Female',
              phone: '+880 1912-334455',
              email: 'nusrat.jahan@example.com',
              address: 'Dhanmondi, Dhaka',
              emergencyContactName: 'Kamal Jahan (Father)',
              emergencyContactPhone: '+880 1511-667788',
              medicalHistory: 'No systemic illnesses. Excellent general health.',
              allergies: 'None reported',
              currentMedications: 'None',
              medicalAlerts: 'Dental phobia/anxiety - gentle anesthesia recommended',
              dentalHistory: 'Bleeding gums when brushing, sensitive to cold water on lower left molars.',
              consentGiven: true,
              notes: 'Interested in orthodontic alignment and teeth whitening.',
              createdBy: currentUser.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              patientIdNumber: 'DF-1003',
              fullName: 'Tanvir Hasan',
              dateOfBirth: '1976-11-05',
              gender: 'Male',
              phone: '+880 1715-887766',
              email: 'tanvir.h@example.com',
              address: 'Uttara Sector 7, Dhaka',
              emergencyContactName: 'Shafali Hasan',
              emergencyContactPhone: '+880 1819-112233',
              medicalHistory: 'Type 2 Diabetes Mellitus (HbA1c 6.8%). Cardiac stent in 2021.',
              allergies: 'Sulfa drugs',
              currentMedications: 'Metformin 500mg BD, Aspirin 75mg OD',
              medicalAlerts: 'Diabetic; Cardiac Stent (Aspirin precautions for oral surgery)',
              dentalHistory: 'Deep caries in tooth 36. Requires root canal therapy and crown.',
              consentGiven: true,
              notes: 'Needs antibiotic prophylaxis consultation before surgical extraction.',
              createdBy: currentUser.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];

          for (const p of demoPatients) {
            const pRef = doc(patientsRef);
            await setDoc(pRef, {
              ...p,
              id: pRef.id,
              clinicId: DEFAULT_CLINIC_ID,
            });
          }
        }

        // Seed inventory essentials
        const invRef = collection(db, 'clinics', DEFAULT_CLINIC_ID, 'inventory');
        const invSnap = await getDocs(query(invRef, limit(1)));
        if (invSnap.empty) {
          const defaultInventory = [
            { name: 'Lidocaine 2% with Epinephrine 1:100,000', category: 'Anesthetics', quantity: 45, unit: 'Cartridge', purchaseCost: 85, supplier: 'Septodont Medical', batchNumber: 'LID-882', expiryDate: '2027-08-30', reorderThreshold: 20, status: 'In Stock' },
            { name: 'Articaine 4% with Epinephrine 1:100,000', category: 'Anesthetics', quantity: 12, unit: 'Cartridge', purchaseCost: 110, supplier: 'Septodont Medical', batchNumber: 'ART-401', expiryDate: '2027-05-15', reorderThreshold: 15, status: 'Low Stock' },
            { name: 'Filtek Z350 XT Composite Syringe (A2)', category: 'Restorative', quantity: 8, unit: 'Syringe', purchaseCost: 1800, supplier: '3M ESPE', batchNumber: '3M-552', expiryDate: '2027-11-20', reorderThreshold: 5, status: 'In Stock' },
            { name: 'Single Bond Universal Adhesive', category: 'Restorative', quantity: 4, unit: 'Bottle', purchaseCost: 3200, supplier: '3M ESPE', batchNumber: 'SBU-12', expiryDate: '2027-03-10', reorderThreshold: 2, status: 'In Stock' },
            { name: 'Nitrile Examination Gloves (Medium)', category: 'PPE', quantity: 3, unit: 'Box (100pcs)', purchaseCost: 450, supplier: 'TopGlove Healthcare', batchNumber: 'TG-991', expiryDate: '2028-01-01', reorderThreshold: 5, status: 'Low Stock' },
            { name: 'Alginate Impression Material (Chromaprint)', category: 'Impression', quantity: 6, unit: 'Pack (454g)', purchaseCost: 650, supplier: 'Dentsply Sirona', batchNumber: 'ALG-33', expiryDate: '2027-09-18', reorderThreshold: 3, status: 'In Stock' },
          ];

          for (const item of defaultInventory) {
            const itemRef = doc(invRef);
            await setDoc(itemRef, {
              ...item,
              id: itemRef.id,
              clinicId: DEFAULT_CLINIC_ID,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Seed initial expenses if collection is empty
        const expRef = collection(db, 'clinics', DEFAULT_CLINIC_ID, 'expenses');
        const expSnap = await getDocs(query(expRef, limit(1)));
        if (expSnap.empty) {
          const sampleExpenses = [
            {
              title: 'Dental Laboratory Ceramic Crown Fabrication (Apex Lab)',
              category: 'Dental Supplies & Lab',
              amount: 6500,
              date: new Date().toISOString().split('T')[0],
              paymentMethod: 'Bank Transfer',
              referenceNumber: 'LAB-9041',
              notes: 'Zirconia crown for tooth #16',
              recordedBy: 'Kamrul Islam (Cashier)',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              title: 'Monthly Clinic Facility Electricity & Utility Bill (DESCO)',
              category: 'Utilities',
              amount: 14200,
              date: new Date().toISOString().split('T')[0],
              paymentMethod: 'Mobile Financial Service',
              referenceNumber: 'bKash-UTIL-442',
              notes: 'Banani practice electricity charges',
              recordedBy: 'Kamrul Islam (Cashier)',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              title: 'Surgical Autoclave Maintenance & Sterility Testing',
              category: 'Equipment & Maintenance',
              amount: 3500,
              date: new Date().toISOString().split('T')[0],
              paymentMethod: 'Cash',
              referenceNumber: 'MNT-771',
              notes: 'Class B autoclave validation and gasket replacement',
              recordedBy: 'Dr. Shihab Hossain',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];

          for (const eItem of sampleExpenses) {
            const eRef = doc(expRef);
            await setDoc(eRef, {
              ...eItem,
              id: eRef.id,
              clinicId: DEFAULT_CLINIC_ID,
            });
          }
        }

        // Seed initial appointments (including Upcoming Root Canal today)
        const apptsRef = collection(db, 'clinics', DEFAULT_CLINIC_ID, 'appointments');
        const apptSnap = await getDocs(query(apptsRef, limit(1)));
        if (apptSnap.empty) {
          const todayStr = new Date().toISOString().split('T')[0];
          const demoAppts = [
            {
              patientId: 'DF-1003',
              patientName: 'Tanvir Hasan',
              patientPhone: '+880 1715-887766',
              dentistId: 'ayesha',
              dentistName: 'Dr. Ayesha Siddiqa',
              date: todayStr,
              startTime: '11:30',
              endTime: '12:30',
              durationMinutes: 60,
              type: 'Root Canal Therapy (Molar)',
              reason: 'Deep pulp necrosis & acute apical pain in tooth #36',
              status: 'Confirmed',
              room: 'Operatory 2 (Surgery)',
              notes: 'Patient has Diabetic and Cardiac stent history. Administer local anesthesia without high epinephrine.',
              createdBy: currentUser?.uid || 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              patientId: 'DF-1001',
              patientName: 'Rahim Chowdhury',
              patientPhone: '+880 1819-554433',
              dentistId: 'shihab',
              dentistName: 'Dr. Shihab Hossain',
              date: todayStr,
              startTime: '10:00',
              endTime: '10:45',
              durationMinutes: 45,
              type: 'Surgical Implant Evaluation',
              reason: 'Post-extraction alveolar bone assessment',
              status: 'Checked In',
              room: 'Operatory 1 (General)',
              notes: 'Severe Penicillin allergy flagged. Currently checked in waiting in reception.',
              createdBy: currentUser?.uid || 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];

          for (const a of demoAppts) {
            const aRef = doc(apptsRef);
            await setDoc(aRef, {
              ...a,
              id: aRef.id,
              clinicId: DEFAULT_CLINIC_ID,
            });
          }
        }

        // Seed initial invoices (including Outstanding Balances)
        const invsRef = collection(db, 'clinics', DEFAULT_CLINIC_ID, 'invoices');
        const invoiceSnap = await getDocs(query(invsRef, limit(1)));
        if (invoiceSnap.empty) {
          const demoInvoices = [
            {
              invoiceNumber: 'ADC-1001',
              patientId: 'DF-1003',
              patientName: 'Tanvir Hasan',
              patientPhone: '+880 1715-887766',
              dentistName: 'Dr. Ayesha Siddiqa',
              issueDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
              dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
              items: [
                { id: '1', description: 'Root Canal Therapy - Molar (D3330)', quantity: 1, unitPrice: 8500, total: 8500 },
                { id: '2', description: 'Digital Periapical Radiograph (D0220)', quantity: 2, unitPrice: 500, total: 1000 },
              ],
              subtotal: 9500,
              discount: 500,
              tax: 450,
              total: 9450,
              paidAmount: 1450,
              balance: 8000,
              status: 'Partially Paid' as const,
              notes: 'Outstanding balance of ৳ 8,000 for Root Canal procedure.',
              createdBy: currentUser?.uid || 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              invoiceNumber: 'ADC-1002',
              patientId: 'DF-1001',
              patientName: 'Rahim Chowdhury',
              patientPhone: '+880 1819-554433',
              dentistName: 'Dr. Shihab Hossain',
              issueDate: new Date(Date.now() - 12 * 86400000).toISOString().split('T')[0],
              dueDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
              items: [
                { id: '1', description: 'Surgical Extraction / Impaction (D7210)', quantity: 1, unitPrice: 6000, total: 6000 },
                { id: '2', description: 'Porcelain-Fused-to-Metal Crown (D2750)', quantity: 1, unitPrice: 7000, total: 7000 },
              ],
              subtotal: 13000,
              discount: 1000,
              tax: 600,
              total: 12600,
              paidAmount: 0,
              balance: 12600,
              status: 'Overdue' as const,
              notes: 'Overdue invoice. Immediate follow-up required.',
              createdBy: currentUser?.uid || 'system',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];

          for (const inv of demoInvoices) {
            const invDoc = doc(invsRef);
            await setDoc(invDoc, {
              ...inv,
              id: invDoc.id,
              clinicId: DEFAULT_CLINIC_ID,
            });
          }
        }

        // Seed initial dental lab orders (Prosthodontics)
        const labRef = collection(db, 'clinics', DEFAULT_CLINIC_ID, 'lab_orders');
        const labSnap = await getDocs(query(labRef, limit(1)));
        if (labSnap.empty) {
          const demoLabs = [
            {
              patientId: 'DF-1003',
              patientName: 'Tanvir Hasan',
              dentistId: 'ayesha',
              dentistName: 'Dr. Ayesha Siddiqa',
              labName: 'Apex Precision Dental Ceramics',
              prosthesisType: 'Zirconia Crown' as const,
              toothNumbers: '36',
              shade: 'A2 (VITA Classical)',
              sentDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
              dueDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
              cost: 4500,
              status: 'In Fabrication' as const,
              instructions: 'Monolithic multilayer zirconia for lower left 1st molar after RCT. High occlusal clearance.',
              expenseRecorded: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              patientId: 'DF-1001',
              patientName: 'Rahim Chowdhury',
              dentistId: 'shihab',
              dentistName: 'Dr. Shihab Hossain',
              labName: 'Dhaka ProsthoLab & CAD/CAM Studio',
              prosthesisType: 'PFM Crown' as const,
              toothNumbers: '16',
              shade: 'A3 (VITA Classical)',
              sentDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
              dueDate: new Date().toISOString().split('T')[0],
              cost: 3000,
              status: 'Try-In Ready' as const,
              instructions: 'Porcelain-fused-to-metal crown with 360-degree ceramic shoulder margin. Ready for patient try-in today.',
              expenseRecorded: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];

          for (const item of demoLabs) {
            const lDoc = doc(labRef);
            await setDoc(lDoc, {
              ...item,
              id: lDoc.id,
              clinicId: DEFAULT_CLINIC_ID,
            });
          }
        }

        // Seed initial staff login audit logs (including historical handover trail)
        const logsRef = collection(db, 'clinics', DEFAULT_CLINIC_ID, 'staff_login_logs');
        const logsSnap = await getDocs(query(logsRef, limit(1)));
        if (logsSnap.empty) {
          const now = Date.now();
          const demoLogs = [
            {
              clinicId: DEFAULT_CLINIC_ID,
              staffAccountId: 'preset-shihab',
              userId: 'uid-shihab',
              staffName: 'Dr. Shihab Hossain',
              staffEmail: 'owner@dentflow.com',
              staffRole: 'Owner' as UserRole,
              loginTimestamp: new Date(now - 15 * 60 * 1000).toISOString(),
              deviceInfo: 'Chrome on macOS',
              ipOrLocation: 'Practice Director Office (Admin Terminal 1)',
              sessionStatus: 'Active' as const,
              accountReassigned: false,
              previousStaffName: '',
              notes: 'Owner administrative session initiated',
              action: 'login',
              activityType: 'User Login',
              details: 'Owner logged into DentFlow clinical suite',
              createdAt: new Date(now - 15 * 60 * 1000).toISOString(),
            },
            {
              clinicId: DEFAULT_CLINIC_ID,
              staffAccountId: 'preset-shihab',
              userId: 'uid-shihab',
              staffName: 'Dr. Shihab Hossain',
              staffEmail: 'owner@dentflow.com',
              staffRole: 'Owner' as UserRole,
              loginTimestamp: new Date(now - 35 * 60 * 1000).toISOString(),
              deviceInfo: 'Chrome on macOS',
              ipOrLocation: 'Practice Director Office',
              sessionStatus: 'Success' as const,
              accountReassigned: false,
              previousStaffName: '',
              notes: 'Owner edited collected payment record',
              action: 'payment_edited',
              activityType: 'Payment Edited',
              details: 'Modified payment receipt for invoice #ADC-2026-9981 (Amount: ৳ 1,050, Method: Cash)',
              targetResource: 'ADC-2026-9981',
              createdAt: new Date(now - 35 * 60 * 1000).toISOString(),
            },
            {
              clinicId: DEFAULT_CLINIC_ID,
              staffAccountId: 'preset-ayesha',
              userId: 'uid-ayesha',
              staffName: 'Dr. Ayesha Siddiqa',
              staffEmail: 'dr.ayesha@apex-dental.com',
              staffRole: 'Dentist' as UserRole,
              loginTimestamp: new Date(now - 45 * 60 * 1000).toISOString(),
              deviceInfo: 'Edge on Windows 11',
              ipOrLocation: 'Operatory 2 (Surgery Terminal)',
              sessionStatus: 'Active' as const,
              accountReassigned: true,
              previousStaffName: 'Dr. Sarah Khan',
              notes: 'Authenticated on reassigned associate dental workstation',
              action: 'login',
              activityType: 'User Login',
              details: 'Dentist logged in on operatory chair terminal',
              createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
            },
            {
              clinicId: DEFAULT_CLINIC_ID,
              staffAccountId: 'preset-reception',
              userId: 'uid-reception',
              staffName: 'Marcus Vance',
              staffEmail: 'reception@dentflow.com',
              staffRole: 'Receptionist' as UserRole,
              loginTimestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
              deviceInfo: 'Chrome on Windows 11',
              ipOrLocation: 'Reception Desk 1 (Main Lobby)',
              sessionStatus: 'Active' as const,
              accountReassigned: false,
              previousStaffName: '',
              notes: 'Front desk morning patient intake shift started',
              action: 'login',
              activityType: 'User Login',
              details: 'Receptionist logged in for front-desk duty',
              createdAt: new Date(now - 2 * 3600 * 1000).toISOString(),
            },
            {
              clinicId: DEFAULT_CLINIC_ID,
              staffAccountId: 'preset-cashier',
              userId: 'uid-cashier',
              staffName: 'Rachel Chen',
              staffEmail: 'cashier@dentflow.com',
              staffRole: 'Cashier' as UserRole,
              loginTimestamp: new Date(now - 3 * 3600 * 1000).toISOString(),
              deviceInfo: 'Chrome on Windows 11',
              ipOrLocation: 'Cashier Counter (Billing Terminal)',
              sessionStatus: 'Success' as const,
              accountReassigned: false,
              previousStaffName: '',
              notes: 'Payment collected at counter',
              action: 'payment_collected',
              activityType: 'Payment Collected',
              details: 'Recorded counter payment receipt for Invoice #ADC-1001 (Amount: ৳ 4,000)',
              targetResource: 'ADC-1001',
              createdAt: new Date(now - 3 * 3600 * 1000).toISOString(),
            },
            {
              clinicId: DEFAULT_CLINIC_ID,
              staffAccountId: 'preset-shihab',
              userId: 'uid-shihab',
              staffName: 'Dr. Shihab Hossain',
              staffEmail: 'owner@dentflow.com',
              staffRole: 'Owner' as UserRole,
              loginTimestamp: new Date(now - 24 * 3600 * 1000).toISOString(),
              deviceInfo: 'Chrome on macOS',
              ipOrLocation: 'Practice Director Office',
              sessionStatus: 'Success' as const,
              accountReassigned: false,
              previousStaffName: '',
              notes: 'Archived test record',
              action: 'patient_deleted',
              activityType: 'Patient Deleted',
              details: 'Deleted duplicate test patient record #DF-0982 per GDPR data cleanup policy',
              targetResource: 'DF-0982',
              createdAt: new Date(now - 24 * 3600 * 1000).toISOString(),
            },
            {
              clinicId: DEFAULT_CLINIC_ID,
              staffAccountId: 'preset-ayesha',
              userId: 'uid-shihab',
              staffName: 'Dr. Shihab Hossain',
              staffEmail: 'owner@dentflow.com',
              staffRole: 'Owner' as UserRole,
              loginTimestamp: new Date(now - 2 * 86400 * 1000).toISOString(),
              deviceInfo: 'Chrome on macOS',
              ipOrLocation: 'Practice Director Office',
              sessionStatus: 'Success' as const,
              accountReassigned: true,
              previousStaffName: 'Dr. Sarah Khan',
              notes: 'Transferred staff seat to Dr. Ayesha Siddiqa',
              action: 'staff_reassigned',
              activityType: 'Staff Account Reassigned',
              details: 'Reassigned Associate Dentist account and operatory privileges from Dr. Sarah Khan to Dr. Ayesha Siddiqa',
              createdAt: new Date(now - 2 * 86400 * 1000).toISOString(),
            },
            {
              clinicId: DEFAULT_CLINIC_ID,
              staffAccountId: 'preset-ayesha',
              userId: 'uid-sarah-khan-legacy',
              staffName: 'Dr. Sarah Khan (Former)',
              staffEmail: 'dr.sarah.khan@apex-dental.com',
              staffRole: 'Dentist' as UserRole,
              loginTimestamp: new Date(now - 45 * 86400 * 1000).toISOString(),
              deviceInfo: 'Safari on macOS',
              ipOrLocation: 'Operatory 2 (Surgery Terminal)',
              sessionStatus: 'Terminated' as const,
              accountReassigned: true,
              previousStaffName: '',
              notes: 'Historical session before departing practice / handover to Dr. Ayesha',
              action: 'login',
              activityType: 'User Login',
              details: 'Historical session archive before departing clinic',
              createdAt: new Date(now - 45 * 86400 * 1000).toISOString(),
            },
          ];

          for (const l of demoLogs) {
            const lDoc = doc(logsRef);
            await setDoc(lDoc, {
              ...l,
              id: lDoc.id,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Initial seeding note:', e);
    }
  };

  // Sync custom staff permissions when role or email matches a configured staff member in Firestore
  const [roleCustomPermissions, setRoleCustomPermissions] = useState<Record<string, DashboardModuleId[]>>({});

  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    let isMounted = true;
    getDocs(collection(db, 'clinics', clinicId, 'staff'))
      .then((snap) => {
        if (!isMounted) return;
        const map: Record<string, DashboardModuleId[]> = {};
        snap.forEach((d) => {
          const data = d.data() as StaffAccount;
          if (data.permissions && data.permissions.length > 0) {
            if (data.email) map[data.email.toLowerCase()] = data.permissions;
            if (data.role) map[`role:${data.role}`] = data.permissions;
          }
        });
        setRoleCustomPermissions(map);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [clinic?.id, activeRole, userProfile?.email]);

  const isOwnerOrAdmin = useMemo(() => {
    const norm = String(activeRole || '').trim().toLowerCase();
    return norm === 'owner' || norm === 'admin' || norm === 'administrator' || norm === 'superadmin';
  }, [activeRole]);

  const hasPermission = (allowedRoles: UserRole[]): boolean => {
    if (isOwnerOrAdmin) return true; // Owner/Admin has full access across modules
    return allowedRoles.some((r) => r.toLowerCase() === String(activeRole).toLowerCase());
  };

  const activePermissions = useMemo<DashboardModuleId[]>(() => {
    if (isOwnerOrAdmin) {
      return DEFAULT_ROLE_PERMISSIONS.Owner;
    }
    const emailKey = userProfile?.email?.toLowerCase();
    if (emailKey && roleCustomPermissions[emailKey]) {
      return roleCustomPermissions[emailKey];
    }
    if (roleCustomPermissions[`role:${activeRole}`]) {
      return roleCustomPermissions[`role:${activeRole}`];
    }
    if (userProfile?.permissions && userProfile.permissions.length > 0) {
      return userProfile.permissions;
    }
    return DEFAULT_ROLE_PERMISSIONS[activeRole] || [];
  }, [isOwnerOrAdmin, activeRole, userProfile?.permissions, userProfile?.email, roleCustomPermissions]);

  const canAccessModule = (moduleId: string): boolean => {
    // Write/management access to 'staff', 'settings', and 'log_history' strictly requires OWNER or ADMIN privileges
    if (moduleId === 'staff' || moduleId === 'clinic-settings' || moduleId === 'settings' || moduleId === 'log_history') {
      return isOwnerOrAdmin;
    }
    if (isOwnerOrAdmin) return true;
    return activePermissions.includes(moduleId as DashboardModuleId);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        activeRole,
        clinic,
        loading,
        error,
        signInWithEmail,
        signInAsRole,
        signUpWithEmail,
        signOut,
        sendPasswordReset,
        switchActiveRole,
        updateClinic,
        seedInitialDataIfEmpty,
        hasPermission,
        canAccessModule,
        activePermissions,
        clearError,
        recordStaffLoginLog,
        recordAuditLog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
