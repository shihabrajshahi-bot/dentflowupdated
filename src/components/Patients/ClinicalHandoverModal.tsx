import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  Patient,
  TreatmentPlan,
  ClinicalNote,
  Prescription,
  Appointment,
  ClinicSettings,
} from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import {
  Printer,
  FileDown,
  X,
  ShieldAlert,
  Layers,
  FileText,
  UserCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  ClinicalHandoverData,
  HandoverMetadata,
  printClinicalHandoverDocument,
  exportClinicalHandoverPDF,
  calculatePatientAge,
} from '../../utils/clinicalHandoverGenerator';
import { formatClinicDate } from '../../utils/dateFormatter';

interface ClinicalHandoverModalProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
}

export const ClinicalHandoverModal: React.FC<ClinicalHandoverModalProps> = ({
  patient,
  isOpen,
  onClose,
}) => {
  const { clinic, userProfile, activeRole } = useAuth();
  const clinicId = clinic?.id || DEFAULT_CLINIC_ID;

  // Records loaded for this patient
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Handover specific metadata inputs
  const [receivingClinicianName, setReceivingClinicianName] = useState('');
  const [receivingFacility, setReceivingFacility] = useState('');
  const [handoverReason, setHandoverReason] = useState(
    'Transfer of patient care for specialized multidisciplinary treatment and clinical continuity.'
  );
  const [urgencyLevel, setUrgencyLevel] = useState<'Routine' | 'Priority' | 'Urgent'>('Routine');
  const [clinicalPrecautions, setClinicalPrecautions] = useState(
    patient.medicalAlerts ? `Medical Alert Flag: ${patient.medicalAlerts}` : ''
  );
  const [includeFinancials, setIncludeFinancials] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch patient subcollection records in real time
  useEffect(() => {
    if (!isOpen || !patient?.id || !clinicId) return;
    setLoading(true);

    // 1. Treatment plans
    const qPlans = query(
      collection(db, 'clinics', clinicId, 'treatment_plans'),
      where('patientId', '==', patient.id)
    );
    const unsubPlans = onSnapshot(
      qPlans,
      (snap) => {
        const list: TreatmentPlan[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as TreatmentPlan));
        setTreatmentPlans(list);
      },
      (err) => console.warn('Fetch treatment plans warning:', err)
    );

    // 2. Clinical Notes
    const qNotes = query(
      collection(db, 'clinics', clinicId, 'clinical_notes'),
      where('patientId', '==', patient.id)
    );
    const unsubNotes = onSnapshot(
      qNotes,
      (snap) => {
        const list: ClinicalNote[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ClinicalNote));
        setClinicalNotes(list);
      },
      (err) => console.warn('Fetch clinical notes warning:', err)
    );

    // 3. Prescriptions
    const qRx = query(
      collection(db, 'clinics', clinicId, 'prescriptions'),
      where('patientId', '==', patient.id)
    );
    const unsubRx = onSnapshot(
      qRx,
      (snap) => {
        const list: Prescription[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Prescription));
        setPrescriptions(list);
      },
      (err) => console.warn('Fetch prescriptions warning:', err)
    );

    // 4. Appointments
    const qApts = query(
      collection(db, 'clinics', clinicId, 'appointments'),
      where('patientId', '==', patient.id)
    );
    const unsubApts = onSnapshot(
      qApts,
      (snap) => {
        const list: Appointment[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Appointment));
        setAppointments(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Fetch appointments warning:', err);
        setLoading(false);
      }
    );

    return () => {
      unsubPlans();
      unsubNotes();
      unsubRx();
      unsubApts();
    };
  }, [isOpen, patient?.id, clinicId]);

  // Assembled handover data object
  const handoverData: ClinicalHandoverData = useMemo(() => {
    const metadata: HandoverMetadata = {
      referringClinicianName: userProfile?.displayName || 'Dr. Shihab Hossain',
      referringClinicianRole: activeRole || 'Dentist',
      referringClinicianLicense: 'BDS, PGT (Dental Surgery) - BMDC Reg #29104',
      receivingClinicianName: receivingClinicianName.trim() || 'Attending Clinical Specialist',
      receivingFacility: receivingFacility.trim() || 'Specialist Referral Center',
      handoverReason: handoverReason.trim(),
      urgencyLevel,
      clinicalPrecautions: clinicalPrecautions.trim(),
      includeFinancials,
    };

    const resolvedClinic: ClinicSettings = clinic || {
      id: clinicId,
      ownerId: userProfile?.uid || 'owner_default',
      name: 'Apex Dental Care & Implant Center',
      brandName: 'DentFlow',
      slogan: 'Apex Dental & Implant Centre',
      phone: '+880 1711-234567',
      email: 'contact@apexdentalcare.com',
      address: 'House 42, Road 11, Banani, Dhaka, Bangladesh',
      currency: 'BDT',
      currencySymbol: '৳',
      invoicePrefix: 'ADC',
      taxRate: 5,
      defaultAppointmentDuration: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      patient,
      treatmentPlans,
      clinicalNotes,
      prescriptions,
      appointments,
      clinic: resolvedClinic,
      handoverMetadata: metadata,
    };
  }, [
    patient,
    treatmentPlans,
    clinicalNotes,
    prescriptions,
    appointments,
    clinic,
    clinicId,
    userProfile,
    activeRole,
    receivingClinicianName,
    receivingFacility,
    handoverReason,
    urgencyLevel,
    clinicalPrecautions,
    includeFinancials,
  ]);

  if (!isOpen) return null;

  const handlePrint = () => {
    printClinicalHandoverDocument(handoverData);
    setToastMessage('Sent to print service. Check print preview window.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDownloadPDF = () => {
    exportClinicalHandoverPDF(handoverData);
    setToastMessage('Clinical handover PDF generated and downloaded.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  const upcomingPlans = treatmentPlans.filter(
    (p) => p.status !== 'Completed' && p.status !== 'Cancelled'
  );
  const completedPlans = treatmentPlans.filter((p) => p.status === 'Completed');
  const sortedNotes = [...clinicalNotes].sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Clinical Handover & Treatment Summary</span>
                <span className="text-[11px] font-mono bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-bold">
                  Print-Optimized
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Generate professional transfer documents for specialist referrals, second opinions, or handover of care.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Print document or save as PDF via system dialog"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Direct Vector PDF Export"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback notification toast */}
        {toastMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Modal Body: Split view of Handover Settings and Document Live Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Panel: Handover Parameters & Clinician Inputs */}
          <div className="lg:col-span-4 border-r border-slate-200 p-5 overflow-y-auto space-y-4 bg-white text-xs">
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                Handover Parameters
              </span>
              <span className="text-[10px] text-slate-400">Customizable</span>
            </div>

            {/* Handing over clinician badge */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Transferring Clinician</span>
              <div className="font-bold text-slate-800">{userProfile?.displayName || 'Dr. Shihab Hossain'}</div>
              <div className="text-[11px] text-teal-700 font-semibold">{activeRole || 'Dentist'} &bull; Apex Dental Care</div>
            </div>

            {/* Receiving Clinician */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Receiving Clinician / Specialist
              </label>
              <input
                type="text"
                value={receivingClinicianName}
                onChange={(e) => setReceivingClinicianName(e.target.value)}
                placeholder="e.g. Dr. Sarah Mitchell, Orthodontist"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Receiving Facility */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Receiving Facility / Hospital Department
              </label>
              <input
                type="text"
                value={receivingFacility}
                onChange={(e) => setReceivingFacility(e.target.value)}
                placeholder="e.g. Apex Maxillofacial Surgery Unit"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Urgency Level */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Handover Priority / Urgency
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Routine', 'Priority', 'Urgent'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setUrgencyLevel(lvl)}
                    className={`py-1.5 text-center rounded-lg font-bold text-[11px] border transition-all cursor-pointer ${
                      urgencyLevel === lvl
                        ? lvl === 'Urgent'
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : lvl === 'Priority'
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason for Handover */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Clinical Objective / Handover Indication
              </label>
              <textarea
                rows={2}
                value={handoverReason}
                onChange={(e) => setHandoverReason(e.target.value)}
                placeholder="State clinical transfer goals, required investigations, or pending surgical phases..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
              />
            </div>

            {/* Clinical Precautions */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Clinical Precautions / Handover Instructions
              </label>
              <textarea
                rows={2}
                value={clinicalPrecautions}
                onChange={(e) => setClinicalPrecautions(e.target.value)}
                placeholder="e.g. Prophylactic amoxicillin 2g prior to surgical intervention. Allergy to latex."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
              />
            </div>

            {/* Financial Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeFinancials}
                  onChange={(e) => setIncludeFinancials(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Include Treatment Plan Estimated Cost</span>
              </label>
              <p className="text-[10px] text-slate-400 ml-5 mt-0.5">
                Disable if generating a purely clinical referral without billing items.
              </p>
            </div>

            {/* Data summary pills */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <div className="text-[10px] font-bold uppercase text-slate-400">Attached Patient Records</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px] font-semibold">
                  {upcomingPlans.length} Upcoming Plan(s)
                </span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px] font-semibold">
                  {sortedNotes.length} Clinical Encounter(s)
                </span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px] font-semibold">
                  {completedPlans.length} Past Completed
                </span>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px] font-semibold">
                  {prescriptions.length} Prescription(s)
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Print-Optimized Document Preview */}
          <div className="lg:col-span-8 bg-slate-100 p-4 sm:p-6 overflow-y-auto flex justify-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-2" />
                <span className="text-xs font-semibold">Compiling patient treatment history & upcoming plan...</span>
              </div>
            ) : (
              <div className="bg-white shadow-md border border-slate-300 rounded-sm w-full max-w-[760px] p-8 text-slate-900 space-y-4 font-sans text-xs min-h-[900px]">
                {/* Simulated Document Header */}
                <div className="flex items-start justify-between border-b-2 border-teal-600 pb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                      {clinic?.name || 'Apex Dental Care & Implant Center'}
                    </h2>
                    <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">
                      {clinic?.brandName || 'Specialized Dental Practice & Implant Center'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {clinic?.address || 'House 42, Road 11, Banani, Dhaka'} &bull; Tel: {clinic?.phone || '+880 1711-234567'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black uppercase text-teal-700 tracking-wider">
                      Clinical Handover
                    </div>
                    <div className="font-mono text-[10px] font-bold text-slate-700">
                      Ref: TX-HO-{patient.patientIdNumber || patient.id.slice(0, 6).toUpperCase()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Date: {formatClinicDate(new Date().toISOString())}
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        urgencyLevel === 'Urgent'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : urgencyLevel === 'Priority'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {urgencyLevel} Handover
                    </span>
                  </div>
                </div>

                {/* Handover Protocol Context */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="font-bold text-slate-700 block uppercase text-[10px]">Transferring Clinician:</span>
                    <span className="font-semibold text-slate-900">{userProfile?.displayName || 'Dr. Shihab Hossain'}</span>
                    <span className="text-slate-500 block text-[10px]">License: BDS, BMDC Reg #29104</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block uppercase text-[10px]">Receiving Clinician / Unit:</span>
                    <span className="font-semibold text-slate-900">
                      {receivingClinicianName || 'Attending Clinical Specialist'}
                    </span>
                    <span className="text-slate-500 block text-[10px]">
                      {receivingFacility || 'Specialist Care Center'}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-700 block uppercase text-[10px]">Clinical Indication:</span>
                    <span className="text-slate-800">{handoverReason}</span>
                  </div>
                </div>

                {/* Patient Demographics */}
                <div className="border border-slate-200 rounded p-3 grid grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Patient Name</span>
                    <span className="font-bold text-slate-900">{patient.fullName}</span>
                    <span className="font-mono text-[10px] text-teal-700 ml-1 font-bold">[{patient.patientIdNumber}]</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Age / Sex</span>
                    <span className="font-semibold text-slate-800">
                      {calculatePatientAge(patient.dateOfBirth)} &bull; {patient.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Primary Contact</span>
                    <span className="font-semibold text-slate-800">{patient.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Emergency Contact</span>
                    <span className="font-semibold text-slate-800">
                      {patient.emergencyContactName || 'N/A'} ({patient.emergencyContactPhone || 'N/A'})
                    </span>
                  </div>
                </div>

                {/* Medical & Allergy Strip */}
                <div className="bg-amber-50/70 border border-amber-300 rounded p-3 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold text-amber-900">Documented Allergies:</span>
                    <span className={patient.allergies ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                      {patient.allergies || 'No known drug allergies (NKDA)'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-amber-900">Current Medications:</span>{' '}
                    <span className="text-slate-700">{patient.currentMedications || 'None'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-amber-900">Systemic Medical History:</span>{' '}
                    <span className="text-slate-700">{patient.medicalHistory || 'Unremarkable'}</span>
                  </div>
                  {clinicalPrecautions && (
                    <div className="pt-1 border-t border-amber-200 text-amber-950 font-medium">
                      <strong>Special Precaution:</strong> {clinicalPrecautions}
                    </div>
                  )}
                </div>

                {/* 1. UPCOMING TREATMENT PLAN & PHASES */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      1. Upcoming Treatment Plan & Phase Schedule ({upcomingPlans.length})
                    </h4>
                  </div>

                  {upcomingPlans.length === 0 ? (
                    <p className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-500 text-[11px]">
                      No active or pending treatment phases scheduled.
                    </p>
                  ) : (
                    upcomingPlans.map((plan, idx) => (
                      <div key={plan.id} className="p-2.5 bg-slate-50 border-l-4 border-teal-600 border border-slate-200 rounded space-y-1 text-[11px]">
                        <div className="flex justify-between items-start font-semibold">
                          <span className="font-bold text-slate-900">
                            {idx + 1}. {plan.title}
                            {plan.affectedTeeth && (
                              <span className="ml-1.5 text-teal-700 font-bold font-mono">
                                [Tooth #{plan.affectedTeeth}]
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Priority: <strong className="text-teal-800">{plan.priority}</strong> &bull; Status: {plan.status}
                            {includeFinancials && ` &bull; Est: ${clinic?.currencySymbol || '৳'}${plan.estimatedCost?.toLocaleString() || 0}`}
                          </span>
                        </div>
                        <div className="text-slate-700">
                          <strong>Procedures:</strong> {plan.procedures}
                        </div>
                        {plan.phases && (
                          <div className="bg-white p-2 rounded border border-slate-200 text-slate-600 font-mono text-[10px] whitespace-pre-line">
                            {plan.phases}
                          </div>
                        )}
                        {plan.notes && (
                          <div className="text-[10px] text-slate-500 italic">
                            Notes: {plan.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* 2. RECENT CLINICAL HISTORY */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      2. Treatment History & Recent Clinical Encounters ({sortedNotes.length})
                    </h4>
                  </div>

                  {sortedNotes.length === 0 ? (
                    <p className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-500 text-[11px]">
                      No previous clinical encounter notes documented for this patient.
                    </p>
                  ) : (
                    sortedNotes.slice(0, 3).map((note) => (
                      <div key={note.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1.5 text-[11px]">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 border-b border-slate-200 pb-1">
                          <span>
                            Date: {formatClinicDate(note.date || note.createdAt)}
                          </span>
                          <span>Clinician: {note.dentistName || 'Attending Staff'}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                          <div className="bg-white p-1.5 rounded border border-slate-100">
                            <strong className="text-teal-700 block">Complaint</strong>
                            <span className="text-slate-600">{note.presentingComplaint || '-'}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-slate-100">
                            <strong className="text-teal-700 block">Findings</strong>
                            <span className="text-slate-600">{note.examinationFindings || '-'}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-slate-100">
                            <strong className="text-teal-700 block">Diagnosis</strong>
                            <span className="text-slate-600">{note.diagnosis || '-'}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded border border-slate-100">
                            <strong className="text-teal-700 block">Treatment Done</strong>
                            <span className="text-slate-600">{note.treatmentPerformed || note.clinicalRecommendations || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* SIGN-OFF SECTION */}
                <div className="pt-4 border-t-2 border-slate-300 grid grid-cols-2 gap-8 text-[11px]">
                  <div>
                    <div className="border-b border-slate-400 h-8 mb-1"></div>
                    <div className="font-bold text-slate-900">{userProfile?.displayName || 'Dr. Shihab Hossain'}</div>
                    <div className="text-[10px] text-slate-500">Transferring Clinician Signature & Date</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 h-8 mb-1"></div>
                    <div className="font-bold text-slate-900">{receivingClinicianName || 'Receiving Practitioner'}</div>
                    <div className="text-[10px] text-slate-500">Receiving Clinician Acknowledgment & Date</div>
                  </div>
                </div>

                {/* Legal disclaimer */}
                <div className="text-[9px] text-center text-slate-400 pt-2 border-t border-slate-100">
                  CONFIDENTIAL PATIENT RECORD &bull; Generated for professional clinical handover & transfer of care.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
