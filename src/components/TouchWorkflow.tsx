import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { ChevronLeft } from 'lucide-react';
import type { TouchStatus } from '@/types';

interface TouchWorkflowProps {
  householdId: string;
  onBack: () => void;
}

const outcomes: TouchStatus[] = ['Completed', 'Attempted - email', 'Attempted - phone', 'Skipped'];

export default function TouchWorkflow({ householdId, onBack }: TouchWorkflowProps) {
  const { households, addInteraction } = useData();
  const household = households.find(h => h.id === householdId);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome] = useState<TouchStatus>('Completed');
  const [note, setNote] = useState('');

  if (!household) return null;

  const handleSave = () => {
    if (!date) return;
    addInteraction({
      household_id: householdId,
      date,
      type: 'Quarterly check-in',
      touch_status: outcome,
      counts_cadence: outcome === 'Completed' || outcome === 'Attempted - email' || outcome === 'Attempted - phone',
      marks_ar: false,
      ar_status: null,
      plan_updated: false,
      follow_up: null,
      note,
    });
    onBack();
  };

  return (
    <div>
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft size={16} /> Back
        </button>
        <span className="text-sm font-medium">{household.identifier} — Quarterly Touch</span>
      </div>

      <div className="px-4 py-5 space-y-4">
        <Field label="Date">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
        </Field>

        <Field label="Outcome">
          <div className="space-y-2">
            {outcomes.map(o => (
              <button
                key={o}
                onClick={() => setOutcome(o)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md border transition-colors ${
                  outcome === o ? 'bg-primary text-primary-foreground border-primary' : 'bg-card'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Note">
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Optional" className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
        </Field>

        <button onClick={handleSave} disabled={!date}
          className="w-full py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-40">
          Save
        </button>
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
