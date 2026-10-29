# DentFlow — Dental Clinic Management System

**DentFlow** is a modern, secure, and production-grade dental clinic management web application built with React 19, TypeScript, Tailwind CSS, and Firebase (Firebase Authentication and Google Cloud Firestore).

---

## 1. Core Clinical & Practice Modules

1. **Interactive FDI Odontogram (Dental Charting)**:
   - Full ISO 3950 / FDI Two-Digit tooth numbering system.
   - Adult permanent dentition (11–18, 21–28, 31–38, 41–48) and pediatric deciduous dentition (51–55, 61–65, 71–75, 81–85).
   - Surface-level diagnostics: Occlusal, Mesial, Distal, Buccal/Facial, Lingual/Palatal, Incisal.
   - Clinical conditions: Sound/Healthy, Caries/Cavity, Restorative Filling, Crown/Bridge, Root Canal Therapy (RCT), Dental Implant, Extraction, Periodontal Pocket, and Missing.
   - Lifecycle stages: Existing, Planned, and Completed.
   - Audit trail preserving historical clinical findings with doctor timestamps.

2. **Patient Medical Records (EMR)**:
   - 9 organized clinical sections: Overview, Medical History, FDI Odontogram, SOAP Clinical Notes, Treatment Plans, Appointments, Prescriptions (Rx), Invoices & Ledger, and Consent Documentation.
   - High-alert contraindications banner (Allergies, Diabetes, Cardiac Stents, Bleeding disorders).
   - Duplicate patient detection warning on registration.

3. **Smart Appointment Scheduling & Waiting Room**:
   - Double-booking prevention algorithm guarding dentist and operatory room overlaps.
   - Real-time patient pipeline: Scheduled, Confirmed, Checked In (Waiting Room), In Progress (On Chair), Completed, Cancelled, No Show.
   - Daily, weekly, and list calendar views.

4. **Phased Treatment Planning**:
   - Multi-phase sequencing (Phase 1: Urgent relief; Phase 2: Restorative; Phase 3: Prosthodontics/Maintenance).
   - Priority tagging (Low, Medium, High, Urgent), estimated fee calculations, and acceptance tracking.

5. **Structured SOAP Clinical Notes**:
   - Subjective chief complaints, objective intraoral findings, definitive diagnosis, treatment rendered log, and post-operative instructions.

6. **Printable Electronic Prescriptions (Rx)**:
   - Automated allergy cross-check alerting clinicians to documented drug sensitivities (e.g. penicillin contraindications).
   - Multi-medication posology schedule (dosage, route, frequency, duration, timing).
   - Printable clinic letterhead pad with registered BMDC doctor credentials.

7. **Itemized Billing & Financial Ledger**:
   - Default BDT (৳) currency with support for USD, EUR, and GBP.
   - Itemized procedure fees, calculated VAT/tax, and authorized discounts.
   - Partial payments, balance tracking, and multi-channel receipts (bKash, Nagad, POS Card, Cash).
   - Printable patient receipts and invoices.

8. **Dental Consumables & Inventory**:
   - Track local anesthetics, composite syringes, PPE, impression materials, and burs.
   - Reorder thresholds with low-stock warnings and expiration tracking.

9. **Reports & Analytics**:
   - Real-time collection metrics, outstanding receivables, treatment plan acceptance rates, and appointment distribution.
   - One-click CSV export.

---

## 2. Security & Role-Based Access Control (RBAC)

DentFlow implements 5 segregated roles strictly enforced in `firestore.rules`:

| Role | Permissions |
|---|---|
| **Clinic Owner / Admin** | Complete practice governance, staff profiles, pricing, clinic settings, financial reports, clinical oversight. |
| **Dentist** | Odontogram charting, treatment plans, clinical notes, prescriptions, patient medical records. |
| **Dental Assistant** | Patient chair prep, appointment tracking, material inventory restocking. |
| **Receptionist** | Patient registration, appointment scheduling, waiting room check-in, invoice viewing. |
| **Accountant** | Invoicing, payment collection, receipts, financial summaries (without access to private clinical notes). |

### Role Simulation & Evaluation
An **Active Role Simulator** is built into the top navigation bar, allowing reviewers and administrators to test the UI and permissions from the perspective of any of the 5 roles in real time.

---

## 3. Firebase Backend Configuration

- **Authentication**: Firebase Auth with Google Sign-In and Email/Password.
- **Database**: Cloud Firestore with hardened rules deployed via `fax.DeployRules`.
- **Database Instance ID**: `ai-studio-b8eaae2d-6e38-4caf-84a9-63667f430742`
- **Initial Clinic Seeding**: Seeds standard procedure prices (D0150, D1110, D2330, etc.), sample patient records, and consumable stock on initialization.

---

## 4. Administrative Handover & Disaster Recovery Protocol

1. **Ownership**: Root clinic authority is bound to the owner UID and verified email (`shihab.rajshahi@gmail.com`).
2. **Transfer of Ownership**: Can be conducted by updating the `ownerId` field in the clinic configuration document through authenticated administration.
3. **Audit Trail**: Every clinical chart amendment, invoice payment, and encounter note preserves creator UIDs and immutable timestamps.
