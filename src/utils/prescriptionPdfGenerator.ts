import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Prescription, ClinicSettings, Patient } from '../types/dental';
import { formatClinicDate } from './dateFormatter';

/**
 * Generates an official, publication-quality dental practice Prescription Pad PDF
 */
export function generatePrescriptionPDF(
  rx: Prescription,
  clinic: ClinicSettings | null,
  patient?: Patient | null
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Clinic dynamic branding
  const clinicName = clinic?.name || clinic?.brandName || 'Bright Smiles Dental Clinic';
  const clinicSubtitle = clinic?.badgeText || 'CLINICAL SUITE';
  const clinicSlogan = clinic?.slogan || 'Healthy Teeth • Brighter Smiles • Better Lives';
  const clinicAddress = clinic?.address || '123 Wellness Drive, Dhaka 1205, Bangladesh';
  const clinicPhone = clinic?.phone || '+880 1711 223344';
  const clinicEmail = clinic?.email || 'info@brightsmiles.com';
  const clinicWebsite = clinic?.website || 'www.brightsmiles.com';

  const primaryTeal: [number, number, number] = [0, 168, 150]; // #00A896
  const darkNavy: [number, number, number] = [15, 41, 55];
  const slateText: [number, number, number] = [51, 65, 85];
  const lightBg: [number, number, number] = [240, 251, 251];

  let currentY = 40;

  // 1. Draw Tooth Logo (Vector curves) on Left
  const logoX = margin;
  const logoY = currentY;

  doc.setDrawColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.setLineWidth(2.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(logoX, logoY, 44, 44, 12, 12, 'S');

  doc.setLineWidth(2);
  doc.ellipse(logoX + 22, logoY + 24, 10, 6, 'S');

  // Clinic Title & Subtitle & Slogan
  const textLeftX = logoX + 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.text(clinicName, textLeftX, logoY + 16);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 168, 150);
  doc.text(clinicSubtitle.toUpperCase(), textLeftX, logoY + 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(clinicSlogan, textLeftX, logoY + 39);

  // Clinic Contact on Right
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const rightX = pageWidth - margin;
  doc.text(clinicAddress, rightX, logoY + 12, { align: 'right' });
  doc.text(`Tel: ${clinicPhone}`, rightX, logoY + 22, { align: 'right' });
  doc.text(clinicEmail, rightX, logoY + 32, { align: 'right' });
  doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.text(clinicWebsite, rightX, logoY + 42, { align: 'right' });

  // Divider Line
  currentY = logoY + 54;
  doc.setDrawColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.setLineWidth(1.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 15;

  // 2. Patient & Prescriber Info Box
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(218, 238, 235);
  doc.setLineWidth(1);
  doc.roundedRect(margin, currentY, contentWidth, 54, 6, 6, 'FD');

  const boxY = currentY + 16;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`Patient Name: `, margin + 12, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(patient?.fullName || rx.patientName, margin + 80, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text(`Patient ID: `, margin + 12, boxY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(patient?.patientIdNumber || rx.patientId, margin + 80, boxY + 16);

  doc.setFont('helvetica', 'bold');
  doc.text(`Age / Sex: `, margin + 12, boxY + 30);
  doc.setFont('helvetica', 'normal');
  const age = rx.patientAge || (patient?.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Yrs` : 'Adult');
  const sex = patient?.gender || 'N/A';
  doc.text(`${age} / ${sex}`, margin + 80, boxY + 30);

  // Right column of box: Prescriber info & Date
  const col2X = margin + contentWidth - 190;
  doc.setFont('helvetica', 'bold');
  doc.text(`Date: `, col2X, boxY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatClinicDate(rx.date), col2X + 60, boxY);

  doc.setFont('helvetica', 'bold');
  doc.text(`Prescriber: `, col2X, boxY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(rx.dentistName, col2X + 60, boxY + 16);

  doc.setFont('helvetica', 'bold');
  doc.text(`Reg / BMDC: `, col2X, boxY + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(rx.licenseNumber || 'BMDC/DC-7841', col2X + 60, boxY + 30);

  currentY += 68;

  // 3. Allergy Alert if specified
  const allergy = rx.allergyWarnings || patient?.allergies;
  if (allergy && allergy.toLowerCase() !== 'none' && allergy.toLowerCase() !== 'none reported') {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, currentY, contentWidth, 22, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text(`Allergy Alert: ${allergy}`, margin + 10, currentY + 14);
    currentY += 30;
  }

  // 4. Classical ℞ Heading
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(28);
  doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.text('Rx', margin, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('Prescribed Medications & Pharmacotherapy', margin + 38, currentY + 18);

  currentY += 32;

  // 5. Medications Table using autoTable
  const tableRows = rx.medications.map((m, idx) => [
    `${idx + 1}`,
    `${m.name}\n${m.dosage ? `Strength: ${m.dosage}` : ''}`,
    m.route || 'Oral',
    m.frequency || '1-0-1',
    m.duration || '5 days',
    m.instructions || 'After meals',
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Medication & Dosage', 'Route', 'Frequency & Timing', 'Duration', 'Instructions']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 168, 150],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 6,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 6,
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 160 },
      2: { cellWidth: 55 },
      3: { cellWidth: 105 },
      4: { cellWidth: 65 },
      5: { cellWidth: 105 },
    },
    margin: { left: margin, right: margin },
  });

  // Calculate table end
  // @ts-ignore
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : currentY + 150;
  let bottomY = finalY;

  // 6. Special Advice / Directions Box
  if (rx.notes) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, bottomY, contentWidth, 42, 5, 5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('Directions & Clinical Advice:', margin + 10, bottomY + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    const splitNotes = doc.splitTextToSize(rx.notes, contentWidth - 20);
    doc.text(splitNotes, margin + 10, bottomY + 28);

    bottomY += 58;
  }

  // 7. Signature & Authentication Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  const signY = pageHeight - 90;

  // Horizontal stroke
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(margin, signY, pageWidth - margin, signY);

  // Left stamp / authentication
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('DentFlow Dental Clinic Management System', margin, signY + 16);
  doc.text('Electronically signed & verified clinical prescription document.', margin, signY + 26);
  doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, signY + 36);

  // Right doctor signature line
  const signBoxWidth = 160;
  const signBoxX = pageWidth - margin - signBoxWidth;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1);
  doc.line(signBoxX, signY + 24, signBoxX + signBoxWidth, signY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(rx.dentistName, signBoxX + signBoxWidth / 2, signY + 36, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(rx.licenseNumber || 'Registered Dental Surgeon', signBoxX + signBoxWidth / 2, signY + 46, { align: 'center' });

  return doc;
}

/**
 * Downloads the Prescription PDF file directly to client
 */
export function exportPrescriptionPDF(
  rx: Prescription,
  clinic: ClinicSettings | null,
  patient?: Patient | null
): void {
  const doc = generatePrescriptionPDF(rx, clinic, patient);
  const patientSafe = (patient?.fullName || rx.patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateSafe = (rx.date || 'rx').replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`Prescription_${patientSafe}_${dateSafe}.pdf`);
}

/**
 * Generates an isolated printable document inside a hidden iframe
 * Guarantees print dialog works seamlessly inside sandboxed web preview environments
 */
export function printPrescriptionDocument(
  rx: Prescription,
  clinic: ClinicSettings | null,
  patient?: Patient | null
): void {
  const clinicName = clinic?.name || clinic?.brandName || 'Bright Smiles Dental Clinic';
  const clinicSubtitle = clinic?.badgeText || 'CLINICAL SUITE';
  const clinicSlogan = clinic?.slogan || 'Healthy Teeth • Brighter Smiles • Better Lives';
  const clinicAddress = clinic?.address || '123 Wellness Drive, Dhaka 1205, Bangladesh';
  const clinicPhone = clinic?.phone || '+880 1711 223344';
  const clinicEmail = clinic?.email || 'info@brightsmiles.com';
  const clinicWebsite = clinic?.website || 'www.brightsmiles.com';

  const patientName = patient?.fullName || rx.patientName;
  const patientId = patient?.patientIdNumber || rx.patientId;
  const patientAge = rx.patientAge || (patient?.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Yrs` : 'Adult');
  const patientGender = patient?.gender || 'N/A';
  const allergy = rx.allergyWarnings || patient?.allergies;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Prescription Pad - ${patientName}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #fff;
            margin: 0;
            padding: 10px;
            font-size: 12px;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 12px;
            border-bottom: 2px solid #00a896;
            margin-bottom: 15px;
          }
          .clinic-brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-svg {
            width: 52px;
            height: 52px;
          }
          .clinic-name {
            font-size: 20px;
            font-weight: 800;
            color: #008f8a;
            margin: 0;
            line-height: 1.1;
          }
          .clinic-subtitle {
            font-size: 9px;
            font-weight: 800;
            color: #00a896;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .clinic-slogan {
            font-size: 10px;
            color: #0f766e;
            margin-top: 2px;
          }
          .clinic-contact {
            text-align: right;
            font-size: 10px;
            color: #475569;
            line-height: 1.5;
          }
          .patient-box {
            background: #f0fbfb;
            border: 1px solid #cceeed;
            border-radius: 8px;
            padding: 10px 14px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 20px;
            margin-bottom: 16px;
            font-size: 11px;
          }
          .patient-box strong {
            color: #0f2937;
          }
          .allergy-alert {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #b91c1c;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 10.5px;
            font-weight: 600;
            margin-bottom: 15px;
          }
          .rx-heading {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
          }
          .rx-symbol {
            font-size: 32px;
            font-family: serif;
            font-weight: bold;
            color: #008f8a;
            line-height: 1;
          }
          .rx-title {
            font-size: 13px;
            font-weight: 800;
            color: #0f2937;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          table.med-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 18px;
          }
          table.med-table th {
            background: #00a896;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 7px 10px;
            border: 1px solid #009688;
          }
          table.med-table td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          table.med-table tr:nth-child(even) td {
            background: #f8fafc;
          }
          .med-name {
            font-weight: 700;
            color: #0f2937;
          }
          .med-dosage {
            color: #64748b;
            font-size: 10px;
          }
          .med-freq {
            color: #0f766e;
            font-weight: 600;
          }
          .notes-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 11px;
            margin-bottom: 30px;
          }
          .notes-box strong {
            color: #0f2937;
            display: block;
            margin-bottom: 3px;
          }
          .footer-section {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 10px;
          }
          .footer-auth {
            color: #94a3b8;
            line-height: 1.4;
          }
          .sign-box {
            text-align: center;
            width: 180px;
          }
          .sign-line {
            border-top: 1.5px solid #0f172a;
            padding-top: 5px;
            font-weight: 700;
            font-size: 11px;
            color: #0f2937;
          }
          .sign-sub {
            color: #64748b;
            font-size: 9px;
            margin-top: 2px;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div class="clinic-brand">
            <svg class="logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M26 18 C14 28 12 46 16 64 C19 78 26 90 36 90 C43 90 45 76 50 74 C55 76 57 90 64 90 C74 90 81 78 84 64 C88 46 86 28 74 18 C64 10 56 18 50 20 C44 18 36 10 26 18 Z" stroke="#00A896" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="#FFFFFF"/>
              <path d="M34 40 C42 54 58 54 66 40" stroke="#00A896" stroke-width="3.8" stroke-linecap="round"/>
              <path d="M36 28 C41 24 45 25 48 27" stroke="#00A896" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
              <path d="M64 28 C59 24 55 25 52 27" stroke="#00A896" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
            </svg>
            <div>
              <h1 class="clinic-name">${clinicName}</h1>
              <div class="clinic-subtitle">${clinicSubtitle}</div>
              <div class="clinic-slogan">${clinicSlogan}</div>
            </div>
          </div>
          <div class="clinic-contact">
            <div>${clinicAddress}</div>
            <div>Tel: <strong>${clinicPhone}</strong></div>
            <div>Email: ${clinicEmail}</div>
            <div style="color: #00a896; font-weight: 700;">${clinicWebsite}</div>
          </div>
        </div>

        <div class="patient-box">
          <div><strong>Patient Name:</strong> ${patientName}</div>
          <div><strong>Prescription Date:</strong> ${formatClinicDate(rx.date)}</div>
          <div><strong>Patient ID:</strong> ${patientId}</div>
          <div><strong>Prescribing Doctor:</strong> ${rx.dentistName}</div>
          <div><strong>Age / Sex:</strong> ${patientAge} / ${patientGender}</div>
          <div><strong>BMDC Reg / License:</strong> ${rx.licenseNumber || 'Dental Practitioner'}</div>
        </div>

        ${allergy && allergy.toLowerCase() !== 'none' && allergy.toLowerCase() !== 'none reported' ? `
          <div class="allergy-alert">
            Allergy Advisory: Documented patient allergy — <strong>${allergy}</strong>. Verify drug interactions.
          </div>
        ` : ''}

        <div class="rx-heading">
          <span class="rx-symbol">℞</span>
          <span class="rx-title">Medications & Pharmacotherapy Regimen</span>
        </div>

        <table class="med-table">
          <thead>
            <tr>
              <th style="width: 25px; text-align: center;">#</th>
              <th>Medication & Strength</th>
              <th>Route</th>
              <th>Frequency & Timing</th>
              <th>Duration</th>
              <th>Instructions</th>
            </tr>
          </thead>
          <tbody>
            ${rx.medications.map((m, idx) => `
              <tr>
                <td style="text-align: center; color: #94a3b8; font-weight: 700;">${idx + 1}</td>
                <td>
                  <span class="med-name">${m.name}</span>
                  ${m.dosage ? `<div class="med-dosage">Strength: ${m.dosage}</div>` : ''}
                </td>
                <td>${m.route || 'Oral'}</td>
                <td class="med-freq">${m.frequency || '1-0-1'}</td>
                <td>${m.duration || '5 days'}</td>
                <td>${m.instructions || 'After meals'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${rx.notes ? `
          <div class="notes-box">
            <strong>Directions & Special Advisory:</strong>
            ${rx.notes}
          </div>
        ` : ''}

        <div class="footer-section">
          <div class="footer-auth">
            <div><strong>DentFlow Dental Clinical System</strong></div>
            <div>Electronically generated & authenticated electronic prescription pad.</div>
          </div>
          <div class="sign-box">
            <div class="sign-line">${rx.dentistName}</div>
            <div class="sign-sub">${rx.licenseNumber || 'BMDC Registered Practitioner'}</div>
            <div class="sign-sub">Dental Surgeon & Specialist</div>
          </div>
        </div>
      </body>
    </html>
  `;

  let iframe = document.getElementById('dentflow-prescription-printer') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'dentflow-prescription-printer';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print():', err);
        window.print();
      }
    }, 400);
  } else {
    window.print();
  }
}
