import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { ChevronLeft } from 'lucide-react';

interface AdHocWorkflowProps {
  householdId: string;
  onBack: () => void;
}

export default function AdHocWorkflow({ householdId, onBack }: AdHocWorkflowProps) {
  const { households, addInteraction } = useData();
  const household = households.find(h => h.id === householdId);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [countsCadence, setCountsCadence] = useState(false);

  if (!household) return null;

  const handleSave = () => {
    if (!date) return;
    addInteraction({
      household_id: householdId,
      date,
      type: 'Ad hoc call',
      touch_status: null,
      counts_cadence: countsCadence,
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
        <span className="text-sm font-medium">{household.identifier} — Ad Hoc Call</span>
      </div>

      <div className="px-4 py-5 space-y-4">
        <Field label="Date">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
        </Field>

        <Field label="Note">
          <input type="text" value={note} onChange={e => setNote(e.target.value)}
            placeholder="What was discussed?" className="w-full px-3 py-2 border rounded-md text-sm bg-background" />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={countsCadence} onChange={e => setCountsCadence(e.target.checked)} className="rounded" />
          Count toward quarterly cadence
        </label>

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
