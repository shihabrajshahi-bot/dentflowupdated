import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Appointment,
  Invoice,
  Payment,
  Patient,
  TreatmentPlan,
  ClinicSettings,
  ClinicExpense,
} from '../types/dental';

export interface ReportData {
  clinic: ClinicSettings | null;
  appointments: Appointment[];
  invoices: Invoice[];
  payments: Payment[];
  patients: Patient[];
  plans: TreatmentPlan[];
  expenses?: ClinicExpense[];
  generatedBy?: string;
  generatedRole?: string;
  reportingPeriod?: string;
  selectedMonth?: string; // YYYY-MM or 'all'
}

export function generateReportsPDF(data: ReportData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const clinicName = data.clinic?.name || 'Apex Dental Care & Implant Center';
  const clinicAddress = data.clinic?.address || 'House 42, Road 11, Banani, Dhaka, Bangladesh';
  const clinicPhone = data.clinic?.phone || '+880 1711-234567';
  const clinicEmail = data.clinic?.email || 'contact@apexdentalcare.com';
  const currency = data.clinic?.currency || 'BDT';
  const rawSymbol = data.clinic?.currencySymbol;
  // Standard PDF fonts (Helvetica) do not support non-Latin unicode glyphs like '৳'. Fallback to 'Tk ' or 'BDT '.
  const currencySymbol = (rawSymbol && rawSymbol !== '৳') ? rawSymbol + ' ' : 'Tk ';
  const generatedBy = data.generatedBy || 'Clinical Administration';
  const generatedRole = data.generatedRole || 'Clinic Owner';

  // Format month or period
  const periodLabel = data.reportingPeriod || (data.selectedMonth && data.selectedMonth !== 'all'
    ? `Monthly Cycle: ${data.selectedMonth}`
    : 'Comprehensive Practice Period (All-Time)');

  // Filter records by month if specified
  const filteredAppts = data.selectedMonth && data.selectedMonth !== 'all'
    ? data.appointments.filter((a) => a.date?.startsWith(data.selectedMonth!))
    : data.appointments;

  const filteredInvoices = data.selectedMonth && data.selectedMonth !== 'all'
    ? data.invoices.filter((i) => (i.issueDate || i.createdAt)?.startsWith(data.selectedMonth!))
    : data.invoices;

  const filteredPayments = data.selectedMonth && data.selectedMonth !== 'all'
    ? data.payments.filter((p) => (p.date || p.createdAt)?.startsWith(data.selectedMonth!))
    : data.payments;

  const filteredExpenses = data.selectedMonth && data.selectedMonth !== 'all' && data.expenses
    ? data.expenses.filter((e) => (e.date || e.createdAt)?.startsWith(data.selectedMonth!))
    : data.expenses || [];

  // Financial calculations
  const totalBilled = filteredInvoices.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const totalCollected = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((sum, i) => sum + (Number(i.balance) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalCollected - totalExpenses;

  // Appointment calculations
  const totalVisits = filteredAppts.length;
  const completedVisits = filteredAppts.filter((a) => a.status === 'Completed').length;
  const waitingVisits = filteredAppts.filter((a) => a.status === 'Checked In').length;
  const scheduledVisits = filteredAppts.filter((a) => a.status === 'Scheduled' || a.status === 'Confirmed').length;
  const cancelledVisits = filteredAppts.filter((a) => a.status === 'Cancelled' || a.status === 'No Show').length;
  const completionRate = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;
  const cancellationRate = totalVisits > 0 ? Math.round((cancelledVisits / totalVisits) * 100) : 0;

  // Plan acceptance
  const acceptedPlans = data.plans.filter(
    (p) => p.status === 'Accepted' || p.status === 'In Progress' || p.status === 'Completed'
  ).length;
  const planRate = data.plans.length > 0 ? Math.round((acceptedPlans / data.plans.length) * 100) : 0;

  // Color palette (Teal brand)
  const primaryTeal: [number, number, number] = [15, 57, 66]; // #0F3942
  const secondaryTeal: [number, number, number] = [13, 148, 136]; // #0D9488
  const darkSlate: [number, number, number] = [30, 41, 59]; // #1E293B
  const lightBg: [number, number, number] = [248, 250, 252]; // #F8FAFC

  // --------------------------------------------------------------------------
  // PAGE 1: HEADER & EXECUTIVE SUMMARY
  // --------------------------------------------------------------------------

  // Top Dark Teal Header Banner
  doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.rect(0, 0, 595.28, 90, 'F');

  // Accent Line
  doc.setFillColor(secondaryTeal[0], secondaryTeal[1], secondaryTeal[2]);
  doc.rect(0, 90, 595.28, 4, 'F');

  // Header Title & Subtitle
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(clinicName.toUpperCase(), 40, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(204, 251, 241);
  doc.text('DENTAL CLINIC MANAGEMENT & EXECUTIVE PERFORMANCE REPORT', 40, 52);

  doc.setFontSize(8);
  doc.setTextColor(153, 246, 228);
  doc.text(`${clinicAddress} • Tel: ${clinicPhone} • Email: ${clinicEmail}`, 40, 68);

  // Metadata Block (Right side of header)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORT REFERENCE:', 420, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(`DF-REP-${Date.now().toString().slice(-6)}`, 510, 36);

  doc.setFont('helvetica', 'bold');
  doc.text('GENERATED ON:', 420, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 510, 50);

  doc.setFont('helvetica', 'bold');
  doc.text('PERIOD:', 420, 64);
  doc.setFont('helvetica', 'normal');
  doc.text(periodLabel.length > 20 ? periodLabel.slice(0, 20) + '...' : periodLabel, 510, 64);

  // Document Title & Summary Banner
  let currentY = 114;
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Executive Performance Metrics', 40, currentY);

  currentY += 8;

  // 4 Key Performance Cards (AutoTable Grid)
  autoTable(doc, {
    startY: currentY,
    theme: 'plain',
    margin: { left: 40, right: 40 },
    head: [],
    body: [
      [
        `TOTAL REVENUE COLLECTED\n${currencySymbol} ${totalCollected.toLocaleString()}\n${filteredPayments.length} verified transactions`,
        `TOTAL INVOICED BILLING\n${currencySymbol} ${totalBilled.toLocaleString()}\n${filteredInvoices.length} issued invoices`,
        `OUTSTANDING BALANCE\n${currencySymbol} ${totalOutstanding.toLocaleString()}\nAccounts receivable pending`,
        `PRACTICE NET PROFIT\n${currencySymbol} ${netProfit.toLocaleString()}\nExpenses: ${currencySymbol} ${totalExpenses.toLocaleString()}`,
      ],
      [
        `APPOINTMENT VISITS\n${totalVisits} Total Visits\n${completionRate}% completion rate`,
        `COMPLETED PROCEDURES\n${completedVisits} Completed\n${cancelledVisits} cancellations/no-shows`,
        `PLAN ACCEPTANCE RATE\n${planRate}%\n${acceptedPlans} of ${data.plans.length} plans accepted`,
        `ACTIVE PATIENT ROSTER\n${data.patients.length} Registered Patients\nMedical record verified`,
      ],
    ],
    styles: {
      fillColor: [248, 250, 252],
      textColor: [30, 41, 59],
      fontSize: 8.5,
      font: 'helvetica',
      cellPadding: 8,
      lineWidth: 0.5,
      lineColor: [226, 232, 240],
      halign: 'left',
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { fontStyle: 'bold' },
      2: { fontStyle: 'bold' },
      3: { fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 22;

  // --------------------------------------------------------------------------
  // SECTION 2: APPOINTMENT & OPERATIONAL STATISTICS
  // --------------------------------------------------------------------------
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('2. Appointment Statistics & Clinical Flow', 40, currentY);
  currentY += 8;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    head: [['Appointment Pipeline Status', 'Visits Count', 'Distribution %', 'Clinical & Practice Assessment']],
    body: [
      ['Completed Treatments', `${completedVisits}`, `${completionRate}%`, 'Procedures successfully administered in operatories'],
      ['Scheduled & Confirmed', `${scheduledVisits}`, `${totalVisits > 0 ? Math.round((scheduledVisits / totalVisits) * 100) : 0}%`, 'Upcoming booked calendar visits on chair schedule'],
      ['Waiting in Lobby / Checked In', `${waitingVisits}`, `${totalVisits > 0 ? Math.round((waitingVisits / totalVisits) * 100) : 0}%`, 'Patients currently in waiting room awaiting call'],
      ['Cancelled / No-Show', `${cancelledVisits}`, `${cancellationRate}%`, 'Cancelled or missed patient bookings requiring recall'],
    ],
    headStyles: {
      fillColor: primaryTeal,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 22;

  // --------------------------------------------------------------------------
  // SECTION 3: FINANCIAL SUMMARIES & PAYMENT LEDGER
  // --------------------------------------------------------------------------
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('3. Financial Summaries & Revenue Ledger', 40, currentY);
  currentY += 8;

  // Calculate payment methods breakdown
  const paymentMethods: Record<string, { amount: number; count: number }> = {};
  filteredPayments.forEach((p) => {
    const method = p.paymentMethod || 'Cash';
    if (!paymentMethods[method]) paymentMethods[method] = { amount: 0, count: 0 };
    paymentMethods[method].amount += Number(p.amount) || 0;
    paymentMethods[method].count += 1;
  });

  const methodRows = Object.entries(paymentMethods).map(([m, val]) => [
    m,
    `${val.count} receipts`,
    `${currencySymbol} ${val.amount.toLocaleString()}`,
    `${totalCollected > 0 ? Math.round((val.amount / totalCollected) * 100) : 0}%`,
  ]);

  if (methodRows.length === 0) {
    methodRows.push(['Cash / Standard Payments', `${filteredPayments.length} receipts`, `${currencySymbol} ${totalCollected.toLocaleString()}`, '100%']);
  }

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    head: [['Payment Channel / Gateway', 'Transactions', 'Total Reconciled', 'Share of Collections']],
    body: methodRows,
    headStyles: {
      fillColor: secondaryTeal,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 5,
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 22;

  // --------------------------------------------------------------------------
  // PAGE 2: ITEMIZED INVOICES, OUTSTANDING BALANCES & SIGN-OFF
  // --------------------------------------------------------------------------
  doc.addPage();

  // Top header bar on Page 2
  doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.rect(0, 0, 595.28, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${clinicName} • Executive Financial & Patient Invoices Ledger`, 40, 24);
  doc.setFont('helvetica', 'normal');
  doc.text('Page 2 of 2', 510, 24);

  currentY = 60;
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('4. Itemized Invoices & Accounts Receivable Roster', 40, currentY);
  currentY += 8;

  // Prepare top invoice rows (up to 15 invoices)
  const invoiceRows = filteredInvoices.slice(0, 15).map((inv) => [
    inv.invoiceNumber,
    inv.patientName,
    inv.issueDate || inv.createdAt?.split('T')[0] || '—',
    inv.dueDate || '—',
    `${currencySymbol} ${(Number(inv.total) || 0).toLocaleString()}`,
    `${currencySymbol} ${(Number(inv.paidAmount) || 0).toLocaleString()}`,
    `${currencySymbol} ${(Number(inv.balance) || 0).toLocaleString()}`,
    inv.status,
  ]);

  if (invoiceRows.length === 0) {
    invoiceRows.push(['No Invoices', 'No billing records found for this period', '—', '—', `${currencySymbol} 0`, `${currencySymbol} 0`, `${currencySymbol} 0`, 'Clear']);
  }

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    head: [['Invoice #', 'Patient Name', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Balance', 'Status']],
    body: invoiceRows,
    headStyles: {
      fillColor: primaryTeal,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      6: { fontStyle: 'bold', textColor: [180, 83, 9] }, // Amber for balance
      7: { fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 25;

  // --------------------------------------------------------------------------
  // ADMINISTRATIVE VERIFICATION & AUDIT SIGN-OFF
  // --------------------------------------------------------------------------
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(40, currentY, 515.28, 90, 6, 6, 'FD');

  doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CLINICAL GOVERNANCE & REPORT VERIFICATION', 52, currentY + 18);

  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `This report reflects verified operational records from the DentFlow practice management database. All appointment throughputs,\npatient medical records, itemized billing invoices, and financial ledger receipts comply with clinic audit standards.`,
    52,
    currentY + 32
  );

  doc.setFont('helvetica', 'bold');
  doc.text(`Generated By: ${generatedBy} (${generatedRole})`, 52, currentY + 62);
  doc.setFont('helvetica', 'normal');
  doc.text(`Authorized Medical Director: Dr. Shihab Hossain (Lead Surgeon)`, 52, currentY + 75);

  // Signature lines
  doc.line(360, currentY + 60, 480, currentY + 60);
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Medical Director / Practice Seal', 360, currentY + 72);

  // Footer on Page 2
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `DentFlow Cloud Practice Automation | Apex Dental & Implant Centre | Internal Clinical Confidential Document`,
    40,
    815
  );

  return doc;
}

export function downloadReportsPDF(data: ReportData, customFilename?: string): void {
  const doc = generateReportsPDF(data);
  const dateStr = new Date().toISOString().split('T')[0];
  const periodSlug = data.selectedMonth && data.selectedMonth !== 'all' ? data.selectedMonth : 'Full_Practice';
  const filename = customFilename || `DentFlow_Executive_Report_${periodSlug}_${dateStr}.pdf`;
  doc.save(filename);
}

