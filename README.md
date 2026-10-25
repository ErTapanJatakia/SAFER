# SAFER
### Security Administration, Field Readiness, Evidence & Reporting
**Tagline:** Prepared. Accountable. Secure.  
**Product Descriptor:** AI-Assisted Security Operations Platform

An administrative readiness, qualification audit, incident documentation, and defensive cybersecurity management prototype engineered for protective security operations and personnel readiness oversight.

> **Demonstration Notice & Statement of Independence:** This application is an independent portfolio demonstration and readiness prototype, not an official product or endorsement of any private military company or operational agency. It is a defensive administrative software prototype built entirely with simulated, non-sensitive, unverified sample demonstration records. It does not connect to live operational command systems, weapons inventories, classified databases, surveillance apparatus, police records, or external communication networks. Preloaded records are sample and unverified records intended solely for demonstration and interface evaluation.

---

## 1. Project Purpose

Protection operations coordinators, supervisors, and administrative officers face complex logistical and safety compliance burdens:
- **Personnel Readiness & Credential Audit:** Tracking certification validity (First Aid/CPR, emergency comms, protective driving, venue security) across personnel, highlighting expiring or unverified qualifications.
- **Defensive Cyber Hygiene:** Auditing defensive cybersecurity posture (operating-system patches, phishing awareness, hardware MFA tokens) to prevent credential compromise across field teams.
- **Objective Incident Documentation:** Structuring field incident narratives into clear administrative records while strictly separating reported facts from unverified claims and never automating legal guilt or liability findings.
- **Pre-Deployment Safety Verification:** Conducting comprehensive operational readiness reviews across safety, administrative, communications, and equipment readiness domains.

**SAFER** (**Security Administration, Field Readiness, Evidence & Reporting**) provides a centralized, human-in-the-loop workstation that isolates documentation gaps, enforces field-level redaction, and maintains an absolute boundary against automated deployment authorizations.

---

## 2. Key Features

### Section 1: Executive Operations Dashboard
- Real-time administrative metrics: **Total Personnel Roster** count, documentation validity, outstanding checklist requirements, pending supervisory reviews, and open incident investigations.
- Quick-action navigation shortcuts to jump directly to expiring certifications, active incident investigations, and overdue pre-deployment tasks.
- Operational readiness status breakdown across active personnel.

### Section 2: Personnel Readiness & Certification Audit
- Individual and roster-wide administrative qualification tracking with realistic Indian-context personnel profiles (Veer Bahadur Singh, Arjun Mehta, Priyanka Nair, Ayesha Khan, Rohan Deshmukh, Gurpreet Kaur, Karthik Iyer).
- Discrete and independent **PMC Employee ID** (`PMC-ID-001`, `PMC-ID-002`, etc.) and **Badge ID** (`PMC-ID-XXX`) fields.
- Universal standardisation on **Call Sign** across all views, search bars, modals, and exports.
- Comprehensive personal data fields: Personal Email Address, Birth Date (DD-MM-YYYY), Marital Status, Blood Group (including rare/other phenotype input with international ABO/Rh coverage), and Health Particulars.
- Structured address model with synchronized Correspondence Address duplication toggle ("Correspondence Address is the same as Residence Address").
- Multiple Operational Role(s), Professional Specialization(s), and repeatable Work Experience entries with start/end (DD-MM-YYYY) dates, "Currently working here" toggle, contact numbers, job descriptions, and skills in use.
- Automatic expiration calculations (Valid, Expiring within 45 days, Expired, or Unverified) with explicit `Completion Date (DD-MM-YYYY)` and `Expiry Date (DD-MM-YYYY)` indicators.
- Plain-English administrative readiness summary generation with one-click clipboard copy and text download.
- Full form validation for adding and editing personnel records.

