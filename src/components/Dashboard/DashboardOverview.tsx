import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Appointment, Patient, Invoice, Payment, ClinicExpense, TreatmentPlan } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Grid,
  CreditCard,
  UserPlus,
  Stethoscope,
  TrendingDown,
  Layers,
  ShieldCheck,
  Shield,
  Key,
  Trash2,
  Lock,
  History,
} from 'lucide-react';
import { StaffManagement } from './StaffManagement';
import { UrgentAlertsPanel } from './UrgentAlertsPanel';

interface DashboardOverviewProps {
  onNavigate: (module: string) => void;
  onOpenNewPatient: () => void;
  onOpenNewAppointment: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  onOpenNewPatient,
  onOpenNewAppointment,
}) => {
  const { clinic, userProfile, activeRole, seedInitialDataIfEmpty } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<ClinicExpense[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerTab, setOwnerTab] = useState<'overview' | 'staff'>('overview');

  const currencySymbol = clinic?.currencySymbol || '৳';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    setLoading(true);

    const unsubAppts = onSnapshot(
      collection(db, 'clinics', clinicId, 'appointments'),
      (snap) => {
        const list: Appointment[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Appointment));
        setAppointments(list);
        setLoading(false);
      },
      (err) => console.warn('Appt snap error:', err)
    );

    const unsubPatients = onSnapshot(
      collection(db, 'clinics', clinicId, 'patients'),
      (snap) => {
        const list: Patient[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Patient));
        setPatients(list);
      },
      (err) => console.warn('Patients snap error:', err)
    );

    const unsubInvoices = onSnapshot(
      collection(db, 'clinics', clinicId, 'invoices'),
      (snap) => {
        const list: Invoice[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Invoice));
        setInvoices(list);
      },
      (err) => console.warn('Invoices snap error:', err)
    );

    const unsubPayments = onSnapshot(
      collection(db, 'clinics', clinicId, 'payments'),
      (snap) => {
        const list: Payment[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Payment));
        setPayments(list);
      },
      (err) => console.warn('Payments snap error:', err)
    );

    const unsubExpenses = onSnapshot(
      collection(db, 'clinics', clinicId, 'expenses'),
      (snap) => {
        const list: ClinicExpense[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ClinicExpense));
        setExpenses(list);
      },
      (err) => console.warn('Expenses snap error:', err)
    );

    const unsubPlans = onSnapshot(
      collection(db, 'clinics', clinicId, 'treatment_plans'),
      (snap) => {
        const list: TreatmentPlan[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as TreatmentPlan));
        setTreatmentPlans(list);
      },
      (err) => console.warn('Treatment plans snap error:', err)
    );

    seedInitialDataIfEmpty();

    return () => {
      unsubAppts();
      unsubPatients();
      unsubInvoices();
      unsubPayments();
      unsubExpenses();
      unsubPlans();
    };
  }, [clinic?.id]);

  // Real data calculations
  const todayAppts = appointments.filter((a) => a.date === todayStr);
  const waitingPatients = appointments.filter(
    (a) => a.date === todayStr && a.status === 'Checked In'
  );
  const inProgressPatients = appointments.filter(
    (a) => a.date === todayStr && a.status === 'In Progress'
  );
  const completedToday = appointments.filter(
    (a) => a.date === todayStr && a.status === 'Completed'
  );

  const totalOutstanding = invoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0);
  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // View personalization based on User Role Matrix:
  // Owner: Full | Dentist: Clinical | Receptionist: Scheduling | Cashier: Financial
  const isOwner = activeRole === 'Owner';
  const isDentist = activeRole === 'Dentist';
  const isReceptionist = activeRole === 'Receptionist';
  const isCashier = activeRole === 'Cashier';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-teal-900 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-teal-700/80 text-teal-100 px-2.5 py-0.5 rounded-full font-medium">
              Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="text-xs bg-teal-500/30 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              {activeRole} Dashboard ({isOwner ? 'Full' : isDentist ? 'Clinical' : isReceptionist ? 'Scheduling' : 'Financial'})
            </span>
          </div>
          <h2 className="text-2xl font-bold mt-2 tracking-tight">
            Welcome, {userProfile?.displayName || 'Clinical Staff'}
          </h2>
          <p className="text-xs text-teal-100/90 mt-1 max-w-xl">
            {clinic?.name || 'Apex Dental Care'} — Practice overview, patient waiting queue, and operational flow.
          </p>
        </div>

        {/* Quick action buttons tailored to role */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {(isOwner || isReceptionist) && (
            <button
              type="button"
              onClick={onOpenNewAppointment}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-teal-900 rounded-xl text-xs font-bold shadow-xs hover:bg-teal-50 transition-colors"
            >
              <Calendar className="w-4 h-4 text-teal-700" />
              Book Appointment
            </button>
          )}

          {(isOwner || isReceptionist) && (
            <button
              type="button"
              onClick={onOpenNewPatient}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-700/90 hover:bg-teal-750 text-white rounded-xl text-xs font-bold border border-teal-600/50 shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              New Patient
            </button>
          )}

          {isDentist && (
            <button
              type="button"
              onClick={() => onNavigate('patients')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-teal-900 rounded-xl text-xs font-bold shadow-xs hover:bg-teal-50 transition-colors"
            >
              <Grid className="w-4 h-4 text-teal-700" />
              Open Odontogram
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              onClick={() => setOwnerTab((prev) => (prev === 'staff' ? 'overview' : 'staff'))}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600/90 hover:bg-teal-600 text-white rounded-xl text-xs font-bold border border-teal-500/50 shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-teal-200" />
              {ownerTab === 'staff' ? 'Practice Overview' : 'Staff Accounts & RBAC'}
            </button>
          )}
        </div>
      </div>

      {/* Owner Exclusive Sub-Navigation */}
      {isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOwnerTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ownerTab === 'overview'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Practice Operations & Schedule
            </button>
            <button
              type="button"
              onClick={() => setOwnerTab('staff')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                ownerTab === 'staff'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Staff Accounts & Permissions (Owner Only)
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium hidden md:flex items-center gap-2 px-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span>
              Privileged Clearance: <strong className="text-slate-800 font-semibold">{userProfile?.displayName || 'Owner'}</strong> (Owner Access)
            </span>
          </div>
        </div>
      )}

      {isOwner && ownerTab === 'staff' ? (
        <StaffManagement />
      ) : (
        <>

      {/* KPI Cards adapted to Role */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        {isCashier ? (
          <div
            onClick={() => onNavigate('billing')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-emerald-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Collections
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-800 font-mono">
              {currencySymbol} {totalRevenue.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{payments.length} transactions received</div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('appointments')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-teal-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Today's Schedule
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {todayAppts.length}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{completedToday.length} completed today</div>
          </div>
        )}

        {/* Card 2 */}
        <div
          onClick={() => onNavigate('appointments')}
          className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-amber-500/60 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Waiting in Clinic
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 font-mono flex items-center gap-2">
            <span>{waitingPatients.length}</span>
            {waitingPatients.length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full animate-pulse">
                Checked In
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {inProgressPatients.length} currently on dental chair
          </div>
        </div>

        {/* Card 3 */}
        {isDentist ? (
          <div
            onClick={() => onNavigate('appointments')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-sky-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Active Procedures
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {inProgressPatients.length + completedToday.length}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">In chair / completed today</div>
          </div>
        ) : isCashier ? (
          <div
            onClick={() => onNavigate('billing')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-amber-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Outstanding Dues
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700 font-mono">
              {currencySymbol} {totalOutstanding.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Receivable invoice balances</div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('patients')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-sky-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Patients
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              {patients.length}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Registered patient charts</div>
          </div>
        )}

        {/* Card 4 */}
        {isOwner ? (
          <div
            onClick={() => onNavigate('expenses')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-teal-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Net Profit
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-teal-800 font-mono">
              {currencySymbol} {netProfit.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Expenses: {currencySymbol} {totalExpenses.toLocaleString()}
            </div>
          </div>
        ) : isCashier ? (
          <div
            onClick={() => onNavigate('expenses')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-rose-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Clinic Expenses
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700 font-mono">
              {currencySymbol} {totalExpenses.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Registered vouchers & overheads</div>
          </div>
        ) : isDentist ? (
          <div
            onClick={() => onNavigate('services')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-teal-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                CDT Procedures
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              Clinical Catalog
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Standard fee & chair durations</div>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('appointments')}
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs hover:border-teal-500/60 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Room Occupancy
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
              3 Operatories
            </div>
            <div className="mt-1 text-[11px] text-slate-400">General, Surgical & Hygiene</div>
          </div>
        )}
      </div>

      {/* Urgent Patient Alerts Panel (Upcoming Root Canals, Outstanding Balances, Medical Flags) */}
      <UrgentAlertsPanel
        appointments={appointments}
        patients={patients}
        invoices={invoices}
        onNavigate={onNavigate}
        currencySymbol={currencySymbol}
      />

      {/* Main Grid: Today's Schedule & Waiting Queue + Quick Patient Jump */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Appointments & Chair Status */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Today's Patient Schedule ({todayAppts.length})
              </h3>
              <p className="text-xs text-slate-500">Live operatory status and waiting room arrivals</p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('appointments')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
            >
              Full Calendar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4">
            {todayAppts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 p-4">
                <Calendar className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                <p className="text-xs font-medium">No bookings scheduled for today.</p>
                {(isOwner || isReceptionist) && (
                  <button
                    type="button"
                    onClick={onOpenNewAppointment}
                    className="mt-2 text-xs font-bold text-teal-700 hover:underline inline-block"
                  >
                    + Schedule First Patient
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayAppts.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-3 bg-slate-50/80 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center font-mono w-14 bg-white py-1 px-1.5 rounded border border-slate-200 shadow-2xs">
                        <div className="font-bold text-slate-800">{appt.startTime}</div>
                        <div className="text-[10px] text-slate-400">{appt.durationMinutes}m</div>
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {appt.patientName}
                          {appt.room && (
                            <span className="text-[10px] font-normal text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {appt.room}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {appt.type} • Dr. {appt.dentistName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          appt.status === 'Checked In'
                            ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-400/50 animate-pulse'
                            : appt.status === 'In Progress'
                            ? 'bg-purple-100 text-purple-800'
                            : appt.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Patient Jump & Health Alerts */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Recent Patient Charts</h3>
              <button
                type="button"
                onClick={() => onNavigate('patients')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                View All
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-xs">
              {patients.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  onClick={() => onNavigate('patients')}
                  className="p-2.5 rounded-lg border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-xs">
                      {p.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                        {p.fullName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.patientIdNumber}</div>
                    </div>
                  </div>

                  {p.medicalAlerts ? (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      Alert
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Normal</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Clinical & Role Shortcuts */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Fast Access Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {(isOwner || isDentist) && (
                <button
                  type="button"
                  onClick={() => onNavigate('patients')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Grid className="w-3.5 h-3.5 text-teal-600" />
                  Odontogram
                </button>
              )}

              {(isOwner || isCashier) && (
                <button
                  type="button"
                  onClick={() => onNavigate('billing')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                  Invoices
                </button>
              )}

              {(isOwner || isCashier) && (
                <button
                  type="button"
                  onClick={() => onNavigate('expenses')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                  Expenses & P&L
                </button>
              )}

              {isOwner && (
                <button
                  type="button"
                  onClick={() => onNavigate('log_history')}
                  className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-amber-700" />
                  Log History
                </button>
              )}

              {isReceptionist && (
                <button
                  type="button"
                  onClick={() => onNavigate('appointments')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  Waiting Room
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Owner / Administrator Exclusive Section: Staff Accounts & Security */}
      {isOwner && (
        <div className="bg-gradient-to-r from-[#0F3942] to-[#0A262C] rounded-2xl p-6 text-white shadow-sm border border-teal-800/40 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-teal-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-400/20 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded-full">
                    OWNER / ADMINISTRATOR PRIVILEGED SECTION
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white mt-1">
                  Staff Account Creation & Deletion Control
                </h3>
                <p className="text-xs text-teal-100/80">
                  Role-Based Access Control (RBAC): Only Clinic Owners & Administrators can provision new staff accounts, assign credentials, or delete staff members.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('log_history')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-teal-950 font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-teal-950" />
                <span>Log History</span>
              </button>
              <button
                type="button"
                onClick={() => setOwnerTab('staff')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-teal-900" />
                Create New Staff Account
              </button>
              <button
                type="button"
                onClick={() => setOwnerTab('staff')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-xs border border-white/20 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                Manage & Delete Accounts
              </button>
            </div>
          </div>

          {/* Security Policy Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-teal-300 text-xs">
                <Key className="w-3.5 h-3.5" />
                <span>Account Provisioning</span>
              </div>
              <p className="text-teal-100/70 text-[11px] leading-relaxed">
                Instantly create new staff profiles for Dentists, Receptionists, and Billing Staff with auto-generated secure credentials.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-300 text-xs">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanent Deletion & Safety</span>
              </div>
              <p className="text-teal-100/70 text-[11px] leading-relaxed">
                Safely delete former staff accounts from Firestore with safety checks that prevent owners from deleting their own active account.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-300 text-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Restricted to Owner/Admin</span>
              </div>
              <p className="text-teal-100/70 text-[11px] leading-relaxed">
                Dentists, Receptionists, and Cashiers cannot access account creation, deletion, or permission configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )}
</div>
  );
};
