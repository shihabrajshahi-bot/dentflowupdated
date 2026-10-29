import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { Patient } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import { formatClinicDate } from '../../utils/dateFormatter';
import { Odontogram } from '../DentalOdontogram/Odontogram';
import { ClinicalNotesManager } from '../ClinicalNotes/ClinicalNotesManager';
import { PrescriptionManager } from '../Prescriptions/PrescriptionManager';
import { LabOrdersManager } from '../LabOrders/LabOrdersManager';
import { BillingManager } from '../Billing/BillingManager';
import { AppointmentManager } from '../Appointments/AppointmentManager';
import {
  X,
  User,
  HeartPulse,
  Grid,
  FileText,
  Layers,
  Calendar,
  Pill,
  FlaskConical,
  CreditCard,
  FileCheck,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Edit3,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { ClinicalHandoverModal } from './ClinicalHandoverModal';

interface PatientDetailModalProps {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  patient,
  isOpen,
  onClose,
  defaultTab = 'overview',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { clinic, activeRole, hasPermission } = useAuth();
  const canEditPatient = hasPermission(['Owner', 'Dentist', 'Receptionist']);

  // Edit patient modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(patient.fullName);
  const [phone, setPhone] = useState(patient.phone);
  const [email, setEmail] = useState(patient.email || '');
  const [address, setAddress] = useState(patient.address || '');
  const [emergencyContactName, setEmergencyContactName] = useState(patient.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(patient.emergencyContactPhone || '');
  const [medicalAlerts, setMedicalAlerts] = useState(patient.medicalAlerts || '');
  const [allergies, setAllergies] = useState(patient.allergies || '');
  const [currentMedications, setCurrentMedications] = useState(patient.currentMedications || '');
  const [medicalHistory, setMedicalHistory] = useState(patient.medicalHistory || '');
  const [dentalHistory, setDentalHistory] = useState(patient.dentalHistory || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  useEffect(() => {
    setFullName(patient.fullName);
    setPhone(patient.phone);
    setEmail(patient.email || '');
    setAddress(patient.address || '');
    setEmergencyContactName(patient.emergencyContactName || '');
    setEmergencyContactPhone(patient.emergencyContactPhone || '');
    setMedicalAlerts(patient.medicalAlerts || '');
    setAllergies(patient.allergies || '');
    setCurrentMedications(patient.currentMedications || '');
    setMedicalHistory(patient.medicalHistory || '');
    setDentalHistory(patient.dentalHistory || '');
  }, [patient]);

  if (!isOpen) return null;

  const handleSavePatientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPatient) return;
    setIsSavingProfile(true);
    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const path = `clinics/${clinicId}/patients/${patient.id}`;
    try {
      await updateDoc(doc(db, 'clinics', clinicId, 'patients', patient.id), {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        medicalAlerts: medicalAlerts.trim(),
        allergies: allergies.trim(),
        currentMedications: currentMedications.trim(),
        medicalHistory: medicalHistory.trim(),
        dentalHistory: dentalHistory.trim(),
        updatedAt: new Date().toISOString(),
      });
      setIsEditingProfile(false);
      setSaveFeedback('Patient profile and medical alerts updated.');
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const allTabs = [
    { id: 'overview', label: 'Overview', icon: User, roles: ['Owner', 'Dentist', 'Receptionist', 'Cashier'] },
    { id: 'medical', label: 'Medical History', icon: HeartPulse, roles: ['Owner', 'Dentist', 'Receptionist'] },
    { id: 'chart', label: 'Dental Chart (Odontogram)', icon: Grid, roles: ['Owner', 'Dentist'] },
    { id: 'notes', label: 'Clinical Notes', icon: FileText, roles: ['Owner', 'Dentist'] },
    { id: 'prescriptions', label: 'Prescriptions (Rx)', icon: Pill, roles: ['Owner', 'Dentist'] },
    { id: 'lab_orders', label: 'Lab Orders', icon: FlaskConical, roles: ['Owner', 'Dentist', 'Receptionist'] },
    { id: 'appointments', label: 'Appointments', icon: Calendar, roles: ['Owner', 'Dentist', 'Receptionist', 'Cashier'] },
    { id: 'billing', label: 'Invoices & Billing', icon: CreditCard, roles: ['Owner', 'Dentist', 'Receptionist', 'Cashier'] },
    { id: 'consent', label: 'Consent & Legal', icon: FileCheck, roles: ['Owner', 'Dentist', 'Receptionist'] },
  ];

  const tabs = allTabs.filter((t) => t.roles.includes(activeRole));

  const calculateAge = (dob: string) => {
    if (!dob) return '';
    const diffMs = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Patient Profile Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#FAFBFB] gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
              {patient.fullName.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-800">{patient.fullName}</h2>
                <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                  {patient.patientIdNumber}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {patient.gender} • {calculateAge(patient.dateOfBirth)} Yrs
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {patient.phone}
                </span>
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {patient.email}
                  </span>
                )}
                {patient.address && (
                  <span className="flex items-center gap-1 truncate max-w-xs">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {patient.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center">
            {patient.medicalAlerts && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Alert: {patient.medicalAlerts}</span>
              </div>
            )}
            {/* Clinical Handover & Treatment Summary print button */}
            <button
              type="button"
              onClick={() => setIsHandoverModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors cursor-pointer"
              title="Generate print-optimized clinical handover and treatment plan summary"
            >
              <Printer className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Clinical Handover Summary</span>
              <span className="sm:hidden">Handover</span>
            </button>

            {canEditPatient && (
              <button
                type="button"
                onClick={() => setIsEditingProfile((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-slate-700 hover:text-teal-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                {isEditingProfile ? 'Cancel Edit' : 'Edit Profile & Alerts'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-white overflow-x-auto gap-1 text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsEditingProfile(false);
                }}
                className={`flex items-center gap-1.5 py-3 px-3.5 font-semibold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-teal-600 text-teal-800 bg-teal-50/40'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAFBFB]">
          {saveFeedback && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveFeedback}</span>
            </div>
          )}

          {/* INLINE EDIT PATIENT PROFILE & MEDICAL ALERTS */}
          {isEditingProfile && (
            <form
              onSubmit={handleSavePatientProfile}
              className="mb-6 bg-white p-6 rounded-xl border border-teal-200 shadow-sm space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-teal-600" />
                  Edit Patient Demographics & Medical Alerts
                </h4>
                <span className="text-[11px] font-mono text-slate-500">{patient.patientIdNumber}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-amber-800 mb-1">
                    Critical Medical Alerts / Flags (Displayed on Dashboard & Chart)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Diabetic; Cardiac Stent; Bleeding Disorder"
                    value={medicalAlerts}
                    onChange={(e) => setMedicalAlerts(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-rose-800 mb-1">
                    Documented Drug / Material Allergies
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Sulfa drugs, Latex"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="w-full rounded-lg border border-rose-300 bg-rose-50/40 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Medications</label>
                  <textarea
                    rows={2}
                    value={currentMedications}
                    onChange={(e) => setCurrentMedications(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Systemic Medical History</label>
                  <textarea
                    rows={2}
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Past Dental History</label>
                  <textarea
                    rows={2}
                    value={dentalHistory}
                    onChange={(e) => setDentalHistory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingProfile ? 'Saving Changes...' : 'Save Patient Profile'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {patient.medicalAlerts && (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Critical Clinical Contraindications</h4>
                    <p className="mt-0.5 leading-relaxed">{patient.medicalAlerts}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Demographics Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">
                    Patient Demographics
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date of Birth:</span>
                      <span className="font-semibold text-slate-800">{formatClinicDate(patient.dateOfBirth)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Biological Sex:</span>
                      <span className="font-semibold text-slate-800">{patient.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Primary Phone:</span>
                      <span className="font-semibold text-slate-800">{patient.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="font-semibold text-slate-800">{patient.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Address:</span>
                      <span className="font-semibold text-slate-800 text-right">{patient.address || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Registration Date:</span>
                      <span className="font-medium text-xs text-slate-700">
                        {patient.createdAt ? formatClinicDate(patient.createdAt) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">
                    Emergency Contact
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact Name:</span>
                      <span className="font-semibold text-slate-800">
                        {patient.emergencyContactName || 'None listed'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Emergency Phone:</span>
                      <span className="font-semibold text-slate-800">
                        {patient.emergencyContactPhone || 'None listed'}
                      </span>
                    </div>
                    <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-100 text-[11px] text-teal-800">
                      In the event of medical emergencies, the clinic protocol mandates notifying the emergency contact immediately.
                    </div>
                  </div>
                </div>

                {/* Health & Allergies Quick Summary */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">
                    Health Status & Alerts
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Documented Allergies:</span>
                      <span className={`font-semibold ${patient.allergies ? 'text-rose-700' : 'text-slate-700'}`}>
                        {patient.allergies || 'No known drug allergies (NKDA)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Current Medications:</span>
                      <span className="font-semibold text-slate-800">
                        {patient.currentMedications || 'None reported'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Consent Status:</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <FileCheck className="w-3.5 h-3.5" />
                        Signed & Acknowledged
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick links to tabs */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wider">
                  Quick Access Modules
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('chart')}
                    className="p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer"
                  >
                    <Grid className="w-4 h-4 text-teal-600 mb-1" />
                    <div className="font-bold text-slate-800 text-xs">Dental Odontogram</div>
                    <div className="text-[10px] text-slate-500">Tooth-by-tooth FDI chart</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className="p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-teal-600 mb-1" />
                    <div className="font-bold text-slate-800 text-xs">Clinical Notes</div>
                    <div className="text-[10px] text-slate-500">SOAP encounter logs</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('prescriptions')}
                    className="p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer"
                  >
                    <Pill className="w-4 h-4 text-teal-600 mb-1" />
                    <div className="font-bold text-slate-800 text-xs">Prescriptions</div>
                    <div className="text-[10px] text-slate-500">Issue printable Rx</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('lab_orders')}
                    className="p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer"
                  >
                    <FlaskConical className="w-4 h-4 text-teal-600 mb-1" />
                    <div className="font-bold text-slate-800 text-xs">Dental Lab Orders</div>
                    <div className="text-[10px] text-slate-500">Crowns, bridges & shades</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('billing')}
                    className="p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 text-left transition-all cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-teal-600 mb-1" />
                    <div className="font-bold text-slate-800 text-xs">Invoices & Billing</div>
                    <div className="text-[10px] text-slate-500">Itemized statements</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsHandoverModalOpen(true)}
                    className="p-3 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100 hover:border-teal-400 text-left transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-teal-700 mb-1" />
                    <div className="font-bold text-teal-900 text-xs">Clinical Handover</div>
                    <div className="text-[10px] text-teal-700">Print treatment plan summary</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEDICAL HISTORY */}
          {activeTab === 'medical' && (
            <div className="space-y-4 max-w-4xl">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 text-sm">
                    Comprehensive Medical & Dental History
                  </h4>
                  {canEditPatient && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Update Medical History
                    </button>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Systemic Medical History
                  </label>
                  <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                    {patient.medicalHistory || 'No systemic illnesses or prior major surgeries reported.'}
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Documented Allergies
                  </label>
                  <p className="p-3 bg-rose-50/50 rounded-lg border border-rose-200 text-slate-700 leading-relaxed">
                    {patient.allergies || 'No known drug or material allergies.'}
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Current Medications
                  </label>
                  <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                    {patient.currentMedications || 'Patient is not taking any regular prescription medications.'}
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Dental History & Previous Treatments
                  </label>
                  <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                    {patient.dentalHistory || 'Routine hygiene visits; no traumatic injuries.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DENTAL ODONTOGRAM */}
          {activeTab === 'chart' && <Odontogram patient={patient} />}

          {/* TAB 4: CLINICAL NOTES */}
          {activeTab === 'notes' && <ClinicalNotesManager patient={patient} />}

          {/* TAB 5: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <AppointmentManager patientIdFilter={patient.id} />
          )}

          {/* TAB 7: PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && <PrescriptionManager patient={patient} />}

          {/* TAB 8: LAB ORDERS */}
          {activeTab === 'lab_orders' && <LabOrdersManager patient={patient} />}

          {/* TAB 9: BILLING */}
          {activeTab === 'billing' && <BillingManager patientIdFilter={patient.id} />}

          {/* TAB 10: CONSENT & LEGAL */}
          {activeTab === 'consent' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs max-w-3xl text-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                Informed Consent & Treatment Agreement
              </h4>

              <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 text-slate-700 leading-relaxed space-y-2">
                <p>
                  <strong>Patient Name:</strong> {patient.fullName} ({patient.patientIdNumber})
                </p>
                <p>
                  <strong>Consent Status:</strong> {patient.consentGiven ? 'Granted on registration' : 'Pending'}
                </p>
                <p className="text-slate-600">
                  The patient has been briefed on diagnostic investigations (periapical / panoramic radiographs, vitality testing, intraoral photography) and restorative procedures. Potential risks, alternatives, and anticipated outcomes have been discussed.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-slate-500">
                <span>Verified by DentFlow Compliance Architecture</span>
                <span className="font-mono text-[11px] text-teal-800 bg-teal-50 px-2.5 py-1 rounded">
                  E-Consent Ref: {patient.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print-Optimized Clinical Handover & Treatment Plan Summary Modal */}
      {isHandoverModalOpen && (
        <ClinicalHandoverModal
          patient={patient}
          isOpen={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
        />
      )}
    </div>
  );
};
