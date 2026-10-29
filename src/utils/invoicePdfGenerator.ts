import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Invoice,
  Payment,
  Patient,
  ClinicSettings,
} from '../types/dental';
import { formatClinicDate } from './dateFormatter';

export interface InvoicePdfData {
  invoice: Invoice;
  clinic: ClinicSettings | null;
  patient?: Patient | null;
  payments?: Payment[];
}

/**
 * Resolves a safe ASCII/Latin currency symbol for standard PDF fonts (Helvetica)
 * Standard Helvetica fails on Bengali Taka symbol '৳' or non-Latin glyphs.
 */
export const getSafeCurrencySymbol = (clinic?: ClinicSettings | null): string => {
  const sym = clinic?.currencySymbol;
  if (!sym) return 'Tk ';
  if (sym === '৳') return 'Tk ';
  if (sym === '$') return '$ ';
  if (sym === '€') return 'EUR ';
  if (sym === '£') return 'GBP ';
  return `${sym} `;
};

/**
 * Generates an official, publication-quality dental practice Invoice PDF
 * matching the Bright Smiles Dental Invoice layout
 */
export function generateInvoicePDF(
  invoice: Invoice,
  clinic: ClinicSettings | null,
  patient?: Patient | null,
  payments: Payment[] = []
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Customizable Clinic branding
  const clinicName = clinic?.name || clinic?.brandName || 'Bright Smiles';
  const clinicSubtitle = clinic?.badgeText || 'DENTAL CLINIC';
  const clinicSlogan = clinic?.slogan || 'Healthy Teeth • Brighter Smiles • Better Lives';
  const clinicAddress = clinic?.address || '123 Wellness Drive, Dhaka 1205, Bangladesh';
  const clinicPhone = clinic?.phone || '+880 1711 223344';
  const clinicEmail = clinic?.email || 'info@brightsmiles.com';
  const clinicWebsite = clinic?.website || 'www.brightsmiles.com';
  const currCode = clinic?.currency || 'BDT';

  // Palette matching Bright Smiles reference
  const primaryTeal: [number, number, number] = [0, 168, 150]; // #00A896
  const tableTeal: [number, number, number] = [0, 150, 136]; // #009688
  const darkNavy: [number, number, number] = [15, 41, 55]; // #0F2937
  const slateText: [number, number, number] = [51, 65, 85];
  const mutedText: [number, number, number] = [100, 116, 139];
  const lightBg: [number, number, number] = [240, 251, 251]; // #F0FBFB

  let currentY = 40;

  // 1. Draw Tooth Logo (Vector curves) on Left
  const logoX = margin;
  const logoY = currentY;

  // Draw stylized tooth vector
  doc.setDrawColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.setLineWidth(2.5);
  doc.setFillColor(255, 255, 255);

  // Outer tooth outline
  doc.roundedRect(logoX, logoY, 44, 44, 12, 12, 'S');

  // Smile contour inside
  doc.setLineWidth(2);
  doc.ellipse(logoX + 22, logoY + 24, 10, 6, 'S');

  // Clinic Title & Subtitle & Slogan
  const textLeftX = logoX + 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.text(clinicName, textLeftX, logoY + 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 168, 150);
  doc.text(clinicSubtitle.toUpperCase(), textLeftX, logoY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 118, 110);
  doc.text(clinicSlogan, textLeftX, logoY + 42);

  // Right Side Contact Information
  const rightX = pageWidth - margin;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);

  doc.text(clinicAddress, rightX, logoY + 12, { align: 'right' });
  doc.text(`Tel: ${clinicPhone}`, rightX, logoY + 23, { align: 'right' });
  doc.text(`Email: ${clinicEmail}`, rightX, logoY + 34, { align: 'right' });
  doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.text(`Web: ${clinicWebsite}`, rightX, logoY + 45, { align: 'right' });

  currentY = logoY + 54;

  // Full-width teal horizontal divider line
  doc.setDrawColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.setLineWidth(1.2);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 24;

  // 2. "Patient Invoice" title & Info Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('Patient Invoice', margin, currentY + 4);

  // Left side Patient Details
  const patientStartY = currentY + 22;
  const col1X = margin;
  const col2X = margin + 80;
  const col3X = margin + 90;

  const patientFields = [
    { label: 'Patient Name', val: patient?.fullName || invoice.patientName },
    { label: 'Patient ID', val: patient?.patientIdNumber || invoice.patientId || 'P-000123' },
    { label: 'Phone', val: patient?.phone || '+880 1812 345678' },
    { label: 'Email', val: patient?.email || 'patient@email.com' },
    { label: 'Date of Birth', val: patient?.dateOfBirth ? formatClinicDate(patient.dateOfBirth) : '15 Aug 1990' },
  ];

  patientFields.forEach((item, idx) => {
    const rowY = patientStartY + idx * 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(item.label, col1X, rowY);
    doc.text(':', col2X, rowY);

    doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(item.val, col3X, rowY);
  });

  // Right side Rounded Card (Invoice Details)
  const cardWidth = 190;
  const cardHeight = 74;
  const cardX = pageWidth - margin - cardWidth;
  const cardY = currentY - 2;

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(180, 230, 225);
  doc.setLineWidth(0.8);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 6, 6, 'FD');

  const invNum = invoice.invoiceNumber.startsWith('INV') ? invoice.invoiceNumber : `INV-${invoice.invoiceNumber}`;
  const invRows = [
    { label: 'Invoice No', val: invNum },
    { label: 'Issue Date', val: formatClinicDate(invoice.issueDate) },
    { label: 'Appointment Date', val: formatClinicDate(invoice.issueDate) },
    { label: 'Payment Due', val: formatClinicDate(invoice.dueDate) },
  ];

  invRows.forEach((item, idx) => {
    const rowY = cardY + 16 + idx * 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(slateText[0], slateText[1], slateText[2]);
    doc.text(item.label, cardX + 12, rowY);
    doc.text(':', cardX + 90, rowY);

    doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(item.val, cardX + 98, rowY);
  });

  currentY = Math.max(patientStartY + patientFields.length * 14 + 16, cardY + cardHeight + 16);

  // 3. Items Table
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

  const tableBody = items.map((it, idx) => [
    (idx + 1).toString(),
    it.description,
    it.toothOrArea || '—',
    it.quantity.toString(),
    it.unitPrice.toLocaleString(),
    it.total.toLocaleString(),
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    headStyles: {
      fillColor: tableTeal,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
      textColor: darkNavy,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 32, halign: 'center', fillColor: [0, 135, 122], textColor: [255, 255, 255] },
      1: { cellWidth: contentWidth - 272 },
      2: { cellWidth: 70, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 65, halign: 'right' },
      5: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
    head: [['#', 'Description', 'Tooth / Area', 'Qty', `Unit Price (${currCode})`, `Amount (${currCode})`]],
    body: tableBody,
    margin: { left: margin, right: margin },
  });

  const finalTableY = (doc as any).lastAutoTable.finalY + 16;

  // 4. Payment Method & Summary Section
  const isPaid = invoice.status === 'Paid' || (invoice.balance || 0) === 0;
  const isPartial = invoice.status === 'Partially Paid' && (invoice.balance || 0) > 0;
  const primaryPayment = payments.find((p) => p.invoiceId === invoice.id);

  // Left: Payment Method box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(tableTeal[0], tableTeal[1], tableTeal[2]);
  doc.text('Payment Method', margin, finalTableY + 4);

  const payMethodRows = [
    { label: 'Paid by:', val: primaryPayment?.paymentMethod || (isPaid ? 'bKash / Cash' : 'Due Counter') },
    { label: 'Transaction ID:', val: primaryPayment?.referenceNumber || (isPaid ? '01812345678' : '—') },
    {
      label: 'Paid on:',
      val: primaryPayment?.date
        ? formatClinicDate(primaryPayment.date)
        : isPaid
        ? formatClinicDate(invoice.issueDate)
        : 'Pending',
    },
  ];

  payMethodRows.forEach((r, idx) => {
    const rY = finalTableY + 20 + idx * 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
    doc.text(r.label, margin, rY);

    doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(r.val, margin + 74, rY);
  });

  // Right: Subtotal, Discount, Total
  const summaryWidth = 190;
  const summaryX = pageWidth - margin - summaryWidth;
  let summaryY = finalTableY + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Subtotal', summaryX, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text((invoice.subtotal || invoice.total).toLocaleString(), pageWidth - margin, summaryY, { align: 'right' });
  summaryY += 15;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text('Discount', summaryX, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text((invoice.discount || 0).toLocaleString(), pageWidth - margin, summaryY, { align: 'right' });
  summaryY += 15;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(summaryX, summaryY - 4, pageWidth - margin, summaryY - 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`Total Amount (${currCode})`, summaryX, summaryY + 6);
  doc.text(invoice.total.toLocaleString(), pageWidth - margin, summaryY + 6, { align: 'right' });
  summaryY += 22;

  // Status Badge Pill
  if (isPaid) {
    doc.setFillColor(230, 248, 242);
    doc.setDrawColor(171, 237, 216);
    doc.setTextColor(0, 135, 90);
  } else if (isPartial) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 230, 138);
    doc.setTextColor(180, 83, 9);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.setTextColor(185, 28, 28);
  }

  doc.setLineWidth(0.8);
  doc.roundedRect(summaryX, summaryY - 4, summaryWidth, 22, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Payment Status', summaryX + 10, summaryY + 10);
  doc.text(isPaid ? 'PAID' : isPartial ? 'PARTIALLY PAID' : 'DUE', pageWidth - margin - 10, summaryY + 10, {
    align: 'right',
  });

  // 5. Footer Section: Notes & Calligraphic Thank You
  const footerY = Math.max(finalTableY + 84, summaryY + 36);

  // Footer dynamic fields
  const invoiceNotes =
    clinic?.invoiceNotes && clinic.invoiceNotes.length > 0
      ? clinic.invoiceNotes
      : [
          "Please follow the dentist's care instructions for a faster recovery.",
          'The next appointment is recommended in 6 months for a regular check-up.',
          `For any questions, please contact us at ${clinicPhone}.`,
        ];
  const invoiceThankYouMessage = clinic?.invoiceThankYouMessage || 'Thank you!';
  const invoiceFollowUpMessage = clinic?.invoiceFollowUpMessage || 'We look forward to seeing you again!';
  const invoiceFooterClinicName = clinic?.invoiceFooterClinicName || `${clinicName} Dental Clinic`;

  // Left: Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(tableTeal[0], tableTeal[1], tableTeal[2]);
  doc.text('Notes', margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  invoiceNotes.forEach((noteText, nIdx) => {
    doc.text(`• ${noteText}`, margin, footerY + 12 + nIdx * 11);
  });

  // Right: Thank You Sign-off
  const rightFooterX = pageWidth - margin - 70;
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(16);
  doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.text(invoiceThankYouMessage, rightFooterX, footerY + 10, { align: 'center' });

  // Underline flourish
  doc.setDrawColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.setLineWidth(1.5);
  doc.line(rightFooterX - 45, footerY + 14, rightFooterX + 45, footerY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
  doc.text(invoiceFollowUpMessage, rightFooterX, footerY + 26, { align: 'center' });

  doc.setDrawColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.setLineWidth(0.6);
  doc.line(rightFooterX - 55, footerY + 32, rightFooterX + 55, footerY + 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.text(invoiceFooterClinicName, rightFooterX, footerY + 42, { align: 'center' });

  return doc;
}

/**
 * Triggers direct download of the invoice as a PDF file
 */
export function exportInvoicePDF(
  invoice: Invoice,
  clinic: ClinicSettings | null,
  patient?: Patient | null,
  payments: Payment[] = []
): void {
  const doc = generateInvoicePDF(invoice, clinic, patient, payments);
  const cleanInv = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanName = (invoice.patientName || 'patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Invoice_${cleanInv}_${cleanName}.pdf`);
}

/**
 * Returns a Blob URL of the generated invoice PDF
 */
export function getInvoicePdfBlobUrl(
  invoice: Invoice,
  clinic: ClinicSettings | null,
  patient?: Patient | null,
  payments: Payment[] = []
): string {
  const doc = generateInvoicePDF(invoice, clinic, patient, payments);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}

/**
 * Prints the invoice reliably using a dedicated invisible iframe
 * strictly styled to match the Bright Smiles Dental Invoice layout
 */
export function printInvoiceDocument(
  invoice: Invoice,
  clinic: ClinicSettings | null,
  patient?: Patient | null,
  payments: Payment[] = []
): void {
  // Customizable Clinic Branding
  const clinicName = clinic?.name || clinic?.brandName || 'Bright Smiles';
  const clinicSubtitle = clinic?.badgeText || 'DENTAL CLINIC';
  const clinicSlogan = clinic?.slogan || 'Healthy Teeth • Brighter Smiles • Better Lives';
  const clinicAddress = clinic?.address || '123 Wellness Drive, Dhaka 1205, Bangladesh';
  const clinicPhone = clinic?.phone || '+880 1711 223344';
  const clinicEmail = clinic?.email || 'info@brightsmiles.com';
  const clinicWebsite = clinic?.website || 'www.brightsmiles.com';
  const currencyCode = clinic?.currency || 'BDT';

  // Customizable Invoice Footer Fields
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

  const isPaid = invoice.status === 'Paid' || (invoice.balance || 0) === 0;
  const isPartial = invoice.status === 'Partially Paid' && (invoice.balance || 0) > 0;
  const relevantPayments = payments.filter((p) => p.invoiceId === invoice.id);
  const primaryPayment = relevantPayments[0];

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

  const itemsHtml = items
    .map(
      (it, idx) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B;">${idx + 1}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 500; color: #1E293B;">${it.description}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #475569;">${it.toothOrArea || '—'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #334155; font-family: monospace;">${it.quantity}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #334155; font-family: monospace;">${it.unitPrice.toLocaleString()}</td>
      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: bold; color: #0F172A; font-family: monospace;">${it.total.toLocaleString()}</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${invoice.invoiceNumber} - ${invoice.patientName}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1E293B;
            background: #FFFFFF;
            margin: 0;
            padding: 24px;
            font-size: 13px;
            line-height: 1.4;
          }
          .header-wrap {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 14px;
          }
          .brand-left {
            display: flex;
            align-items: flex-start;
            gap: 14px;
          }
          .brand-text h1 {
            font-size: 28px;
            font-weight: 800;
            color: #008F8A;
            margin: 0 0 2px 0;
            letter-spacing: -0.5px;
          }
          .brand-text .subtitle {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #00A896;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .brand-text .slogan {
            font-size: 11px;
            color: #0F766E;
            font-weight: 500;
          }
          .contact-right {
            text-align: right;
            font-size: 11.5px;
            color: #475569;
          }
          .contact-item {
            margin-bottom: 3px;
          }
          .contact-icon {
            color: #00A896;
            margin-left: 4px;
          }
          .divider-line {
            width: 100%;
            height: 1.5px;
            background-color: #00A896;
            margin: 8px 0 22px 0;
          }
          .title-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 24px;
          }
          .patient-info h2 {
            font-size: 24px;
            font-weight: 800;
            color: #0F2937;
            margin: 0 0 12px 0;
          }
          .info-table {
            border-collapse: collapse;
            font-size: 12px;
          }
          .info-table td {
            padding: 3px 0;
          }
          .info-table .label {
            color: #475569;
            font-weight: 600;
            width: 110px;
          }
          .info-table .colon {
            color: #94A3B8;
            padding-right: 8px;
          }
          .info-table .val {
            color: #0F172A;
            font-weight: 500;
          }
          .invoice-card {
            background: #F0FBFB;
            border: 1px solid #CCFBF1;
            border-radius: 12px;
            padding: 14px 18px;
            width: 290px;
          }
          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .invoice-table td {
            padding: 3px 0;
          }
          .invoice-table .label {
            font-weight: 600;
            color: #334155;
            width: 120px;
          }
          .invoice-table .colon {
            color: #94A3B8;
            padding-right: 8px;
          }
          .invoice-table .val {
            color: #0F172A;
            font-weight: 600;
          }
          table.services {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0 24px 0;
            border: 1px solid #CCFBF1;
            border-radius: 8px;
            overflow: hidden;
          }
          table.services th {
            background-color: #009688;
            color: #FFFFFF;
            padding: 10px 12px;
            font-size: 11.5px;
            font-weight: 700;
          }
          .summary-wrap {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 28px;
          }
          .pay-details {
            font-size: 12px;
          }
          .pay-header {
            font-size: 12px;
            font-weight: 700;
            color: #009688;
            text-transform: uppercase;
            margin-bottom: 8px;
          }
          .totals-box {
            width: 260px;
          }
          .totals-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12.5px;
            margin-bottom: 12px;
          }
          .totals-table td {
            padding: 4px 0;
          }
          .total-row {
            border-top: 1px solid #CBD5E1;
            padding-top: 6px;
            font-weight: 800;
            font-size: 14px;
            color: #0F172A;
          }
          .status-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 800;
            font-size: 12px;
            background: ${isPaid ? '#E6F8F2' : isPartial ? '#FEF3C7' : '#FEF2F2'};
            color: ${isPaid ? '#00875A' : isPartial ? '#B45309' : '#B91C1C'};
            border: 1px solid ${isPaid ? '#ABEDD8' : isPartial ? '#FDE68A' : '#FECACA'};
          }
          .footer-wrap {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-top: 1px solid #F1F5F9;
            padding-top: 20px;
          }
          .notes-box {
            font-size: 11px;
            color: #475569;
            max-width: 360px;
          }
          .notes-box h4 {
            color: #00A896;
            margin: 0 0 6px 0;
            font-size: 12px;
            font-weight: 700;
          }
          .notes-box ul {
            margin: 0;
            padding-left: 16px;
          }
          .sign-right {
            text-align: right;
          }
          .cursive-thanks {
            font-family: "Brush Script MT", "Caveat", "Segoe Script", cursive;
            font-size: 36px;
            color: #00A896;
            font-weight: bold;
            margin-bottom: 2px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-wrap">
          <div class="brand-left">
            <svg width="68" height="68" viewBox="0 0 100 100" fill="none">
              <path d="M26 18 C14 28 12 46 16 64 C19 78 26 90 36 90 C43 90 45 76 50 74 C55 76 57 90 64 90 C74 90 81 78 84 64 C88 46 86 28 74 18 C64 10 56 18 50 20 C44 18 36 10 26 18 Z" stroke="#00A896" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="#FFFFFF"/>
              <path d="M34 40 C42 54 58 54 66 40" stroke="#00A896" stroke-width="3.8" stroke-linecap="round"/>
              <path d="M36 28 C41 24 45 25 48 27" stroke="#00A896" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
              <path d="M64 28 C59 24 55 25 52 27" stroke="#00A896" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>
            </svg>
            <div class="brand-text">
              <h1>${clinicName}</h1>
              <div class="subtitle">${clinicSubtitle}</div>
              <div class="slogan">${clinicSlogan}</div>
            </div>
          </div>
          <div class="contact-right">
            <div class="contact-item">${clinicAddress} <span class="contact-icon">📍</span></div>
            <div class="contact-item">${clinicPhone} <span class="contact-icon">📞</span></div>
            <div class="contact-item">${clinicEmail} <span class="contact-icon">✉</span></div>
            <div class="contact-item" style="color: #00A896; font-weight: 600;">${clinicWebsite} <span class="contact-icon">🌐</span></div>
          </div>
        </div>

        <div class="divider-line"></div>

        <!-- Title Section -->
        <div class="title-section">
          <div class="patient-info">
            <h2>Patient Invoice</h2>
            <table class="info-table">
              <tr>
                <td class="label">Patient Name</td>
                <td class="colon">:</td>
                <td class="val" style="font-weight: 700;">${patient?.fullName || invoice.patientName}</td>
              </tr>
              <tr>
                <td class="label">Patient ID</td>
                <td class="colon">:</td>
                <td class="val" style="font-family: monospace;">${patient?.patientIdNumber || invoice.patientId || 'P-000123'}</td>
              </tr>
              <tr>
                <td class="label">Phone</td>
                <td class="colon">:</td>
                <td class="val">${patient?.phone || '+880 1812 345678'}</td>
              </tr>
              <tr>
                <td class="label">Email</td>
                <td class="colon">:</td>
                <td class="val">${patient?.email || 'patient@email.com'}</td>
              </tr>
              <tr>
                <td class="label">Date of Birth</td>
                <td class="colon">:</td>
                <td class="val">${patient?.dateOfBirth ? formatClinicDate(patient.dateOfBirth) : '15 Aug 1990'}</td>
              </tr>
            </table>
          </div>

          <div class="invoice-card">
            <table class="invoice-table">
              <tr>
                <td class="label">Invoice No</td>
                <td class="colon">:</td>
                <td class="val" style="font-family: monospace;">${invoice.invoiceNumber.startsWith('INV') ? invoice.invoiceNumber : `INV-${invoice.invoiceNumber}`}</td>
              </tr>
              <tr>
                <td class="label">Issue Date</td>
                <td class="colon">:</td>
                <td class="val">${formatClinicDate(invoice.issueDate)}</td>
              </tr>
              <tr>
                <td class="label">Appointment Date</td>
                <td class="colon">:</td>
                <td class="val">${formatClinicDate(invoice.issueDate)}</td>
              </tr>
              <tr>
                <td class="label">Payment Due</td>
                <td class="colon">:</td>
                <td class="val">${formatClinicDate(invoice.dueDate)}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Services Table -->
        <table class="services">
          <thead>
            <tr>
              <th style="width: 38px; text-align: center; background-color: #00877A;">#</th>
              <th style="text-align: left;">Description</th>
              <th style="width: 110px; text-align: center;">Tooth / Area</th>
              <th style="width: 45px; text-align: center;">Qty</th>
              <th style="width: 110px; text-align: right;">Unit Price (${currencyCode})</th>
              <th style="width: 110px; text-align: right;">Amount (${currencyCode})</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Summary & Payment -->
        <div class="summary-wrap">
          <div class="pay-details">
            <div class="pay-header">💳 Payment Method</div>
            <table class="info-table">
              <tr>
                <td class="label">Paid by:</td>
                <td class="val" style="font-weight: 600;">${primaryPayment?.paymentMethod || (isPaid ? 'bKash / Cash' : 'Due Counter')}</td>
              </tr>
              <tr>
                <td class="label">Transaction ID:</td>
                <td class="val" style="font-family: monospace;">${primaryPayment?.referenceNumber || (isPaid ? '01812345678' : '—')}</td>
              </tr>
              <tr>
                <td class="label">Paid on:</td>
                <td class="val">${primaryPayment?.date ? formatClinicDate(primaryPayment.date) : isPaid ? formatClinicDate(invoice.issueDate) : 'Pending'}</td>
              </tr>
            </table>
          </div>

          <div class="totals-box">
            <table class="totals-table">
              <tr>
                <td style="color: #475569;">Subtotal</td>
                <td style="text-align: right; font-weight: 600; font-family: monospace;">${(invoice.subtotal || invoice.total).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="color: #475569;">Discount</td>
                <td style="text-align: right; font-weight: 600; font-family: monospace;">${(invoice.discount || 0).toLocaleString()}</td>
              </tr>
              <tr class="total-row">
                <td>Total Amount (${currencyCode})</td>
                <td style="text-align: right; font-family: monospace;">${invoice.total.toLocaleString()}</td>
              </tr>
            </table>

            <div class="status-banner">
              <span>Payment Status</span>
              <span>${isPaid ? 'PAID' : isPartial ? 'PARTIALLY PAID' : 'DUE'}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-wrap">
          <div class="notes-box">
            <h4>ℹ Notes</h4>
            <ul>
              ${invoiceNotes.map((n) => `<li>${n}</li>`).join('')}
            </ul>
          </div>

          <div class="sign-right">
            <div class="cursive-thanks">${invoiceThankYouMessage}</div>
            <div style="font-size: 11px; color: #64748B; margin-bottom: 6px;">${invoiceFollowUpMessage}</div>
            <div style="width: 180px; height: 1px; background: #00A896; margin-left: auto; margin-bottom: 6px;"></div>
            <div style="font-size: 11px; font-weight: 700; color: #009688;">${invoiceFooterClinicName}</div>
          </div>
        </div>
      </body>
    </html>
  `;

  // Hidden print iframe
  let iframe = document.getElementById('dentflow-invoice-printer') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'dentflow-invoice-printer';
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
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 400);
  }
}

/**
 * Prints a dedicated official practice receipt slip for a payment
 */
export function printReceiptDocument(
  payment: Payment,
  clinic: ClinicSettings | null
): void {
  const clinicName = clinic?.name || clinic?.brandName || 'Bright Smiles';
  const clinicAddress = clinic?.address || '123 Wellness Drive, Dhaka 1205, Bangladesh';
  const clinicPhone = clinic?.phone || '+880 1711 223344';
  const clinicEmail = clinic?.email || 'info@brightsmiles.com';
  const currencySymbol = clinic?.currencySymbol || '৳';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Receipt - ${payment.patientName}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1E293B; padding: 24px; font-size: 13px; line-height: 1.4; }
          .header { border-bottom: 2px solid #00A896; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .brand h1 { margin: 0 0 4px 0; font-size: 24px; color: #008F8A; font-weight: 800; }
          .sub { color: #64748B; font-size: 11px; margin: 2px 0; }
          .receipt-tag { text-align: right; }
          .receipt-tag h2 { margin: 0 0 4px 0; font-size: 18px; color: #0F172A; }
          .box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 12px; }
          .box p { margin: 6px 0; }
          .amount-box { background: #E6F8F2; border: 1px solid #ABEDD8; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
          .amount { font-size: 32px; font-weight: 800; color: #00875A; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>${clinicName}</h1>
            <p class="sub">${clinicAddress}</p>
            <p class="sub">Tel: ${clinicPhone} | Email: ${clinicEmail}</p>
          </div>
          <div class="receipt-tag">
            <h2>PAYMENT RECEIPT</h2>
            <p class="sub">Receipt Date: ${formatClinicDate(payment.date)}</p>
            <p class="sub">Ref: ${payment.referenceNumber || 'N/A'}</p>
          </div>
        </div>

        <div class="box">
          <p><strong>Patient Name:</strong> ${payment.patientName}</p>
          <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
          <p><strong>Reference / Invoice:</strong> ${payment.referenceNumber || 'Counter Receipt'}</p>
          <p><strong>Cashier:</strong> ${payment.receivedBy || 'Authorized Cashier'}</p>
        </div>

        <div class="amount-box">
          <div style="font-size: 12px; font-weight: 700; color: #00875A; text-transform: uppercase;">Amount Collected</div>
          <div class="amount">${currencySymbol} ${payment.amount.toLocaleString()}</div>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B;">
          <div>
            <p><strong>Thank you for choosing ${clinicName}!</strong></p>
            <p>Official electronic practice ledger receipt</p>
          </div>
          <div style="text-align: center; border-top: 1px solid #94A3B8; width: 160px; padding-top: 6px;">
            Authorized Cashier
          </div>
        </div>
      </body>
    </html>
  `;

  let iframe = document.getElementById('dentflow-receipt-printer') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'dentflow-receipt-printer';
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
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 400);
  }
}

