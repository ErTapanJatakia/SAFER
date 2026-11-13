import React from 'react';
import { useModalFocus } from '../hooks/useModalFocus.ts';
import { SAFER_FREE_PLAN_REFERENCE } from '../utils/budgetPolicy.ts';
import { ShieldCheck, X, AlertTriangle, Info } from 'lucide-react';

interface BudgetPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetPolicyModal: React.FC<BudgetPolicyModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useModalFocus<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-policy-title"
    >
      <section className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] text-slate-900">
        <header className="bg-slate-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-6 h-6 text-teal-300 shrink-0" />
            <div className="min-w-0">
              <h2 id="budget-policy-title" className="font-bold text-base">SAFER INR 0 Budget Policy</h2>
              <p className="text-xs text-slate-300">Reviewed free-plan reference and operating guardrails</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close budget policy" className="text-slate-300 hover:text-white p-2 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-teal-950">
            <p className="font-semibold">Operating constraint: INR 0</p>
            <p className="mt-1 text-xs leading-relaxed">SAFER development and hosting must remain within genuinely no-cost plans. No paid APIs, subscriptions, billing upgrades, or paid infrastructure.</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Reviewed free-plan reference</h3>
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {SAFER_FREE_PLAN_REFERENCE.map((service) => (
                <li key={service.provider} className="py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                  <div>
                    <p className="font-semibold">{service.provider}</p>
                    <p className="text-xs text-slate-600">{service.purpose}</p>
                  </div>
                  <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded px-2 py-1 self-start">{service.plan}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <strong>Important:</strong> This is an advisory policy reference, not a technical billing lock or live pricing feed. Free-plan terms, quotas, eligibility and commercial-use restrictions can change. Verify the provider’s current terms before enabling a service.
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">Unknown providers, plans or costs must be reviewed rather than assumed free. Any paid billing or non-zero expected monthly cost is outside policy. No cloud account settings are changed by this screen.</p>
          </div>
        </div>

        <footer className="border-t border-slate-200 px-4 sm:px-6 py-3 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Close</button>
        </footer>
      </section>
    </div>
  );
};
