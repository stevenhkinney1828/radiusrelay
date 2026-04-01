import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { getDisplayARStatus, getARStatusBadgeClass, formatDate, isCycleComplete } from '@/lib/household-logic';
import { ChevronLeft, Edit2, Star, X } from 'lucide-react';
import { parseISO, subMonths } from 'date-fns';
import type { Interaction } from '@/types';

interface ClientDetailProps {
  householdId: string;
  onBack: () => void;
  onEdit: () => void;
  onARWorkflow: () => void;
  onTouchWorkflow: () => void;
}

// --- Label mapping for AR steps ---
function arStepLabel(entry: Interaction): string {
  if (entry.marks_ar) return 'Review completed';
  switch (entry.ar_status) {
    case 'Working to Schedule': return 'Outreach sent';
    case 'Scheduled': return 'Meeting scheduled';
    case 'Postponed': return 'Postponed';
    case 'Skipped': return 'Skipped';
    default: return entry.ar_status || 'Annual review';
  }
}

// --- Types for display list ---
type DisplayItem =
  | { kind: 'flat'; interaction: Interaction }
  | { kind: 'ar-group'; completed: boolean; entries: Interaction[] };

/** Group AR interactions into cycles; leave others flat.
 * Interactions arrive newest-first. A marks_ar entry is the END of a cycle.
 * When we hit marks_ar and the current group already has newer (post-cycle) entries,
 * flush those as a separate open-cycle group before starting the completed cycle. */
function buildDisplayList(sortedInteractions: Interaction[]): DisplayItem[] {
  const items: DisplayItem[] = [];
  let currentGroup: Interaction[] | null = null;
  let currentCompleted = false;

  const flushGroup = () => {
    if (currentGroup && currentGroup.length > 0) {
      items.push({ kind: 'ar-group', completed: currentCompleted, entries: [...currentGroup] });
      currentGroup = null;
      currentCompleted = false;
    }
  };

  for (const i of sortedInteractions) {
    if (i.type === 'Annual review meeting') {
      if (!currentGroup) {
        currentGroup = [];
        currentCompleted = false;
      }
      if (i.marks_ar) {
        // Flush any newer open-cycle entries first
        if (currentGroup.length > 0) {
          flushGroup();
        }
        // Start completed group — don't flush yet; older steps will follow
        currentGroup = [i];
        currentCompleted = true;
      } else {
        currentGroup.push(i);
      }
    } else {
      flushGroup();
      items.push({ kind: 'flat', interaction: i });
    }
  }
  flushGroup();
  return items;
}

