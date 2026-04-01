import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { shouldSuppressTouch, formatDate } from '@/lib/household-logic';
import { startOfMonth, addMonths, isSameMonth, parseISO } from 'date-fns';
import type { Household } from '@/types';

interface TouchesTabProps {
  onSelectClient: (id: string) => void;
}

export default function TouchesTab({ onSelectClient }: TouchesTabProps) {
  const { households } = useData();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisMonth = startOfMonth(now);
  const nextMonth = startOfMonth(addMonths(now, 1));

  const active = useMemo(() =>
    households.filter(h => h.is_active && !shouldSuppressTouch(h)),
    [households]
  );

  const overdue = useMemo(() =>
    active.filter(h => h.next_quarterly_touch && h.next_quarterly_touch < today)
      .sort((a, b) => a.next_quarterly_touch!.localeCompare(b.next_quarterly_touch!)),
    [active, today]
  );

  const thisMonthClients = useMemo(() =>
    active.filter(h => {
      if (!h.next_quarterly_touch) return false;
      const d = parseISO(h.next_quarterly_touch);
      return isSameMonth(d, thisMonth) && h.next_quarterly_touch >= today;
    }).sort((a, b) => a.next_quarterly_touch!.localeCompare(b.next_quarterly_touch!)),
    [active, today, thisMonth]
  );

  const nextMonthClients = useMemo(() =>
    active.filter(h => {
      if (!h.next_quarterly_touch) return false;
      const d = parseISO(h.next_quarterly_touch);
      return isSameMonth(d, nextMonth);
    }).sort((a, b) => a.next_quarterly_touch!.localeCompare(b.next_quarterly_touch!)),
    [active, nextMonth]
  );

  return (
    <div>
      <TouchSection
        title={`Overdue (${overdue.length})`}
        clients={overdue}
        onSelect={onSelectClient}
        isOverdue
      />
      <TouchSection
        title={`This month (${thisMonthClients.length})`}
        clients={thisMonthClients}
        onSelect={onSelectClient}
      />
      <TouchSection
        title={`Next month (${nextMonthClients.length})`}
        clients={nextMonthClients}
        onSelect={onSelectClient}
      />
      {overdue.length === 0 && thisMonthClients.length === 0 && nextMonthClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No touches due</p>
        </div>
      )}
    </div>
  );
}

function TouchSection({ title, clients, onSelect, isOverdue }: {
  title: string;
  clients: Household[];
  onSelect: (id: string) => void;
  isOverdue?: boolean;
}) {
  return (
    <div>
      <div className="section-header text-blue-600">{title}</div>
      {clients.length === 0 ? (
        <div className="px-4 py-3 text-sm text-muted-foreground border-b">None</div>
      ) : (
        clients.map(h => (
          <div key={h.id} className="client-row" onClick={() => onSelect(h.id)}>
            <span className="font-medium text-sm">{h.identifier}</span>
            {isOverdue ? (
              <span className="status-badge status-badge-overdue">
                Overdue · {formatDate(h.next_quarterly_touch, 'MMM d, yyyy')}
              </span>
            ) : (
              <span className="status-badge bg-indigo-100 text-indigo-700">
                {formatDate(h.next_quarterly_touch, 'MMM d, yyyy')}
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
