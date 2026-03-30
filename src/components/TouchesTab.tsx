import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { shouldSuppressTouch, formatDate } from '@/lib/household-logic';
import { parseISO, addDays, isBefore, isAfter } from 'date-fns';
import type { Household } from '@/types';

interface TouchesTabProps {
  onSelectClient: (id: string) => void;
}

export default function TouchesTab({ onSelectClient }: TouchesTabProps) {
  const { households } = useData();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in28Days = addDays(now, 28).toISOString().slice(0, 10);

  const active = useMemo(() =>
    households.filter(h => h.is_active && !shouldSuppressTouch(h)),
    [households]
  );

  const overdue = useMemo(() =>
    active.filter(h => h.next_quarterly_touch && h.next_quarterly_touch < today)
      .sort((a, b) => a.next_quarterly_touch!.localeCompare(b.next_quarterly_touch!)),
    [active, today]
  );

  const upcoming = useMemo(() =>
    active.filter(h =>
      h.next_quarterly_touch &&
      h.next_quarterly_touch >= today &&
      h.next_quarterly_touch <= in28Days
    ).sort((a, b) => a.next_quarterly_touch!.localeCompare(b.next_quarterly_touch!)),
    [active, today, in28Days]
  );

  const nudges = useMemo(() =>
    households.filter(h =>
      h.is_active &&
      h.next_follow_up &&
      h.next_follow_up >= today &&
      h.next_follow_up <= in28Days
    ).sort((a, b) => a.next_follow_up!.localeCompare(b.next_follow_up!)),
    [households, today, in28Days]
  );

  return (
    <div>
      <TouchSection title={`Overdue (${overdue.length})`} clients={overdue} dateField="next_quarterly_touch" onSelect={onSelectClient} isOverdue />
      <TouchSection title={`Next 4 weeks (${upcoming.length})`} clients={upcoming} dateField="next_quarterly_touch" onSelect={onSelectClient} />
      <TouchSection title={`Follow-up nudges (${nudges.length})`} clients={nudges} dateField="next_follow_up" onSelect={onSelectClient} />

      {overdue.length === 0 && upcoming.length === 0 && nudges.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No touches due</p>
        </div>
      )}
    </div>
  );
}

function TouchSection({ title, clients, dateField, onSelect, isOverdue }: {
  title: string;
  clients: Household[];
  dateField: 'next_quarterly_touch' | 'next_follow_up';
  onSelect: (id: string) => void;
  isOverdue?: boolean;
}) {
  if (clients.length === 0) return null;

  return (
    <div>
      <div className="section-header">{title}</div>
      {clients.map(h => (
        <div key={h.id} className="client-row" onClick={() => onSelect(h.id)}>
          <span className="font-medium text-sm">{h.identifier}</span>
          <span className={`text-xs ${isOverdue ? 'status-badge status-badge-overdue' : 'text-muted-foreground'}`}>
            {formatDate(h[dateField], 'MMM d')}
          </span>
        </div>
      ))}
    </div>
  );
}