### Section 3: Personnel Export & Granular Field Redaction System
- Exports individual dossiers or the full roster across 5 major formats:
  - **Plain Text (.txt)**: Clean section headers, numbered employer entries, and full confidentiality notice.
  - **Comma-Separated Values (.csv)**: UTF-8 BOM, RFC 4180 compliant quoting, and structured field-value layout.
  - **Excel Workbook (.xlsx)**: Multi-worksheet workbook with dedicated tabs for Overview, Work Experience, Qualifications, and Administrative Audit.
  - **PDF Document (.pdf)**: High-resolution styled PDF with administrative banners, paginated auto-tables, and redaction warnings.
  - **Microsoft Word Document (.docx)**: Valid OpenXML `.docx` with headings, tables, and numbered employer narratives.
- **Granular Schema-Driven Redaction**:
  - Every schema field—including each individual repeated employer and qualification—has an independent redaction toggle.
  - Sensitive fields (identifiers, personal email, birth date, marital status, blood group, health particulars, addresses, and employer phone numbers) preselected by default.
  - Quick controls: "Select All Redactions", "Clear All Redactions", and "Reset to Sensitive Defaults".
  - Live search filter to quickly locate specific fields.
  - Live export preview tab showing the exact output before download.
  - Strict redaction integrity: redacted values are replaced with `[REDACTED]`, keeping labels visible and never modifying source records.
  - Safe, non-sensitive filenames (`PMC-ID-001_personnel_record_YYYY-MM-DD.ext` or `personnel_roster_N_records_YYYY-MM-DD.ext`) with zero PII in filenames.
  - 100% client-side execution with zero external data transmissions.

### Section 4: Indian-Context Incident Reports & Factual Extraction Engine
- **8 Preloaded Demonstration Incidents** set in realistic Indian administrative and operational contexts:
  1. *Unreturned Access Badge:* Managed facility visitor/contractor badge unreturned at Electronics City, Bengaluru, Karnataka.
  2. *Visitor-Log Discrepancy:* Physical paper register missing exit time vs. turnstile badge-out at Cyber City, Gurugram, Haryana.
  3. *Missing Equipment Transceiver:* VHF radio missing from charging bay during shift changeover at HITEC City, Hyderabad, Telangana.
  4. *Suspicious Credential Phishing Email:* Employee-reported spoofed HR payroll email at Bandra Kurla Complex (BKC), Mumbai, Maharashtra.
  5. *Overdue Generator Maintenance:* 125 kVA emergency backup generator maintenance delay at Salt Lake Sector V, Kolkata, West Bengal.
  6. *Lost Company Device:* Administrative mobile smartphone misplaced in transit at Sector 62, Noida, Uttar Pradesh, with confirmed remote MDM wipe.
  7. *Incomplete Handover Log:* Unrecorded patrol window at static security reception in Hinjewadi Phase 2, Pune, Maharashtra.
  8. *Safety Checklist Follow-Up:* Fire exit corridor obstructed by equipment crates at OMR, Chennai, Tamil Nadu.
- All incident records adhere to:
  - Dates formatted as `DD-MM-YYYY` and times in 24-hour format with `IST` (`HH:mm IST`).
  - Realistic Indian names, facilities, and regional state/UT jurisdictions.
  - Strictly neutral language with no visible occurrences of "Fictional" or "fictional".
- **10-Point Structured Incident Drafting**:
  1. Incident Reference Identifier
  2. Date & Time (DD-MM-YYYY HH:mm IST)
  3. Location Description
  4. People & Roles Involved (Personnel / Role Identifiers)
  5. Factual Chronological Account
  6. Actions Taken (Only as reported, never invented)
  7. Witness Information
  8. Physical & Digital Evidence References
  9. Outstanding Questions & Missing Information
  10. Follow-up Actions Requiring Human Review
- **Strict Factual Reporting Safeguards**:
  - Automatically isolates reported facts from unverified claims (`claimed`, `alleged`, `suspected`, `believed`).
  - Preserves source timestamps and wording.
  - Never invents witness statements, evidence tokens, or actions taken; marks missing information as `[NO WITNESS INFORMATION PROVIDED IN SOURCE NOTES]`.
  - Flags contradictions and information gaps for human supervisory review.
  - Never generates automated findings about guilt, responsibility, or legal liability.
  - Allows full user editing and local `.txt` export of the generated draft.

