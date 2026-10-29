import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { Prescription, MedicationItem, Patient } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import { formatClinicDate } from '../../utils/dateFormatter';
import {
  Pill,
  Plus,
  Trash2,
  Printer,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PrescriptionPadModal } from './PrescriptionPadModal';

interface PrescriptionManagerProps {
  patient: Patient;
}

export const PrescriptionManager: React.FC<PrescriptionManagerProps> = ({ patient }) => {
  const { clinic, userProfile, hasPermission } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForPrint, setSelectedForPrint] = useState<Prescription | null>(null);
  const [selectedForPadModal, setSelectedForPadModal] = useState<Prescription | null>(null);
  const [isPadModalOpen, setIsPadModalOpen] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Take with full glass of water. Complete full course of antibiotics.');
  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      id: 'med-1',
      name: 'Amoxicillin + Clavulanic Acid (Augmentin)',
      dosage: '625mg',
      route: 'Oral',
      frequency: '1 tablet twice daily (1-0-1)',
      duration: '5 days',
      instructions: 'After meals',
    },
    {
      id: 'med-2',
      name: 'Ketorolac Tromethamine',
      dosage: '10mg',
      route: 'Oral',
      frequency: '1 tablet when in pain (max 3/day)',
      duration: '3 days',
      instructions: 'After meals with antacid',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canPrescribe = hasPermission(['Owner', 'Dentist']);

  // Automatic allergy check against patient record!
  const hasPenicillinAllergy =
    patient?.allergies?.toLowerCase().includes('penicillin') ||
    patient?.medicalAlerts?.toLowerCase().includes('penicillin');

  useEffect(() => {
    if (!patient?.id || !clinic?.id) return;
    setLoading(true);
    const path = `clinics/${clinic.id}/prescriptions`;

    const q = query(
      collection(db, 'clinics', clinic.id, 'prescriptions'),
      where('patientId', '==', patient.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Prescription[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Prescription);
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setPrescriptions(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [patient?.id, clinic?.id]);

  const handleAddMedicationRow = () => {
    setMedications([
      ...medications,
      {
        id: `med-${Date.now()}`,
        name: '',
        dosage: '',
        route: 'Oral',
        frequency: '1-0-1',
        duration: '5 days',
        instructions: 'After meals',
      },
    ]);
  };

  const handleRemoveMedicationRow = (id: string) => {
    setMedications(medications.filter((m) => m.id !== id));
  };

  const handleMedChange = (id: string, field: keyof MedicationItem, val: string) => {
    setMedications(
      medications.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPrescribe || !clinic) return;

    // Filter empty rows
    const validMeds = medications.filter((m) => m.name.trim() !== '');
    if (validMeds.length === 0) {
      alert('Please add at least one medication.');
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const path = `clinics/${clinic.id}/prescriptions`;
    try {
      const newRx: Omit<Prescription, 'id'> = {
        clinicId: clinic.id,
        patientId: patient.id,
        patientName: patient.fullName,
        patientAge: patient.dateOfBirth
          ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Yrs`
          : undefined,
        date,
        medications: validMeds,
        allergyWarnings: patient.allergies || undefined,
        notes: notes.trim(),
        dentistId: userProfile?.uid || 'dentist-uid',
        dentistName: userProfile?.displayName || 'Dr. Shihab (BDS, PGT Dental Surgery)',
        licenseNumber: userProfile?.licenseNumber || 'BMDC Reg: DC-7841',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'clinics', clinic.id, 'prescriptions'), {
        ...newRx,
        _serverTimestamp: serverTimestamp(),
      });

      setIsModalOpen(false);
      setFeedback('Prescription generated and verified.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canPrescribe || !clinic) return;
    if (!window.confirm('Delete this prescription record?')) return;
    const path = `clinics/${clinic.id}/prescriptions/${id}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinic.id, 'prescriptions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const printPrescription = (rx: Prescription) => {
    setSelectedForPadModal(rx);
    setIsPadModalOpen(true);
    setSelectedForPrint(rx);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Pill className="w-5 h-5 text-teal-600" />
            Prescriptions & Pharmacotherapy
          </h3>
          <p className="text-xs text-slate-500">
            Dentist-issued electronic prescriptions with contraindication and allergy alerts.
          </p>
        </div>

        {canPrescribe && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Issue New Prescription (Rx)
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Allergy warning banner if any */}
      {patient?.allergies && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Patient Allergy Alert:</span>
            <span>Documented allergies: <strong>{patient.allergies}</strong>. Verify all drug classes before issuing!</span>
          </div>
        </div>
      )}

      {/* Prescription List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading prescriptions...</div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <Pill className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No prescriptions recorded for this patient.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click 'Issue New Prescription' to prepare a printable Rx with dosage and schedules.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-teal-800 flex items-center gap-1.5 font-mono">
                    <span className="text-base text-teal-600 font-serif">℞</span>
                    Date: {formatClinicDate(rx.date)}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-medium">
                    Prescribed by {rx.dentistName} ({rx.licenseNumber || 'Dental Surgeon'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printPrescription(rx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 hover:border-teal-300 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-98"
                    title="Open interactive prescription pad to print or download PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-teal-600" />
                    <span>Print Pad</span>
                  </button>
                  {canPrescribe && (
                    <button
                      type="button"
                      onClick={() => handleDelete(rx.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                      title="Delete prescription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Medications Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Medication Name & Strength</th>
                      <th className="py-2 px-3">Route</th>
                      <th className="py-2 px-3">Frequency & Timing</th>
                      <th className="py-2 px-3">Duration</th>
                      <th className="py-2 px-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rx.medications.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {m.name} <span className="text-slate-500 font-normal">({m.dosage})</span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{m.route}</td>
                        <td className="py-2 px-3 text-teal-700 font-medium">{m.frequency}</td>
                        <td className="py-2 px-3 text-slate-700">{m.duration}</td>
                        <td className="py-2 px-3 text-slate-500">{m.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rx.notes && (
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Directions: </span>
                  {rx.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal to Issue Prescription */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="text-teal-600 font-serif text-lg">℞</span>
                Create Electronic Prescription
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="p-6 space-y-4 overflow-y-auto text-xs">
              {hasPenicillinAllergy && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>
                    <strong>Caution:</strong> Patient has recorded penicillin allergy! Avoid Amoxicillin, Augmentin, Penicillin V. Consider Clindamycin, Azithromycin, or Ciprofloxacin.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prescription Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Patient</label>
                  <input
                    type="text"
                    disabled
                    value={`${patient.fullName} (${patient.patientIdNumber})`}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 font-semibold"
                  />
                </div>
              </div>

              {/* Medication item rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-semibold text-slate-700">
                    Prescribed Medications & Posology
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicationRow}
                    className="text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Drug
                  </button>
                </div>

                <div className="space-y-3">
                  {medications.map((m, index) => (
                    <div
                      key={m.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2 items-center"
                    >
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Drug name (e.g. Metronidazole)"
                          value={m.name}
                          onChange={(e) => handleMedChange(m.id, 'name', e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Dose (e.g. 400mg)"
                          value={m.dosage}
                          onChange={(e) => handleMedChange(m.id, 'dosage', e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Freq (e.g. 1-0-1 or TDS)"
                          value={m.frequency}
                          onChange={(e) => handleMedChange(m.id, 'frequency', e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Duration (5 days)"
                          value={m.duration}
                          onChange={(e) => handleMedChange(m.id, 'duration', e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Timing (After food)"
                          value={m.instructions}
                          onChange={(e) => handleMedChange(m.id, 'instructions', e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs bg-white text-slate-800 focus:outline-none"
                        />
                        {medications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationRow(m.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  General Dietary & Usage Directions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Generating...' : 'Sign & Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Prescription Template (Shows during window.print) */}
      {selectedForPrint && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black">
          {/* Clinic Header */}
          <div className="border-b-2 border-teal-800 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-teal-900">{clinic?.name || 'Apex Dental Care'}</h1>
              <p className="text-xs text-slate-600">{clinic?.address}</p>
              <p className="text-xs text-slate-600">Phone: {clinic?.phone} • Email: {clinic?.email}</p>
            </div>
            <div className="text-right">
              <h2 className="text-base font-bold text-slate-800">{selectedForPrint.dentistName}</h2>
              <p className="text-xs text-slate-600">{selectedForPrint.licenseNumber}</p>
              <p className="text-xs text-slate-600">Dental Surgeon & Implant Specialist</p>
            </div>
          </div>

          {/* Patient Details Strip */}
          <div className="bg-slate-100 p-3 rounded-lg mb-6 flex justify-between text-xs">
            <div>
              <span className="font-bold">Patient Name: </span>{patient.fullName}
            </div>
            <div>
              <span className="font-bold">ID: </span>{patient.patientIdNumber}
            </div>
            <div>
              <span className="font-bold">Date: </span>{formatClinicDate(selectedForPrint.date)}
            </div>
            <div>
              <span className="font-bold">Age/Sex: </span>
              {selectedForPrint.patientAge || 'Adult'} / {patient.gender}
            </div>
          </div>

          {/* Rx Symbol */}
          <div className="text-3xl font-serif font-bold text-teal-800 mb-4">℞</div>

          {/* Drugs List */}
          <div className="space-y-4 mb-8">
            {selectedForPrint.medications.map((m, idx) => (
              <div key={idx} className="border-b border-slate-200 pb-2 text-xs">
                <div className="flex justify-between font-bold text-sm">
                  <span>{idx + 1}. {m.name} — {m.dosage}</span>
                  <span className="text-teal-800">{m.frequency}</span>
                </div>
                <div className="text-slate-600 text-xs mt-1">
                  Route: {m.route} | Duration: {m.duration} | Instructions: {m.instructions}
                </div>
              </div>
            ))}
          </div>

          {selectedForPrint.notes && (
            <div className="mb-12 p-3 bg-slate-50 border border-slate-200 rounded text-xs">
              <span className="font-bold">Special Advice: </span>
              {selectedForPrint.notes}
            </div>
          )}

          {/* Signature Line */}
          <div className="mt-20 flex justify-between text-xs pt-8 border-t border-slate-300">
            <div>
              <p className="text-[10px] text-slate-400">DentFlow Clinical System • Electronically Signed & Verified</p>
            </div>
            <div className="text-center w-48">
              <div className="border-t border-slate-800 pt-1 font-bold">
                {selectedForPrint.dentistName}
              </div>
              <div className="text-[10px] text-slate-500">Registered Dental Practitioner</div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Printable Prescription Pad Modal */}
      {isPadModalOpen && selectedForPadModal && (
        <PrescriptionPadModal
          isOpen={isPadModalOpen}
          onClose={() => {
            setIsPadModalOpen(false);
            setSelectedForPadModal(null);
          }}
          prescription={selectedForPadModal}
          clinic={clinic}
          patient={patient}
        />
      )}
    </div>
  );
};
