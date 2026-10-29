import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  PracticeRoleDefinition,
  DEFAULT_PRACTICE_ROLES,
  DashboardModuleId,
} from '../types/dental';

export interface CreateRoleInput {
  name: string;
  category: 'Clinical' | 'Front Desk' | 'Financial' | 'Support' | 'Administrative';
  description: string;
  permissions: DashboardModuleId[];
}

export interface UsePracticeRolesOptions {
  activeRole?: string;
  isOwner?: boolean;
  userEmail?: string;
  userUid?: string;
}

/**
 * Checks whether a given role string qualifies for ADMIN or OWNER privileges.
 */
export const checkAdminOrOwnerPrivilege = (roleName?: string): boolean => {
  if (!roleName) return false;
  const normalized = roleName.trim().toLowerCase();
  return (
    normalized === 'owner' ||
    normalized === 'admin' ||
    normalized === 'administrator' ||
    normalized === 'superadmin' ||
    normalized === 'managing director'
  );
};

export const usePracticeRoles = (
  clinicId: string,
  roleOrOptions: boolean | string | UsePracticeRolesOptions = true
) => {
  const [customRoles, setCustomRoles] = useState<PracticeRoleDefinition[]>([]);
  const [deletedSystemRoleIds, setDeletedSystemRoleIds] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Extract role and ownership flags
  const activeRole: string =
    typeof roleOrOptions === 'string'
      ? roleOrOptions
      : typeof roleOrOptions === 'object' && roleOrOptions !== null
      ? roleOrOptions.activeRole || (roleOrOptions.isOwner ? 'Owner' : 'Dentist')
      : roleOrOptions
      ? 'Owner'
      : 'Dentist';

  const userEmail: string =
    typeof roleOrOptions === 'object' && roleOrOptions !== null
      ? roleOrOptions.userEmail || ''
      : '';

  const isPrivileged =
    typeof roleOrOptions === 'boolean'
      ? roleOrOptions
      : typeof roleOrOptions === 'object' && roleOrOptions.isOwner !== undefined
      ? Boolean(roleOrOptions.isOwner) || checkAdminOrOwnerPrivilege(activeRole)
      : checkAdminOrOwnerPrivilege(activeRole);

  useEffect(() => {
    if (!clinicId) {
      setLoadingRoles(false);
      return;
    }

    // 1. Listen to custom_roles
    const qCustomRoles = query(collection(db, 'clinics', clinicId, 'custom_roles'));
    const unsubscribeCustomRoles = onSnapshot(
      qCustomRoles,
      (snapshot) => {
        const roleItems: PracticeRoleDefinition[] = [];
        snapshot.forEach((d) => {
          roleItems.push({ id: d.id, ...d.data() } as PracticeRoleDefinition);
        });
        setCustomRoles(roleItems);
        setLoadingRoles(false);
      },
      (err) => {
        console.warn('Custom roles listener warning:', err);
        setLoadingRoles(false);
      }
    );

    // 2. Listen to deleted_system_roles
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
      (err) => {
        console.warn('Deleted system roles listener warning:', err);
      }
    );

    return () => {
      unsubscribeCustomRoles();
      unsubscribeDeletedRoles();
    };
  }, [clinicId]);

  // Aggregate active system roles with custom roles
  const activeSystemRoles = DEFAULT_PRACTICE_ROLES.filter(
    (sr) => !deletedSystemRoleIds.includes(sr.id)
  );

  const allRoles: PracticeRoleDefinition[] = [
    ...activeSystemRoles,
    ...customRoles.filter(
      (cr) => !activeSystemRoles.some((sr) => sr.name.toLowerCase() === cr.name.toLowerCase())
    ),
  ];

  // Create role method (enforces ADMIN or OWNER privileges)
  const createRole = useCallback(
    async (input: CreateRoleInput) => {
      // Verify activeRole has ADMIN or OWNER privileges
      if (!isPrivileged) {
        throw new Error(
          `Permission Denied: Your current active role is "${activeRole}". Creating practice roles (such as "${input.name || 'Surgeon'}") requires Clinic OWNER or ADMIN privileges. Please switch to the Owner role using the portal role switcher in the top navigation bar.`
        );
      }

      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error('Please specify a role title (e.g. Surgeon or Dental Assistant).');
      }

      if (allRoles.some((r) => r.name.toLowerCase() === trimmedName.toLowerCase())) {
        throw new Error(`A practice role named "${trimmedName}" already exists.`);
      }

      const roleColRef = collection(db, 'clinics', clinicId, 'custom_roles');
      const newDoc = doc(roleColRef);
      const effectiveRoleStamp = checkAdminOrOwnerPrivilege(activeRole) ? activeRole : 'Owner';

      const newRole: PracticeRoleDefinition = {
        id: newDoc.id,
        name: trimmedName,
        category: input.category,
        description: input.description.trim() || `${trimmedName} clinical/administrative staff role`,
        isSystemRole: false,
        permissions: input.permissions.length > 0 ? input.permissions : ['dashboard'],
        createdAt: new Date().toISOString(),
        ...(effectiveRoleStamp ? { creatorRole: effectiveRoleStamp, activeRole: effectiveRoleStamp } : {}),
        ...(userEmail ? { createdBy: userEmail } : {}),
      };

      // Optimistic update so UI reflects the new role immediately
      setCustomRoles((prev) => [...prev.filter((r) => r.id !== newDoc.id), newRole]);

      try {
        await setDoc(newDoc, newRole);
      } catch (err: any) {
        console.error('Firestore create role write error:', err);
        const rawMsg = String(err?.message || err || '');
        if (
          rawMsg.includes('Missing or insufficient permissions') ||
          rawMsg.includes('permission-denied') ||
          err?.code === 'permission-denied'
        ) {
          throw new Error(
            `Firestore Permission Error: Operation rejected by security rules. Modifying practice roles requires verified OWNER or ADMIN privileges. Please verify that your active role is set to Owner or Administrator.`
          );
        }
        throw err;
      }

      return newRole;
    },
    [activeRole, allRoles, clinicId, isPrivileged, userEmail]
  );

  // Delete role method (enforces ADMIN or OWNER privileges)
  const deleteRole = useCallback(
    async (role: PracticeRoleDefinition) => {
      if (!isPrivileged) {
        throw new Error(
          `Permission Denied: Your current active role is "${activeRole}". Deleting practice roles requires Clinic OWNER or ADMIN privileges.`
        );
      }

      if (role.name === 'Owner') {
        throw new Error('The Clinic Owner role is permanent and cannot be deleted.');
      }

      // Optimistic deletion
      if (role.isSystemRole) {
        setDeletedSystemRoleIds((prev) => [...prev, role.id]);
      } else {
        setCustomRoles((prev) => prev.filter((r) => r.id !== role.id));
      }

      try {
        const effectiveRoleStamp = checkAdminOrOwnerPrivilege(activeRole) ? activeRole : 'Owner';
        if (role.isSystemRole) {
          const deletedDocRef = doc(db, 'clinics', clinicId, 'deleted_system_roles', role.id);
          await setDoc(deletedDocRef, {
            roleId: role.id,
            name: role.name,
            deletedAt: new Date().toISOString(),
            creatorRole: effectiveRoleStamp,
            activeRole: effectiveRoleStamp,
            ...(userEmail ? { deletedBy: userEmail } : {}),
          });
        } else {
          await deleteDoc(doc(db, 'clinics', clinicId, 'custom_roles', role.id));
        }
      } catch (err: any) {
        console.error('Firestore delete role write error:', err);
        const rawMsg = String(err?.message || err || '');
        if (
          rawMsg.includes('Missing or insufficient permissions') ||
          rawMsg.includes('permission-denied') ||
          err?.code === 'permission-denied'
        ) {
          throw new Error(
            `Firestore Permission Error: Role deletion was rejected by security rules. Verified OWNER or ADMIN privileges are required.`
          );
        }
        throw err;
      }
    },
    [activeRole, clinicId, isPrivileged, userEmail]
  );

  return {
    allRoles,
    customRoles,
    deletedSystemRoleIds,
    loadingRoles,
    roleError,
    setRoleError,
    createRole,
    deleteRole,
    isPrivileged,
    activeRole,
  };
};
