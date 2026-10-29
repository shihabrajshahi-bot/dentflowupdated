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
import { ClinicalNote, Patient } from '../../types/dental';
import { useAuth, DEFAULT_CLINIC_ID } from '../../context/AuthContext';
import { formatClinicDate } from '../../utils/dateFormatter';
import {
  FileText,
  Plus,
  Trash2,
  Calendar,
  UserCheck,
  Stethoscope,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';

interface ClinicalNotesManagerProps {
  patient: Patient;
}

export const ClinicalNotesManager: React.FC<ClinicalNotesManagerProps> = ({ patient }) => {
  const { clinic, userProfile, hasPermission } = useAuth();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [presentingComplaint, setPresentingComplaint] = useState('');
  const [examinationFindings, setExaminationFindings] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPerformed, setTreatmentPerformed] = useState('');
  const [clinicalRecommendations, setClinicalRecommendations] = useState('');
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canWrite = hasPermission(['Owner', 'Dentist']);

  useEffect(() => {
    if (!patient?.id || !clinic?.id) return;
    setLoading(true);
    const path = `clinics/${clinic.id}/clinical_notes`;

    const q = query(
      collection(db, 'clinics', clinic.id, 'clinical_notes'),
      where('patientId', '==', patient.id)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ClinicalNote[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ClinicalNote);
        });
        list.sort((a, b) => b.date.localeCompare(a.date));
        setNotes(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [patient?.id, clinic?.id]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !clinic) return;
    setSubmitting(true);
    setFeedback(null);

    const path = `clinics/${clinic.id}/clinical_notes`;
    try {
      const newNote: Omit<ClinicalNote, 'id'> = {
        clinicId: clinic.id,
        patientId: patient.id,
        date,
        presentingComplaint: presentingComplaint.trim(),
        examinationFindings: examinationFindings.trim(),
        diagnosis: diagnosis.trim(),
        treatmentPerformed: treatmentPerformed.trim(),
        clinicalRecommendations: clinicalRecommendations.trim() || undefined,
        followUpInstructions: followUpInstructions.trim() || undefined,
        dentistId: userProfile?.uid || 'dentist-uid',
        dentistName: userProfile?.displayName || 'Attending Dentist',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'clinics', clinic.id, 'clinical_notes'), {
        ...newNote,
        _serverTimestamp: serverTimestamp(),
      });

      setIsModalOpen(false);
      setPresentingComplaint('');
      setExaminationFindings('');
      setDiagnosis('');
      setTreatmentPerformed('');
      setClinicalRecommendations('');
      setFollowUpInstructions('');
      setFeedback('Encounter note saved.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!canWrite || !clinic) return;
    if (!window.confirm('Delete this clinical encounter note?')) return;
    const path = `clinics/${clinic.id}/clinical_notes/${noteId}`;
    try {
      await deleteDoc(doc(db, 'clinics', clinic.id, 'clinical_notes', noteId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-600" />
            Clinical Encounter Notes (SOAP Format)
          </h3>
          <p className="text-xs text-slate-500">
            Chronological documentation of consultations, diagnoses, and surgical procedures.
          </p>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Consultation Note
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading clinical documentation...</div>
      ) : notes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-medium text-slate-600">No clinical encounter notes recorded yet.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click 'Add Consultation Note' to document presenting symptoms and treatment rendered.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    Encounter Date: {formatClinicDate(note.date)}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 font-medium flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    {note.dentistName}
                  </span>
                </div>

                {canWrite && (
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Subjective & Objective */}
                <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-wide text-teal-800 block mb-1">
                      1. Presenting Complaint (Subjective)
                    </span>
                    <p className="text-slate-700 leading-relaxed">{note.presentingComplaint}</p>
                  </div>

                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-wide text-teal-800 block mb-1">
                      2. Examination Findings (Objective)
                    </span>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {note.examinationFindings}
                    </p>
                  </div>
                </div>

                {/* Assessment & Treatment */}
                <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-wide text-teal-800 block mb-1">
                      3. Diagnosis (Assessment)
                    </span>
                    <p className="font-semibold text-slate-900 bg-white p-2 rounded border border-slate-200">
                      {note.diagnosis}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-wide text-teal-800 block mb-1">
                      4. Treatment Performed (Procedure Log)
                    </span>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line bg-white p-2 rounded border border-slate-200">
                      {note.treatmentPerformed}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendations & Follow up */}
              {(note.clinicalRecommendations || note.followUpInstructions) && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-4 text-slate-600 text-[11px]">
                  {note.clinicalRecommendations && (
                    <div>
                      <span className="font-semibold text-slate-700">Recommendations: </span>
                      {note.clinicalRecommendations}
                    </div>
                  )}
                  {note.followUpInstructions && (
                    <div>
                      <span className="font-semibold text-slate-700">Follow-up: </span>
                      {note.followUpInstructions}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                Add Clinical Examination & Treatment Note
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="p-6 space-y-4 overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Encounter Date *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full sm:w-48 rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Presenting Complaint / Chief Symptoms *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Throbbing pain in tooth #46 for 3 days, worsens with hot foods..."
                  value={presentingComplaint}
                  onChange={(e) => setPresentingComplaint(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Intraoral Examination Findings *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Tenderness on vertical percussion, deep disto-occlusal cavitation with pulp exposure..."
                  value={examinationFindings}
                  onChange={(e) => setExaminationFindings(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Definitive Diagnosis *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Symptomatic Irreversible Pulpitis #46"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Follow-up Timeline</label>
                  <input
                    type="text"
                    placeholder="e.g. Recall in 7 days for canal obturation"
                    value={followUpInstructions}
                    onChange={(e) => setFollowUpInstructions(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Treatment Rendered Today *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Administered 1 cartridge 2% Lidocaine with 1:100,000 adrenaline via IANB. Rubber dam isolation achieved. Caries excavated. Access cavity prepared. Working lengths established. Canals irrigated with 2.5% NaOCl and dressed with calcium hydroxide. Cavit temporary seal placed."
                  value={treatmentPerformed}
                  onChange={(e) => setTreatmentPerformed(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Home Care / Post-Operative Recommendations
                </label>
                <input
                  type="text"
                  placeholder="e.g. Avoid chewing hard foods on right side until definitive crown. Soft diet for 24h."
                  value={clinicalRecommendations}
                  onChange={(e) => setClinicalRecommendations(e.target.value)}
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
                  {submitting ? 'Saving Note...' : 'Save Encounter Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
