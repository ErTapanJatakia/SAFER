import React, { useRef } from 'react';
import { ShieldAlert, X, Check, FileText } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';

interface DemonstrationNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemonstrationNoticeModal: React.FC<DemonstrationNoticeModalProps> = ({
  isOpen,
  onClose,
}) => {
  const understandButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useModalFocus<HTMLDivElement>(isOpen, onClose, understandButtonRef);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demonstration-notice-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[90vh] min-w-0 my-4 sm:my-8 text-slate-900"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-start justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="demonstration-notice-title" className="font-bold text-base text-white break-words">
                DEMONSTRATION NOTICE — FULL TEXT
              </h2>
              <p className="text-xs text-slate-400">
                Independent Portfolio Prototype &bull; Operational Safeguards & Demonstration Scope
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800 transition"
            aria-label="Close Demonstration Notice"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Notice Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed min-w-0">
          <section className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">Purpose and status</h3>
            <p>
              This application is an independent demonstration prototype designed to showcase personnel readiness administration, incident documentation, compliance checklists and defensive cybersecurity capabilities.
            </p>
            <p>
              It is not an official product of any organisation unless that organisation separately confirms its adoption or authorisation.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">Organisational branding</h3>
            <p>
              Logos uploaded by the presenter are provided for demonstration and presentation purposes. Their display does not imply that the logo owner developed, operates, endorses or is affiliated with this application. The presenter is responsible for obtaining appropriate permission to use organisational branding.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">Records and accuracy</h3>
            <p>
              Preloaded personnel, employment, health, contact, incident and other records are illustrative sample entries and are not verified operational records. They must not be treated as verified identities, qualifications, employment histories, incidents, evidence or statements about actual people or organisations.
            </p>
            <p>
              Information entered by users has not been independently verified. Users must review and validate information before relying on it or sharing it externally.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">Personal and sensitive information</h3>
            <p>
              Do not enter genuine personal data, medical information, confidential business information, classified information or sensitive operational information during demonstrations.
            </p>
            <p>
              The prototype is not a certified personnel-information management system, secure medical-record system or approved repository for operational records.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">Data storage, retention and exports</h3>
            <p>
              In Demo Guest mode, personnel, incident, cyber-hygiene and checklist records are stored in this browser profile's local storage. They are not synced to a tenant database. These records have no automatic expiry: closing a tab, restarting the browser or signing out does not erase them.
            </p>
            <p>
              Use the application's <strong>Reset Records</strong> action to remove the four operational Demo Guest record sets and restore the bundled synthetic baseline on the next load. This reset does not remove theme, accessibility or branding preferences. Clearing this site's browser data is a separate browser-level action and may also remove those preferences.
            </p>
            <p>
              Resetting browser storage is not a guarantee of secure erasure from browser backups, device snapshots or other copies. Browser-local storage is not a secure records-management system; other scripts on this origin and users of a shared or compromised device may be able to access stored data.
            </p>
            <p>
              Check all redaction settings before exporting records. Exported files are downloaded to a location controlled by the user and are not removed by Reset Records. Store, transfer and delete exported files responsibly.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">Artificial intelligence and human review</h3>
            <p>
              AI-generated summaries, classifications and recommendations may be incomplete, inaccurate or misleading. They must be reviewed by an appropriately qualified person. The application does not independently authenticate information, validate professional qualifications or certify an individual's readiness.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">Limitations</h3>
            <p>
              This prototype does not replace qualified professional judgement, legal advice, medical advice, emergency services, organisational policy or required human approval. It must not independently authorise deployment, determine fitness for duty or make consequential employment or operational decisions.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900">Responsible use</h3>
            <p>
              Users are responsible for complying with applicable privacy, data-protection, employment, information-security and other relevant legal requirements, as well as their organisation's policies.
            </p>
            <p className="font-semibold text-slate-900">
              By continuing to use the prototype, the user acknowledges these limitations.
            </p>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            Independent Demonstration Scope &bull; Human Authority Mandatory
          </div>
          <div className="flex items-start space-x-3 min-w-0">
            <button
              ref={understandButtonRef}
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Check className="w-4 h-4 text-teal-300" />
              <span>I Understand</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
