import { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import { getDisplayARStatus, getARStatusBadgeClass, formatDate, isCycleComplete } from '@/lib/household-logic';
import type { Household, SortOption, FilterOption } from '@/types';
import { isBefore, parseISO } from 'date-fns';

interface ClientsTabProps {
  onSelectClient: (id: string) => void;
}

export default function ClientsTab({ onSelectClient }: ClientsTabProps) {
  const { households } = useData();
  const [sort, setSort] = useState<SortOption>('az');
  const [filter, setFilter] = useState<FilterOption>('all');

  const activeHouseholds = useMemo(() => {
    let list = households.filter(h => h.is_active);

    // Filter
    if (filter === 'overdue') {
      const today = new Date().toISOString().slice(0, 10);
      list = list.filter(h => {
        const touchOverdue = h.next_quarterly_touch && h.next_quarterly_touch < today;
        const reviewOverdue = h.next_review_target && h.next_review_target < today && getDisplayARStatus(h) !== 'Completed';
        return touchOverdue || reviewOverdue;
      });
    }

    // Sort
    list.sort((a, b) => {
      switch (sort) {
        case 'az':
          return a.identifier.localeCompare(b.identifier);
        case 'next-ar':
          return (a.next_review_target || '9999').localeCompare(b.next_review_target || '9999');
        case 'next-touch':
          return (a.next_quarterly_touch || '9999').localeCompare(b.next_quarterly_touch || '9999');
        case 'ar-status': {
          const order: Record<string, number> = {
            'Ready to Schedule': 0,
            'Working to Schedule': 1,
            'Scheduled': 2,
            'Postponed': 3,
            'Skipped': 4,
            'Completed': 5,
          };
          return (order[getDisplayARStatus(a)] ?? 5) - (order[getDisplayARStatus(b)] ?? 5);
        }
        default:
          return 0;
      }
    });

    return list;
  }, [households, sort, filter]);

  return (
    <div>
      {/* Sort/Filter bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto">
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          className="text-xs bg-secondary rounded-md px-2 py-1 border-none outline-none"
        >
          <option value="az">A–Z</option>
          <option value="next-ar">Next AR</option>
          <option value="next-touch">Next Touch</option>
          <option value="ar-status">AR Status</option>
        </select>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as FilterOption)}
          className="text-xs bg-secondary rounded-md px-2 py-1 border-none outline-none"
        >
          <option value="all">All</option>
          <option value="overdue">Overdue</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{activeHouseholds.length} clients</span>
      </div>

      {/* Client list */}
      {activeHouseholds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">No clients yet</p>
          <p className="text-xs mt-1">Tap "+ Client" to add your first household</p>
        </div>
      ) : (
        <div>
          {activeHouseholds.map(h => (
            <ClientRow key={h.id} household={h} onClick={() => onSelectClient(h.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClientRow({ household, onClick }: { household: Household; onClick: () => void }) {
  const displayStatus = getDisplayARStatus(household);
  const cycleComplete = isCycleComplete(household);
  const today = new Date().toISOString().slice(0, 10);
  const touchOverdue = household.next_quarterly_touch && household.next_quarterly_touch < today;

  return (
    <div className="client-row" onClick={onClick}>
      <span className="font-medium text-sm">{household.identifier}</span>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <span className={getARStatusBadgeClass(displayStatus)}>
            {displayStatus === 'Ready to Schedule' ? 'Ready' : displayStatus}
          </span>
          {cycleComplete && household.last_completed_review && (
            <span style={{ fontSize: 10, color: '#6EE7B7', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {formatDate(household.last_completed_review, 'MMM d, yyyy')}
            </span>
          )}
          {!cycleComplete && household.next_review_target && (
            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {new Date(household.next_review_target + 'T00:00:00')
                .toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
        {household.next_quarterly_touch && (
          <span className={`text-xs ${touchOverdue ? 'text-status-overdue font-medium' : 'text-muted-foreground'}`}>
            {formatDate(household.next_quarterly_touch, 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}