export default function ClientDetail({ householdId, onBack, onEdit, onARWorkflow, onTouchWorkflow }: ClientDetailProps) {
  const { households, interactions, updateInteraction } = useData();

  // Edit panel state for completed AR cycle
  const [editingAR, setEditingAR] = useState<Interaction | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editPlanUpdated, setEditPlanUpdated] = useState(false);
  const household = households.find(h => h.id === householdId);

  const clientInteractions = useMemo(() =>
    interactions
      .filter(i => i.household_id === householdId)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [interactions, householdId]
  );

  // 18-month window
  const cutoff = subMonths(new Date(), 18).toISOString().slice(0, 10);
  const recentInteractions = useMemo(() =>
    clientInteractions.filter(i => i.date >= cutoff),
    [clientInteractions, cutoff]
  );

  const displayList = useMemo(() => buildDisplayList(recentInteractions), [recentInteractions]);

  // Up next items
  const upNext = useMemo(() => {
    if (!household) return [];
    const items: { label: string; date: string; type: string }[] = [];

    if (household.next_quarterly_touch) {
      items.push({ label: 'Quarterly touch', date: household.next_quarterly_touch, type: 'touch' });
    }
    if (household.next_review_target && !isCycleComplete(household)) {
      items.push({ label: 'Annual review', date: household.next_review_target, type: 'review' });
    }
    if (household.annual_review_scheduled) {
      items.push({ label: 'Review meeting', date: household.annual_review_scheduled, type: 'scheduled' });
    }
    if (household.next_follow_up) {
      items.push({ label: 'Follow up', date: household.next_follow_up, type: 'nudge' });
    }

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [household]);

  if (!household) return null;

  const displayStatus = getDisplayARStatus(household);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft size={16} />
          Back
        </button>
        <button onClick={onEdit} className="p-2 text-muted-foreground">
          <Edit2 size={16} />
        </button>
      </div>

      <div className="px-4 py-4">
        <h2 className="text-xl font-semibold">{household.identifier}</h2>
        {household.note && <p className="text-sm text-muted-foreground mt-1">{household.note}</p>}
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-3 px-4">
        <button onClick={onARWorkflow} className="p-4 rounded-lg border bg-card text-left">
          <div className="text-xs text-muted-foreground mb-1">Annual Review</div>
          <span className={getARStatusBadgeClass(displayStatus)}>
            {displayStatus}
            {isCycleComplete(household) && household.last_completed_review
              ? ' · ' + formatDate(household.last_completed_review, 'MMM d, yyyy')
              : household.annual_review_status === 'Scheduled' && household.annual_review_scheduled
              ? ' · ' + formatDate(household.annual_review_scheduled, 'MMM d, yyyy')
              : household.next_review_target
              ? ' · ' + new Date(household.next_review_target + 'T00:00:00')
                  .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : ''}
          </span>
        </button>

        <button onClick={onTouchWorkflow} className="p-4 rounded-lg border bg-card text-left">
          <div className="text-xs text-muted-foreground mb-1">Quarterly Touch</div>
          {household.next_quarterly_touch && household.next_quarterly_touch < today ? (
            <span className="status-badge status-badge-overdue">
              Overdue · {formatDate(household.next_quarterly_touch, 'MMM d, yyyy')}
            </span>
          ) : (
            <span className="status-badge bg-indigo-100 text-indigo-700">
              {formatDate(household.next_quarterly_touch, 'MMM d, yyyy')}
            </span>
          )}
          <div className="text-xs text-muted-foreground mt-2">
            Last: {formatDate(household.last_counted_touch, 'MMM d')}
          </div>
        </button>
      </div>

      {/* Cadence info */}
      <div className="px-4 mt-4">
        <div className="text-xs text-muted-foreground">
          Cadence: {household.cadence_days} days · Last review: {formatDate(household.last_completed_review, 'MMM yyyy')}
        </div>
      </div>

      {/* Up Next */}
      {upNext.length > 0 && (
        <div className="mt-5">
          <div className="section-header">Up Next</div>
          {upNext.map((item, i) => (
            <div key={i} className="px-4 py-2 flex items-center justify-between border-b">
              <span className="text-sm">{item.label}</span>
              <span className={`text-xs ${item.date < today ? 'text-status-overdue font-medium' : 'text-muted-foreground'}`}>
                {formatDate(item.date, 'MMM d, yyyy')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="mt-5">
        <div className="section-header">Timeline</div>
        {displayList.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No interactions yet</p>
        ) : (
          displayList.map((item, idx) =>
            item.kind === 'flat' ? (
              <TimelineRow key={item.interaction.id} interaction={item.interaction} />
            ) : (
              <ARGroupCard
                key={`ar-${idx}`}
                completed={item.completed}
                entries={item.entries}
                onEditCompleted={item.completed ? (entry) => {
                  setEditingAR(entry);
                  setEditDate(entry.date);
                  setEditPlanUpdated(entry.plan_updated);
                } : undefined}
              />
            )
          )
        )}
      </div>

      {/* Edit AR Completion Panel */}
      {editingAR && (
        <AREditPanel
          interaction={editingAR}
          editDate={editDate}
          setEditDate={setEditDate}
          editPlanUpdated={editPlanUpdated}
          setEditPlanUpdated={setEditPlanUpdated}
          allInteractions={clientInteractions}
          onSave={() => {
            updateInteraction(editingAR.id, {
              date: editDate,
              plan_updated: editPlanUpdated,
            });
            setEditingAR(null);
          }}
          onCancel={() => setEditingAR(null)}
        />
      )}
    </div>
  );
}

// --- AR Group Card (compact milestone summary) ---
function ARGroupCard({ completed, entries }: { completed: boolean; entries: Interaction[] }) {
  // For completed cycles, show only the completion entry; for open cycles show all steps
  const toShow = completed ? entries.filter(e => e.marks_ar) : entries;
  const chronological = [...toShow].reverse();

  return (
    <div className="mx-4 my-2 rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Star size={14} className={completed ? 'text-green-500 fill-green-500' : 'text-purple-500 fill-purple-500'} />
          <span className="text-sm font-medium">Annual review</span>
        </div>
        {completed && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            Completed ✓
          </span>
        )}
      </div>

      {/* Milestone list */}
      <div
        className="mx-3 mb-3 pl-3"
        style={{ borderLeft: `2px solid ${completed ? '#D1FAE5' : '#EDE9FE'}` }}
      >
        {chronological.map(entry => (
          <div key={entry.id} className="py-1 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {arStepLabel(entry)}
                </span>
                {entry.plan_updated && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 whitespace-nowrap">
                    📋 Plan updated
                  </span>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {formatDate(entry.date, 'MMM d, yyyy')}
              </span>
            </div>
            {entry.note && (
              <p className="text-[10px] text-muted-foreground/70 ml-4 truncate italic">
                {entry.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Flat timeline row (Quarterly touch, Ad hoc call) ---
function TimelineRow({ interaction }: { interaction: Interaction }) {
  const typeLabels: Record<string, string> = {
    'Quarterly check-in': '📞',
    'Annual review meeting': '📋',
    'Ad hoc call': '💬',
  };

  const detail = interaction.type === 'Quarterly check-in'
    ? interaction.touch_status
    : interaction.type === 'Annual review meeting'
      ? interaction.ar_status
      : interaction.counts_cadence ? 'Counts toward cadence' : '';

  return (
    <div className="px-4 py-3 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{typeLabels[interaction.type] || '•'}</span>
          <span className="text-sm font-medium">{interaction.type}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatDate(interaction.date, 'MMM d, yyyy')}</span>
      </div>
      {detail && <div className="text-xs text-muted-foreground mt-1 ml-7">{detail}</div>}
      {interaction.note && <div className="text-xs text-muted-foreground mt-0.5 ml-7 italic">{interaction.note}</div>}
    </div>
  );
}
