import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileDown,
  X,
  CheckCircle2,
  AlertTriangle,
  Phone,
  MapPin,
  Mail,
  Globe,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Prescription, ClinicSettings, Patient } from '../../types/dental';
import { formatClinicDate } from '../../utils/dateFormatter';
import {
  exportPrescriptionPDF,
  printPrescriptionDocument,
} from '../../utils/prescriptionPdfGenerator';
import { DentalInvoiceLogo } from '../Billing/InvoicePreviewModal';

export interface PrescriptionPadModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  clinic: ClinicSettings | null;
  patient?: Patient | null;
}

export const PrescriptionPadModal: React.FC<PrescriptionPadModalProps> = ({
  prescription,
  isOpen,
  onClose,
  clinic,
  patient,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !prescription) return null;

  // Clinic dynamic branding
  const clinicName = clinic?.name || clinic?.brandName || 'Bright Smiles Dental Clinic';
  const clinicSubtitle = clinic?.badgeText || 'CLINICAL SUITE';
  const clinicSlogan = clinic?.slogan || 'Healthy Teeth • Brighter Smiles • Better Lives';
  const clinicAddress = clinic?.address || '123 Wellness Drive, Dhaka 1205, Bangladesh';
  const clinicPhone = clinic?.phone || '+880 1711 223344';
  const clinicEmail = clinic?.email || 'info@brightsmiles.com';
  const clinicWebsite = clinic?.website || 'www.brightsmiles.com';
  const clinicLogoUrl = clinic?.logoUrl;

  const patientName = patient?.fullName || prescription.patientName;
  const patientId = patient?.patientIdNumber || prescription.patientId;
  const patientAge =
    prescription.patientAge ||
    (patient?.dateOfBirth
      ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Yrs`
      : 'Adult');
  const patientGender = patient?.gender || 'N/A';
  const allergy = prescription.allergyWarnings || patient?.allergies;

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      printPrescriptionDocument(prescription, clinic, patient);
      setFeedback('Opening print dialog...');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Print trigger error:', err);
      window.print();
    } finally {
      setTimeout(() => setIsPrinting(false), 500);
    }
  };

  const handleDownload = () => {
    try {
      exportPrescriptionPDF(prescription, clinic, patient);
      setFeedback('Prescription PDF downloaded successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Download PDF error:', err);
      setFeedback('Failed to download PDF. Please try again.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800 font-serif font-bold text-lg">
              ℞
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Prescription Pad • {patientName}
              </h3>
              <p className="text-[11px] text-slate-500">
                Date: {formatClinicDate(prescription.date)} • Dr. {prescription.dentistName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Print Prescription Pad"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Preparing Print...' : 'Print Pad'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Download Prescription as PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-teal-600" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Bar */}
        {feedback && (
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Prescription Pad Scrollable Canvas */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100/60 flex-1 flex justify-center">
          <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 text-slate-800">
            {/* Header (Branding & Clinic Info) */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-teal-600">
              <div className="flex items-start gap-3">
                <DentalInvoiceLogo
                  logoUrl={clinicLogoUrl}
                  clinicName={clinicName}
                  className="w-14 h-14 sm:w-16 sm:h-16 shrink-0"
                />
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-[#008f8a] tracking-tight leading-tight">
                    {clinicName}
                  </h1>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00a896] mt-0.5">
                    {clinicSubtitle}
                  </div>
                  <p className="text-[11px] text-[#0f766e] font-medium mt-1">
                    {clinicSlogan}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-right text-[11px] text-slate-600 w-full sm:w-auto shrink-0">
                <div className="flex items-center sm:justify-end gap-1.5">
                  <span className="text-slate-700">{clinicAddress}</span>
                  <MapPin className="w-3.5 h-3.5 text-[#00a896] shrink-0" />
                </div>
                <div className="flex items-center sm:justify-end gap-1.5">
                  <span className="font-semibold text-slate-800">{clinicPhone}</span>
                  <Phone className="w-3.5 h-3.5 text-[#00a896] shrink-0" />
                </div>
                <div className="flex items-center sm:justify-end gap-1.5">
                  <span className="text-slate-700">{clinicEmail}</span>
                  <Mail className="w-3.5 h-3.5 text-[#00a896] shrink-0" />
                </div>
                <div className="flex items-center sm:justify-end gap-1.5">
                  <span className="font-semibold text-[#00a896]">{clinicWebsite}</span>
                  <Globe className="w-3.5 h-3.5 text-[#00a896] shrink-0" />
                </div>
              </div>
            </div>

            {/* Patient & Prescriber Info Strip */}
            <div className="bg-[#f0fbfb] border border-[#cceeed] rounded-xl p-3 sm:p-4 my-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <div>
                  <span className="font-bold text-slate-900">Patient Name: </span>
                  <span className="font-semibold text-teal-900">{patientName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">Patient ID: </span>
                  <span className="font-mono text-slate-700">{patientId}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">Age / Gender: </span>
                  <span className="text-slate-700">{patientAge} / {patientGender}</span>
                </div>
              </div>

              <div className="space-y-1.5 sm:text-right">
                <div>
                  <span className="font-bold text-slate-900">Prescription Date: </span>
                  <span className="font-medium text-slate-700">{formatClinicDate(prescription.date)}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">Prescribed By: </span>
                  <span className="font-semibold text-slate-800">{prescription.dentistName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900">Registration: </span>
                  <span className="font-mono text-slate-700">{prescription.licenseNumber || 'Dental Practitioner'}</span>
                </div>
              </div>
            </div>

            {/* Allergy Warning if any */}
            {allergy && allergy.toLowerCase() !== 'none' && allergy.toLowerCase() !== 'none reported' && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2 mb-4 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Documented Allergy Alert: <strong>{allergy}</strong>. Verify all drug classes before dispensing.</span>
              </div>
            )}

            {/* ℞ Prescription Content */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl sm:text-4xl font-serif font-black text-[#008f8a] leading-none">
                ℞
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Prescribed Medications & Posology
              </span>
            </div>

            {/* Medications Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 mb-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#00a896] text-white font-bold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">Medication Name & Strength</th>
                    <th className="py-2.5 px-3">Route</th>
                    <th className="py-2.5 px-3">Frequency & Timing</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescription.medications.map((m, idx) => (
                    <tr key={m.id || idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        {m.dosage && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            Strength: {m.dosage}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{m.route || 'Oral'}</td>
                      <td className="py-2.5 px-3 font-semibold text-teal-700">{m.frequency}</td>
                      <td className="py-2.5 px-3 text-slate-700">{m.duration}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Directions & Special Notes */}
            {prescription.notes && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 mb-8">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-teal-800">
                  Clinical Advice & Directions:
                </span>
                <p className="text-slate-700 leading-relaxed">{prescription.notes}</p>
              </div>
            )}

            {/* Signature & Authentication Line */}
            <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4 text-xs">
              <div className="text-[11px] text-slate-400 text-center sm:text-left space-y-0.5">
                <div className="flex items-center gap-1 text-teal-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>DentFlow Clinical System Verified</span>
                </div>
                <div>Electronically signed and issued digital dental prescription pad.</div>
              </div>

              <div className="text-center w-52">
                <div className="w-full border-t border-slate-800 pt-1.5 font-bold text-slate-900 text-xs">
                  {prescription.dentistName}
                </div>
                <div className="text-[10px] text-slate-500">
                  {prescription.licenseNumber || 'Registered Dental Practitioner'}
                </div>
                <div className="text-[10px] text-teal-700 font-medium">
                  Dental Surgeon & Implant Specialist
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
