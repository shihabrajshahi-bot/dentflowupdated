import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  StaffAccount,
  StaffAccountHistoryItem,
  UserRole,
  DashboardModuleId,
  DEFAULT_ROLE_PERMISSIONS,
  DASHBOARD_MODULE_DEFINITIONS,
  DashboardModuleDefinition,
  PracticeRoleDefinition,
  DEFAULT_PRACTICE_ROLES,
} from '../../types/dental';
import { STAFF_PRESETS, DEV_TEST_PASSWORD } from '../../config/staffPresets';
import { StaffLoginReport } from './StaffLoginReport';
import {
  Users,
  UserPlus,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Key,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  X,
  Mail,
  UserCheck,
  UserX,
  FileBadge,
  Send,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  Stethoscope,
  Building,
  RefreshCw,
  Edit3,
  RotateCcw,
  Sliders,
  CheckSquare,
  Square,
  Layers,
  Settings,
  ArrowRightLeft,
  History,
  UserMinus,
} from 'lucide-react';

interface StaffInvitation {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title?: string;
  inviteToken: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
}

interface StaffManagementProps {
  initialTab?: 'roster' | 'register' | 'invitations' | 'login_logs' | 'roles';
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ initialTab }) => {
  const { clinic, currentUser, activeRole, hasPermission, recordStaffLoginLog } = useAuth();
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'roster' | 'register' | 'invitations' | 'login_logs' | 'roles'>(
    initialTab || 'roster'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Role Management State (Add & Delete Roles in Owner account)
  const [customRoles, setCustomRoles] = useState<PracticeRoleDefinition[]>([]);
  const [deletedSystemRoleIds, setDeletedSystemRoleIds] = useState<string[]>([]);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<PracticeRoleDefinition | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [savingNewRole, setSavingNewRole] = useState(false);
  const [newRoleFormData, setNewRoleFormData] = useState<{
    name: string;
    category: 'Clinical' | 'Front Desk' | 'Financial' | 'Support' | 'Administrative';
    description: string;
    permissions: DashboardModuleId[];
  }>({
    name: '',
    category: 'Clinical',
    description: '',
    permissions: ['dashboard', 'patients', 'appointments'],
  });

  // Reassign / Handover Account State (When staff member leaves and successor arrives)
  const [reassigningStaff, setReassigningStaff] = useState<StaffAccount | null>(null);
  const [reassignFormData, setReassignFormData] = useState({
    outgoingReason: 'Resigned / Leaving practice',
    outgoingNote: '',
    incomingName: '',
    incomingEmail: '',
    incomingTitle: '',
    incomingLicense: '',
    incomingPhone: '',
    incomingPassword: 'DentalStaff2025!',
    resetPermissionsToDefault: true,
  });
  const [reassigning, setReassigning] = useState(false);
  const [showReassignPassword, setShowReassignPassword] = useState(false);

  // Form mode: 'register' = direct account provision, 'invite' = send email invitation
  const [formMode, setFormMode] = useState<'register' | 'invite'>('register');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Modal & Notification states
  const [staffToDelete, setStaffToDelete] = useState<StaffAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit Staff Member State
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    email: string;
    role: UserRole;
    title: string;
    specialty: string;
    licenseNumber: string;
    phone: string;
    status: 'active' | 'suspended';
    initialPassword: string;
    permissions: DashboardModuleId[];
  }>({
    name: '',
    email: '',
    role: 'Dentist',
    title: '',
    specialty: '',
    licenseNumber: '',
    phone: '',
    status: 'active',
    initialPassword: '',
    permissions: [],
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  // Register Form Data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Dentist' as UserRole,
    password: '',
    title: '',
    specialty: '',
    licenseNumber: '',
    phone: '',
    inviteNote: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Strict RBAC Verification: Module only accessible to 'Owner' role
  const isOwner = activeRole === 'Owner' || hasPermission(['Owner']);
  const clinicId = clinic?.id || DEFAULT_CLINIC_ID;

  // Real-time listener for Staff members
  useEffect(() => {
    if (!isOwner) {
      setLoading(false);
      return;
    }

    const qStaff = query(collection(db, 'clinics', clinicId, 'staff'));
    const unsubscribeStaff = onSnapshot(
      qStaff,
      async (snapshot) => {
        const items: StaffAccount[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as StaffAccount);
        });

        // Initialize presets if empty so the owner immediately has the practice roster
        if (items.length === 0) {
          try {
            const staffRef = collection(db, 'clinics', clinicId, 'staff');
            const now = new Date().toISOString();
            for (const preset of STAFF_PRESETS) {
              const docRef = doc(staffRef, `preset-${preset.id}`);
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
                initialPassword: DEV_TEST_PASSWORD,
                permissions: DEFAULT_ROLE_PERMISSIONS[preset.systemRole] || [],
                createdAt: now,
                updatedAt: now,
                createdBy: 'system-seed',
              });
            }
          } catch (e) {
            console.warn('Initial staff seeding note:', e);
          }
        } else {
          setStaffList(items);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Staff listener note:', error);
        setLoading(false);
      }
    );

    // Real-time listener for Invitations
    const qInvites = query(collection(db, 'clinics', clinicId, 'staff_invitations'));
    const unsubscribeInvites = onSnapshot(
      qInvites,
      (snapshot) => {
        const inviteItems: StaffInvitation[] = [];
        snapshot.forEach((d) => {
          inviteItems.push({ id: d.id, ...d.data() } as StaffInvitation);
        });
        setInvitations(inviteItems);
      },
      (err) => console.warn('Invites listener note:', err)
    );

    // Real-time listener for Custom Practice Roles
    const qCustomRoles = query(collection(db, 'clinics', clinicId, 'custom_roles'));
    const unsubscribeCustomRoles = onSnapshot(
      qCustomRoles,
      (snapshot) => {
        const roleItems: PracticeRoleDefinition[] = [];
        snapshot.forEach((d) => {
          roleItems.push({ id: d.id, ...d.data() } as PracticeRoleDefinition);
        });
        setCustomRoles(roleItems);
      },
      (err) => console.warn('Custom roles listener note:', err)
    );

    // Real-time listener for Deleted System Roles
    const qDeletedRoles = query(collection(db, 'clinics', clinicId, 'deleted_system_roles'));
    const unsubscribeDeletedRoles = onSnapshot(
      qDeletedRoles,
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((d) => {
          ids.push(d.id);
        });
        setDeletedSystemRoleIds(ids);
      },
      (err) => console.warn('Deleted roles listener note:', err)
    );

    return () => {
      unsubscribeStaff();
      unsubscribeInvites();
      unsubscribeCustomRoles();
      unsubscribeDeletedRoles();
    };
  }, [clinicId, isOwner]);

  // Aggregate Active System Roles and Custom Roles
  const activeSystemRoles = DEFAULT_PRACTICE_ROLES.filter(
    (sr) => !deletedSystemRoleIds.includes(sr.id)
  );
  const allRoles: PracticeRoleDefinition[] = [
    ...activeSystemRoles,
    ...customRoles.filter(
      (cr) => !activeSystemRoles.some((sr) => sr.name.toLowerCase() === cr.name.toLowerCase())
    ),
  ];

  // Create New Practice Role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    const trimmedName = newRoleFormData.name.trim();
    if (!trimmedName) {
      setActionError('Please specify a role title (e.g. Dental Assistant).');
      return;
    }

    if (allRoles.some((r) => r.name.toLowerCase() === trimmedName.toLowerCase())) {
      setActionError(`A practice role named "${trimmedName}" already exists.`);
      return;
    }

    setSavingNewRole(true);
    setActionError(null);

    try {
      const roleColRef = collection(db, 'clinics', clinicId, 'custom_roles');
      const newDoc = doc(roleColRef);
      const newRole: PracticeRoleDefinition = {
        id: newDoc.id,
        name: trimmedName,
        category: newRoleFormData.category,
        description:
          newRoleFormData.description.trim() || `${trimmedName} clinical/administrative staff role`,
        isSystemRole: false,
        permissions:
          newRoleFormData.permissions.length > 0 ? newRoleFormData.permissions : ['dashboard'],
        createdAt: new Date().toISOString(),
      };

      await setDoc(newDoc, newRole);

      setSuccessToast(`Practice role "${trimmedName}" successfully created.`);
      setIsAddRoleModalOpen(false);
      setNewRoleFormData({
        name: '',
        category: 'Clinical',
        description: '',
        permissions: ['dashboard', 'patients', 'appointments'],
      });
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error creating role:', err);
      setActionError(err.message || 'Failed to create practice role.');
    } finally {
      setSavingNewRole(false);
    }
  };

  // Delete Practice Role
  const handleDeleteRole = async (role: PracticeRoleDefinition) => {
    if (!isOwner) return;

    if (role.name === 'Owner') {
      setActionError('Security Policy: The Clinic Owner role is permanent and cannot be deleted.');
      return;
    }

    setDeletingRole(true);
    setActionError(null);

    try {
      if (role.isSystemRole) {
        const deletedDocRef = doc(db, 'clinics', clinicId, 'deleted_system_roles', role.id);
        await setDoc(deletedDocRef, {
          roleId: role.id,
          name: role.name,
          deletedAt: new Date().toISOString(),
        });
      } else {
        await deleteDoc(doc(db, 'clinics', clinicId, 'custom_roles', role.id));
      }

      setSuccessToast(`Practice role "${role.name}" has been deleted.`);
      setRoleToDelete(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error deleting role:', err);
      setActionError(err.message || 'Failed to delete practice role.');
    } finally {
      setDeletingRole(false);
    }
  };

  // Generate a cryptographically secure random temporary password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'DentFlow-';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: res }));
    setShowPassword(true);
  };

  const generateRandomEditPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'DentFlow-';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditFormData((prev) => ({ ...prev, initialPassword: res }));
    setShowEditPassword(true);
  };

  // Open Edit Modal for a Staff Member
  const handleOpenEditStaff = (staff: StaffAccount) => {
    setEditingStaff(staff);
    // If the staff account already has custom permissions, populate them; otherwise, load role default
    const existingPerms =
      staff.permissions && staff.permissions.length > 0
        ? [...staff.permissions]
        : [...(DEFAULT_ROLE_PERMISSIONS[staff.role] || [])];

    setEditFormData({
      name: staff.name || '',
      email: staff.email || '',
      role: staff.role || 'Dentist',
      title: staff.title || '',
      specialty: staff.specialty || '',
      licenseNumber: staff.licenseNumber || '',
      phone: staff.phone || '',
      status: staff.status || 'active',
      initialPassword: staff.initialPassword || '',
      permissions: existingPerms,
    });
    setEditSuccessNotice(null);
  };

  // Close Edit Modal
  const handleCloseEditStaff = () => {
    setEditingStaff(null);
    setEditSuccessNotice(null);
    setShowEditPassword(false);
  };

  // Reset Permissions to Default Mode (Step 3)
  const handleResetPermissionsToDefault = () => {
    const roleDef = allRoles.find((r) => r.name === editFormData.role);
    const defaults = [...(roleDef?.permissions || DEFAULT_ROLE_PERMISSIONS[editFormData.role] || [])];
    setEditFormData((prev) => ({
      ...prev,
      permissions: defaults,
    }));
    setEditSuccessNotice(
      `Reset permissions to default mode for role: ${editFormData.role} (${defaults.length} modules allowed)`
    );
    setTimeout(() => setEditSuccessNotice(null), 3500);
  };

  // Toggle individual permission checkbox
  const handleTogglePermission = (moduleId: DashboardModuleId) => {
    setEditFormData((prev) => {
      const current = prev.permissions;
      const exists = current.includes(moduleId);
      const next = exists ? current.filter((id) => id !== moduleId) : [...current, moduleId];
      return { ...prev, permissions: next };
    });
  };

  // Save Edited Staff Member Info & Permissions (Step 2 & Step 3)
  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !isOwner) return;

    setSavingEdit(true);
    setActionError(null);

    const trimmedName = editFormData.name.trim();
    const trimmedEmail = editFormData.email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setActionError('Full Name and Email Address are required.');
      setSavingEdit(false);
      return;
    }

    const now = new Date().toISOString();

    try {
      // 1. Update clinic staff document in Firestore
      const staffDocRef = doc(db, 'clinics', clinicId, 'staff', editingStaff.id);
      const updateData: Partial<StaffAccount> = {
        name: trimmedName,
        email: trimmedEmail,
        role: editFormData.role,
        title: editFormData.title.trim() || `${editFormData.role} Member`,
        specialty: editFormData.specialty.trim() || undefined,
        licenseNumber: editFormData.licenseNumber.trim() || undefined,
        phone: editFormData.phone.trim() || undefined,
        status: editFormData.status,
        initialPassword: editFormData.initialPassword.trim() || undefined,
        permissions: editFormData.permissions,
        updatedAt: now,
      };

      await updateDoc(staffDocRef, updateData);

      // 2. Also update matching user profile in Firestore if uid exists
      if (editingStaff.uid) {
        const userDocRef = doc(db, 'users', editingStaff.uid);
        await setDoc(
          userDocRef,
          {
            displayName: trimmedName,
            email: trimmedEmail,
            role: editFormData.role,
            specialty: updateData.specialty,
            licenseNumber: updateData.licenseNumber,
            phone: updateData.phone,
            permissions: editFormData.permissions,
            updatedAt: now,
          },
          { merge: true }
        );
      }

      setSuccessToast(`Successfully updated staff member info and permissions for ${trimmedName}!`);
      setEditingStaff(null);
      setTimeout(() => setSuccessToast(null), 4500);
    } catch (err: any) {
      console.error('Update staff error:', err);
      setActionError(err.message || 'Failed to update staff member. Verify Firebase permissions.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Reassign / Account Handover Modal
  const handleOpenReassignModal = (staff: StaffAccount) => {
    setActionError(null);
    setReassigningStaff(staff);
    setReassignFormData({
      outgoingReason: 'Resigned / Transitioned to new employee',
      outgoingNote: '',
      incomingName: '',
      incomingEmail: staff.email,
      incomingTitle: staff.title || `${staff.role} Member`,
      incomingLicense: '',
      incomingPhone: '',
      incomingPassword: 'DentalStaff2025!',
      resetPermissionsToDefault: true,
    });
  };

  // Confirm Account Handover to New Incoming Employee
  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !reassigningStaff) return;

    const trimmedIncomingName = reassignFormData.incomingName.trim();
    if (!trimmedIncomingName) {
      setActionError('Please enter the incoming new employee’s full name.');
      return;
    }

    setReassigning(true);
    setActionError(null);

    const now = new Date().toISOString();
    const previousEmployeeName = reassigningStaff.name;
    const previousEmployeeEmail = reassigningStaff.email;
    const previousStartDate = reassigningStaff.currentEmployeeSince || reassigningStaff.createdAt;

    const historyItem: StaffAccountHistoryItem = {
      id: `handover-${Date.now()}`,
      employeeName: previousEmployeeName,
      employeeEmail: previousEmployeeEmail,
      employeePhone: reassigningStaff.phone,
      licenseNumber: reassigningStaff.licenseNumber,
      role: reassigningStaff.role,
      startDate: previousStartDate,
      endDate: now,
      reassignedBy: currentUser?.displayName || 'Dr. Shihab Hossain (Clinic Owner)',
      reassignedReason: reassignFormData.outgoingReason,
      note: reassignFormData.outgoingNote.trim() || undefined,
    };

    const existingHistory = reassigningStaff.accountHistory || [];
    const updatedHistory = [...existingHistory, historyItem];

    const roleDefaults = DEFAULT_ROLE_PERMISSIONS[reassigningStaff.role] || [];
    const nextPermissions = reassignFormData.resetPermissionsToDefault
      ? roleDefaults
      : reassigningStaff.permissions || roleDefaults;

    try {
      const staffDocRef = doc(db, 'clinics', clinicId, 'staff', reassigningStaff.id);
      await updateDoc(staffDocRef, {
        name: trimmedIncomingName,
        email: reassignFormData.incomingEmail.trim().toLowerCase() || previousEmployeeEmail,
        title: reassignFormData.incomingTitle.trim() || `${reassigningStaff.role} Member`,
        licenseNumber: reassignFormData.incomingLicense.trim() || undefined,
        phone: reassignFormData.incomingPhone.trim() || undefined,
        initialPassword: reassignFormData.incomingPassword.trim() || undefined,
        status: 'active',
        currentEmployeeSince: now,
        accountHistory: updatedHistory,
        permissions: nextPermissions,
        updatedAt: now,
      });

      // Also record handover audit event in staff_login_logs
      if (recordStaffLoginLog) {
        await recordStaffLoginLog({
          staffAccountId: reassigningStaff.id,
          userId: reassigningStaff.uid || `reassigned-${reassigningStaff.id}`,
          staffName: trimmedIncomingName,
          staffEmail: reassignFormData.incomingEmail.trim().toLowerCase() || previousEmployeeEmail,
          staffRole: reassigningStaff.role,
          accountReassigned: true,
          previousStaffName: previousEmployeeName,
          notes: `Account handover: ${previousEmployeeName} left practice. Role account assigned to ${trimmedIncomingName}. Reason: ${reassignFormData.outgoingReason}`,
          action: 'account_handover',
        });
      }

      setSuccessToast(
        `Account successfully handed over to ${trimmedIncomingName}! All past login history of ${previousEmployeeName} remains permanently cataloged in the Staff Login Report.`
      );
      setReassigningStaff(null);
      setTimeout(() => setSuccessToast(null), 5500);
    } catch (err: any) {
      console.error('Reassign staff error:', err);
      setActionError(err.message || 'Failed to reassign account.');
    } finally {
      setReassigning(false);
    }
  };

  // Handle Form Submission: Register Account OR Send Invitation
  const handleSubmitStaffForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    // Security Guard: Enforce Owner authorization
    if (!isOwner) {
      setActionError('Security Violation: Only users with the Owner role can register or invite staff.');
      return;
    }

    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedName = formData.name.trim();

    if (!trimmedName || !trimmedEmail) {
      setActionError('Please provide both Staff Full Name and Email Address.');
      return;
    }

    // Check duplicate in current staff roster
    const existsInStaff = staffList.some((s) => s.email.toLowerCase() === trimmedEmail);
    if (existsInStaff) {
      setActionError(`A staff account with email ${trimmedEmail} already exists in the roster.`);
      return;
    }

    setSubmitting(true);
    const now = new Date().toISOString();

    try {
      if (formMode === 'register') {
        // Mode 1: Instant Account Registration with Credentials
        if (!formData.password || formData.password.length < 6) {
          setActionError('Initial password must be at least 6 characters.');
          setSubmitting(false);
          return;
        }

        const staffColRef = collection(db, 'clinics', clinicId, 'staff');
        const staffDocRef = doc(staffColRef);
        const newUid = `staff-${Date.now().toString(36)}`;

        const targetRoleDef = allRoles.find((r) => r.name === formData.role);
        const initialRolePermissions = targetRoleDef?.permissions || DEFAULT_ROLE_PERMISSIONS[formData.role] || ['dashboard'];

        const newAccount: StaffAccount = {
          id: staffDocRef.id,
          uid: newUid,
          name: trimmedName,
          email: trimmedEmail,
          role: formData.role,
          title: formData.title.trim() || `${formData.role} Member`,
          specialty: formData.specialty.trim() || undefined,
          licenseNumber: formData.licenseNumber.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          status: 'active',
          initialPassword: formData.password.trim(),
          permissions: initialRolePermissions,
          createdAt: now,
          updatedAt: now,
          createdBy: currentUser?.uid || 'owner',
        };

        // Write to Firestore clinic staff collection
        await setDoc(staffDocRef, newAccount);

        // Also write to user profile collection
        const userDocRef = doc(db, 'users', newUid);
        await setDoc(userDocRef, {
          uid: newUid,
          email: trimmedEmail,
          displayName: trimmedName,
          role: formData.role,
          clinicId,
          specialty: newAccount.specialty,
          licenseNumber: newAccount.licenseNumber,
          phone: newAccount.phone,
          permissions: newAccount.permissions,
          createdAt: now,
          updatedAt: now,
        });

        setSuccessToast(`Staff account successfully created for ${trimmedName} (${formData.role}).`);
      } else {
        // Mode 2: Send Official Staff Invitation
        const inviteColRef = collection(db, 'clinics', clinicId, 'staff_invitations');
        const inviteDocRef = doc(inviteColRef);
        const inviteToken = `inv-${Math.random().toString(36).substring(2, 10)}`;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        const newInvitation: StaffInvitation = {
          id: inviteDocRef.id,
          email: trimmedEmail,
          name: trimmedName,
          role: formData.role,
          title: formData.title.trim() || `${formData.role} Member`,
          inviteToken,
          status: 'pending',
          expiresAt,
          createdAt: now,
        };

        await setDoc(inviteDocRef, newInvitation);
        setSuccessToast(`Staff invitation dispatched to ${trimmedEmail}. Valid for 7 days.`);
      }

      // Reset form fields
      setFormData({
        name: '',
        email: '',
        role: 'Dentist',
        password: '',
        title: '',
        specialty: '',
        licenseNumber: '',
        phone: '',
        inviteNote: '',
      });
      setActiveTab('roster');
      setTimeout(() => setSuccessToast(null), 4500);
    } catch (err: any) {
      console.error('Staff registration error:', err);
      setActionError(err.message || 'Failed to complete staff registration. Verify Firebase permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Staff Account Execution (Owner role only)
  const handleConfirmDelete = async () => {
    if (!staffToDelete || !isOwner) return;

    // Self-deletion safety check: Owner cannot delete themselves
    if (
      staffToDelete.uid === currentUser?.uid ||
      staffToDelete.email.toLowerCase() === currentUser?.email?.toLowerCase()
    ) {
      setActionError('Self-Deletion Prohibited: You cannot delete your own active Clinic Owner account.');
      setStaffToDelete(null);
      return;
    }

    setDeleting(true);
    setActionError(null);

    try {
      // 1. Delete from clinics/{clinicId}/staff/{staffId}
      const staffDocRef = doc(db, 'clinics', clinicId, 'staff', staffToDelete.id);
      await deleteDoc(staffDocRef);

      // 2. Delete corresponding user doc if uid exists
      if (staffToDelete.uid) {
        await deleteDoc(doc(db, 'users', staffToDelete.uid)).catch(() => {});
      }

      setSuccessToast(
        `Staff account for ${staffToDelete.name} (${staffToDelete.role}) has been permanently deleted.`
      );
      setStaffToDelete(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Staff deletion error:', err);
      setActionError(err.message || 'Failed to delete staff account. Verify Firebase security rules.');
    } finally {
      setDeleting(false);
    }
  };

  // Delete Staff Invitation
  const handleDeleteInvitation = async (invitationId: string) => {
    if (!isOwner) return;
    try {
      await deleteDoc(doc(db, 'clinics', clinicId, 'staff_invitations', invitationId));
      setSuccessToast('Staff invitation cancelled.');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel invitation.');
    }
  };

  // Toggle Account Status (Active / Suspended)
  const handleToggleStatus = async (staff: StaffAccount) => {
    if (!isOwner) return;
    if (
      staff.uid === currentUser?.uid ||
      staff.email.toLowerCase() === currentUser?.email?.toLowerCase()
    ) {
      setActionError('Cannot suspend your own active Clinic Owner account.');
      return;
    }

    const nextStatus = staff.status === 'active' ? 'suspended' : 'active';
    try {
      const staffDocRef = doc(db, 'clinics', clinicId, 'staff', staff.id);
      await updateDoc(staffDocRef, {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      setSuccessToast(
        `Staff account ${staff.name} is now ${nextStatus === 'active' ? 'Active' : 'Suspended'}.`
      );
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to toggle account status.');
    }
  };

  // STRICT ACCESS DENIAL: If active user is NOT an Owner, refuse rendering
  if (!isOwner) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-2xl mx-auto space-y-4 my-8 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full inline-block">
            RESTRICTED ACCESS
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-2">
            Owner Role Required for Staff Management
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            The Staff Management module is strictly restricted to users with the <strong>Owner</strong> role.
            Clinical staff (Dentists, Receptionists, and Cashiers) are not authorized to provision credentials,
            edit staff details, or configure permissions.
          </p>
        </div>
        <div className="inline-block px-3.5 py-1.5 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
          Your Active Session Role: <strong className="text-slate-900 uppercase">{activeRole}</strong>
        </div>
      </div>
    );
  }

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const queryStr = search.toLowerCase();
    const matchesSearch =
      search === '' ||
      s.name.toLowerCase().includes(queryStr) ||
      s.email.toLowerCase().includes(queryStr) ||
      (s.title && s.title.toLowerCase().includes(queryStr)) ||
      (s.licenseNumber && s.licenseNumber.toLowerCase().includes(queryStr));
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeCount = staffList.filter((s) => s.status === 'active').length;
  const dentistCount = staffList.filter((s) => s.role === 'Dentist').length;
  const frontDeskCount = staffList.filter((s) => s.role === 'Receptionist' || s.role === 'Cashier').length;

  // Determine if edit permissions match default mode
  const currentRoleDefaults = DEFAULT_ROLE_PERMISSIONS[editFormData.role] || [];
  const isDefaultMode =
    editFormData.permissions.length === currentRoleDefaults.length &&
    editFormData.permissions.every((p) => currentRoleDefaults.includes(p));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-[#0F3942] to-[#0A262C] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold tracking-wider uppercase bg-teal-400/20 text-teal-200 border border-teal-400/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              PRACTICE GOVERNANCE • OWNER ACCESS ONLY
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight flex items-center gap-2.5">
            Staff Management & Access Permissions
          </h2>
          <p className="text-xs text-teal-100/80 mt-1 max-w-2xl leading-relaxed">
            Manage practice staff profiles, edit contact information, grant custom dashboard module access
            permissions, or reset accounts back to default role permissions.
          </p>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'bg-white text-teal-950 shadow-xs'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            Staff Roster ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setFormMode('register');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'register' && formMode === 'register'
                ? 'bg-teal-500 text-teal-950 shadow-xs'
                : 'bg-teal-600/80 hover:bg-teal-600 text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Register Staff
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setFormMode('invite');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'register' && formMode === 'invite'
                ? 'bg-teal-500 text-teal-950 shadow-xs'
                : 'bg-teal-600/80 hover:bg-teal-600 text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            Send Invite
          </button>
          {invitations.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('invitations')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'invitations'
                  ? 'bg-white text-teal-950 shadow-xs'
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              Invites ({invitations.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('login_logs')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'login_logs'
                ? 'bg-amber-400 text-teal-950 shadow-xs'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <History className="w-4 h-4 text-amber-300" />
            <span>Log History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'roles'
                ? 'bg-emerald-400 text-teal-950 shadow-xs'
                : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-300" />
            Practice Roles ({allRoles.length})
          </button>
        </div>
      </div>

      {/* Action Notifications */}
      {successToast && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-700 hover:text-rose-950 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Practice Role Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Staff Accounts
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {staffList.length}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
            {activeCount} active in practice
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Dental Clinicians
          </div>
          <div className="text-2xl font-black text-teal-800 font-mono mt-1">
            {dentistCount}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Surgeons & associate dentists
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Front Desk & Cashiers
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono mt-1">
            {frontDeskCount}
          </div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
            Reception & billing staff
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Pending Invitations
          </div>
          <div className="text-2xl font-black text-teal-800 font-mono mt-1">
            {invitations.length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Awaiting registration completion
          </div>
        </div>
      </div>

      {/* TAB 1: REGISTER OR INVITE STAFF FORM */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="bg-slate-50/80 p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {formMode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4 text-teal-600" />
                    Register New Staff Member (Direct Provisioning)
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-teal-600" />
                    Send Staff Member Invitation
                  </>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {formMode === 'register'
                  ? 'Instantly create a verified staff account with credentials and assign clinical permissions.'
                  : 'Dispatch an email invite containing a secure token. Staff member completes their registration.'}
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setFormMode('register')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  formMode === 'register'
                    ? 'bg-white text-teal-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Direct Register
              </button>
              <button
                type="button"
                onClick={() => setFormMode('invite')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  formMode === 'invite'
                    ? 'bg-white text-teal-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Send Invite
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitStaffForm} className="p-6 space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Tanvir Rahman or Farzana Haque"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  Staff Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. staff.member@apex-dental.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                    Assigned Clinical / Administrative Role *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddRoleModalOpen(true)}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-md"
                      title="Create a new practice role"
                    >
                      <Plus className="w-3 h-3 text-teal-600" />
                      <span>+ Create / Add Role</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('roles')}
                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded-md"
                      title="Manage and delete practice roles"
                    >
                      <span>Manage Roles</span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-semibold"
                  >
                    {allRoles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name} ({role.category})
                      </option>
                    ))}
                  </select>
                  {formData.role !== 'Owner' && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = allRoles.find((r) => r.name === formData.role);
                        if (target) setRoleToDelete(target);
                      }}
                      className="px-3 py-2 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                      title={`Delete role "${formData.role}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Professional Title */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  Professional Title / Designation
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Associate Dental Surgeon or Senior Receptionist"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                />
              </div>

              {/* Clinical Specialty (Optional) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  Clinical Specialty (if clinician)
                </label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g. Endodontics, Orthodontics, Oral Surgery"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                />
              </div>

              {/* License / BMDC */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  Dental Council / Medical License Number
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  placeholder="e.g. BMDC/DC-9921"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-mono"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+880 1711-000000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                />
              </div>

              {/* Password (Only in Register mode) */}
              {formMode === 'register' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                      Initial Password *
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      Auto-Generate Secure Key
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Default module permissions for {formData.role} will be automatically assigned.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : formMode === 'register' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Complete Account Registration
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Dispatch Invitation
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: STAFF ROSTER TABLE */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Filter Controls */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, BMDC..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="all">All Roles ({staffList.length})</option>
                {allRoles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} ({staffList.filter((s) => s.role === r.name).length})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setFormMode('register');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Staff</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-0">
            {loading ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
                <p className="text-xs font-semibold">Loading verified staff accounts...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">No staff records matching your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Credentials & Contact</th>
                      <th className="py-3.5 px-4">Dashboard Access</th>
                      <th className="py-3.5 px-4">License / BMDC</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map((staff) => {
                      const isCurrentOwner =
                        staff.uid === currentUser?.uid ||
                        staff.email.toLowerCase() === currentUser?.email?.toLowerCase();

                      const roleDefaults = DEFAULT_ROLE_PERMISSIONS[staff.role] || [];
                      const effectivePerms =
                        staff.permissions && staff.permissions.length > 0
                          ? staff.permissions
                          : roleDefaults;
                      const hasCustom =
                        staff.permissions &&
                        staff.permissions.length > 0 &&
                        (staff.permissions.length !== roleDefaults.length ||
                          !staff.permissions.every((p) => roleDefaults.includes(p)));

                      return (
                        <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Staff Name & Initials */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {staff.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <span>{staff.name}</span>
                                  {isCurrentOwner && (
                                    <span className="text-[9px] font-extrabold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded uppercase">
                                      Active Session (You)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {staff.title || staff.role}
                                </div>
                                {staff.accountHistory && staff.accountHistory.length > 0 && (
                                  <div
                                    className="flex items-center gap-1 mt-1 text-[9.5px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit"
                                    title={`Account handed over from predecessor: ${staff.accountHistory[staff.accountHistory.length - 1].employeeName}`}
                                  >
                                    <ArrowRightLeft className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    <span>Successor to: {staff.accountHistory[staff.accountHistory.length - 1].employeeName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider border ${
                                staff.role === 'Owner'
                                  ? 'bg-teal-50 text-teal-900 border-teal-200'
                                  : staff.role === 'Dentist'
                                  ? 'bg-sky-50 text-sky-900 border-sky-200'
                                  : staff.role === 'Receptionist'
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              }`}
                            >
                              {staff.role}
                            </span>
                          </td>

                          {/* Email & Initial Key */}
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            <div className="text-slate-800 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[160px]">{staff.email}</span>
                            </div>
                            {staff.phone && (
                              <div className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5 font-sans">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{staff.phone}</span>
                              </div>
                            )}
                            {staff.initialPassword && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Key className="w-3 h-3 text-teal-600 shrink-0" />
                                <span>
                                  Key: <strong className="text-slate-700">{staff.initialPassword}</strong>
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Dashboard Access Permissions Column */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaff(staff)}
                              className="group text-left cursor-pointer"
                              title="Click to view and edit dashboard part access"
                            >
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-colors ${
                                  hasCustom
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 group-hover:bg-amber-100'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-slate-200'
                                }`}
                              >
                                <Shield className="w-3 h-3 text-teal-700 shrink-0" />
                                <span>{effectivePerms.length} Parts</span>
                                {hasCustom ? (
                                  <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-extrabold uppercase">
                                    Custom
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded font-medium uppercase">
                                    Default
                                  </span>
                                )}
                              </span>
                            </button>
                          </td>

                          {/* License */}
                          <td className="py-3.5 px-4 text-slate-600">
                            {staff.licenseNumber ? (
                              <span className="flex items-center gap-1 font-mono text-[11px]">
                                <FileBadge className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                {staff.licenseNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Status Toggle */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              disabled={isCurrentOwner}
                              onClick={() => handleToggleStatus(staff)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                                isCurrentOwner ? 'cursor-default' : 'cursor-pointer hover:opacity-85'
                              } ${
                                staff.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                              title={
                                isCurrentOwner
                                  ? 'Active session cannot be suspended'
                                  : 'Click to toggle status'
                              }
                            >
                              {staff.status === 'active' ? (
                                <>
                                  <UserCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <UserX className="w-3 h-3 text-rose-600" />
                                  <span>Suspended</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Actions: Edit & Delete */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* EDIT BUTTON (Step 2 & Step 3) */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(staff)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors font-bold text-xs cursor-pointer shadow-2xs"
                                title={`Edit details and dashboard permissions for ${staff.name}`}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                                <span>Edit</span>
                              </button>

                              {/* HANDOVER / REASSIGN BUTTON (When staff leaves & new employee takes over) */}
                              {!isCurrentOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenReassignModal(staff)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors font-bold text-xs cursor-pointer shadow-2xs"
                                  title={`Handover account to new successor employee when ${staff.name} leaves practice`}
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Handover</span>
                                </button>
                              )}

                              {/* DELETE BUTTON */}
                              {isCurrentOwner ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-medium px-2 py-1"
                                  title="Self-deletion blocked"
                                >
                                  <Lock className="w-3.5 h-3.5 text-slate-300" />
                                  Protected
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setStaffToDelete(staff)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors font-bold text-xs cursor-pointer shadow-2xs"
                                  title={`Permanently delete staff account for ${staff.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PENDING INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-teal-600" />
                Pending Staff Invitations ({invitations.length})
              </h3>
              <p className="text-xs text-slate-500">
                Staff members who have received invitations but haven't finished account activation.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60"
              >
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span>{inv.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                      {inv.role}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono mt-0.5">{inv.email}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Token: <code className="bg-slate-100 px-1 py-0.5 rounded">{inv.inviteToken}</code> •
                    Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteInvitation(inv.id)}
                    className="px-3 py-1.5 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold transition-colors cursor-pointer"
                  >
                    Cancel Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: STAFF LOGIN & HANDOVER AUDIT LOGS REPORT */}
      {activeTab === 'login_logs' && (
        <StaffLoginReport
          staffList={staffList}
          onOpenReassignModal={(staff) => handleOpenReassignModal(staff)}
        />
      )}

      {/* TAB 5: PRACTICE ROLES & ARCHITECTURE */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold tracking-wider uppercase bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  OWNER GOVERNANCE • ROLES ARCHITECTURE
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                Practice Roles & System Permissions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, customize, or delete clinical, front-desk, and administrative staff roles for your dental practice.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddRoleModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Practice Role</span>
            </button>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allRoles.map((role) => {
              const staffAssigned = staffList.filter((s) => s.role === role.name);
              const isOwnerRole = role.name === 'Owner';

              const categoryBadgeClass =
                role.category === 'Clinical'
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : role.category === 'Financial'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : role.category === 'Front Desk'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : role.category === 'Administrative'
                  ? 'bg-teal-50 text-teal-900 border-teal-200'
                  : 'bg-violet-50 text-violet-800 border-violet-200';

              return (
                <div
                  key={role.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Top row: Name & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                          {role.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadgeClass}`}>
                            {role.category}
                          </span>
                          {role.isSystemRole ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              System Preset
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                              Custom Role
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Staff Count Pill */}
                      <div
                        className="text-right shrink-0"
                        title={`${staffAssigned.length} staff member(s) currently registered with this role`}
                      >
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          {staffAssigned.length}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                      {role.description}
                    </p>

                    {/* Default Dashboard Access Modules */}
                    <div>
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Baseline Modules ({role.permissions.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 5).map((modId) => {
                          const modDef = DASHBOARD_MODULE_DEFINITIONS.find((m) => m.id === modId);
                          return (
                            <span
                              key={modId}
                              className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80"
                            >
                              {modDef?.name.split(' ')[0] || modId}
                            </span>
                          );
                        })}
                        {role.permissions.length > 5 && (
                          <span className="text-[10px] font-bold bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                            +{role.permissions.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {isOwnerRole ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                        Permanent System Role
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRoleToDelete(role)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs transition-colors cursor-pointer shadow-2xs ml-auto"
                        title={`Delete ${role.name} role`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Role</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT STAFF MEMBER INFO & DASHBOARD PERMISSIONS (Steps 2 & 3)        */}
      {/* ========================================================================= */}
      {editingStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#0F3942] text-white p-5 flex items-center justify-between border-b border-teal-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-700/80 text-teal-200 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>Edit Staff Profile & Access Permissions</span>
                  </h3>
                  <p className="text-xs text-teal-200/80 mt-0.5">
                    Modifying {editingStaff.name} ({editingStaff.email})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEditStaff}
                className="w-8 h-8 rounded-lg hover:bg-teal-800/80 text-teal-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <form onSubmit={handleSaveStaffEdit} className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Notice when Reset is clicked */}
              {editSuccessNotice && (
                <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{editSuccessNotice}</span>
                </div>
              )}

              {/* Section 1: Staff Personal & Professional Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    1. Staff Member Information
                  </h4>
                  <span className="text-[11px] text-slate-400">Account ID: {editingStaff.id}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-semibold"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-mono"
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      System Role *
                    </label>
                    <select
                      value={editFormData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as UserRole;
                        const roleDef = allRoles.find((r) => r.name === newRole);
                        setEditFormData({
                          ...editFormData,
                          role: newRole,
                          permissions: roleDef?.permissions || DEFAULT_ROLE_PERMISSIONS[newRole] || [],
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-bold"
                    >
                      {allRoles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.name} ({role.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Designation / Title
                    </label>
                    <input
                      type="text"
                      value={editFormData.title}
                      onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      placeholder="e.g. Associate Dental Surgeon"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                    />
                  </div>

                  {/* Specialty */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Clinical Specialty
                    </label>
                    <input
                      type="text"
                      value={editFormData.specialty}
                      onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                      placeholder="e.g. Prosthodontics, Endodontics"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                    />
                  </div>

                  {/* License */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      BMDC / Council License
                    </label>
                    <input
                      type="text"
                      value={editFormData.licenseNumber}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, licenseNumber: e.target.value })
                      }
                      placeholder="e.g. BMDC/DC-7841"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-mono"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="+880 1711-234567"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800"
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Account Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          status: e.target.value as 'active' | 'suspended',
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-bold"
                    >
                      <option value="active">Active (Access Allowed)</option>
                      <option value="suspended">Suspended (Access Blocked)</option>
                    </select>
                  </div>

                  {/* Initial Password Key */}
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                        Initial Access Key / Password
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomEditPassword}
                        className="text-[10px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-teal-600" />
                        Regenerate Key
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editFormData.initialPassword}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, initialPassword: e.target.value })
                        }
                        placeholder="Staff temporary login key"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-800 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Dashboard Access Permissions & Reset Button (Step 3) */}
              <div className="space-y-4 pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-teal-600" />
                      2. Dashboard Part Access Permissions
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select which parts of the dashboard this staff member will be granted access to.
                    </p>
                  </div>

                  {/* RESET TO DEFAULT MODE BUTTON (Step 3 Requirement) */}
                  <button
                    type="button"
                    onClick={handleResetPermissionsToDefault}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer self-start sm:self-auto"
                    title={`Reset permissions back to default mode for ${editFormData.role}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-teal-600" />
                    <span>Reset to Default Mode</span>
                  </button>
                </div>

                {/* Status Indicator Banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Access Mode:</span>
                    {isDefaultMode ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10.5px]">
                        Default Role Permissions ({editFormData.role})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md font-bold text-[10.5px]">
                        Customized Permissions ({editFormData.permissions.length} modules granted)
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono">
                    {editFormData.permissions.length} of {DASHBOARD_MODULE_DEFINITIONS.length} active
                  </span>
                </div>

                {/* Permissions Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DASHBOARD_MODULE_DEFINITIONS.map((mod: DashboardModuleDefinition) => {
                    const isGranted = editFormData.permissions.includes(mod.id);
                    const isOwnerRestricted = mod.ownerOnly && editFormData.role !== 'Owner';

                    return (
                      <div
                        key={mod.id}
                        onClick={() => {
                          if (!isOwnerRestricted) {
                            handleTogglePermission(mod.id);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                          isOwnerRestricted
                            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                            : isGranted
                            ? 'bg-teal-50/70 border-teal-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="pt-0.5">
                          {isOwnerRestricted ? (
                            <Lock className="w-4 h-4 text-slate-400" />
                          ) : isGranted ? (
                            <CheckSquare className="w-4 h-4 text-teal-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {mod.name}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                                mod.category === 'Core'
                                  ? 'bg-slate-100 text-slate-600'
                                  : mod.category === 'Clinical'
                                  ? 'bg-sky-50 text-sky-700'
                                  : mod.category === 'Financial'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-purple-50 text-purple-700'
                              }`}
                            >
                              {mod.category}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-500 mt-0.5 leading-tight">
                            {mod.description}
                          </p>
                          {isOwnerRestricted && (
                            <span className="text-[9.5px] text-amber-700 font-bold block mt-1">
                              Exclusive to Owner role
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleResetPermissionsToDefault}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default Mode</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCloseEditStaff}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingEdit ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Staff Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETING STAFF ACCOUNT */}
      {staffToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-rose-50 p-5 border-b border-rose-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950">Delete Staff Account</h3>
                <p className="text-xs text-rose-700">Enforced Role-Based Authorization</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs text-slate-600">
              <p className="leading-relaxed">
                Are you sure you want to permanently delete the staff account for:
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="font-extrabold text-slate-900 text-sm">
                  {staffToDelete.name}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  {staffToDelete.email}
                </div>
                <div className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded inline-block uppercase mt-1">
                  Role: {staffToDelete.role}
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] leading-relaxed">
                <strong>Permanent Action:</strong> Deleting this account permanently revokes the user's
                login access, removes their clinic credentials, and deletes the record in Firebase Firestore.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Yes, Permanently Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HANDOVER / REASSIGN ACCOUNT TO NEW INCOMING EMPLOYEE                */}
      {/* ========================================================================= */}
      {reassigningStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#0F3942] text-white p-5 flex items-center justify-between border-b border-teal-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-teal-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                  <ArrowRightLeft className="w-5 h-5 text-teal-950" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    Staff Account Handover & Succession
                  </h3>
                  <p className="text-xs text-teal-200">
                    Archive departing staff member & assign account to incoming employee
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassigningStaff(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleConfirmReassign} className="overflow-y-auto p-6 space-y-5 text-xs flex-1">
              {/* Succession Summary Notice */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-950">Audit Continuity Maintained:</div>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    When this account is reassigned, all historical sign-in logs and activity for{' '}
                    <strong>{reassigningStaff.name}</strong> will remain permanently preserved in the{' '}
                    <strong>Staff Login Report</strong> under the account lineage. The new employee will receive fresh credentials to continue practice operations.
                  </p>
                </div>
              </div>

              {/* SECTION 1: DEPARTING EMPLOYEE (Outgoing) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                    <UserMinus className="w-3 h-3 text-rose-600" />
                    Outgoing Staff Member
                  </span>
                  <span className="text-[10.5px] font-bold text-slate-500 uppercase">
                    Role: {reassigningStaff.role}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Name</div>
                    <div className="font-bold text-slate-900 text-sm">{reassigningStaff.name}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Email / Contact</div>
                    <div className="font-mono text-slate-800 truncate">{reassigningStaff.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Departure Reason *
                    </label>
                    <select
                      value={reassignFormData.outgoingReason}
                      onChange={(e) =>
                        setReassignFormData({ ...reassignFormData, outgoingReason: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <option value="Resigned / Relocated">Resigned / Relocated</option>
                      <option value="Transitioned to New Practice">Transitioned to New Practice</option>
                      <option value="End of Contract / Rotation">End of Contract / Rotation</option>
                      <option value="Maternity / Parental Leave">Maternity / Parental Leave</option>
                      <option value="Position Reassignment">Position Reassignment</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Departure Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={reassignFormData.outgoingNote}
                      onChange={(e) =>
                        setReassignFormData({ ...reassignFormData, outgoingNote: e.target.value })
                      }
                      placeholder="e.g. Completed clinical handover & key return"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: INCOMING EMPLOYEE (New Staff Member) */}
              <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-300 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-teal-700" />
                    Incoming Successor Employee
                  </span>
                  <span className="text-[10.5px] text-teal-900 font-bold">
                    Target Role: {reassigningStaff.role}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      New Employee Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={reassignFormData.incomingName}
                      onChange={(e) =>
                        setReassignFormData({ ...reassignFormData, incomingName: e.target.value })
                      }
                      placeholder="e.g. Dr. Sabrina Noor or Farzana Haque"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Employee Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={reassignFormData.incomingEmail}
                      onChange={(e) =>
                        setReassignFormData({ ...reassignFormData, incomingEmail: e.target.value })
                      }
                      placeholder="e.g. new.dentist@apex-dental.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Title / Designation
                    </label>
                    <input
                      type="text"
                      value={reassignFormData.incomingTitle}
                      onChange={(e) =>
                        setReassignFormData({ ...reassignFormData, incomingTitle: e.target.value })
                      }
                      placeholder="e.g. Associate Dentist"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      License / BMDC #
                    </label>
                    <input
                      type="text"
                      value={reassignFormData.incomingLicense}
                      onChange={(e) =>
                        setReassignFormData({ ...reassignFormData, incomingLicense: e.target.value })
                      }
                      placeholder="e.g. BMDC-A-98124"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={reassignFormData.incomingPhone}
                      onChange={(e) =>
                        setReassignFormData({ ...reassignFormData, incomingPhone: e.target.value })
                      }
                      placeholder="+880 1711-..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                  </div>
                </div>

                {/* Initial Access Password */}
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                    Initial Access Password / Security Key *
                  </label>
                  <div className="relative">
                    <input
                      type={showReassignPassword ? 'text' : 'password'}
                      required
                      value={reassignFormData.incomingPassword}
                      onChange={(e) =>
                        setReassignFormData({ ...reassignFormData, incomingPassword: e.target.value })
                      }
                      placeholder="Secure initial password"
                      className="w-full pr-10 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReassignPassword(!showReassignPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showReassignPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Provide this key to the incoming staff member for their initial login.
                  </p>
                </div>

                {/* Reset to standard permissions checkbox */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reassignFormData.resetPermissionsToDefault}
                    onChange={(e) =>
                      setReassignFormData({
                        ...reassignFormData,
                        resetPermissionsToDefault: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span className="text-[11px] font-bold text-slate-700">
                    Reset dashboard permissions to standard {reassigningStaff.role} default mode
                  </span>
                </label>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  disabled={reassigning}
                  onClick={() => setReassigningStaff(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning}
                  className="px-5 py-2.5 bg-[#0F3942] hover:bg-[#144752] text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {reassigning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-teal-300" />
                      Handing Over Account...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-4 h-4 text-amber-300" />
                      Confirm Handover & Save Lineage
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW PRACTICE ROLE (Owner Account Capability)                   */}
      {/* ========================================================================= */}
      {isAddRoleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="bg-[#0F3942] text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-700/80 text-teal-200 flex items-center justify-center shrink-0 border border-teal-500/30">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Add New Practice Role</h3>
                  <p className="text-xs text-teal-200/80">
                    Define role classification and baseline dashboard module access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoleModalOpen(false)}
                className="text-teal-300 hover:text-white p-1 rounded-lg hover:bg-teal-800/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Role Title */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                  Role Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dental Assistant, Oral Hygienist, Treatment Coordinator"
                  value={newRoleFormData.name}
                  onChange={(e) => setNewRoleFormData({ ...newRoleFormData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              {/* Classification */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                  Role Classification / Category *
                </label>
                <select
                  value={newRoleFormData.category}
                  onChange={(e) =>
                    setNewRoleFormData({
                      ...newRoleFormData,
                      category: e.target.value as PracticeRoleDefinition['category'],
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="Clinical">Clinical (Surgeons, Associate Dentists, Dental Assistants)</option>
                  <option value="Front Desk">Front Desk (Patient Reception, Scheduling, Queue)</option>
                  <option value="Financial">Financial (Billing, Cashier, Practice Margins)</option>
                  <option value="Support">Support (Sterilization, Dental Supplies, Technicians)</option>
                  <option value="Administrative">Administrative (Office Governance & Management)</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                  Scope & Responsibilities
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe clinical or operational duties for this role..."
                  value={newRoleFormData.description}
                  onChange={(e) => setNewRoleFormData({ ...newRoleFormData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 resize-none"
                />
              </div>

              {/* Baseline Permissions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                    Baseline Dashboard Modules ({newRoleFormData.permissions.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNewRoleFormData({
                          ...newRoleFormData,
                          permissions: DASHBOARD_MODULE_DEFINITIONS.filter((m) => !m.ownerOnly).map((m) => m.id),
                        })
                      }
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setNewRoleFormData({ ...newRoleFormData, permissions: ['dashboard'] })}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Minimal
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {DASHBOARD_MODULE_DEFINITIONS.filter((m) => !m.ownerOnly).map((mod) => {
                    const checked = newRoleFormData.permissions.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                          checked
                            ? 'bg-teal-50/80 border-teal-300 text-teal-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewRoleFormData({
                                ...newRoleFormData,
                                permissions: [...newRoleFormData.permissions, mod.id],
                              });
                            } else {
                              setNewRoleFormData({
                                ...newRoleFormData,
                                permissions: newRoleFormData.permissions.filter((p) => p !== mod.id),
                              });
                            }
                          }}
                          className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                        />
                        <span className="text-[11px] truncate">{mod.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex items-center justify-end gap-2 mt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddRoleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewRole}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingNewRole ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving Role...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Create Practice Role
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE PRACTICE ROLE CONFIRMATION                                  */}
      {/* ========================================================================= */}
      {roleToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Role: {roleToDelete.name}?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to delete this staff role from your practice? This role will no longer appear when provisioning accounts or editing permissions.
                </p>
                {staffList.filter((s) => s.role === roleToDelete.name).length > 0 && (
                  <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-semibold text-amber-800 text-left flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Notice: {staffList.filter((s) => s.role === roleToDelete.name).length} staff account(s) currently hold this role. Their current access is preserved until their role is manually updated.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deletingRole}
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={deletingRole}
                onClick={() => handleDeleteRole(roleToDelete)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingRole ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirm Delete Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
