import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  Appointment,
  Invoice,
  Payment,
  Patient,
  TreatmentPlan,
  ClinicExpense,
} from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  generateReportsPDF,
  downloadReportsPDF,
  ReportData,
} from '../../utils/pdfReportGenerator';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Eye,
  X,
  Printer,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Building,
  Activity,
  Layers,
} from 'lucide-react';

export const ReportsDashboard: React.FC = () => {
  const { clinic, hasPermission, userProfile, activeRole } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [expenses, setExpenses] = useState<ClinicExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Month / Period filtering
  // Format: 'all' or 'YYYY-MM'
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState<string | null>(null);
  const [exportSuccessNotice, setExportSuccessNotice] = useState<string | null>(null);

  const canViewFinances = hasPermission(['Owner', 'Cashier']);
  const currencySymbol = clinic?.currencySymbol || '৳';

  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const loadAll = async () => {
      setLoading(true);
      try {
        const [aSnap, iSnap, pSnap, ptSnap, plSnap, expSnap] = await Promise.allSettled([
          getDocs(collection(db, 'clinics', clinicId, 'appointments')),
          getDocs(collection(db, 'clinics', clinicId, 'invoices')),
          getDocs(collection(db, 'clinics', clinicId, 'payments')),
          getDocs(collection(db, 'clinics', clinicId, 'patients')),
          getDocs(collection(db, 'clinics', clinicId, 'treatment_plans')),
          getDocs(collection(db, 'clinics', clinicId, 'expenses')),
        ]);

        if (aSnap.status === 'fulfilled') {
          const aList: Appointment[] = [];
          aSnap.value.forEach((d) => aList.push({ id: d.id, ...d.data() } as Appointment));
          setAppointments(aList);
        }

        if (iSnap.status === 'fulfilled') {
          const iList: Invoice[] = [];
          iSnap.value.forEach((d) => iList.push({ id: d.id, ...d.data() } as Invoice));
          setInvoices(iList);
        }

        if (pSnap.status === 'fulfilled') {
          const pList: Payment[] = [];
          pSnap.value.forEach((d) => pList.push({ id: d.id, ...d.data() } as Payment));
          setPayments(pList);
        }

        if (ptSnap.status === 'fulfilled') {
          const ptList: Patient[] = [];
          ptSnap.value.forEach((d) => ptList.push({ id: d.id, ...d.data() } as Patient));
          setPatients(ptList);
        }

        if (plSnap.status === 'fulfilled') {
          const plList: TreatmentPlan[] = [];
          plSnap.value.forEach((d) => plList.push({ id: d.id, ...d.data() } as TreatmentPlan));
          setPlans(plList);
        }

        if (expSnap.status === 'fulfilled') {
          const expList: ClinicExpense[] = [];
          expSnap.value.forEach((d) => expList.push({ id: d.id, ...d.data() } as ClinicExpense));
          setExpenses(expList);
        }
      } catch (err) {
        console.warn('Reports load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [clinic?.id]);

  // Derived filtered collections based on selectedMonth
  const filteredAppointments = useMemo(() => {
    if (selectedMonth === 'all') return appointments;
    return appointments.filter((a) => a.date?.startsWith(selectedMonth));
  }, [appointments, selectedMonth]);

  const filteredInvoices = useMemo(() => {
    if (selectedMonth === 'all') return invoices;
    return invoices.filter((i) => (i.issueDate || i.createdAt)?.startsWith(selectedMonth));
  }, [invoices, selectedMonth]);

  const filteredPayments = useMemo(() => {
    if (selectedMonth === 'all') return payments;
    return payments.filter((p) => (p.date || p.createdAt)?.startsWith(selectedMonth));
  }, [payments, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    if (selectedMonth === 'all') return expenses;
    return expenses.filter((e) => (e.date || e.createdAt)?.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Statistics calculation
  const totalBilled = filteredInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const totalCollected = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0);
  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalCollected - totalExpenseAmount;

  const totalVisits = filteredAppointments.length;
  const completedAppts = filteredAppointments.filter((a) => a.status === 'Completed').length;
  const scheduledAppts = filteredAppointments.filter(
    (a) => a.status === 'Scheduled' || a.status === 'Confirmed'
  ).length;
  const cancelledAppts = filteredAppointments.filter(
    (a) => a.status === 'Cancelled' || a.status === 'No Show'
  ).length;
  const waitingAppts = filteredAppointments.filter((a) => a.status === 'Checked In').length;
  const completionRate = totalVisits > 0 ? Math.round((completedAppts / totalVisits) * 100) : 0;
  const cancellationRate = totalVisits > 0 ? Math.round((cancelledAppts / totalVisits) * 100) : 0;

  const acceptedPlans = plans.filter(
    (p) => p.status === 'Accepted' || p.status === 'In Progress' || p.status === 'Completed'
  ).length;
  const planAcceptanceRate = plans.length > 0 ? Math.round((acceptedPlans / plans.length) * 100) : 0;

  // Prepare Report Data payload
  const buildReportPayload = (monthTarget: string = selectedMonth): ReportData => {
    const periodLabel =
      monthTarget === 'all'
        ? 'Comprehensive Full-Practice History'
        : `Monthly Cycle: ${new Date(monthTarget + '-01').toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}`;

    return {
      clinic,
      appointments,
      invoices,
      payments,
      patients,
      plans,
      expenses,
      generatedBy: userProfile?.displayName || 'Clinical Administration',
      generatedRole: activeRole || 'Practice Administrator',
      selectedMonth: monthTarget,
      reportingPeriod: periodLabel,
    };
  };

  // Direct PDF Download Handler
  const handleDownloadPDF = async (monthOverride?: string) => {
    try {
      setIsExportingPdf(true);
      const targetMonth = monthOverride !== undefined ? monthOverride : selectedMonth;
      const payload = buildReportPayload(targetMonth);

      // Trigger download
      downloadReportsPDF(payload);

      const periodDesc =
        targetMonth === 'all'
          ? 'Comprehensive Full-Practice'
          : new Date(targetMonth + '-01').toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            });
      setExportSuccessNotice(`Successfully exported PDF report for ${periodDesc}!`);
      setTimeout(() => setExportSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Preview in Modal
  const handlePreviewPDF = () => {
    try {
      const payload = buildReportPayload(selectedMonth);
      const doc = generateReportsPDF(payload);
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      setPdfPreviewBlobUrl(blobUrl);
      setShowPdfModal(true);
    } catch (err) {
      console.error('Failed to preview PDF:', err);
    }
  };

  // Close Preview
  const handleCloseModal = () => {
    if (pdfPreviewBlobUrl) {
      URL.revokeObjectURL(pdfPreviewBlobUrl);
      setPdfPreviewBlobUrl(null);
    }
    setShowPdfModal(false);
  };

  // Export to CSV
  const exportInvoicesCSV = () => {
    if (filteredInvoices.length === 0) return;
    const headers = [
      'Invoice Number',
      'Patient Name',
      'Issue Date',
      'Due Date',
      'Total',
      'Paid',
      'Balance',
      'Status',
    ];
    const rows = filteredInvoices.map((i) => [
      i.invoiceNumber,
      `"${i.patientName}"`,
      i.issueDate,
      i.dueDate,
      i.total,
      i.paidAmount,
      i.balance,
      i.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `DentFlow_Billing_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute available months for dropdown selection
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((a) => {
      if (a.date) set.add(a.date.slice(0, 7));
    });
    invoices.forEach((i) => {
      if (i.issueDate) set.add(i.issueDate.slice(0, 7));
      else if (i.createdAt) set.add(i.createdAt.slice(0, 7));
    });
    payments.forEach((p) => {
      if (p.date) set.add(p.date.slice(0, 7));
      else if (p.createdAt) set.add(p.createdAt.slice(0, 7));
    });
    // Ensure current month is available
    set.add(currentMonthStr);
    return Array.from(set).sort().reverse();
  }, [appointments, invoices, payments, currentMonthStr]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {exportSuccessNotice && (
        <div className="flex items-center justify-between p-3.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>{exportSuccessNotice}</span>
          </div>
          <button
            onClick={() => setExportSuccessNotice(null)}
            className="text-teal-600 hover:text-teal-900 ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Control Center */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            Clinic Intelligence & Executive Reports
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time monthly performance metrics, appointment statistics, and clinical financial
            ledger summaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Period Selection Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-600">Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="all">All-Time History</option>
              <option value={currentMonthStr}>Current Month ({currentMonthStr})</option>
              {availableMonths
                .filter((m) => m !== currentMonthStr)
                .map((m) => (
                  <option key={m} value={m}>
                    {new Date(m + '-01').toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    ({m})
                  </option>
                ))}
            </select>
          </div>

          {/* Quick PDF Preview Modal Button */}
          <button
            type="button"
            onClick={handlePreviewPDF}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            title="Preview generated PDF in viewer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            Preview PDF
          </button>

          {/* Main Download PDF Report Button */}
          <button
            type="button"
            onClick={() => handleDownloadPDF()}
            disabled={loading || isExportingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>
              {isExportingPdf ? 'Generating PDF...' : 'Download PDF Report'}
            </span>
          </button>

          {/* CSV Export Option */}
          {canViewFinances && (
            <button
              type="button"
              onClick={exportInvoicesCSV}
              disabled={loading || filteredInvoices.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              title="Export filtered records to spreadsheet CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Report Coverage Indicator Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-800/80 border border-teal-600/40 flex items-center justify-center text-teal-300">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-300 font-semibold">
              Reporting Scope: {selectedMonth === 'all' ? 'All Practice Historical Data' : `Cycle: ${selectedMonth}`}
            </div>
            <div className="text-sm font-medium text-slate-200">
              {totalVisits} Appointments • {filteredInvoices.length} Invoices Issued • {filteredPayments.length} Payment Receipts Reconciled
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setSelectedMonth(currentMonthStr)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              selectedMonth === currentMonthStr
                ? 'bg-teal-500 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              selectedMonth === 'all'
                ? 'bg-teal-500 text-white shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            All-Time
          </button>
          <button
            onClick={() => handleDownloadPDF(currentMonthStr)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700/80 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors border border-teal-500/40"
          >
            <Download className="w-3 h-3" />
            Monthly PDF
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (1. Monthly Performance Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue Collected */}
        {canViewFinances && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Revenue Collected
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {currencySymbol} {totalCollected.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Total invoiced: {currencySymbol} {totalBilled.toLocaleString()}
            </div>
          </div>
        )}

        {/* Card 2: Outstanding Receivables */}
        {canViewFinances && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Outstanding Balance
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700 font-mono">
              {currencySymbol} {totalOutstanding.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Accounts receivable pending collection
            </div>
          </div>
        )}

        {/* Card 3: Completed Visits */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Completed Visits
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {completedAppts}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              ({completionRate}% rate)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Total bookings: {totalVisits} • Missed/Cancelled: {cancelledAppts}
          </div>
        </div>

        {/* Card 4: Plan Acceptance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Plan Acceptance
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700 font-mono">
            {planAcceptanceRate}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {acceptedPlans} of {plans.length} clinical proposals accepted
          </div>
        </div>
      </div>

      {/* Financial Summary & Operating Health Bar (When Owner or Cashier) */}
      {canViewFinances && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Building className="w-4 h-4 text-teal-600" />
                Practice Operating Margin & Financial Performance
              </h4>
              <p className="text-slate-400 text-[11px]">
                Net operating summary calculated from patient payments and practice overhead.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-semibold text-[11px]">
              {selectedMonth === 'all' ? 'All Records' : `Cycle ${selectedMonth}`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">Gross Revenue Billed</span>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {currencySymbol} {totalBilled.toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-400">Total charge slips generated</span>
            </div>

            <div className="p-3.5 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <span className="text-[11px] text-emerald-700 font-medium">Reconciled Collections</span>
              <div className="text-lg font-bold text-emerald-800 font-mono mt-0.5">
                {currencySymbol} {totalCollected.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% collection yield
              </span>
            </div>

            <div className="p-3.5 bg-rose-50/50 rounded-lg border border-rose-100">
              <span className="text-[11px] text-rose-700 font-medium">Operating Expenses</span>
              <div className="text-lg font-bold text-rose-800 font-mono mt-0.5">
                {currencySymbol} {totalExpenseAmount.toLocaleString()}
              </div>
              <span className="text-[10px] text-rose-600">Supplies, lab, facility costs</span>
            </div>

            <div className="p-3.5 bg-teal-50/50 rounded-lg border border-teal-100">
              <span className="text-[11px] text-teal-700 font-medium">Estimated Net Margin</span>
              <div
                className={`text-lg font-bold font-mono mt-0.5 ${
                  netProfit >= 0 ? 'text-teal-900' : 'text-rose-700'
                }`}
              >
                {currencySymbol} {netProfit.toLocaleString()}
              </div>
              <span className="text-[10px] text-teal-700">Cash-in minus logged expenses</span>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Panels (2. Appointment Statistics & 3. Financial Summaries) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Status Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-600" />
              Appointment Pipeline & Operatory Flow
            </h4>
            <span className="text-slate-400 font-mono">
              Total: {filteredAppointments.length} Visits
            </span>
          </div>

          <div className="space-y-3.5">
            {[
              {
                label: 'Completed Treatments',
                count: completedAppts,
                color: 'bg-emerald-500',
                note: 'Procedures executed in dental chairs',
              },
              {
                label: 'Scheduled & Confirmed Bookings',
                count: scheduledAppts,
                color: 'bg-teal-500',
                note: 'Upcoming chair appointments on calendar',
              },
              {
                label: 'Checked In / Waiting in Lobby',
                count: waitingAppts,
                color: 'bg-amber-500',
                note: 'Patients arrived, waiting in reception',
              },
              {
                label: 'Cancelled / No-Show Patient Visits',
                count: cancelledAppts,
                color: 'bg-rose-400',
                note: 'Slots lost to cancellations/no-shows',
              },
            ].map((st, idx) => {
              const pct =
                filteredAppointments.length > 0
                  ? Math.round((st.count / filteredAppointments.length) * 100)
                  : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{st.label}</span>
                    <span className="font-mono">
                      {st.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${st.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-400">{st.note}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods Distribution Ledger */}
        {canViewFinances ? (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-teal-600" />
                Payment Gateway & Collections Breakdown
              </h4>
              <span className="text-slate-400 font-mono">
                {filteredPayments.length} Transactions
              </span>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                No payment transactions logged for this period.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {filteredPayments.slice(0, 8).map((pay) => (
                  <div
                    key={pay.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-100 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{pay.patientName}</div>
                      <div className="text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{pay.paymentMethod}</span>{' '}
                        {pay.referenceNumber ? `• Ref: ${pay.referenceNumber}` : ''} • {pay.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700 font-mono text-sm">
                        +{currencySymbol} {Number(pay.amount || 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">Received by {pay.receivedBy}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
            <ShieldCheck className="w-10 h-10 text-teal-600 mb-2 opacity-80" />
            <h4 className="font-bold text-slate-800 text-sm">Clinical Access Mode</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Financial summaries are protected and restricted to Owner and Cashier roles. Operational
              appointment throughput and patient volumes remain accessible.
            </p>
          </div>
        )}
      </div>

      {/* Quick Action: PDF Export Highlights Footer Card */}
      <div className="p-4 bg-teal-50 border border-teal-200/80 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-teal-900">
              Audit-Ready Clinical Practice PDF Export
            </h5>
            <p className="text-[11px] text-teal-700">
              Generates a formal 2-page document with Executive KPIs, chair utilization rates,
              payment gateway breakdown, itemized receivables roster, and Medical Director sign-off.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleDownloadPDF('all')}
            className="flex-1 md:flex-none px-3 py-1.5 bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-semibold transition-colors"
          >
            All-Time PDF
          </button>
          <button
            onClick={() => handleDownloadPDF(currentMonthStr)}
            className="flex-1 md:flex-none px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download {new Date().toLocaleDateString('en-US', { month: 'short' })} Report
          </button>
        </div>
      </div>

      {/* PDF Interactive Preview Modal */}
      {showPdfModal && pdfPreviewBlobUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-sm font-bold">
                    Executive Clinical Performance Report Preview
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedMonth === 'all'
                      ? 'Comprehensive Practice Overview'
                      : `Monthly Cycle: ${selectedMonth}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / PDF Frame */}
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex items-center justify-center min-h-[480px]">
              <iframe
                src={pdfPreviewBlobUrl}
                title="DentFlow PDF Performance Report Preview"
                className="w-full h-full rounded-lg border border-slate-300 shadow-inner bg-white min-h-[500px]"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Clinical governance & audit seal included on page 2.
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
