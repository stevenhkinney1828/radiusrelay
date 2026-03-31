import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { getDisplayARStatus, getARStatusBadgeClass, formatMonthYear, isCycleComplete } from '@/lib/household-logic';
import { parseISO, isBefore, startOfMonth, addMonths, addDays, isSameMonth } from 'date-fns';
import type { Household } from '@/types';

interface ReviewsTabProps {
  onSelectClient: (id: string) => void;
  onMoveAR?: (id: string) => void;
}

export default function ReviewsTab({ onSelectClient, onMoveAR }: ReviewsTabProps) {
  const { households } = useData();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in28Days = addDays(now, 28).toISOString().slice(0, 10);
  const thisMonth = startOfMonth(now);
  const nextMonth = startOfMonth(addMonths(now, 1));

  const active = useMemo(() => households.filter(h => h.is_active && h.next_review_target), [households]);

  const overdue = useMemo(() => active.filter(h => {
    const target = parseISO(h.next_review_target!);
    return isBefore(target, thisMonth) && !isCycleComplete(h);
  }).sort((a, b) => a.next_review_target!.localeCompare(b.next_review_target!)), [active, thisMonth]);

  const thisMonthClients = useMemo(() => active.filter(h => {
    const target = parseISO(h.next_review_target!);
    return isSameMonth(target, thisMonth);
  }).sort((a, b) => a.identifier.localeCompare(b.identifier)), [active, thisMonth]);

  const nextMonthClients = useMemo(() => active.filter(h => {
    const target = parseISO(h.next_review_target!);
    return isSameMonth(target, nextMonth);
  }).sort((a, b) => a.identifier.localeCompare(b.identifier)), [active, nextMonth]);

  const followUpNudges = useMemo(() =>
    households.filter(h =>
      h.is_active &&
      h.next_follow_up &&
      ['Working to Schedule', 'Postponed'].includes(h.annual_review_status) &&
      h.next_follow_up >= today &&
      h.next_follow_up <= in28Days
    ).sort((a, b) => a.next_follow_up!.localeCompare(b.next_follow_up!)),
    [households, today, in28Days]
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
        return (
          <div key={h.id} className="client-row" onClick={() => onSelect(h.id)}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{h.identifier}</span>
              <span className={getARStatusBadgeClass(displayStatus)}>
                {displayStatus === 'Ready to Schedule' ? 'Ready' : displayStatus}
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
            <span className="text-xs text-muted-foreground">
              {formatMonthYear(h.next_follow_up!).replace(/\s\d{4}$/, '')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
