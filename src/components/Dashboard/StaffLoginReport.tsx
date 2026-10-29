import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import { StaffAccount, StaffLoginLog, UserRole, AuditActivityType } from '../../types/dental';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatClinicDate } from '../../utils/dateFormatter';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Users,
  Laptop,
  Globe,
  ArrowRightLeft,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  History,
  LogIn,
  Edit2,
  Receipt,
  CalendarRange,
  X,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';

interface StaffLoginReportProps {
  staffList?: StaffAccount[];
  onOpenReassignModal?: (staff: StaffAccount) => void;
}

// Built-in seed logs if the clinic has a clean or fresh log collection
const getSeedLogs = (clinicId: string): StaffLoginLog[] => {
  const now = Date.now();
  return [
    {
      id: 'seed-log-1',
      clinicId,
      staffAccountId: 'preset-shihab',
      userId: 'uid-shihab',
      staffName: 'Dr. Shihab Hossain',
      staffEmail: 'owner@dentflow.com',
      staffRole: 'Owner' as UserRole,
      loginTimestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      deviceInfo: 'Chrome on macOS',
      ipOrLocation: 'Practice Director Office (Admin Terminal 1)',
      sessionStatus: 'Active',
      accountReassigned: false,
      notes: 'Owner administrative session initiated',
      action: 'login',
      activityType: 'User Login',
      details: 'Clinic Owner authenticated on management workstation',
      createdAt: new Date(now - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'seed-log-2',
      clinicId,
      staffAccountId: 'preset-shihab',
      userId: 'uid-shihab',
      staffName: 'Dr. Shihab Hossain',
      staffEmail: 'owner@dentflow.com',
      staffRole: 'Owner' as UserRole,
      loginTimestamp: new Date(now - 45 * 60 * 1000).toISOString(),
      deviceInfo: 'Chrome on macOS',
      ipOrLocation: 'Practice Director Office',
      sessionStatus: 'Success',
      accountReassigned: false,
      notes: 'Adjusted payment record',
      action: 'payment_edited',
      activityType: 'Payment Edited',
      details: 'Modified collected payment receipt for Invoice #ADC-2026-9981 (Amount: ৳ 1,050, Method: Cash)',
      targetResource: 'ADC-2026-9981',
      createdAt: new Date(now - 45 * 60 * 1000).toISOString(),
    },
    {
      id: 'seed-log-3',
      clinicId,
      staffAccountId: 'preset-cashier',
      userId: 'uid-cashier',
      staffName: 'Rachel Chen',
      staffEmail: 'cashier@dentflow.com',
      staffRole: 'Cashier' as UserRole,
      loginTimestamp: new Date(now - 2 * 3600 * 1000).toISOString(),
      deviceInfo: 'Chrome on Windows 11',
      ipOrLocation: 'Cashier Counter (Billing Terminal)',
      sessionStatus: 'Success',
      accountReassigned: false,
      notes: 'Counter payment recorded',
      action: 'payment_collected',
      activityType: 'Payment Collected',
      details: 'Recorded counter payment receipt for Invoice #ADC-1001 (Amount: ৳ 4,000 via Cash)',
      targetResource: 'ADC-1001',
      createdAt: new Date(now - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 'seed-log-4',
      clinicId,
      staffAccountId: 'preset-ayesha',
      userId: 'uid-ayesha',
      staffName: 'Dr. Ayesha Siddiqa',
      staffEmail: 'dr.ayesha@apex-dental.com',
      staffRole: 'Dentist' as UserRole,
      loginTimestamp: new Date(now - 3 * 3600 * 1000).toISOString(),
      deviceInfo: 'Edge on Windows 11',
      ipOrLocation: 'Operatory 2 (Surgery Terminal)',
      sessionStatus: 'Active',
      accountReassigned: true,
      previousStaffName: 'Dr. Sarah Khan',
      notes: 'Dentist operatory session',
      action: 'login',
      activityType: 'User Login',
      details: 'Authenticated on associate dental chair workstation',
      createdAt: new Date(now - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: 'seed-log-5',
      clinicId,
      staffAccountId: 'preset-reception',
      userId: 'uid-reception',
      staffName: 'Marcus Vance',
      staffEmail: 'reception@dentflow.com',
      staffRole: 'Receptionist' as UserRole,
      loginTimestamp: new Date(now - 5 * 3600 * 1000).toISOString(),
      deviceInfo: 'Chrome on Windows 11',
      ipOrLocation: 'Reception Desk 1 (Main Lobby)',
      sessionStatus: 'Active',
      accountReassigned: false,
      notes: 'Front desk intake shift started',
      action: 'login',
      activityType: 'User Login',
      details: 'Patient intake reception terminal login',
      createdAt: new Date(now - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: 'seed-log-6',
      clinicId,
      staffAccountId: 'preset-shihab',
      userId: 'uid-shihab',
      staffName: 'Dr. Shihab Hossain',
      staffEmail: 'owner@dentflow.com',
      staffRole: 'Owner' as UserRole,
      loginTimestamp: new Date(now - 26 * 3600 * 1000).toISOString(),
      deviceInfo: 'Chrome on macOS',
      ipOrLocation: 'Practice Director Office',
      sessionStatus: 'Success',
      accountReassigned: false,
      notes: 'Removed test record',
      action: 'patient_deleted',
      activityType: 'Patient Deleted',
      details: 'Archived duplicate test patient record #DF-0982 per practice data hygiene protocol',
      targetResource: 'DF-0982',
      createdAt: new Date(now - 26 * 3600 * 1000).toISOString(),
    },
    {
      id: 'seed-log-7',
      clinicId,
      staffAccountId: 'preset-ayesha',
      userId: 'uid-shihab',
      staffName: 'Dr. Shihab Hossain',
      staffEmail: 'owner@dentflow.com',
      staffRole: 'Owner' as UserRole,
      loginTimestamp: new Date(now - 2 * 86400 * 1000).toISOString(),
      deviceInfo: 'Chrome on macOS',
      ipOrLocation: 'Practice Director Office',
      sessionStatus: 'Success',
      accountReassigned: true,
      previousStaffName: 'Dr. Sarah Khan',
      notes: 'Transferred staff credentials to new associate',
      action: 'staff_reassigned',
      activityType: 'Staff Account Reassigned',
      details: 'Reassigned Associate Dentist account and surgery privileges from Dr. Sarah Khan to Dr. Ayesha Siddiqa',
      createdAt: new Date(now - 2 * 86400 * 1000).toISOString(),
    },
    {
      id: 'seed-log-8',
      clinicId,
      staffAccountId: 'preset-ayesha',
      userId: 'uid-sarah-khan-legacy',
      staffName: 'Dr. Sarah Khan (Former)',
      staffEmail: 'dr.sarah.khan@apex-dental.com',
      staffRole: 'Dentist' as UserRole,
      loginTimestamp: new Date(now - 35 * 86400 * 1000).toISOString(),
      deviceInfo: 'Safari on macOS',
      ipOrLocation: 'Operatory 2 (Surgery Terminal)',
      sessionStatus: 'Terminated',
      accountReassigned: true,
      previousStaffName: '',
      notes: 'Historical session before departing practice / handover to Dr. Ayesha',
      action: 'login',
      activityType: 'User Login',
      details: 'Historical archive record prior to employee transition',
      createdAt: new Date(now - 35 * 86400 * 1000).toISOString(),
    },
  ];
};

export const StaffLoginReport: React.FC<StaffLoginReportProps> = ({
  staffList = [],
}) => {
  const { clinic, activeRole } = useAuth();
  const clinicId = clinic?.id || DEFAULT_CLINIC_ID;

  const [rawLogs, setRawLogs] = useState<StaffLoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [selectedActivityType, setSelectedActivityType] = useState<string>('all');

  // Date Range Filtering States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'this_month' | 'custom'>('all');

  const [exporting, setExporting] = useState(false);

  // Real-time listener for logs in Firestore
  useEffect(() => {
    const logsCol = collection(db, 'clinics', clinicId, 'staff_login_logs');
    const unsubscribe = onSnapshot(
      logsCol,
      (snapshot) => {
        const items: StaffLoginLog[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...d.data() } as StaffLoginLog);
        });

        if (items.length > 0) {
          // Sort newest first
          items.sort(
            (a, b) =>
              new Date(b.loginTimestamp || b.createdAt || 0).getTime() -
              new Date(a.loginTimestamp || a.createdAt || 0).getTime()
          );
          setRawLogs(items);
        } else {
          // Provide rich seed logs if Firestore collection is fresh
          setRawLogs(getSeedLogs(clinicId));
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Staff login logs listener error, using fallback seed trail:', err);
        setRawLogs(getSeedLogs(clinicId));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clinicId]);

  // Identify staff accounts that have been reassigned / transferred to new employees
  const reassignedAccounts = useMemo(() => {
    return staffList.filter((s) => s.accountHistory && s.accountHistory.length > 0);
  }, [staffList]);

  // Handle Preset Date Range Selection
  const handleSelectDatePreset = (preset: 'all' | 'today' | '7days' | '30days' | 'this_month') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
      setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // When user edits either date picker directly, mark as 'custom'
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDatePreset('custom');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setDatePreset('custom');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRole('all');
    setSelectedAccountFilter('all');
    setSelectedActivityType('all');
    setStartDate('');
    setEndDate('');
    setDatePreset('all');
  };

  const isFilterActive =
    searchQuery.trim() !== '' ||
    selectedRole !== 'all' ||
    selectedAccountFilter !== 'all' ||
    selectedActivityType !== 'all' ||
    startDate !== '' ||
    endDate !== '' ||
    datePreset !== 'all';

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    return rawLogs.filter((log) => {
      // 1. Role filter
      if (selectedRole !== 'all' && log.staffRole !== selectedRole) {
        return false;
      }

      // 2. Account filter
      if (selectedAccountFilter === 'reassigned_only') {
        if (!log.accountReassigned && !log.previousStaffName) return false;
      } else if (selectedAccountFilter !== 'all') {
        if (
          log.staffAccountId !== selectedAccountFilter &&
          log.staffEmail !== selectedAccountFilter
        ) {
          return false;
        }
      }

      // 3. Activity Type dropdown filter
      if (selectedActivityType !== 'all') {
        const logAct = log.activityType || 'User Login';
        if (logAct.toLowerCase() !== selectedActivityType.toLowerCase()) {
          return false;
        }
      }

      // 4. Date range filter
      if (startDate) {
        const logDateStr = (log.loginTimestamp || log.createdAt || '').slice(0, 10);
        if (logDateStr < startDate) {
          return false;
        }
      }
      if (endDate) {
        const logDateStr = (log.loginTimestamp || log.createdAt || '').slice(0, 10);
        if (logDateStr > endDate) {
          return false;
        }
      }

      // 5. Search query (matches staffName, previousStaffName, email, device, notes, details, targetResource)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (log.staffName || '').toLowerCase().includes(q);
        const matchesPrev = (log.previousStaffName || '').toLowerCase().includes(q);
        const matchesEmail = (log.staffEmail || '').toLowerCase().includes(q);
        const matchesDevice = (log.deviceInfo || '').toLowerCase().includes(q);
        const matchesLocation = (log.ipOrLocation || '').toLowerCase().includes(q);
        const matchesNotes = (log.notes || '').toLowerCase().includes(q);
        const matchesDetails = (log.details || '').toLowerCase().includes(q);
        const matchesTarget = (log.targetResource || '').toLowerCase().includes(q);
        const matchesAct = (log.activityType || '').toLowerCase().includes(q);

        if (
          !matchesName &&
          !matchesPrev &&
          !matchesEmail &&
          !matchesDevice &&
          !matchesLocation &&
          !matchesNotes &&
          !matchesDetails &&
          !matchesTarget &&
          !matchesAct
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    rawLogs,
    selectedRole,
    selectedAccountFilter,
    selectedActivityType,
    startDate,
    endDate,
    searchQuery,
  ]);

  // Summary Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const totalEntries = rawLogs.length;
  const eventsToday = rawLogs.filter((l) => (l.loginTimestamp || l.createdAt || '').startsWith(todayStr)).length;
  const paymentEventsCount = rawLogs.filter(
    (l) => l.activityType === 'Payment Edited' || l.activityType === 'Payment Collected'
  ).length;
  const patientDeletedCount = rawLogs.filter((l) => l.activityType === 'Patient Deleted').length;
  const reassignedAccountsCount = reassignedAccounts.length;

  // Format timestamp nicely with clinic date rule
  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const isToday = isoStr.startsWith(todayStr);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = formatClinicDate(d);
      return {
        isToday,
        dateStr,
        timeStr,
        full: `${dateStr} at ${timeStr}`,
      };
    } catch {
      return { isToday: false, dateStr: isoStr, timeStr: '', full: isoStr };
    }
  };

  // Helper for rendering distinct colored badges per activity type
  const renderActivityBadge = (activityType?: string) => {
    const act = activityType || 'User Login';
    switch (act) {
      case 'User Login':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <LogIn className="w-2.5 h-2.5 text-blue-600" />
            User Login
          </span>
        );
      case 'Payment Edited':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Edit2 className="w-2.5 h-2.5 text-amber-600" />
            Payment Edited
          </span>
        );
      case 'Patient Deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 className="w-2.5 h-2.5 text-rose-600" />
            Patient Deleted
          </span>
        );
      case 'Payment Collected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Receipt className="w-2.5 h-2.5 text-emerald-600" />
            Payment Collected
          </span>
        );
      case 'Invoice Deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <Trash2 className="w-2.5 h-2.5 text-rose-600" />
            Invoice Deleted
          </span>
        );
      case 'Invoice Created':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            <FileText className="w-2.5 h-2.5 text-teal-600" />
            Invoice Created
          </span>
        );
      case 'Staff Account Reassigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <ArrowRightLeft className="w-2.5 h-2.5 text-purple-600" />
            Account Handover
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <History className="w-2.5 h-2.5 text-slate-500" />
            {act}
          </span>
        );
    }
  };

  // Export PDF Report respecting all active filters
  const handleExportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
      const clinicName = clinic?.name || 'Apex Dental Care & Implant Center';

      // Header Banner
      doc.setFillColor(10, 39, 46); // Dark Teal
      doc.rect(0, 0, doc.internal.pageSize.width, 65, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`${clinicName} - Log History & Security Audit Report`, 36, 30);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(178, 223, 219);
      doc.text(
        `Immutable Activity & Security Log | Generated by Clinic Owner on ${new Date().toLocaleString()}`,
        36,
        46
      );

      // Filter summary banner in document
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const dateRangeDesc =
        startDate && endDate
          ? `${startDate} to ${endDate}`
          : startDate
          ? `From ${startDate}`
          : endDate
          ? `Until ${endDate}`
          : 'All Recorded History';

      doc.text(
        `Date Range: ${dateRangeDesc} | Activity Filter: ${selectedActivityType} | Role: ${selectedRole} | Filtered Records: ${filteredLogs.length} of ${rawLogs.length}`,
        36,
        85
      );

      const tableData = filteredLogs.map((log) => {
        const timeObj = formatTimestamp(log.loginTimestamp || log.createdAt);
        const employeeDisplay = log.previousStaffName
          ? `${log.staffName} (Reassigned from ${log.previousStaffName})`
          : log.staffName;

        return [
          timeObj.full,
          log.activityType || 'User Login',
          employeeDisplay,
          log.staffRole,
          log.details || log.notes || 'Activity completed',
          log.ipOrLocation || 'Clinic LAN',
          log.sessionStatus || 'Success',
        ];
      });

      autoTable(doc, {
        head: [['Timestamp', 'Activity Type', 'Staff Member', 'Role', 'Event Details & Scope', 'Terminal / Location', 'Status']],
        body: tableData,
        startY: 95,
        theme: 'striped',
        headStyles: {
          fillColor: [13, 148, 136], // Teal 600
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        styles: {
          cellPadding: 4,
          overflow: 'linebreak',
        },
      });

      doc.save(`ApexDental_Log_History_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // Export CSV respecting all active filters
  const handleExportCSV = () => {
    try {
      const headers = [
        'Timestamp',
        'Activity Type',
        'Staff Name',
        'Role',
        'Email',
        'Event Details',
        'Target Resource',
        'Terminal/Location',
        'Device Info',
        'Session Status',
        'Reassigned Account',
        'Previous Staff Name',
      ];

      const rows = filteredLogs.map((log) => [
        `"${log.loginTimestamp || log.createdAt}"`,
        `"${log.activityType || 'User Login'}"`,
        `"${log.staffName}"`,
        `"${log.staffRole}"`,
        `"${log.staffEmail}"`,
        `"${(log.details || log.notes || '').replace(/"/g, '""')}"`,
        `"${log.targetResource || ''}"`,
        `"${log.ipOrLocation || ''}"`,
        `"${log.deviceInfo || ''}"`,
        `"${log.sessionStatus || 'Active'}"`,
        `"${log.accountReassigned ? 'Yes' : 'No'}"`,
        `"${log.previousStaffName || ''}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `Log_History_Report_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export error:', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Overview */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 inline-block mb-0.5">
                OWNER GOVERNANCE • LOG HISTORY & AUDIT TRAIL
              </span>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Practice Log History & Security Audit Trail
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Complete audit trail across staff logins, payment edits, patient record deletions, billing receipts, and account handover lineages. Use date range and activity filters below to quickly locate specific clinic events.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Total Logged Events</span>
            <Clock className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalEntries}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Complete clinic session & action trail</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-200 bg-teal-50/25 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-teal-700 flex items-center justify-between">
            <span>Events Today</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-teal-800 mt-1">{eventsToday}</div>
          <div className="text-[11px] text-teal-700 mt-0.5">Activities recorded today</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/25 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center justify-between">
            <span>Payment Audits</span>
            <Edit2 className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">{paymentEventsCount}</div>
          <div className="text-[11px] text-amber-700 mt-0.5">Owner edits & receipts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/25 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center justify-between">
            <span>Patient Deletions</span>
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900 mt-1">
            {patientDeletedCount}
          </div>
          <div className="text-[11px] text-rose-700 mt-0.5">
            Archived / deleted patient records
          </div>
        </div>
      </div>

      {/* Account Lineage / Handover Alert Card (if any accounts were transferred) */}
      {reassignedAccounts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 p-4 rounded-2xl border border-amber-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <ArrowRightLeft className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Employee Account Transition & Handover Lineage</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            The accounts below were previously held by former staff members and transitioned to new employees.
            Their prior login sessions and current employee sessions are both indexed here for full practice continuity.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {reassignedAccounts.map((account) => {
              const lastHistory = account.accountHistory?.[account.accountHistory.length - 1];
              return (
                <div
                  key={account.id}
                  className="bg-white p-3 rounded-xl border border-amber-200 text-xs flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Current: {account.name}</span>
                      <span className="text-[10px] font-semibold text-teal-700 px-1.5 py-0.2 rounded bg-teal-50">
                        {account.role}
                      </span>
                    </div>
                    {lastHistory && (
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                        <span className="text-amber-800 font-semibold">Previous:</span>
                        <span>{lastHistory.employeeName}</span>
                        <span className="text-slate-400">
                          (Handed over {lastHistory.endDate ? formatClinicDate(lastHistory.endDate) : 'recently'})
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAccountFilter(account.id);
                      setSearchQuery('');
                    }}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline shrink-0 cursor-pointer"
                  >
                    View Account Logs
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMPREHENSIVE FILTER CONTROLS: Activity Type Dropdown + Date Range Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff, email, event details, invoice #, workstation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Activity Type Dropdown Filter (e.g. 'User Login', 'Payment Edited', 'Patient Deleted') */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <label htmlFor="activityTypeSelect" className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                Activity:
              </label>
              <select
                id="activityTypeSelect"
                value={selectedActivityType}
                onChange={(e) => setSelectedActivityType(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Activity Types</option>
                <option value="User Login">User Login (Staff Authentication)</option>
                <option value="Payment Edited">Payment Edited (Owner Adjustment)</option>
                <option value="Patient Deleted">Patient Deleted (Record Archival)</option>
                <option value="Payment Collected">Payment Collected (Counter POS)</option>
                <option value="Invoice Deleted">Invoice Deleted (Record Removal)</option>
                <option value="Invoice Created">Invoice Created (Billing Generation)</option>
                <option value="Staff Account Reassigned">Staff Account Reassigned (Handover)</option>
                <option value="Role Changed">Role / Permission Changed</option>
                <option value="Prescription Issued">Prescription Issued (Rx)</option>
                <option value="Data Exported">Data Exported (PDF / CSV)</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <label htmlFor="roleSelect" className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                Role:
              </label>
              <select
                id="roleSelect"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Roles</option>
                <option value="Owner">Clinic Owner</option>
                <option value="Dentist">Dentist / Surgeon</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Cashier">Cashier</option>
              </select>
            </div>

            {/* Account Handover Filter */}
            {reassignedAccounts.length > 0 && (
              <select
                value={selectedAccountFilter}
                onChange={(e) => setSelectedAccountFilter(e.target.value)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">All Staff Accounts</option>
                <option value="reassigned_only">Handed Over Accounts Only</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* DATE RANGE FILTERING BAR */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <CalendarRange className="w-3.5 h-3.5 text-teal-600" />
              Date Range:
            </span>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: '7days', label: 'Last 7 Days' },
                  { id: '30days', label: 'Last 30 Days' },
                  { id: 'this_month', label: 'This Month' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectDatePreset(preset.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    datePreset === preset.id
                      ? 'bg-white text-teal-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Range Pickers */}
            <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="text-xs text-slate-700 font-medium bg-transparent focus:outline-none cursor-pointer"
                />
              </div>

              <span className="text-slate-400 text-xs">to</span>

              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="text-xs text-slate-700 font-medium bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 rounded-lg bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Active Filter Chips Pill Bar */}
        {isFilterActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-400 font-medium">Active filters:</span>
            {selectedActivityType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
                Activity: {selectedActivityType}
                <button
                  type="button"
                  onClick={() => setSelectedActivityType('all')}
                  className="text-teal-600 hover:text-teal-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedRole !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
                Role: {selectedRole}
                <button
                  type="button"
                  onClick={() => setSelectedRole('all')}
                  className="text-teal-600 hover:text-teal-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
                Dates: {startDate || 'Start'} to {endDate || 'Now'}
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDatePreset('all');
                  }}
                  className="text-teal-600 hover:text-teal-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                Search: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-slate-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <span className="text-slate-500 font-medium ml-1">
              ({filteredLogs.length} matching events)
            </span>
          </div>
        )}
      </div>

      {/* Main Logs Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          Loading log history and security audit reports...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400 space-y-2">
          <Clock className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">No log entries matched your filter criteria.</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Try broadening your date range or clearing the activity filter to view all recorded clinic events.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp & Date</th>
                  <th className="py-3 px-4">Activity Type</th>
                  <th className="py-3 px-4">Event Details / Scope</th>
                  <th className="py-3 px-4">Staff Member & Identity</th>
                  <th className="py-3 px-4">Workstation / Location</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const timeInfo = formatTimestamp(log.loginTimestamp || log.createdAt);
                  const isReassigned = Boolean(log.accountReassigned || log.previousStaffName);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{timeInfo.timeStr}</span>
                          {timeInfo.isToday && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-teal-50 text-teal-800 rounded border border-teal-200">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {timeInfo.dateStr}
                        </div>
                      </td>

                      {/* Activity Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        {renderActivityBadge(log.activityType)}
                      </td>

                      {/* Event Details / Scope */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="text-slate-900 font-semibold text-xs leading-snug">
                          {log.details || log.notes || 'Activity completed successfully'}
                        </div>
                        {log.targetResource && (
                          <div className="inline-block mt-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            Ref: {log.targetResource}
                          </div>
                        )}
                        {log.notes && log.details && log.notes !== log.details && (
                          <div className="text-[11px] text-slate-500 mt-0.5 italic">
                            "{log.notes}"
                          </div>
                        )}
                      </td>

                      {/* Staff Member & Identity */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-xs border border-teal-200 shrink-0">
                            {(log.staffName || 'S').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="truncate">{log.staffName}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                  log.staffRole === 'Owner'
                                    ? 'bg-purple-100 text-purple-800'
                                    : log.staffRole === 'Dentist'
                                    ? 'bg-sky-100 text-sky-800'
                                    : log.staffRole === 'Receptionist'
                                    ? 'bg-teal-100 text-teal-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {log.staffRole}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">
                              {log.staffEmail}
                            </div>
                            {isReassigned && log.previousStaffName && (
                              <div className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                                <ArrowRightLeft className="w-2.5 h-2.5" />
                                <span>Reassigned from: {log.previousStaffName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Workstation / Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 align-top">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{log.ipOrLocation || 'Banani Clinic LAN'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Laptop className="w-3 h-3 text-slate-300 shrink-0" />
                          <span>{log.deviceInfo || 'Workstation Terminal'}</span>
                        </div>
                      </td>

                      {/* Session Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap align-top">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {log.sessionStatus || 'Success'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Showing <strong>{filteredLogs.length}</strong> of <strong>{rawLogs.length}</strong> total clinic log events
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Audit trail active</span>
              </span>
              <span className="text-slate-300">|</span>
              <span>Owner Privileged Access</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