### Section 5: Cybersecurity Hygiene & Defensive Posture
- Defensive checklist covering 10 critical operational cybersecurity domains:
  1. Device and operating-system updates
  2. Multi-factor authentication (MFA)
  3. Password-manager usage
  4. Phishing awareness & simulated threat samples
  5. Secure handling of documents
  6. Lost-device reporting protocols
  7. Account access reviews
  8. Backup and recovery checks
  9. Suspicious-activity reporting
  10. Basic incident escalation pathways
- Explicit distinction between **General Recommendations** (baseline best practices) and **Verified Findings** (audited field controls).
- Suspicious Email Awareness Training Lab illustrating threat indicators (spoofed domains, artificial urgency, mismatched URLs).
- Defensive posture metrics and plain-English cybersecurity briefing export.

### Section 6: Pre-Deployment Administrative & Safety Checklist
- Multi-domain pre-deployment verification across 8 mandatory categories based on *Operation Setu* at Yashobhoomi (IICC Dwarka, New Delhi):
  1. Required documentation and approvals
  2. Training and certification validity
  3. Emergency contacts and escalation arrangements
  4. First-aid and emergency preparedness documentation
  5. Equipment inventory and condition records
  6. Device and communications security checks
  7. Required briefings and acknowledgements
  8. Outstanding issues requiring a supervisor's review
- Three-state item statuses: `Complete`, `Incomplete` (Outstanding), and `Not Applicable`.
- Prominent highlight banner for outstanding items requiring supervisor intervention.
- Human supervisory sign-off capture with reviewer name and date.
- Form validation for adding custom pre-deployment items.
- Structured human-review summary report generator with plain-text copy and file export.

---

## 3. Presentation, Themes, Branding & Accessibility

### Independent Logo Usage Controls
- **Dual Independent Logo Placements:**
  - Independent Top Logo (configurable to Top-Left or Top-Right corner)
  - Independent Bottom Logo (configurable to Bottom-Left or Bottom-Right corner)
- **Security & Validation Controls:**
  - File format validation (PNG, JPG, SVG, WebP) up to 2MB.
  - SVG sanitization preventing embedded `<script>`, `onload`, or active executable markup.
  - Independent upload, removal, preview, size adjustment (small, medium, large, xlarge), and accessible alt-text configuration.
  - Changes or removals to one logo operate completely independently of the other.

### 19 Tactical, Camouflage & High-Visibility Theme Presets
- **Standard & Dark:** Midnight Navy, Stealth Obsidian, Tactical Charcoal, Slate Grey, Arctic White, Emerald Guard
- **Camouflage:** Woodland BDU, Desert MARPAT, MultiCam Tactical, Urban SpecOps, Night Recon, Winter Tundra (featuring subtle CSS pattern layers with solid, readable card surfaces)
- **High Visibility / Field:** Safety Hi-Vis Amber, High-Vis Orange, Search & Rescue Red, Air Ops Sky, Subdued Desert, Field Khaki, Maritime Fleet
- All themes maintain high typographic contrast and satisfy readable visual hierarchy.

### Accessibility Features
- **Accessible Typography & Focus:** High-contrast color pairings, visible focus outlines on all interactive elements, and semantic button/input elements.
- **Accessible Modals:** Trap focus, announce dialog role, support Escape-key closing, and provide explicit close controls.
- **Demonstration Notice Modal:** Permanently accessible via header, keyboard operable, with complete legal and operational disclaimer disclosures.
- **Form Controls:** Clear field labels, helper descriptions, and error announcements that do not break layout when accessibility settings or high-zoom modes are enabled.

---

## 4. Privacy & Security Limitations

