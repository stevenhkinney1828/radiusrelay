import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { addDays, format, parseISO, startOfMonth, addYears } from 'date-fns';
import type { CadenceDays } from '@/types';

interface AddClientModalProps {
  onClose: () => void;
  onDeleted?: () => void;
  editId?: string;
}

const cadenceOptions: CadenceDays[] = [30, 45, 60, 90, 120];

export default function AddClientModal({ onClose, onDeleted, editId }: AddClientModalProps) {
  const { households, addHousehold, updateHousehold, deleteHousehold } = useData();
  const existing = editId ? households.find(h => h.id === editId) : null;

  const [identifier, setIdentifier] = useState(existing?.identifier || '');
  const [planDate, setPlanDate] = useState(existing?.last_completed_review || '');
  const [cadenceDays, setCadenceDays] = useState<CadenceDays>(existing?.cadence_days || 90);
  const [note, setNote] = useState(existing?.note || '');
  const [planNote, setPlanNote] = useState(existing?.plan_note || '');
  const [isActive, setIsActive] = useState(existing?.is_active ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Calculated preview dates
  const previewNextTouch = planDate
    ? format(addDays(parseISO(planDate), cadenceDays), 'yyyy-MM-dd')
    : '';
  const previewNextReview = (() => {
    if (!planDate) return '';
    try {
      const d = parseISO(planDate);
      if (isNaN(d.getTime())) return '';
      return format(startOfMonth(addYears(d, 1)), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  })();

  const [nextTouch, setNextTouch] = useState(existing?.next_quarterly_touch || '');
  const [nextReview, setNextReview] = useState(existing?.next_review_target || '');

  const handleSave = () => {
    if (!identifier.trim()) return;

    if (editId && existing) {
      updateHousehold(editId, {
        identifier: identifier.trim(),
        cadence_days: cadenceDays,
        note,
        plan_note: planNote,
        is_active: isActive,
        next_quarterly_touch: nextTouch || existing.next_quarterly_touch,
        next_review_target: nextReview || existing.next_review_target,
      });
    } else {
      if (!planDate) return;
      addHousehold({
        identifier: identifier.trim(),
        planDate,
        cadenceDays,
        nextTouch: nextTouch || undefined,
        nextReviewTarget: nextReview || undefined,
        note,
        planNote,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (confirmDelete && editId) {
      deleteHousehold(editId);
      onDeleted ? onDeleted() : onClose();
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-[480px] rounded-t-xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{editId ? 'Edit Client' : 'Add Client'}</h2>

        <div className="space-y-4">
          <Field label="Safe Identifier">
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Initials or code"
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            />
          </Field>

          {!editId && (
            <Field label="Last Financial Plan Date">
              <input
                type="date"
                value={planDate}
                onChange={e => setPlanDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              />
            </Field>
          )}

          <Field label="Cadence (days)">
            <select
              value={cadenceDays}
              onChange={e => setCadenceDays(Number(e.target.value) as CadenceDays)}
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            >
              {cadenceOptions.map(d => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
          </Field>

          {planDate && !editId && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Next Touch">
                <input
                  type="date"
                  value={nextTouch || previewNextTouch}
                  onChange={e => setNextTouch(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                />
              </Field>
              <Field label="Next Review Target">
                <input
                  type="date"
                  value={nextReview || previewNextReview}
                  onChange={e => setNextReview(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                />
              </Field>
            </div>
          )}

          <Field label="Note">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="General note"
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            />
          </Field>

          <Field label="Plan Note">
            <input
              type="text"
              value={planNote}
              onChange={e => setPlanNote(e.target.value)}
              placeholder="Note about the plan"
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
            />
          </Field>

          {editId && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded"
              />
              Active
            </label>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border rounded-md bg-card">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!identifier.trim() || (!editId && !planDate)}
            className="flex-1 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-40"
          >
            Save
          </button>
        </div>

        {editId && (
          <button
            onClick={handleDelete}
            className="w-full mt-3 px-4 py-2 text-sm rounded-md text-destructive border border-destructive/30"
          >
            {confirmDelete ? 'Confirm Delete' : 'Delete Client'}
          </button>
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
