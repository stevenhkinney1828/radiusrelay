import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ARStatus } from '@/types';

interface ARWorkflowProps {
  householdId: string;
  onBack: () => void;
}

const steps = ['Outreach', 'Scheduled', 'Completed'] as const;

export default function ARWorkflow({ householdId, onBack }: ARWorkflowProps) {
  const { households, addInteraction } = useData();
  const household = households.find(h => h.id === householdId);
  const [step, setStep] = useState(0);

  // Step 1 - Outreach
  const [outreachDate, setOutreachDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [outreachNote, setOutreachNote] = useState('');

  // Step 2 - Scheduled
  const [scheduledDate, setScheduledDate] = useState('');

  // Step 3 - Completed
  const [completedDate, setCompletedDate] = useState('');
  const [planUpdated, setPlanUpdated] = useState(false);
  const [completedNote, setCompletedNote] = useState('');

  if (!household) return null;

  const logOutreach = () => {
    if (!outreachDate) return;
    addInteraction({
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
    onBack();
  };

  const logScheduled = () => {
    if (!scheduledDate) return;
    addInteraction({
      household_id: householdId,
      date: scheduledDate,
      type: 'Annual review meeting',
      touch_status: null,
      counts_cadence: false,
      marks_ar: false,
      ar_status: 'Scheduled',
      plan_updated: false,
      follow_up: scheduledDate,
      note: '',
    });
    onBack();
  };

  const logCompleted = () => {
    if (!completedDate) return;
    addInteraction({
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
    addInteraction({
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
                Log Outreach Sent
              </button>
              <button onClick={() => { if (outreachDate) { setStep(1); } }}
                disabled={!outreachDate}
                className="w-full py-2 text-sm rounded-md border bg-card disabled:opacity-40">
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
            <div className="space-y-2 pt-2">
              <button onClick={logScheduled} disabled={!scheduledDate}
                className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-40">
                Confirm Scheduled
              </button>
              <button onClick={() => { if (scheduledDate) { setStep(2); } }}
                disabled={!scheduledDate}
                className="w-full py-2 text-sm rounded-md border bg-card disabled:opacity-40">
                Skip to Completed →
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
              Financial plan was updated
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
