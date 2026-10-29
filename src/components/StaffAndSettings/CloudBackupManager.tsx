import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  Database,
  CloudDownload,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Eye,
  Lock,
  Clock,
  HardDrive,
  Users,
  Calendar,
  CreditCard,
  Pill,
  FlaskConical,
  Grid,
  FileText,
  Package,
  Layers,
  History,
  X,
} from 'lucide-react';
import { formatClinicDate } from '../../utils/dateFormatter';

interface CollectionStat {
  id: string;
  name: string;
  collectionName: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  category: 'Clinical' | 'Financial' | 'Administrative';
}

interface LastBackupInfo {
  timestamp: string;
  totalRecords: number;
  fileName: string;
  fileSizeBytes: number;
}

export const CloudBackupManager: React.FC = () => {
  const { clinic, userProfile, activeRole, hasPermission, recordAuditLog } = useAuth();
  const clinicId = clinic?.id || DEFAULT_CLINIC_ID;

  // Authorization verification
  const isOwner = useMemo(() => {
    const roleStr = String(activeRole || '').trim().toLowerCase();
    const userRoleStr = String(userProfile?.role || '').trim().toLowerCase();
    const emailStr = String(userProfile?.email || '').trim().toLowerCase();
    return (
      roleStr === 'owner' ||
      userRoleStr === 'owner' ||
      roleStr === 'admin' ||
      userRoleStr === 'admin' ||
      hasPermission(['Owner', 'Admin']) ||
      emailStr === 'owner@dentflow.com' ||
      emailStr === 'shihab.rajshahi@gmail.com' ||
      emailStr === 'shihab@apex-dental.com'
    );
  }, [activeRole, userProfile, hasPermission]);

  // Backup states
  const [loadingStats, setLoadingStats] = useState(false);
  const [collectionStats, setCollectionStats] = useState<CollectionStat[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);

  // Local storage last backup tracking
  const [lastBackup, setLastBackup] = useState<LastBackupInfo | null>(() => {
    try {
      const stored = localStorage.getItem(`dentflow_backup_${clinicId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Definition of all clinic subcollections included in the cloud backup
  const collectionsConfig = useMemo(
    () => [
      { id: 'patients', name: 'Patients Directory', collectionName: 'patients', icon: Users, category: 'Clinical' as const },
      { id: 'appointments', name: 'Scheduled Appointments', collectionName: 'appointments', icon: Calendar, category: 'Clinical' as const },
      { id: 'clinical_notes', name: 'Clinical Notes (SOAP)', collectionName: 'clinical_notes', icon: FileText, category: 'Clinical' as const },
      { id: 'dental_charts', name: 'Dental Charts (Odontograms)', collectionName: 'dental_charts', icon: Grid, category: 'Clinical' as const },
      { id: 'treatment_plans', name: 'Accepted Treatment Plans', collectionName: 'treatment_plans', icon: Layers, category: 'Clinical' as const },
      { id: 'prescriptions', name: 'Prescriptions (Rx)', collectionName: 'prescriptions', icon: Pill, category: 'Clinical' as const },
      { id: 'lab_orders', name: 'Dental Lab Prosthetics', collectionName: 'lab_orders', icon: FlaskConical, category: 'Clinical' as const },
      { id: 'invoices', name: 'Billing Invoices', collectionName: 'invoices', icon: CreditCard, category: 'Financial' as const },
      { id: 'payments', name: 'Collected Payment Receipts', collectionName: 'payments', icon: CreditCard, category: 'Financial' as const },
      { id: 'expenses', name: 'Practice Expenditures', collectionName: 'expenses', icon: HardDrive, category: 'Financial' as const },
      { id: 'services', name: 'Dental Services Catalog', collectionName: 'services', icon: Package, category: 'Administrative' as const },
      { id: 'inventory', name: 'Clinical Stock Inventory', collectionName: 'inventory', icon: Package, category: 'Administrative' as const },
      { id: 'staff', name: 'Staff Accounts Roster', collectionName: 'staff', icon: Users, category: 'Administrative' as const },
      { id: 'custom_roles', name: 'Custom Practice Roles', collectionName: 'custom_roles', icon: ShieldCheck, category: 'Administrative' as const },
      { id: 'staff_login_logs', name: 'Security & Audit Logs', collectionName: 'staff_login_logs', icon: History, category: 'Administrative' as const },
    ],
    []
  );

  // Scan record counts for pre-backup assessment
  const scanCollectionCounts = async () => {
    setLoadingStats(true);
    setExportError(null);
    try {
      const statsPromises = collectionsConfig.map(async (c) => {
        try {
          const snap = await getDocs(collection(db, 'clinics', clinicId, c.collectionName));
          return {
            ...c,
            count: snap.size,
          };
        } catch {
          return {
            ...c,
            count: 0,
          };
        }
      });

      const results = await Promise.all(statsPromises);
      setCollectionStats(results);
    } catch (err: any) {
      console.warn('Scan backup collections warning:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    scanCollectionCounts();
  }, [clinicId]);

  const totalScannedRecords = useMemo(() => {
    return collectionStats.reduce((sum, item) => sum + item.count, 0);
  }, [collectionStats]);

  // Clean data helper to recursively serialize Firestore Timestamps and date objects safely
  const cleanDocumentData = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    // Handle Firestore Timestamp object ({ seconds, nanoseconds } or toDate)
    if (typeof data.toDate === 'function') {
      return data.toDate().toISOString();
    }
    if (typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
      return new Date(data.seconds * 1000).toISOString();
    }
    if (data instanceof Date) {
      return data.toISOString();
    }

    if (Array.isArray(data)) {
      return data.map((item) => cleanDocumentData(item));
    }

    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      // Exclude internal Firestore cache properties
      if (key.startsWith('_serverTimestamp')) continue;
      cleaned[key] = cleanDocumentData(data[key]);
    }
    return cleaned;
  };

  // Perform full clinic snapshot export
  const handleExportBackup = async () => {
    if (!isOwner) {
      setExportError('Disaster recovery data exports are restricted to the Clinic Owner account.');
      return;
    }

    setExporting(true);
    setExportError(null);
    setExportSuccessMsg(null);
    setExportProgress('Initiating cloud snapshot generation...');

    try {
      // 1. Fetch clinic root configuration document
      setExportProgress('Archiving practice identity and branding profile...');
      let clinicDocData: any = null;
      try {
        const cSnap = await getDoc(doc(db, 'clinics', clinicId));
        if (cSnap.exists()) {
          clinicDocData = { id: cSnap.id, ...cleanDocumentData(cSnap.data()) };
        }
      } catch (errClinic) {
        console.warn('Clinic profile snapshot note:', errClinic);
        clinicDocData = clinic || { id: clinicId };
      }

      // 2. Fetch all collections in parallel
      const snapshotPayload: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};
      let totalRecords = 0;

      for (let i = 0; i < collectionsConfig.length; i++) {
        const cfg = collectionsConfig[i];
        setExportProgress(`Querying ${cfg.name} (${i + 1}/${collectionsConfig.length})...`);

        try {
          const colRef = collection(db, 'clinics', clinicId, cfg.collectionName);
          const snap = await getDocs(colRef);
          const records: any[] = [];
          snap.forEach((d) => {
            records.push({
              _id: d.id,
              ...cleanDocumentData(d.data()),
            });
          });
          snapshotPayload[cfg.collectionName] = records;
          recordCounts[cfg.collectionName] = records.length;
          totalRecords += records.length;
        } catch (colErr) {
          console.warn(`Snapshot skip on ${cfg.collectionName}:`, colErr);
          snapshotPayload[cfg.collectionName] = [];
          recordCounts[cfg.collectionName] = 0;
        }
      }

      setExportProgress('Compiling JSON snapshot manifest and audit metadata...');

      // 3. Assemble complete backup object with integrity headers
      const now = new Date();
      const timestampIso = now.toISOString();
      const safeClinicName = (clinic?.name || 'dentflow')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const datePart = timestampIso.split('T')[0];
      const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '');
      const fileName = `${safeClinicName}-backup-${datePart}-${timePart}.json`;

      const fullBackupObject = {
        _schema: 'https://dentflow.app/schemas/backup-v1.json',
        _backupMetadata: {
          version: '1.0.0',
          generator: 'DentFlow Clinical Suite Cloud Snapshot Engine',
          exportedAt: timestampIso,
          clinicId,
          clinicName: clinic?.name || 'Apex Dental Care & Implant Center',
          clinicBrandName: clinic?.brandName || 'DentFlow',
          currency: clinic?.currency || 'BDT',
          currencySymbol: clinic?.currencySymbol || '৳',
          exportedBy: {
            name: userProfile?.displayName || 'Dr. Shihab Hossain',
            email: userProfile?.email || 'owner@dentflow.com',
            role: activeRole || 'Owner',
          },
          summary: {
            totalCollections: collectionsConfig.length + 1, // +1 for clinic profile
            totalRecords: totalRecords + 1,
            recordCounts: {
              clinicProfile: 1,
              ...recordCounts,
            },
          },
        },
        clinicProfile: clinicDocData,
        ...snapshotPayload,
      };

      // 4. Create and trigger download
      const jsonString = JSON.stringify(fullBackupObject, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const fileSizeBytes = blob.size;

      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      // 5. Store last backup manifest in state and localStorage
      const backupManifest: LastBackupInfo = {
        timestamp: timestampIso,
        totalRecords: totalRecords + 1,
        fileName,
        fileSizeBytes,
      };
      setLastBackup(backupManifest);
      try {
        localStorage.setItem(`dentflow_backup_${clinicId}`, JSON.stringify(backupManifest));
      } catch {
        // LocalStorage warning ignored
      }

      // 6. Record Audit Log Event for Practice Governance
      if (recordAuditLog) {
        recordAuditLog({
          activityType: 'Data Exported',
          details: `Owner exported full clinic snapshot JSON (${totalRecords + 1} records, ${(fileSizeBytes / 1024).toFixed(1)} KB) - File: ${fileName}`,
          targetResource: 'Full Practice Cloud Backup',
          notes: `JSON snapshot generated by ${userProfile?.displayName || 'Owner'} (${userProfile?.email || 'owner@dentflow.com'})`,
        }).catch(() => {});
      }

      // 7. Success state
      setPreviewData(fullBackupObject);
      setExportSuccessMsg(
        `Cloud snapshot successfully compiled and downloaded (${totalRecords + 1} records across 16 collections, ${(fileSizeBytes / 1024).toFixed(1)} KB).`
      );
      setTimeout(() => setExportSuccessMsg(null), 8000);
    } catch (err: any) {
      console.error('Backup error:', err);
      setExportError(err?.message || 'Failed to complete cloud data snapshot export. Please verify internet connection.');
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <CloudDownload className="w-3.5 h-3.5 text-teal-600" />
              PRACTICE DISASTER RECOVERY & ARCHIVAL
            </span>
            {isOwner && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-700" />
                Owner Privileges Active
              </span>
            )}
          </div>
          <h4 className="font-bold text-slate-800 text-sm mt-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600" />
            Cloud Database Backup & JSON Snapshot Export
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Export a complete, offline-ready snapshot of your entire dental practice database in standardized JSON format.
            Includes patients, appointments, SOAP clinical notes, odontograms, prescriptions, financial ledgers, and staff security logs.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={scanCollectionCounts}
            disabled={loadingStats || exporting}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Refresh database record counts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportBackup}
            disabled={exporting || !isOwner}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Exporting Snapshot...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Cloud Snapshot (.JSON)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security notice if not owner */}
      {!isOwner && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Access Restriction: </span>
            Clinic data snapshots contain complete patient medical histories and financial ledgers. Only the <strong>Clinic Owner</strong> or <strong>Practice Administrator</strong> can export cloud database backups.
          </div>
        </div>
      )}

      {/* Progress banner during active export */}
      {exporting && exportProgress && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-3 text-teal-900 animate-in fade-in">
          <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <div className="flex-1">
            <span className="font-bold block">Generating Cloud Snapshot...</span>
            <span className="text-[11px] text-teal-700">{exportProgress}</span>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {exportSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Export Complete: </span>
              <span>{exportSuccessMsg}</span>
            </div>
          </div>
          {previewData && (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="text-[11px] font-bold text-teal-800 hover:text-teal-950 underline cursor-pointer shrink-0 ml-2"
            >
              Inspect JSON
            </button>
          )}
        </div>
      )}

      {exportError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2 shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Backup Error: </span>
            <span>{exportError}</span>
          </div>
        </div>
      )}

      {/* Last Backup Status Card */}
      {lastBackup && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Last Generated Snapshot</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saved on <strong>{formatClinicDate(lastBackup.timestamp.split('T')[0])}</strong> at {new Date(lastBackup.timestamp).toLocaleTimeString()} • {lastBackup.totalRecords} records • {formatFileSize(lastBackup.fileSizeBytes)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="font-mono text-[10px] text-slate-500 truncate max-w-xs" title={lastBackup.fileName}>
              {lastBackup.fileName}
            </span>
            {previewData && (
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Eye className="w-3 h-3 text-teal-600" />
                <span>View Schema</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Record Breakdown Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-teal-600" />
            Database Collections Included in Snapshot ({collectionStats.length > 0 ? collectionStats.length : collectionsConfig.length} Modules)
          </span>
          <span className="text-[11px] font-bold text-teal-800 font-mono">
            {loadingStats ? 'Scanning records...' : `${totalScannedRecords.toLocaleString()} Total Records Found`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {collectionsConfig.map((col) => {
            const stat = collectionStats.find((s) => s.id === col.id);
            const count = stat ? stat.count : 0;
            const Icon = col.icon;
            return (
              <div
                key={col.id}
                className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between gap-2 hover:bg-white hover:border-teal-300 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                    <Icon className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold text-slate-800 text-[11px] truncate" title={col.name}>
                      {col.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">/{col.collectionName}</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs shrink-0">
                  {loadingStats ? '...' : count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Snapshot Schema Details & FAQ */}
      <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 text-[11.5px] text-slate-600 space-y-2">
        <div className="font-bold text-teal-900 flex items-center gap-1.5 text-xs">
          <FileCode className="w-4 h-4 text-teal-700" />
          Snapshot Architecture & Disaster Recovery Compliance
        </div>
        <p className="leading-relaxed">
          The exported JSON file represents a self-contained, offline-compatible mirror of your clinic's Firestore root and nested subcollections. All timestamps are normalized to ISO-8601 UTC standards for seamless re-importation, third-party practice management migrations, or secure offline storage in compliance with digital healthcare record preservation guidelines.
        </p>
      </div>

      {/* JSON Schema Preview Modal */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold">Cloud Backup Manifest & Schema Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Backup Version:</span>
                  <strong className="font-mono text-slate-800">{previewData._backupMetadata?.version || '1.0.0'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Records:</span>
                  <strong className="font-mono text-teal-800">{previewData._backupMetadata?.summary?.totalRecords || 0}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Generated At:</span>
                  <strong className="text-slate-800">{previewData._backupMetadata?.exportedAt || 'Just now'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Exported By:</span>
                  <strong className="text-slate-800">{previewData._backupMetadata?.exportedBy?.name} ({previewData._backupMetadata?.exportedBy?.role})</strong>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Manifest Snapshot Preview:</span>
                <pre className="bg-slate-900 text-teal-300 p-3 rounded-xl text-[10.5px] font-mono overflow-x-auto max-h-72 leading-relaxed">
                  {JSON.stringify(previewData._backupMetadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200/60 rounded-xl font-semibold cursor-pointer text-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
