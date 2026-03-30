import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { getDisplayARStatus, getARStatusBadgeClass, formatDate, formatMonthYear, isCycleComplete } from '@/lib/household-logic';
import { ChevronLeft, Edit2 } from 'lucide-react';
import { parseISO, subMonths, isAfter } from 'date-fns';
import type { Interaction } from '@/types';

interface ClientDetailProps {
  householdId: string;
  onBack: () => void;
  onEdit: () => void;
  onARWorkflow: () => void;
  onTouchWorkflow: () => void;
}

export default function ClientDetail({ householdId, onBack, onEdit, onARWorkflow, onTouchWorkflow }: ClientDetailProps) {
  const { households, interactions } = useData();
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

  // Up next items
  const upNext = useMemo(() => {
    if (!household) return [];
    const items: { label: string; date: string; type: string }[] = [];
    const today = new Date().toISOString().slice(0, 10);

    if (household.next_quarterly_touch) {
      items.push({
        label: 'Quarterly touch',
        date: household.next_quarterly_touch,
        type: 'touch',
      });
    }
    if (household.next_review_target && !isCycleComplete(household)) {
      items.push({
        label: 'Annual review',
        date: household.next_review_target,
        type: 'review',
      });
    }
    if (household.annual_review_scheduled) {
      items.push({
        label: 'Review meeting',
        date: household.annual_review_scheduled,
        type: 'scheduled',
      });
    }
    if (household.next_follow_up) {
      items.push({
        label: 'Follow up',
        date: household.next_follow_up,
        type: 'nudge',
      });
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
          </span>
          <div className="text-xs text-muted-foreground mt-2">
            Target: {formatMonthYear(household.next_review_target)}
          </div>
        </button>

        <button onClick={onTouchWorkflow} className="p-4 rounded-lg border bg-card text-left">
          <div className="text-xs text-muted-foreground mb-1">Quarterly Touch</div>
          <div className={`text-sm font-medium ${
            household.next_quarterly_touch && household.next_quarterly_touch < today
              ? 'text-status-overdue' : ''
          }`}>
            {formatDate(household.next_quarterly_touch, 'MMM d, yyyy')}
          </div>
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
        {recentInteractions.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No interactions yet</p>
        ) : (
          recentInteractions.map(i => (
            <TimelineRow key={i.id} interaction={i} />
          ))
        )}
      </div>
    </div>
  );
}

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
