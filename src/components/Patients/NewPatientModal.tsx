import React, { useState } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { Patient } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import { X, UserPlus, AlertTriangle, ShieldCheck } from 'lucide-react';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (patientId: string) => void;
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, userProfile, clinic } = useAuth();

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1990-01-01');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [allergies, setAllergies] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [medicalAlerts, setMedicalAlerts] = useState('');
  const [dentalHistory, setDentalHistory] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);
  const [notes, setNotes] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhoneBlur = async () => {
    if (!phone.trim()) return;
    try {
      const q = query(
        collection(db, 'clinics', DEFAULT_CLINIC_ID, 'patients'),
        where('phone', '==', phone.trim())
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const existing = snap.docs[0].data() as Patient;
        setDuplicateWarning(`A patient with this phone number already exists: ${existing.fullName} (${existing.patientIdNumber})`);
      } else {
        setDuplicateWarning(null);
      }
    } catch (e) {
      console.warn('Duplicate check error:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg('Full Name and Phone Number are required fields.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const clinicId = clinic?.id || DEFAULT_CLINIC_ID;
    const path = `clinics/${clinicId}/patients`;

    try {
      // Generate clean ID code
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedIdNumber = `DF-${randomSuffix}`;

      const newPatient: Omit<Patient, 'id'> = {
        clinicId,
        patientIdNumber: generatedIdNumber,
        fullName: fullName.trim(),
        dateOfBirth,
        gender,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        medicalHistory: medicalHistory.trim() || undefined,
        allergies: allergies.trim() || undefined,
        currentMedications: currentMedications.trim() || undefined,
        medicalAlerts: medicalAlerts.trim() || undefined,
        dentalHistory: dentalHistory.trim() || undefined,
        consentGiven,
        notes: notes.trim() || undefined,
        createdBy: currentUser?.uid || 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'clinics', clinicId, 'patients'), newPatient);

      onClose();
      if (onSuccess) {
        onSuccess(docRef.id);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Register New Patient</h3>
              <p className="text-xs text-slate-500">Record demographics, medical alerts, and contact info</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* Section 1: Demographics */}
          <div>
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100">
              1. Personal Demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sadia Anjum"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Primary Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="+880 1700-000000"
                  value={phone}
                  onBlur={handlePhoneBlur}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Apartment, Street, Area, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Emergency Contact */}
          <div>
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100">
              2. Emergency Contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  placeholder="e.g. Faruk Ahmed (Spouse)"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Emergency Phone</label>
                <input
                  type="tel"
                  placeholder="+880 1800-000000"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Medical History & Critical Alerts */}
          <div>
            <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100 flex items-center justify-between">
              <span>3. Medical Alerts & Health History</span>
              <span className="text-[10px] text-amber-600 font-normal">Vital for clinical contraindications</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  High Alert Clinical Flags (Allergies, Bleeding, Heart)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Allergic to Penicillin, Diabetic, Takes Aspirin"
                  value={medicalAlerts}
                  onChange={(e) => setMedicalAlerts(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/30 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specific Drug / Material Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Latex, Local Anesthetic, NSAIDs"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Systemic Medications</label>
                <input
                  type="text"
                  placeholder="e.g. Metformin 500mg, Losartan 50mg"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dental History & Anxiety Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Fear of dental needles, frequent cold sensitivity"
                  value={dentalHistory}
                  onChange={(e) => setDentalHistory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Systemic Medical History / Surgeries</label>
                <textarea
                  placeholder="Hypertension, Asthma, Hepatitis, Cardiac history, Bleeding disorders..."
                  rows={2}
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Consent & Authorization */}
          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="consent"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="consent" className="text-slate-700 leading-snug cursor-pointer select-none">
              <span className="font-semibold text-teal-900 block">General Treatment & Diagnostic Consent</span>
              Patient acknowledges and consents to clinical oral examinations, diagnostic radiographs, and treatment records maintenance under clinic privacy policy.
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
