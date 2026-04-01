import { useState, useMemo, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { ARStatus } from '@/types';

interface ARWorkflowProps {
  householdId: string;
  onBack: () => void;
}

const steps = ['Outreach', 'Scheduled', 'Completed'] as const;

function statusToStep(status: ARStatus): number {
  switch (status) {
    case 'Working to Schedule': return 0;
    case 'Scheduled': return 1;
    case 'Completed':
    case 'Ready to Schedule':
    default: return 0;
  }
}

export default function ARWorkflow({ householdId, onBack }: ARWorkflowProps) {
  const { households, interactions, addInteraction } = useData();
  const household = households.find(h => h.id === householdId);

  // Find existing outreach interaction for this cycle to pre-fill
  const existingOutreach = useMemo(() => {
    if (!household) return null;
    return interactions
      .filter(i => i.household_id === householdId && i.type === 'Annual review meeting' && i.ar_status === 'Working to Schedule')
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [interactions, householdId, household]);

  // Find existing scheduled interaction for this cycle to pre-fill
  const existingScheduled = useMemo(() => {
    if (!household) return null;
    return interactions
      .filter(i => i.household_id === householdId && i.type === 'Annual review meeting' && i.ar_status === 'Scheduled')
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }, [interactions, householdId, household]);

  const initialStep = household ? statusToStep(household.annual_review_status) : 0;
  const [step, setStep] = useState(initialStep);
  const [savedMsg, setSavedMsg] = useState('');

  // Step 1 - Outreach (pre-fill from existing outreach)
  const [outreachDate, setOutreachDate] = useState(existingOutreach?.date || '');
  const [followUpDate, setFollowUpDate] = useState(existingOutreach?.follow_up || '');
  const [outreachNote, setOutreachNote] = useState('');

  // Step 2 - Scheduled (pre-fill from existing scheduled interaction or household field)
  const [scheduledDate, setScheduledDate] = useState(existingScheduled?.follow_up || household?.annual_review_scheduled || '');
  const [scheduledNote, setScheduledNote] = useState(existingScheduled?.note || '');

  // Step 3 - Completed
  const [completedDate, setCompletedDate] = useState('');
  const [planUpdated, setPlanUpdated] = useState(false);
  const [completedNote, setCompletedNote] = useState('');

  const isSaving = useRef(false);

  if (!household) return null;

  const guardedAddInteraction = (data: Parameters<typeof addInteraction>[0]) => {
    if (isSaving.current) return;
    isSaving.current = true;
    addInteraction(data);
    setTimeout(() => { isSaving.current = false; }, 500);
  };

  const showSuccess = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const logOutreach = () => {
    if (!outreachDate) return;
    guardedAddInteraction({
      household_id: householdId,
      date: outreachDate,
      type: 'Annual review meeting',
      touch_status: null,
      counts_cadence: false,
      marks_ar: false,
      ar_status: 'Working to Schedule',
      plan_updated: false,
      follow_up: followUpDate || null,
      note: outreachNote,
    });
    showSuccess('Outreach logged ✓');
  };

  const logScheduled = () => {
    if (!scheduledDate) return;
    guardedAddInteraction({
      household_id: householdId,
      date: scheduledDate,
      type: 'Annual review meeting',
      touch_status: null,
      counts_cadence: false,
      marks_ar: false,
      ar_status: 'Scheduled',
      plan_updated: false,
      follow_up: scheduledDate,
      note: scheduledNote,
    });
    showSuccess('Meeting scheduled ✓');
  };

  const logCompleted = () => {
    if (!completedDate) return;
    guardedAddInteraction({
      household_id: householdId,
      date: completedDate,
      type: 'Annual review meeting',
      touch_status: null,
      counts_cadence: planUpdated,
      marks_ar: true,
      ar_status: 'Completed',
      plan_updated: planUpdated,
      follow_up: null,
      note: completedNote,
    });
    onBack();
  };

  const logPostpone = () => {
    if (!followUpDate) return;
    guardedAddInteraction({
      household_id: householdId,
      date: new Date().toISOString().slice(0, 10),
      type: 'Annual review meeting',
      touch_status: null,
      counts_cadence: false,
      marks_ar: false,
      ar_status: 'Postponed',
      plan_updated: false,
      follow_up: followUpDate,
      note: '',
    });
    onBack();
  };

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft size={16} /> Back
        </button>
        <span className="text-sm font-medium">{household.identifier} — Annual Review</span>
        <div className="w-12" />
      </div>

      {/* Success banner */}
      {savedMsg && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-md bg-primary/10 text-primary text-sm flex items-center gap-2">
          <Check size={14} /> {savedMsg}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1 px-4 py-3 border-b">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <button
              onClick={() => setStep(i)}
              className={`text-xs px-3 py-1 rounded-full ${
                i === step ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {s}
            </button>
            {i < steps.length - 1 && <ChevronRight size={12} className="text-muted-foreground" />}
          </div>
        ))}
      </div>

      <div className="px-4 py-5 space-y-4">
        {step === 0 && (
          <>
            <Field label="Outreach Date">
              <input type="date" value={outreachDate} onChange={e => setOutreachDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
            </Field>
            <Field label="Follow-up Date (optional)">
              <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
            </Field>
            <Field label="Note">
              <input type="text" value={outreachNote} onChange={e => setOutreachNote(e.target.value)}
                placeholder="Optional" className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
            </Field>
            <div className="space-y-2 pt-2">
              <button onClick={logOutreach} disabled={!outreachDate}
                className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-40">
                {existingOutreach ? 'Log Another Follow-up' : 'Log Outreach Sent'}
              </button>
              <button onClick={() => setStep(1)}
                className="w-full py-2 text-sm rounded-md border bg-card">
                They Responded →
              </button>
              <button onClick={logPostpone} disabled={!followUpDate}
                className="w-full py-2 text-sm rounded-md border bg-card disabled:opacity-40">
                Postpone
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Scheduled Meeting Date">
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
            </Field>
            <Field label="Note">
              <input type="text" value={scheduledNote} onChange={e => setScheduledNote(e.target.value)}
                placeholder="Optional" className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
            </Field>
            <div className="space-y-2 pt-2">
              <button onClick={logScheduled}
                disabled={!scheduledDate}
                className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-40">
                Save Scheduled Date
              </button>
              <button onClick={() => setStep(2)}
                className="w-full py-2 text-sm rounded-md border bg-card">
                Go to Completed →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Completion Date">
              <input type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={planUpdated} onChange={e => setPlanUpdated(e.target.checked)} className="rounded" />
              Financial plan was updated (for your reference only)
            </label>
            <Field label="Note">
              <input type="text" value={completedNote} onChange={e => setCompletedNote(e.target.value)}
                placeholder="Optional" className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
            </Field>
            <button onClick={logCompleted} disabled={!completedDate}
              className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-40">
              Mark Complete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
