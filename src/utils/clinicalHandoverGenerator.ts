import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Patient,
  TreatmentPlan,
  ClinicalNote,
  Prescription,
  Appointment,
  ClinicSettings,
} from '../types/dental';
import { formatClinicDate } from './dateFormatter';

export interface HandoverMetadata {
  referringClinicianName: string;
  referringClinicianRole: string;
  referringClinicianLicense?: string;
  receivingClinicianName: string;
  receivingFacility: string;
  handoverReason: string;
  urgencyLevel: 'Routine' | 'Priority' | 'Urgent';
  clinicalPrecautions?: string;
  handoverNotes?: string;
  includeFinancials?: boolean;
}

export interface ClinicalHandoverData {
  patient: Patient;
  treatmentPlans: TreatmentPlan[];
  clinicalNotes: ClinicalNote[];
  prescriptions?: Prescription[];
  appointments?: Appointment[];
  clinic: ClinicSettings;
  handoverMetadata: HandoverMetadata;
}

/**
 * Calculates patient age from birthdate string safely
 */
export const calculatePatientAge = (dob?: string): string => {
  if (!dob) return 'N/A';
  try {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return 'N/A';
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} yrs`;
  } catch {
    return 'N/A';
  }
};

/**
 * Generates an HTML print-optimized document string for clinical handovers,
 * complete with CSS `@media print` rules, clinic header, medical alert banners,
 * history breakdown, upcoming treatment plans, and signature sign-offs.
 */
export const generateClinicalHandoverHtml = (data: ClinicalHandoverData): string => {
  const { patient, treatmentPlans, clinicalNotes, prescriptions = [], appointments = [], clinic, handoverMetadata } = data;
  const currencySymbol = clinic.currencySymbol || '৳';
  const handoverRef = `TX-HO-${patient.patientIdNumber || patient.id.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const generatedDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Segregate treatment plans
  const completedPlans = treatmentPlans.filter(
    (p) => p.status === 'Completed'
  );
  const upcomingPlans = treatmentPlans.filter(
    (p) => p.status !== 'Completed' && p.status !== 'Cancelled'
  );

  // Past clinical notes sorted chronologically descending
  const sortedNotes = [...clinicalNotes].sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  // Upcoming appointments
  const upcomingAppointments = appointments
    .filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed')
    .sort((a, b) => `${a.date} ${a.startTime || ''}`.localeCompare(`${b.date} ${b.startTime || ''}`));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Clinical Handover - ${patient.fullName} (${patient.patientIdNumber})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.45;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .print-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }

    /* Header styling */
    .clinic-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0d9488;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .clinic-identity h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .clinic-identity .clinic-sub {
      font-size: 9.5pt;
      font-weight: 600;
      color: #0d9488;
      margin: 2px 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .clinic-contact {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.35;
    }
    .document-badge {
      text-align: right;
    }
    .document-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0d9488;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .document-ref {
      font-family: monospace;
      font-size: 8.5pt;
      font-weight: 700;
      color: #334155;
      margin-top: 3px;
    }
    .urgency-pill {
      display: inline-block;
      margin-top: 5px;
      padding: 2px 8px;
      font-size: 8pt;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .urgency-Urgent {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
    }
    .urgency-Priority {
      background-color: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }
    .urgency-Routine {
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    /* Handover Context Banner */
    .handover-banner {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #0d9488;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 8.5pt;
    }
    .handover-banner-item strong {
      color: #1e293b;
      display: block;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 2px;
    }

    /* Medical Alerts Callout */
    .alerts-strip {
      background: #fffbeb;
      border: 1.5px solid #f59e0b;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    .alerts-strip strong {
      color: #b45309;
      display: inline-flex;
      align-items: center;
      margin-right: 6px;
    }
    .alerts-critical {
      color: #b91c1c;
      font-weight: 700;
    }

    /* Patient Demographics Box */
    .patient-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 10px 12px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 8px;
      font-size: 8.5pt;
    }
    .patient-field-label {
      color: #64748b;
      font-size: 7.5pt;
      text-transform: uppercase;
      font-weight: 600;
      display: block;
    }
    .patient-field-value {
      color: #0f172a;
      font-weight: 600;
    }

    /* Section Styling */
    .section-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 4px;
      margin-top: 14px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title .section-count {
      font-size: 8pt;
      color: #64748b;
      font-weight: 500;
      text-transform: none;
    }

    /* Tables */
    table.clinical-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8.5pt;
      page-break-inside: auto;
    }
    table.clinical-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.03em;
    }
    table.clinical-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      color: #1e293b;
    }
    table.clinical-table tr:nth-child(even) td {
      background-color: #fafbfb;
    }
    tr.break-avoid {
      page-break-inside: avoid;
    }

    /* Plan phases card */
    .plan-card {
      border: 1px solid #e2e8f0;
      border-left: 3.5px solid #0d9488;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: #ffffff;
      page-break-inside: avoid;
      font-size: 8.5pt;
    }
    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .plan-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 9pt;
    }
    .plan-meta {
      font-size: 8pt;
      color: #64748b;
    }
    .plan-phases {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 3px;
      padding: 6px 8px;
      margin-top: 4px;
      font-family: inherit;
      white-space: pre-line;
      color: #334155;
      font-size: 8pt;
    }

    /* Clinical Note Box */
    .note-card {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: #ffffff;
      page-break-inside: avoid;
      font-size: 8.5pt;
    }
    .note-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 4px;
      margin-bottom: 6px;
      font-size: 8pt;
      font-weight: 600;
      color: #475569;
    }
    .note-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      font-size: 8pt;
    }
    .note-col {
      background: #f8fafc;
      padding: 4px 6px;
      border-radius: 3px;
      border: 1px solid #e2e8f0;
    }
    .note-tag {
      font-weight: 700;
      font-size: 7.5pt;
      color: #0d9488;
      display: block;
      margin-bottom: 2px;
    }

    /* Sign-off Handover Box */
    .signoff-box {
      border-top: 2px solid #cbd5e1;
      padding-top: 12px;
      margin-top: 18px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      page-break-inside: avoid;
      font-size: 8.5pt;
    }
    .sig-col {
      display: flex;
      flex-direction: column;
    }
    .sig-line {
      border-bottom: 1px solid #94a3b8;
      height: 36px;
      margin-bottom: 4px;
    }
    .sig-label {
      font-size: 7.5pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    .sig-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 8.5pt;
    }

    /* Footer Disclaimer */
    .footer-note {
      margin-top: 14px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-size: 7pt;
      color: #94a3b8;
      text-align: center;
      page-break-inside: avoid;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <!-- CLINIC HEADER -->
    <div class="clinic-header">
      <div class="clinic-identity">
        <h1>${clinic.name}</h1>
        <div class="clinic-sub">${clinic.brandName || 'Specialized Dental Practice & Implant Center'}</div>
        <div class="clinic-contact">
          ${clinic.address}<br>
          Phone: ${clinic.phone} &bull; Email: ${clinic.email}
        </div>
      </div>
      <div class="document-badge">
        <div class="document-title">Clinical Handover</div>
        <div class="document-ref">Ref: ${handoverRef}</div>
        <div class="document-ref" style="font-weight: 400; font-size: 7.5pt; color: #64748b;">Issued: ${generatedDate}</div>
        <div class="urgency-pill urgency-${handoverMetadata.urgencyLevel}">
          Status: ${handoverMetadata.urgencyLevel} Handover
        </div>
      </div>
    </div>

    <!-- HANDOVER PROTOCOL & TRANSFER REASON -->
    <div class="handover-banner">
      <div class="handover-banner-item">
        <strong>Handing-Over Clinician</strong>
        ${handoverMetadata.referringClinicianName} (${handoverMetadata.referringClinicianRole})
        ${handoverMetadata.referringClinicianLicense ? `<br><span style="color:#64748b">Reg / Lic: ${handoverMetadata.referringClinicianLicense}</span>` : ''}
      </div>
      <div class="handover-banner-item">
        <strong>Receiving Clinician / Facility</strong>
        ${handoverMetadata.receivingClinicianName || 'Attending Clinical Specialist'}
        ${handoverMetadata.receivingFacility ? `<br><span style="color:#64748b">${handoverMetadata.receivingFacility}</span>` : ''}
      </div>
      <div class="handover-banner-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 2px;">
        <strong>Clinical Indication & Handover Objective</strong>
        ${handoverMetadata.handoverReason || 'Transfer of clinical management and continuity of multidisciplinary dental treatment.'}
      </div>
    </div>

    <!-- PATIENT DEMOGRAPHICS -->
    <div class="patient-card">
      <div class="patient-grid">
        <div>
          <span class="patient-field-label">Patient Name & ID</span>
          <span class="patient-field-value">${patient.fullName}</span>
          <span style="font-family: monospace; color: #0d9488; margin-left: 4px; font-weight: 700;">[${patient.patientIdNumber}]</span>
        </div>
        <div>
          <span class="patient-field-label">Age / Gender</span>
          <span class="patient-field-value">${calculatePatientAge(patient.dateOfBirth)} &bull; ${patient.gender}</span>
        </div>
        <div>
          <span class="patient-field-label">Contact Phone</span>
          <span class="patient-field-value">${patient.phone}</span>
        </div>
        <div>
          <span class="patient-field-label">Emergency Contact</span>
          <span class="patient-field-value">${patient.emergencyContactName || 'N/A'} (${patient.emergencyContactPhone || 'N/A'})</span>
        </div>
      </div>
    </div>

    <!-- CRITICAL MEDICAL ALERTS & SYSTEMIC CONDITIONS -->
    <div class="alerts-strip">
      <div style="margin-bottom: 3px;">
        <strong>&#9888; Documented Allergies:</strong>
        <span class="${patient.allergies ? 'alerts-critical' : ''}">
          ${patient.allergies || 'No known drug allergies (NKDA)'}
        </span>
      </div>
      <div style="margin-bottom: 3px;">
        <strong>Current Medications:</strong>
        <span>${patient.currentMedications || 'None reported by patient'}</span>
      </div>
      <div>
        <strong>Systemic Medical History:</strong>
        <span>${patient.medicalHistory || 'No systemic contraindications or major hospitalizations documented.'}</span>
        ${patient.medicalAlerts ? `<br><strong style="color: #b91c1c;">Special Alert Flag:</strong> <span class="alerts-critical">${patient.medicalAlerts}</span>` : ''}
      </div>
      ${handoverMetadata.clinicalPrecautions ? `
      <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #fcd34d;">
        <strong style="color: #92400e;">Handover Precautionary Protocol:</strong>
        <span>${handoverMetadata.clinicalPrecautions}</span>
      </div>` : ''}
    </div>

    <!-- UPCOMING TREATMENT PLAN & ACTIVE PHASES -->
    <div class="section-title">
      <span>1. Upcoming Treatment Plan & Phase Schedule</span>
      <span class="section-count">${upcomingPlans.length} Active Plan(s)</span>
    </div>

    ${upcomingPlans.length === 0 ? `
      <div style="padding: 10px; border: 1px dashed #cbd5e1; border-radius: 4px; font-size: 8.5pt; color: #64748b; margin-bottom: 12px;">
        No active or pending treatment phases scheduled. Patient care may require primary diagnostic re-evaluation by receiving team.
      </div>
    ` : upcomingPlans.map((plan, idx) => `
      <div class="plan-card">
        <div class="plan-header">
          <div>
            <span class="plan-title">${idx + 1}. ${plan.title}</span>
            ${plan.affectedTeeth ? `<span style="margin-left: 6px; font-weight: 700; color: #0d9488; font-size: 8pt;">[Teeth: ${plan.affectedTeeth}]</span>` : ''}
          </div>
          <div class="plan-meta">
            <span style="font-weight: 700; color: ${plan.priority === 'Urgent' ? '#b91c1c' : '#0d9488'};">${plan.priority} Priority</span> &bull; 
            <span>Status: <strong>${plan.status}</strong></span>
            ${handoverMetadata.includeFinancials ? ` &bull; <span>Est: <strong>${currencySymbol}${plan.estimatedCost?.toLocaleString() || 0}</strong></span>` : ''}
          </div>
        </div>

        <div style="font-size: 8pt; color: #334155; margin-top: 2px;">
          <strong>Planned Procedures:</strong> ${plan.procedures}
        </div>

        ${plan.phases ? `
          <div class="plan-phases">
            <strong style="text-transform: uppercase; font-size: 7.5pt; color: #475569; display: block; margin-bottom: 2px;">Proposed Phase Sequence:</strong>
            ${plan.phases}
          </div>
        ` : ''}

        ${plan.notes ? `
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 4px; font-style: italic;">
            <strong>Clinical Rationale / Notes:</strong> ${plan.notes}
          </div>
        ` : ''}
      </div>
    `).join('')}

    <!-- UPCOMING APPOINTMENTS -->
    ${upcomingAppointments.length > 0 ? `
      <div style="margin-bottom: 12px;">
        <table class="clinical-table">
          <thead>
            <tr>
              <th style="width: 20%;">Date & Time</th>
              <th style="width: 25%;">Assigned Clinician</th>
              <th style="width: 35%;">Scheduled Procedure / Reason</th>
              <th style="width: 20%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${upcomingAppointments.map((apt) => `
              <tr class="break-avoid">
                <td><strong>${formatClinicDate(apt.date)}</strong> at ${apt.startTime || ''}</td>
                <td>${apt.dentistName || 'Attending Dentist'}</td>
                <td>${apt.reason || apt.type || apt.notes || 'Routine follow-up / treatment session'}</td>
                <td><span style="color:#0d9488; font-weight: 600;">${apt.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- RECENT TREATMENT HISTORY & CLINICAL ENCOUNTERS -->
    <div class="section-title">
      <span>2. Treatment History & Recent Clinical Encounters</span>
      <span class="section-count">${sortedNotes.length} Documented Note(s)</span>
    </div>

    ${sortedNotes.length === 0 ? `
      <div style="padding: 10px; border: 1px dashed #cbd5e1; border-radius: 4px; font-size: 8.5pt; color: #64748b; margin-bottom: 12px;">
        No prior clinical encounters logged in the system for this patient.
      </div>
    ` : sortedNotes.slice(0, 5).map((note) => `
      <div class="note-card">
        <div class="note-header">
          <span>Date: <strong>${formatClinicDate(note.date || note.createdAt)}</strong></span>
          <span>Treating Clinician: <strong>${note.dentistName || 'Clinical Staff'}</strong></span>
        </div>
        <div class="note-grid">
          <div class="note-col">
            <span class="note-tag">Complaint</span>
            <div>${note.presentingComplaint || 'None recorded'}</div>
          </div>
          <div class="note-col">
            <span class="note-tag">Findings</span>
            <div>${note.examinationFindings || 'None recorded'}</div>
          </div>
          <div class="note-col">
            <span class="note-tag">Diagnosis</span>
            <div>${note.diagnosis || 'None recorded'}</div>
          </div>
          <div class="note-col">
            <span class="note-tag">Treatment Performed</span>
            <div>${note.treatmentPerformed || note.clinicalRecommendations || 'None recorded'}</div>
          </div>
        </div>
      </div>
    `).join('')}

    <!-- COMPLETED TREATMENT PROCEDURES SUMMARY -->
    ${completedPlans.length > 0 ? `
      <div style="margin-top: 8px; margin-bottom: 12px;">
        <table class="clinical-table">
          <thead>
            <tr>
              <th style="width: 25%;">Completed Treatment Plan</th>
              <th style="width: 15%;">Teeth Involved</th>
              <th style="width: 45%;">Procedures Completed</th>
              <th style="width: 15%;">Completion Date</th>
            </tr>
          </thead>
          <tbody>
            ${completedPlans.map((cp) => `
              <tr class="break-avoid">
                <td><strong>${cp.title}</strong></td>
                <td>${cp.affectedTeeth || 'General'}</td>
                <td>${cp.procedures}</td>
                <td>${formatClinicDate(cp.updatedAt || cp.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- ACTIVE / RECENT PRESCRIPTIONS -->
    ${prescriptions.length > 0 ? `
      <div class="section-title">
        <span>3. Active / Recent Prescriptions</span>
        <span class="section-count">${prescriptions.length} Prescription Record(s)</span>
      </div>
      <table class="clinical-table">
        <thead>
          <tr>
            <th style="width: 15%;">Date</th>
            <th style="width: 35%;">Medication & Dosage</th>
            <th style="width: 25%;">Frequency & Duration</th>
            <th style="width: 25%;">Special Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${prescriptions.slice(0, 3).flatMap((rx) =>
            rx.medications.map((med) => `
              <tr class="break-avoid">
                <td>${formatClinicDate(rx.date)}</td>
                <td><strong>${med.name}</strong> (${med.dosage})</td>
                <td>${med.frequency} &bull; ${med.duration}</td>
                <td>${med.instructions || 'As directed'}</td>
              </tr>
            `)
          ).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- HANDOVER SIGN-OFF & TRANSFER OF CARE -->
    <div class="signoff-box">
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-name">${handoverMetadata.referringClinicianName}</div>
        <div class="sig-label">Transferring Clinician Signature & Date</div>
        <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">
          ${clinic.name} &bull; License: ${handoverMetadata.referringClinicianLicense || 'On file'}
        </div>
      </div>
      <div class="sig-col">
        <div class="sig-line"></div>
        <div class="sig-name">${handoverMetadata.receivingClinicianName || 'Receiving Practitioner / Care Team'}</div>
        <div class="sig-label">Receiving Clinician Acknowledgment & Date</div>
        <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">
          Transfer of clinical responsibility accepted
        </div>
      </div>
    </div>

    <!-- CONFIDENTIALITY & LEGAL NOTICE -->
    <div class="footer-note">
      CONFIDENTIAL MEDICAL / DENTAL RECORD &bull; This clinical handover summary contains privileged health information intended solely for the designated receiving clinician. Unauthorized dissemination is strictly prohibited under medical data protection regulations. Generated by ${clinic.brandName || 'DentFlow Clinical Suite'}.
    </div>
  </div>

  <script>
    // Automatic trigger when loaded inside print iframe or print window
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>
  `.trim();
};

/**
 * Triggers the native browser print preview using a dedicated hidden iframe.
 * Avoids window.open popup blocking in iframe environments and renders pixel-perfect CSS print styles.
 */
export const printClinicalHandoverDocument = (data: ClinicalHandoverData): void => {
  const htmlContent = generateClinicalHandoverHtml(data);

  // Use hidden iframe for seamless cross-browser print execution
  let iframe = document.getElementById('clinical-handover-print-iframe') as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'clinical-handover-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Trigger print once iframe resources are settled
    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error('Handover print error:', err);
      }
    }, 500);
  }
};

/**
 * Generates a downloadable vector PDF file directly using jsPDF and jspdf-autotable.
 * Provides clinicians with an offline archive or email attachment without invoking the print dialog.
 */
export const exportClinicalHandoverPDF = (data: ClinicalHandoverData): void => {
  const { patient, treatmentPlans, clinicalNotes, prescriptions = [], clinic, handoverMetadata } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const currencySymbol = clinic.currencySymbol || '৳';
  const handoverRef = `TX-HO-${patient.patientIdNumber || patient.id.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Header branding
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(clinic.name, 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(13, 148, 136);
  doc.text(clinic.brandName || 'Specialized Dental Practice & Implant Center', 14, 23);

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`${clinic.address} | Tel: ${clinic.phone}`, 14, 27);

  // Right-aligned header document badge
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text('CLINICAL HANDOVER SUMMARY', 196, 18, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('courier', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Ref: ${handoverRef}`, 196, 23, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${dateStr} | Status: ${handoverMetadata.urgencyLevel}`, 196, 27, { align: 'right' });

  // Divider line
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.8);
  doc.line(14, 30, 196, 30);

  // Handover Context Table
  autoTable(doc, {
    startY: 33,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, textColor: [71, 85, 105] },
      1: { cellWidth: 137 },
    },
    body: [
      ['Transferring Clinician:', `${handoverMetadata.referringClinicianName} (${handoverMetadata.referringClinicianRole})`],
      ['Receiving Clinician / Facility:', `${handoverMetadata.receivingClinicianName || 'Specialist Team'} - ${handoverMetadata.receivingFacility || 'Dental Referral Center'}`],
      ['Handover Objective:', handoverMetadata.handoverReason || 'Continuity of multidisciplinary dental treatment'],
    ],
  });

  // Patient Information Table
  const lastY1 = (doc as any).lastAutoTable.finalY + 3;
  autoTable(doc, {
    startY: lastY1,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    head: [['Patient Name', 'Patient ID', 'Age / Gender', 'Contact Phone', 'Emergency Contact']],
    body: [
      [
        patient.fullName,
        patient.patientIdNumber || patient.id.slice(0, 8),
        `${calculatePatientAge(patient.dateOfBirth)} (${patient.gender})`,
        patient.phone,
        `${patient.emergencyContactName || 'None'} (${patient.emergencyContactPhone || 'N/A'})`,
      ],
    ],
  });

  // Medical Alert Banner
  const lastY2 = (doc as any).lastAutoTable.finalY + 3;
  autoTable(doc, {
    startY: lastY2,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2.5, fillColor: [255, 251, 235], textColor: [146, 64, 14] },
    body: [
      [
        `ALLERGIES: ${patient.allergies || 'No Known Drug Allergies (NKDA)'} | MEDICATIONS: ${patient.currentMedications || 'None'} | MEDICAL HISTORY: ${patient.medicalHistory || 'Unremarkable'}${handoverMetadata.clinicalPrecautions ? ` | PRECAUTION: ${handoverMetadata.clinicalPrecautions}` : ''}`,
      ],
    ],
  });

  // Upcoming Treatment Plans
  const upcomingPlans = treatmentPlans.filter((p) => p.status !== 'Completed' && p.status !== 'Cancelled');
  const lastY3 = (doc as any).lastAutoTable.finalY + 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`1. Upcoming Treatment Plans (${upcomingPlans.length})`, 14, lastY3);

  const planRows = upcomingPlans.map((p, idx) => [
    `${idx + 1}. ${p.title}`,
    p.affectedTeeth || 'General',
    p.priority,
    p.status,
    p.procedures + (p.phases ? `\n[Phases]: ${p.phases}` : ''),
    handoverMetadata.includeFinancials ? `${currencySymbol}${p.estimatedCost?.toLocaleString() || 0}` : 'N/A',
  ]);

  autoTable(doc, {
    startY: lastY3 + 2,
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 20 },
      2: { cellWidth: 18 },
      3: { cellWidth: 22 },
      4: { cellWidth: 67 },
      5: { cellWidth: 20, halign: 'right' },
    },
    head: [['Treatment Plan', 'Teeth', 'Priority', 'Status', 'Planned Procedures & Phases', 'Est Cost']],
    body: planRows.length > 0 ? planRows : [['No upcoming plans scheduled', '-', '-', '-', '-', '-']],
  });

  // Recent Clinical History (SOAP notes)
  const lastY4 = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('2. Recent Clinical Notes & Completed Encounters', 14, lastY4);

  const sortedNotes = [...clinicalNotes]
    .sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''))
    .slice(0, 4);

  const noteRows = sortedNotes.map((n) => [
    formatClinicDate(n.date || n.createdAt),
    n.diagnosis || 'Clinical visit',
    `Complaint: ${n.presentingComplaint || '-'}\nFindings: ${n.examinationFindings || '-'}\nTreatment: ${n.treatmentPerformed || n.clinicalRecommendations || '-'}`,
    n.dentistName || 'Staff Clinician',
  ]);

  autoTable(doc, {
    startY: lastY4 + 2,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 28 },
      2: { cellWidth: 104 },
      3: { cellWidth: 25 },
    },
    head: [['Date', 'Diagnosis', 'Encounter & Treatment Summary', 'Dentist']],
    body: noteRows.length > 0 ? noteRows : [['-', '-', 'No clinical notes logged', '-']],
  });

  // Prescriptions if present
  if (prescriptions.length > 0) {
    const lastY5 = (doc as any).lastAutoTable.finalY + 4;
    if (lastY5 < 240) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. Active Prescriptions', 14, lastY5);

      const rxRows = prescriptions.slice(0, 2).flatMap((rx) =>
        rx.medications.map((m) => [
          formatClinicDate(rx.date),
          m.name,
          m.dosage,
          `${m.frequency} (${m.duration})`,
          m.instructions || 'As directed',
        ])
      );

      autoTable(doc, {
        startY: lastY5 + 2,
        theme: 'plain',
        headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 7.5 },
        styles: { fontSize: 7.5, cellPadding: 1.5 },
        head: [['Date', 'Drug', 'Dosage', 'Schedule', 'Instructions']],
        body: rxRows,
      });
    }
  }

  // Sign-off section on bottom
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = pageHeight - 32;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, signY, 85, signY);
  doc.line(125, signY, 196, signY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(handoverMetadata.referringClinicianName, 14, signY + 4);
  doc.text(handoverMetadata.receivingClinicianName || 'Receiving Practitioner', 125, signY + 4);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Transferring Clinician (${clinic.name})`, 14, signY + 7);
  doc.text('Receiving Clinician Acknowledgment', 125, signY + 7);

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'CONFIDENTIAL DENTAL HANDOVER RECORD - Subject to medical professional privilege and data protection regulations.',
    105,
    pageHeight - 8,
    { align: 'center' }
  );

  // Save PDF
  const safeName = patient.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`clinical-handover-${safeName}-${handoverRef}.pdf`);
};
