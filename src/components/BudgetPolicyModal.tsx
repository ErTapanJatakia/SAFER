import React, { useState } from 'react';
import { useModalFocus } from '../hooks/useModalFocus.ts';
import { evaluateBudgetPolicy, SAFER_FREE_PLAN_REFERENCE, type BudgetPolicyResult } from '../utils/budgetPolicy.ts';
import { ShieldCheck, X, AlertTriangle, Info, Search } from 'lucide-react';

interface BudgetPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetPolicyModal: React.FC<BudgetPolicyModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useModalFocus<HTMLDivElement>(isOpen, onClose);
  const [provider, setProvider] = useState('');
  const [plan, setPlan] = useState('');
  const [monthlyCost, setMonthlyCost] = useState('');
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [result, setResult] = useState<BudgetPolicyResult | null>(null);

  if (!isOpen) return null;

  const assess = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(evaluateBudgetPolicy({
      provider,
      plan,
      billingEnabled,
      expectedMonthlyCostInr: monthlyCost.trim() === '' ? undefined : Number(monthlyCost),
    }));
  };

  const verdictStyles = result?.verdict === 'within-policy'
    ? 'border-teal-300 bg-teal-50 text-teal-950'
    : result?.verdict === 'out-of-policy'
      ? 'border-rose-300 bg-rose-50 text-rose-950'
      : 'border-amber-300 bg-amber-50 text-amber-950';

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
              <h2 id="budget-policy-title" className="font-bold text-base">SAFER INR 0 Budget Policy Inspector</h2>
              <p className="text-xs text-slate-300">Assess a provider and plan against SAFER’s operating constraint</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close budget policy" className="text-slate-300 hover:text-white p-2 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-teal-950">
            <p className="font-semibold">Operating constraint: INR 0</p>
            <p className="mt-1 text-xs leading-relaxed">No paid APIs, subscriptions, billing upgrades, or paid infrastructure for SAFER. This inspector is an advisory control; it does not change provider billing settings.</p>
          </div>

          <form onSubmit={assess} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Search className="w-4 h-4" /> Assess a service</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Provider
                <input required value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="e.g. Firebase" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Plan
                <input required value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="e.g. Spark" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                Expected monthly cost (INR, optional)
                <input type="number" min="0" step="0.01" value={monthlyCost} onChange={(event) => setMonthlyCost(event.target.value)} placeholder="Leave blank if not yet verified" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal" />
              </label>
            </div>
            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={billingEnabled} onChange={(event) => setBillingEnabled(event.target.checked)} className="mt-0.5" />
              Paid billing is enabled for this provider account
            </label>
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Assess against policy</button>
          </form>

          {result && (
            <div role="status" aria-live="polite" className={`rounded-lg border p-3 ${verdictStyles}`}>
              <p className="font-semibold">{result.verdict === 'within-policy' ? 'Within reviewed policy' : result.verdict === 'out-of-policy' ? 'Outside policy' : 'Manual review required'} — {result.provider}</p>
              <p className="mt-1 text-xs leading-relaxed">{result.reason}</p>
            </div>
          )}

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