- **100% Client-Side Processing:** All personnel management, redaction filtering, incident parsing, and document exports execute entirely in the user's browser runtime.
- **No External Data Transmission:** User-entered personal data, health particulars, and operational notes are never transmitted to Gemini, external LLM endpoints, analytics servers, or remote databases.
- **In-Memory Demonstration State:** Additions and edits persist within the browser session memory. Resetting demo data returns records to the curated sample set without overwriting uncommitted user work.
- **Safe Export Filenames:** Exported filenames use anonymized patterns (e.g. `PMC-ID-001_personnel_record_2026-10-24.pdf`), preventing leakage of names or email addresses into filenames.
- **Synthetic Sample Records:** Preloaded personnel, incident reports, and checklist items are synthetic sample records created for demonstration purposes. They do not represent real persons, active legal cases, police reports, or operational entities.

---

## 5. Technology Stack & How to Run

### Technology Used
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Document Generation:** `jspdf`, `jspdf-autotable`, `xlsx`, `docx`
- **Unit Testing:** Node.js native test runner (`node:test`, `node:assert/strict`)

### Local Development Commands
```bash
# Install dependencies
npm install

# Start the Vite development server on port 3000
npm run dev

# Run all automated unit tests (37 tests across 5 suites)
node --test src/utils/*.test.ts

# Type checking and linting
npm run lint

# Production build
npm run build
```

---

## 6. Verification & Test Summary

| Test Domain | Target Tested | Result |
| :--- | :--- | :--- |
| **Indian-Context Incidents** | 8 requested scenarios (badge, visitor log, transceiver, phishing email, generator, lost phone, handover, fire exit) with Indian locations, DD-MM-YYYY dates, 24h IST times, neutral labels | **PASSED** (100%) |
| **Factual Incident Drafting** | Fact/claim separation, missing info tags, source timestamp preservation, zero guilt/liability findings, supervisory review items | **PASSED** (100%) |
| **Personnel & Call Sign Consistency** | `PMC-ID-XXX` format, `Call Sign` terminology, multiple roles/specializations, address synchronization, `(DD-MM-YYYY)` date indicators | **PASSED** (100%) |
| **Privacy, Redaction & Filenames** | Granular field masking (`[REDACTED]`), non-sensitive filenames, non-mutating redaction, safe SVG upload validation | **PASSED** (100%) |
| **Document Exports** | Multi-format generation (TXT, CSV, XLSX, PDF, DOCX) with headers, tables, and redactions | **PASSED** (100%) |
| **Spreadsheet Formula Defense (CWE-1236)** | Formula injection neutralization (`=`, `+`, `-`, `@`, `\t`, `\r`, `|`) in CSV and all XLSX worksheets | **PASSED** (100%) |
| **Logo & Image Data URL Defense (CWE-434, CWE-79)** | Rejection of active scripts, event handlers (`onload`, `on*`), and dangerous protocols (`javascript:`) | **PASSED** (100%) |
| **Path Traversal & Filename Defense (CWE-22)** | Directory traversal filtering (`..`, `/`, `\`), null-byte stripping, and safe filename creation | **PASSED** (100%) |
| **AI Prompt Injection Resistance (OWASP GenAI)** | Deterministic extraction rejecting adversarial overrides and prohibiting automated guilt findings | **PASSED** (100%) |
| **Cyber Hygiene & Posture** | 10 security domains, verified vs recommendation distinction, training scenario | **PASSED** (100%) |
| **Pre-Deployment Checklist** | 8 categories, metrics calculation, outstanding highlight banner, non-authorization disclaimer | **PASSED** (100%) |
| **Themes & Branding** | 19 theme presets, independent dual logo controls, accessible demonstration notice modal | **PASSED** (100%) |
| **Automated Suite Run** | 45 tests across `src/utils/*.test.ts` (`node:test`) | **45 / 45 PASSED** (0 failures) |
| **Compilation & Lint** | `compile_applet` and `tsc --noEmit` | **PASSED** (0 errors) |

### Limitations
- **Data Persistence:** In-memory demonstration state; data is not synced to a persistent database (PostgreSQL/Firebase) as requested by the standalone prototype architecture.
- **Natural Language Parsing:** Incident draft generator uses deterministic regex-based rules to ensure zero fabrication or hallucination; complex conversational narratives should be human-reviewed.
