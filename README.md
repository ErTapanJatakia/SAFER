# SAFER
### Security Administration, Field Readiness, Evidence & Reporting
**Tagline:** Prepared. Accountable. Secure.  
**Product Descriptor:** AI-Assisted Security Operations Platform

An administrative readiness, qualification audit, incident documentation, and defensive cybersecurity management prototype engineered for protective security operations and personnel readiness oversight.

> **Demonstration Notice & Statement of Independence:** This application is an independent portfolio demonstration and readiness prototype, not an official product or endorsement of any private military company or operational agency. It is a defensive administrative software prototype built entirely with simulated, non-sensitive, unverified sample demonstration records. It does not connect to live operational command systems, weapons inventories, classified databases, surveillance apparatus, police records, or external communication networks. Preloaded records are sample and unverified records intended solely for demonstration and interface evaluation.

<img width="1774" height="887" alt="SAFER-Github_Repo" src="https://github.com/user-attachments/assets/ecf0bca5-6c94-4aff-b1a3-3109eaed4c10" />

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

## 4. Privacy, Data Handling & Security Boundaries

- **Demo Guest operational records:** Personnel, incident, cyber-hygiene, and checklist records are stored in this browser's `localStorage` for the explicit Demo Guest experience. They are not synced to a tenant database and have no automatic expiry; closing the tab, restarting the browser, or signing out does not erase them. Use the **Reset Records** action to clear the four operational record sets and restore the bundled synthetic baseline. Theme, accessibility, and branding preferences are preserved. This is not a secure-erasure guarantee; exported files and browser/device backups are outside this reset. Browser-local storage is not a secure vault; use synthetic demonstration records only.
- **No real operational data in Demo Guest:** Do not enter real personal information, health particulars, employee records, incident evidence, credentials, or sensitive operational notes. Other scripts running on the same origin may be able to access browser storage.
- **Browser preferences:** Theme, custom branding, logos, and accessibility preferences are also persisted in browser-local storage.
- **Exports:** Report and roster exports are generated in the browser and downloaded by the user. Review redactions and the destination device before sharing an export.
- **Firebase account services:** When configured, Firebase Authentication handles account registration, email verification, sign-in, password reset, and Google sign-in. These account operations require network communication with Firebase/Google.
- **Tenant access is not released:** The application includes an organisation-membership verification foundation, but successful authentication or membership resolution does not grant access to the operational workspace. The tenant operational repository is not implemented or enabled.
- **Firestore production posture:** Production Firestore rules remain default-deny. No production tenant data onboarding, tenant operational reads/writes, or migration from browser storage is enabled.
- **No privileged backend:** This prototype does not use Cloud Functions, an Admin SDK, custom claims, or a privileged service-account workflow.
- **Synthetic sample records:** Preloaded personnel, incident reports, and checklist items are fictional demonstration data and must not be treated as verified records or real-world findings.

### Important deployment and security notes

- Firebase web configuration values exposed to a browser are not secrets. Access control must be enforced by Firebase Authentication and Firestore Security Rules.
- A successful CI run validates the tested code paths; it is not a penetration test, independent security assessment, or production authorization.
- Security-header configuration in `vercel.json` takes effect only after a deployment containing that configuration is live. Verify actual response headers after deployment rather than relying on repository configuration alone.
- Automatic Vercel Git deployments are configured in the repository to allow `main` and disable other branches. This policy itself takes effect only after Vercel deploys a commit containing the configuration.

---

## 5. Technology Stack & How to Run

### Technology used

- **Application:** React 19 with TypeScript
- **Build and development:** Vite 8
- **Styling and icons:** Tailwind CSS 4 and Lucide React
- **Authentication foundation:** Firebase Authentication (email/password and Google)
- **Data boundary:** Explicit Demo Guest repository; tenant repository reserved but not released
- **Production database posture:** Firestore configured for the project, with production rules remaining default-deny
- **Document generation:** `jspdf`, `jspdf-autotable`, `xlsx`, and `docx`
- **Testing:** Node.js test runner, Vitest, TypeScript, Firebase Emulator Suite

### Local development

Requirements: Node.js 22 and npm. From the repository root:

```bash
npm install
npm run dev
```

The Vite development server starts on port 3000. To validate locally:

```bash
npm run lint
npm run build
node --test tests/vercel-security-headers.test.mjs
npm run test:firestore-rules
npm run test:tenant-membership
npm run test:auth-membership-ui
npm run test:data-boundary
npm run test:demo-repository
npm run test:demo-workspace
npm run test:session-lifecycle
npm run test:session-invalidation
npm audit --omit=dev --audit-level=high
```

Firebase Emulator tests require the Java runtime used by the CI workflow. The CI pipeline also installs dependencies from the frozen Bun lockfile before running validation.

---

## 6. Verification & Test Summary

The GitHub Actions validation workflow currently checks:

| Validation area | What it covers |
| :--- | :--- |
| Vercel security-header policy | Expected response-header configuration and Content Security Policy directives |
| Firestore Security Rules | Allow/deny behavior exercised against the Firebase Emulator |
| Tenant membership resolver | Membership lookup and identity/organisation matching behavior |
| AuthGate membership UI | Authentication, membership-state, and workspace-boundary behavior |
| Operational data boundary | Fail-closed repository selection and unavailable tenant repository |
| Demo Guest repository | Browser-local demonstration data operations |
| Demo Guest workspace boundary | Explicit Demo Guest access and revocation behavior |
| Session lifecycle | Identity transitions and stale asynchronous membership results |
| Cross-tab session invalidation | Broadcast/storage transport, replay handling, and cleanup |
| Dependency security audit | Production dependency advisories at the configured high severity threshold |
| Type-check | TypeScript compilation without emitting files |
| Production build | Vite production bundle generation |

The workflow is the source of truth for the current automated validation scope. Individual test counts can change as regression coverage grows; this README intentionally avoids stale fixed totals.

### Current release limitations

- Tenant operational data access is not released. Authenticated users do not receive the Demo Guest workspace or a tenant repository.
- Production Firestore rules remain default-deny; candidate rules in source control are not evidence that production rules have been published.
- Demo Guest data is browser-local and intended only for synthetic records. It is not tenant-isolated storage for real operational information.
- No automatic migration of existing browser-local data to Firebase is implemented.
- First-owner provisioning, invitations, role lifecycle, owner transfer, recovery, and production tenant onboarding remain outside the released feature set.
- COOP and COEP response headers remain deferred pending compatibility validation for Google sign-in and cross-origin resources.
- Live security-header effectiveness must be verified against the deployed site after the deployment quota permits a new deployment.

