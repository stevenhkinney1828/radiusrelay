import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { getDisplayARStatus, getARStatusBadgeClass, formatDate, isCycleComplete } from '@/lib/household-logic';
import { parseISO, isBefore, startOfMonth, addMonths, isSameMonth } from 'date-fns';
import type { Household } from '@/types';

interface ReviewsTabProps {
  onSelectClient: (id: string) => void;
  onMoveAR?: (id: string) => void;
}

export default function ReviewsTab({ onSelectClient, onMoveAR }: ReviewsTabProps) {
  const { households } = useData();
  const now = new Date();
  const thisMonth = startOfMonth(now);
  const nextMonth = startOfMonth(addMonths(now, 1));

  const active = useMemo(() => households.filter(h => h.is_active && h.next_review_target), [households]);

  const inProgress = (h: Household) =>
    ['Working to Schedule', 'Postponed'].includes(h.annual_review_status);

  const overdue = useMemo(() => active.filter(h => {
    if (inProgress(h)) return false;
    const target = parseISO(h.next_review_target!);
    return isBefore(target, thisMonth) && !isCycleComplete(h);
  }).sort((a, b) => a.next_review_target!.localeCompare(b.next_review_target!)), [active, thisMonth]);

  const thisMonthClients = useMemo(() => active.filter(h => {
    if (inProgress(h)) return false;
    const target = parseISO(h.next_review_target!);
    return isSameMonth(target, thisMonth);
  }).sort((a, b) => a.identifier.localeCompare(b.identifier)), [active, thisMonth]);

  const nextMonthClients = useMemo(() => active.filter(h => {
    if (inProgress(h)) return false;
    const target = parseISO(h.next_review_target!);
    return isSameMonth(target, nextMonth);
  }).sort((a, b) => a.identifier.localeCompare(b.identifier)), [active, nextMonth]);

  const followUpNudges = useMemo(() =>
    households.filter(h =>
      h.is_active &&
      inProgress(h)
    ).sort((a, b) => (a.next_follow_up || '9999').localeCompare(b.next_follow_up || '9999')),
    [households]
  );

  return (
    <div>
      <Section title={`Overdue (${overdue.length})`} clients={overdue} onSelect={onSelectClient} onMove={onMoveAR} />
      <Section title={`This month (${thisMonthClients.length})`} clients={thisMonthClients} onSelect={onSelectClient} onMove={onMoveAR} />
      <Section title={`Next month (${nextMonthClients.length})`} clients={nextMonthClients} onSelect={onSelectClient} onMove={onMoveAR} />
      <NudgeSection title={`Follow-up nudges (${followUpNudges.length})`} clients={followUpNudges} onSelect={onSelectClient} />

      {overdue.length === 0 && thisMonthClients.length === 0 && nextMonthClients.length === 0 && followUpNudges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No reviews due</p>
        </div>
      )}
    </div>
  );
}

function getARDateStr(h: Household): string {
  const isCompleted = isCycleComplete(h);
  if (isCompleted && h.last_completed_review) {
    return ' · ' + formatDate(h.last_completed_review, 'MMM d, yyyy');
  }
  if (h.annual_review_status === 'Scheduled' && h.annual_review_scheduled) {
    return ' · ' + formatDate(h.annual_review_scheduled, 'MMM d, yyyy');
  }
  if (h.next_review_target) {
    return ' · ' + new Date(h.next_review_target + 'T00:00:00')
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
  return '';
}

function Section({ title, clients, onSelect, onMove }: {
  title: string;
  clients: Household[];
  onSelect: (id: string) => void;
  onMove?: (id: string) => void;
}) {
  if (clients.length === 0) return null;

  return (
    <div>
      <div className="section-header">{title}</div>
      {clients.map(h => {
        const displayStatus = getDisplayARStatus(h);
        const pillLabel = (displayStatus === 'Ready to Schedule' ? 'Ready' : displayStatus) + getARDateStr(h);
        return (
          <div key={h.id} className="client-row" onClick={() => onSelect(h.id)}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{h.identifier}</span>
              <span className={getARStatusBadgeClass(displayStatus)}>
                {pillLabel}
              </span>
            </div>
            {onMove && (
              <button
                onClick={e => { e.stopPropagation(); onMove(h.id); }}
                className="text-xs text-muted-foreground px-2 py-1 rounded border bg-card"
              >
                Move
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NudgeSection({ title, clients, onSelect }: {
  title: string;
  clients: Household[];
  onSelect: (id: string) => void;
}) {
  if (clients.length === 0) return null;

  return (
    <div>
      <div className="section-header" style={{ color: '#F59E0B' }}>{title}</div>
      {clients.map(h => {
        const displayStatus = getDisplayARStatus(h);
        return (
          <div key={h.id} className="client-row" onClick={() => onSelect(h.id)}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{h.identifier}</span>
              <span className={getARStatusBadgeClass(displayStatus)}>
                {displayStatus === 'Ready to Schedule' ? 'Ready' : displayStatus}
              </span>
            </div>
            {h.next_follow_up && (
              <span className="text-xs text-muted-foreground">
                {formatDate(h.next_follow_up, 'MMM d')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
