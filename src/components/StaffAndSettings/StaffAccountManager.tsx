import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import { StaffAccount, UserRole } from '../../types/dental';
import { STAFF_PRESETS, DEV_TEST_PASSWORD } from '../../config/staffPresets';
import { usePracticeRoles } from '../../hooks/usePracticeRoles';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Key,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  X,
  RefreshCw,
  Mail,
  UserCheck,
  UserX,
  FileBadge,
} from 'lucide-react';

export const StaffAccountManager: React.FC = () => {
  const { clinic, currentUser, activeRole, hasPermission } = useAuth();
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffAccount | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form states for creating new staff
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Dentist' as UserRole,
    password: '',
    title: '',
    specialty: '',
    licenseNumber: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isOwner = hasPermission(['Owner']);
  const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
  const { allRoles } = usePracticeRoles(clinicId, isOwner);

  // Real-time subscription to clinic staff
  useEffect(() => {
    if (!isOwner) {
      setLoading(false);
      return;
    }

    const staffPath = `clinics/${clinicId}/staff`;
    const qStaff = query(collection(db, 'clinics', clinicId, 'staff'));

    const unsubscribe = onSnapshot(
      qStaff,
      async (snapshot) => {
        const items: StaffAccount[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as StaffAccount);
        });

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
                createdAt: now,
                updatedAt: now,
                createdBy: 'system-seed',
              });
            }
          } catch (e) {
            console.warn('Staff seeding notice:', e);
          }
        } else {
          setStaffList(items);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Staff listener notice:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId, isOwner]);

  // Generate random secure temporary password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'DentFlow-';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: res }));
  };

  // Create Staff Account (Owner / Admin only)
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!isOwner) {
      setActionError('Security Violation: Only Clinic Owners & Administrators can provision accounts.');
      return;
    }

    const trimmedEmail = formData.email.trim().toLowerCase();
    if (!formData.name.trim() || !trimmedEmail || !formData.password.trim()) {
      setActionError('Please fill in required fields: Name, Email, and Initial Password.');
      return;
    }

    if (formData.password.length < 6) {
      setActionError('Password must be at least 6 characters.');
      return;
    }

    // Check duplicate email
    const exists = staffList.some((s) => s.email.toLowerCase() === trimmedEmail);
    if (exists) {
      setActionError(`A staff account with email ${trimmedEmail} already exists.`);
      return;
    }

    setSubmitting(true);
    try {
      const staffRef = collection(db, 'clinics', clinicId, 'staff');
      const docRef = doc(staffRef);
      const newUid = `staff-${Date.now().toString(36)}`;
      const now = new Date().toISOString();

      const newAccount: StaffAccount = {
        id: docRef.id,
        uid: newUid,
        name: formData.name.trim(),
        email: trimmedEmail,
        role: formData.role,
        title: formData.title.trim() || `${formData.role} Staff Member`,
        specialty: formData.specialty.trim() || undefined,
        licenseNumber: formData.licenseNumber.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        status: 'active',
        initialPassword: formData.password.trim(),
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.uid || 'owner',
      };

      await setDoc(docRef, newAccount);

      // Sync user profile for login
      const userRef = doc(db, 'users', newUid);
      await setDoc(userRef, {
        uid: newUid,
        email: trimmedEmail,
        displayName: newAccount.name,
        role: newAccount.role,
        clinicId,
        specialty: newAccount.specialty,
        licenseNumber: newAccount.licenseNumber,
        phone: newAccount.phone,
        createdAt: now,
        updatedAt: now,
      });

      setSuccessToast(`Staff account for ${newAccount.name} (${newAccount.email}) created successfully.`);
      setIsCreateOpen(false);
      setFormData({
        name: '',
        email: '',
        role: 'Dentist',
        password: '',
        title: '',
        specialty: '',
        licenseNumber: '',
        phone: '',
      });
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to create staff account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Staff Account (Owner / Admin only)
  const confirmDeleteStaff = async () => {
    if (!staffToDelete || !isOwner) return;

    // Prevent self-deletion
    if (
      staffToDelete.uid === currentUser?.uid ||
      staffToDelete.email.toLowerCase() === currentUser?.email?.toLowerCase()
    ) {
      setActionError('Self-deletion blocked: You cannot delete your own active Clinic Owner account.');
      setStaffToDelete(null);
      return;
    }

    try {
      const staffDocRef = doc(db, 'clinics', clinicId, 'staff', staffToDelete.id);
      await deleteDoc(staffDocRef);

      if (staffToDelete.uid) {
        await deleteDoc(doc(db, 'users', staffToDelete.uid)).catch(() => {});
      }

      setSuccessToast(`Staff account for ${staffToDelete.name} has been permanently deleted.`);
      setStaffToDelete(null);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to delete staff account.');
    }
  };

  // Toggle Staff Status (Active / Suspended)
  const handleToggleStatus = async (staff: StaffAccount) => {
    if (!isOwner) return;
    if (staff.uid === currentUser?.uid || staff.email.toLowerCase() === currentUser?.email?.toLowerCase()) {
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
      setActionError(err.message || 'Failed to update account status.');
    }
  };

  // Enforce Owner security access check
  if (!isOwner) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-2xl mx-auto space-y-4 my-8">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          Access Restricted: Clinic Owner Only
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          Staff account creation, credential provisioning, and account deletion are restricted to Clinic Owners under the strict Role-Based Access Control (RBAC) security policy.
        </p>
        <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
          Your active session role: <strong className="text-slate-900">{activeRole}</strong>
        </div>
      </div>
    );
  }

  // Filter staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.title && s.title.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeCount = staffList.filter((s) => s.status === 'active').length;
  const suspendedCount = staffList.filter((s) => s.status === 'suspended').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Staff Account Management & RBAC Roster
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Clinic Owner & Administrator Portal • Provision credentials, assign roles & revoke access
              </p>
            </div>
          </div>
        </div>

        {/* Action Button & Quick Stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
              {activeCount} Active Staff
            </span>
            {suspendedCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                {suspendedCount} Suspended
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Create New Staff Account
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-500 hover:text-rose-700 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or title..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Role Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
          >
            <option value="all">All Roles ({staffList.length})</option>
            <option value="Owner">Owner / Administrator</option>
            <option value="Dentist">Dentist / Surgeon</option>
            <option value="Receptionist">Receptionist</option>
            <option value="Cashier">Cashier / Billing</option>
          </select>
        </div>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-semibold">Loading Staff Roster...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No staff accounts match your search.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
              }}
              className="text-teal-700 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Assigned Role</th>
                  <th className="py-3.5 px-4">Credentials & Login</th>
                  <th className="py-3.5 px-4">License / BMDC</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((staff) => {
                  const isCurrent =
                    staff.uid === currentUser?.uid ||
                    staff.email.toLowerCase() === currentUser?.email?.toLowerCase();

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Initials */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
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
                              {isCurrent && (
                                <span className="text-[9px] font-extrabold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{staff.title || staff.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
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

                      {/* Email & Initial Password */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-slate-800 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{staff.email}</span>
                        </div>
                        {staff.initialPassword && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Key className="w-3 h-3 text-slate-400" />
                            <span>Initial Key: <strong className="text-slate-700">{staff.initialPassword}</strong></span>
                          </div>
                        )}
                      </td>

                      {/* License */}
                      <td className="py-3 px-4 text-slate-600">
                        {staff.licenseNumber ? (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <FileBadge className="w-3.5 h-3.5 text-teal-600" />
                            {staff.licenseNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status & Toggle */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => handleToggleStatus(staff)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                            isCurrent ? 'cursor-default' : 'cursor-pointer hover:opacity-85'
                          } ${
                            staff.status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                          title={isCurrent ? 'Cannot suspend yourself' : 'Click to toggle status'}
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

                      {/* Action: Delete */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => setStaffToDelete(staff)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isCurrent
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                          }`}
                          title={
                            isCurrent
                              ? 'Cannot delete your active owner account'
                              : `Permanently delete account for ${staff.name}`
                          }
                          aria-label={`Delete ${staff.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE STAFF ACCOUNT MODAL */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0F3942] to-[#0A262C] p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Provision New Staff Account
                  </h3>
                  <p className="text-xs text-teal-100/80">
                    Create credentials and assign role permissions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-teal-200/70 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateStaff} className="p-6 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                  {actionError}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  STAFF FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Sadia Anjum"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900 font-medium"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  ASSIGNED CLINICAL ROLE *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900 font-medium"
                >
                  {allRoles.length > 0 ? (
                    allRoles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name} ({role.category} • {role.permissions.length} modules)
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Dentist">Dentist (Clinical Charting, Odontogram & Plans)</option>
                      <option value="Receptionist">Receptionist (Front Desk Scheduling & Check-in)</option>
                      <option value="Cashier">Cashier (Billing POS, Invoices & Vouchers)</option>
                      <option value="Owner">Owner / Administrator (Full Practice Governance)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                  STAFF EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. sadia.dentist@apex-dental.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900 font-medium"
                />
              </div>

              {/* Initial Password with Generator */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                    INITIAL PASSWORD * (MIN 6 CHARS)
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generate Key
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="e.g. DentFlow-7aK9"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900 font-mono font-medium"
                />
              </div>

              {/* Position Title & Optional License */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                    POSITION TITLE
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Associate Dental Surgeon"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px]">
                    LICENSE NUMBER (BMDC / REG)
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    placeholder="e.g. BMDC/DC-9921"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {staffToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Staff Account Permanently
                </h3>
                <p className="text-xs text-slate-500">
                  Irreversible security revocation
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-slate-900">{staffToDelete.name}</strong> (
              <span className="font-mono text-slate-800">{staffToDelete.email}</span>)?
              This staff member will immediately lose access to DentFlow and all associated role portals.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteStaff}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
