import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileDown,
  X,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Mail,
  Globe,
  Info,
  CreditCard,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Invoice, Payment, Patient, ClinicSettings } from '../../types/dental';
import { formatClinicDate } from '../../utils/dateFormatter';
import {
  exportInvoicePDF,
  getInvoicePdfBlobUrl,
  printInvoiceDocument,
} from '../../utils/invoicePdfGenerator';

export interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  clinic: ClinicSettings | null;
  patient?: Patient | null;
  payments?: Payment[];
}

/**
 * Modern dental tooth outline logo matching the attached Bright Smiles reference
 */
export const DentalInvoiceLogo: React.FC<{
  logoUrl?: string;
  clinicName?: string;
  className?: string;
}> = ({ logoUrl, clinicName, className = 'w-16 h-16' }) => {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={clinicName || 'Clinic Logo'}
        className={`${className} object-contain rounded-xl p-0.5`}
      />
    );
  }

  return (
    <div className={`${className} flex items-center justify-center shrink-0`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft cyan gradient outline tooth */}
        <path
          d="M26 18 C14 28 12 46 16 64 C19 78 26 90 36 90 C43 90 45 76 50 74 C55 76 57 90 64 90 C74 90 81 78 84 64 C88 46 86 28 74 18 C64 10 56 18 50 20 C44 18 36 10 26 18 Z"
          stroke="#00A896"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#FFFFFF"
        />
        {/* Inner smiling dental contour */}
        <path
          d="M34 40 C42 54 58 54 66 40"
          stroke="#00A896"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <path
          d="M36 28 C41 24 45 25 48 27"
          stroke="#00A896"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M64 28 C59 24 55 25 52 27"
          stroke="#00A896"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    </div>
  );
};

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  isOpen,
  onClose,
  clinic,
  patient,
  payments = [],
}) => {
  const [viewMode, setViewMode] = useState<'document' | 'pdf'>('document');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
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

  // Generate PDF blob URL on demand if PDF view is requested
  useEffect(() => {
    if (!isOpen || !invoice) {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      return;
    }

    if (viewMode === 'pdf') {
      try {
        const url = getInvoicePdfBlobUrl(invoice, clinic, patient, payments);
        setPdfBlobUrl(url);
      } catch (err) {
        console.warn('Could not generate PDF preview:', err);
      }
    }

    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, viewMode, invoice?.id, invoice?.total, invoice?.paidAmount, invoice?.balance, clinic?.name, clinic?.slogan, clinic?.logoUrl]);

  if (!isOpen || !invoice) return null;

  const currencyCode = clinic?.currency || 'BDT';
  const currencySymbol = clinic?.currencySymbol || '৳';
  const isPaid = invoice.status === 'Paid' || (invoice.balance || 0) === 0;
  const isPartial = invoice.status === 'Partially Paid' && (invoice.balance || 0) > 0;

  // Clinic dynamic branding (from settings - red circled customizable part)
  const clinicName = clinic?.name || clinic?.brandName || 'Bright Smiles';
  const clinicSubtitle = clinic?.badgeText || 'DENTAL CLINIC';
  const clinicSlogan = clinic?.slogan || 'Healthy Teeth • Brighter Smiles • Better Lives';
  const clinicAddress = clinic?.address || '123 Wellness Drive, Dhaka 1205, Bangladesh';
  const clinicPhone = clinic?.phone || '+880 1711 223344';
  const clinicEmail = clinic?.email || 'info@brightsmiles.com';
  const clinicWebsite = clinic?.website || 'www.brightsmiles.com';
  const clinicLogoUrl = clinic?.logoUrl;

  // Footer dynamic customizable fields (from clinic settings)
  const invoiceNotes =
    clinic?.invoiceNotes && clinic.invoiceNotes.length > 0
      ? clinic.invoiceNotes
      : [
          "Please follow the dentist's care instructions for a faster recovery.",
          'The next appointment is recommended in 6 months for a regular check-up.',
          `For any questions, please contact us at ${clinicPhone}.`,
        ];
  const invoiceThankYouMessage = clinic?.invoiceThankYouMessage || 'Thank you!';
  const invoiceFollowUpMessage =
    clinic?.invoiceFollowUpMessage || 'We look forward to seeing you again!';
  const invoiceFooterClinicName =
    clinic?.invoiceFooterClinicName || `${clinicName} Dental Clinic`;

  const relevantPayments = payments.filter((p) => p.invoiceId === invoice.id);
  const primaryPayment = relevantPayments[0];

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      printInvoiceDocument(invoice, clinic, patient, payments);
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
      exportInvoicePDF(invoice, clinic, patient, payments);
      setFeedback('Invoice PDF downloaded successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Download PDF error:', err);
      setFeedback('Failed to download PDF. Please try again.');
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  // Build items array, default to realistic sample items if single consultation
  const items =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            id: '1',
            description: 'Comprehensive Dental Examination',
            toothOrArea: '—',
            quantity: 1,
            unitPrice: Math.round(invoice.total * 0.2) || 1000,
            total: Math.round(invoice.total * 0.2) || 1000,
          },
          {
            id: '2',
            description: 'Dental Scaling & Polishing',
            toothOrArea: '—',
            quantity: 1,
            unitPrice: invoice.total - (Math.round(invoice.total * 0.2) || 1000),
            total: invoice.total - (Math.round(invoice.total * 0.2) || 1000),
          },
        ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-preview-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden my-auto">
        {/* Top Control Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00a896] text-white flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="invoice-preview-title" className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                  Invoice #{invoice.invoiceNumber}
                </h3>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                    isPaid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : isPartial
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {isPaid ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  <span>{isPaid ? 'PAID' : isPartial ? 'PARTIALLY PAID' : 'PAYMENT DUE'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Patient: <span className="font-semibold text-slate-700">{invoice.patientName}</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'document'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Invoice View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'pdf'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                PDF View
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-2.5 sm:px-4 py-1.5 bg-[#00a896] hover:bg-[#008f80] active:bg-[#007b6e] text-white rounded-lg font-semibold text-[11px] sm:text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Print invoice or export to PDF via browser print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Printing...' : 'Print Invoice'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 sm:px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-[11px] sm:text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Download vector PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-[#00a896]" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer ml-1"
              aria-label="Close invoice preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {feedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center gap-2 text-xs text-emerald-800 font-medium shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Modal Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100/70">
          {viewMode === 'pdf' ? (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 h-[680px] flex flex-col">
              {pdfBlobUrl ? (
                <iframe
                  src={pdfBlobUrl}
                  title={`Invoice-${invoice.invoiceNumber}`}
                  className="w-full h-full rounded border-0"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <FileText className="w-10 h-10 mb-2 animate-pulse text-[#00a896]" />
                  <p className="text-xs font-medium">Generating PDF preview...</p>
                </div>
              )}
            </div>
          ) : (
            /* Document View strictly styled to match Bright Smiles Dental Invoice reference */
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200/90 p-3.5 sm:p-7 md:p-10 font-sans text-slate-800">
              {/* ======================================================== */}
              {/* 1. Header: Customizable Clinic Branding (Red Circled Part) */}
              {/* ======================================================== */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4">
                {/* Left: Tooth Logo + Clinic Title + Slogan */}
                <div className="flex items-start gap-3.5">
                  <DentalInvoiceLogo
                    logoUrl={clinicLogoUrl}
                    clinicName={clinicName}
                    className="w-16 h-16 sm:w-20 sm:h-20 shrink-0"
                  />
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#008f8a] leading-none">
                      {clinicName}
                    </h1>
                    <div className="text-[11px] sm:text-xs font-bold tracking-[0.22em] text-[#00a896] uppercase mt-1">
                      {clinicSubtitle}
                    </div>
                    {clinicSlogan && (
                      <p className="text-[11px] sm:text-xs text-[#0f766e] font-medium mt-1.5 flex items-center flex-wrap gap-1">
                        {clinicSlogan.split('•').map((segment, sIdx, arr) => (
                          <React.Fragment key={sIdx}>
                            <span>{segment.trim()}</span>
                            {sIdx < arr.length - 1 && (
                              <span className="text-[#00a896] font-bold text-xs"> • </span>
                            )}
                          </React.Fragment>
                        ))}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Contact Information with Icons */}
                <div className="space-y-1.5 text-xs text-slate-600 sm:text-right shrink-0">
                  <div className="flex items-start sm:justify-end gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#00a896] shrink-0 mt-0.5 sm:order-2" />
                    <span className="leading-snug max-w-[210px] whitespace-pre-line text-[11.5px] sm:order-1">
                      {clinicAddress}
                    </span>
                  </div>

                  {clinicPhone && (
                    <div className="flex items-center sm:justify-end gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#00a896] shrink-0 sm:order-2" />
                      <span className="text-[11.5px] sm:order-1 font-medium">{clinicPhone}</span>
                    </div>
                  )}

                  {clinicEmail && (
                    <div className="flex items-center sm:justify-end gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#00a896] shrink-0 sm:order-2" />
                      <span className="text-[11.5px] sm:order-1">{clinicEmail}</span>
                    </div>
                  )}

                  {clinicWebsite && (
                    <div className="flex items-center sm:justify-end gap-2">
                      <Globe className="w-3.5 h-3.5 text-[#00a896] shrink-0 sm:order-2" />
                      <span className="text-[11.5px] sm:order-1 font-medium text-[#00a896]">
                        {clinicWebsite}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Full-width sleek teal horizontal divider */}
              <div className="w-full h-[1.5px] bg-[#00a896]/70 mb-6" />

              {/* ======================================================== */}
              {/* 2. Patient Invoice Title & Meta Box */}
              {/* ======================================================== */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-7">
                {/* Left: Patient Invoice Heading & Patient Details */}
                <div className="flex-1 space-y-3">
                  <h2 className="text-2xl font-bold tracking-tight text-[#0f2937]">
                    Patient Invoice
                  </h2>

                  <div className="space-y-1.5 text-xs">
                    <div className="grid grid-cols-[100px_12px_1fr] items-baseline text-slate-700">
                      <span className="font-semibold text-slate-600">Patient Name</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-bold text-slate-900">
                        {patient?.fullName || invoice.patientName}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_12px_1fr] items-baseline text-slate-700">
                      <span className="font-semibold text-slate-600">Patient ID</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-mono text-slate-800">
                        {patient?.patientIdNumber || invoice.patientId || 'P-000123'}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_12px_1fr] items-baseline text-slate-700">
                      <span className="font-semibold text-slate-600">Phone</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-slate-800">
                        {patient?.phone || '+880 1812 345678'}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_12px_1fr] items-baseline text-slate-700">
                      <span className="font-semibold text-slate-600">Email</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-slate-800">
                        {patient?.email || 'patient@email.com'}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_12px_1fr] items-baseline text-slate-700">
                      <span className="font-semibold text-slate-600">Date of Birth</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-slate-800">
                        {patient?.dateOfBirth ? formatClinicDate(patient.dateOfBirth) : '15 Aug 1990'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Rounded Teal Invoice Card */}
                <div className="w-full md:w-72 bg-[#f0fbfb] border border-teal-100 rounded-xl p-4 text-xs space-y-2 text-slate-800 shadow-2xs">
                  <div className="grid grid-cols-[115px_12px_1fr] items-baseline">
                    <span className="font-semibold text-slate-700">Invoice No</span>
                    <span className="text-slate-400">:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {invoice.invoiceNumber.startsWith('INV') ? invoice.invoiceNumber : `INV-${invoice.invoiceNumber}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-[115px_12px_1fr] items-baseline">
                    <span className="font-semibold text-slate-700">Issue Date</span>
                    <span className="text-slate-400">:</span>
                    <span className="text-slate-800 font-medium">
                      {formatClinicDate(invoice.issueDate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-[115px_12px_1fr] items-baseline">
                    <span className="font-semibold text-slate-700">Appointment Date</span>
                    <span className="text-slate-400">:</span>
                    <span className="text-slate-800 font-medium">
                      {formatClinicDate(invoice.issueDate)}
                    </span>
                  </div>

                  <div className="grid grid-cols-[115px_12px_1fr] items-baseline">
                    <span className="font-semibold text-slate-700">Payment Due</span>
                    <span className="text-slate-400">:</span>
                    <span className="text-slate-800 font-medium">
                      {formatClinicDate(invoice.dueDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 3. Items & Services Table */}
              {/* ======================================================== */}
              <div className="border border-teal-200/80 rounded-lg overflow-x-auto mb-7 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                  <thead>
                    <tr className="bg-[#009688] text-white font-semibold text-[11.5px]">
                      <th className="py-2.5 px-3 text-center w-12 bg-[#00877a]">#</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-3 text-center w-28">Tooth / Area</th>
                      <th className="py-2.5 px-3 text-center w-14">Qty</th>
                      <th className="py-2.5 px-4 text-right w-28">Unit Price ({currencyCode})</th>
                      <th className="py-2.5 px-4 text-right w-28">Amount ({currencyCode})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((it, idx) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-500 font-mono font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {it.description}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">
                          {it.toothOrArea || '—'}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700 font-mono">
                          {it.quantity}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 font-mono">
                          {it.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          {it.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ======================================================== */}
              {/* 4. Payment Method & Summary Section */}
              {/* ======================================================== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start mb-8">
                {/* Left: Payment Method Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#009688] font-bold text-xs uppercase tracking-wide">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Method</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-700 pl-1">
                    <div className="grid grid-cols-[100px_1fr] items-baseline">
                      <span className="text-slate-500 font-medium">Paid by:</span>
                      <span className="font-semibold text-slate-800">
                        {primaryPayment?.paymentMethod || (isPaid ? 'bKash / Cash' : 'Due Counter')}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-baseline">
                      <span className="text-slate-500 font-medium">Transaction ID:</span>
                      <span className="font-mono text-slate-700">
                        {primaryPayment?.referenceNumber || (isPaid ? '01812345678' : '—')}
                      </span>
                    </div>

                    <div className="grid grid-cols-[100px_1fr] items-baseline">
                      <span className="text-slate-500 font-medium">Paid on:</span>
                      <span className="text-slate-700">
                        {primaryPayment?.date
                          ? formatClinicDate(primaryPayment.date)
                          : isPaid
                          ? formatClinicDate(invoice.issueDate)
                          : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Subtotal, Discount, Total & Status Pill */}
                <div className="space-y-3">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {(invoice.subtotal || invoice.total).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span className="font-medium">Discount</span>
                      <span className="font-mono text-slate-700">
                        {(invoice.discount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                      <span className="font-bold text-sm text-slate-900">
                        Total Amount ({currencyCode})
                      </span>
                      <span className="font-mono font-black text-base text-slate-900">
                        {invoice.total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Payment Status Banner Pill */}
                  <div
                    className={`w-full py-2 px-3.5 rounded-lg flex items-center justify-between text-xs font-bold ${
                      isPaid
                        ? 'bg-[#e6f8f2] text-[#00875a] border border-[#abedd8]'
                        : isPartial
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isPaid ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00875a]" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                      <span>Payment Status</span>
                    </div>
                    <span className="tracking-wider uppercase">
                      {isPaid ? 'PAID' : isPartial ? 'PARTIALLY PAID' : 'DUE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* 5. Footer: Notes & Elegant Handwritten Thank You */}
              {/* ======================================================== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-4 border-t border-slate-100">
                {/* Notes Column */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[#00a896] font-bold text-xs">
                    <Info className="w-4 h-4" />
                    <span>Notes</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4 leading-relaxed">
                    {invoiceNotes.map((note, nIdx) => (
                      <li key={nIdx}>{note}</li>
                    ))}
                  </ul>
                </div>

                {/* Right: Signature & "Thank you!" Calligraphy */}
                <div className="text-center sm:text-right flex flex-col items-center sm:items-end justify-center">
                  {/* Elegant Calligraphic "Thank you!" */}
                  <div className="relative mb-1">
                    <span
                      style={{
                        fontFamily: "'Dancing Script', 'Caveat', 'Brush Script MT', 'Segoe Script', cursive",
                      }}
                      className="text-4xl text-[#00a896] font-bold tracking-wide italic select-none inline-block transform -rotate-2"
                    >
                      {invoiceThankYouMessage}
                    </span>
                    {/* Hand-drawn underline swoosh */}
                    <svg
                      viewBox="0 0 160 20"
                      className="w-36 h-3 text-[#00a896] -mt-1 mx-auto sm:ml-auto"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M 5 8 Q 80 18 155 6" />
                    </svg>
                  </div>

                  <p className="text-[11.5px] text-slate-600 font-medium">
                    {invoiceFollowUpMessage}
                  </p>

                  <div className="w-44 h-[1px] bg-[#00a896]/50 my-2 mx-auto sm:ml-auto sm:mr-0" />

                  <p className="text-xs font-semibold text-[#009688]">
                    {invoiceFooterClinicName}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500 text-[11px]">
            Official invoice format. Click <strong>Print Invoice</strong> to send directly to your clinic printer or save as PDF.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5 text-[#00a896]" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-5 py-2 bg-[#00a896] hover:bg-[#008f80] active:bg-[#007b6e] text-white rounded-lg font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Printing...' : 'Print Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
