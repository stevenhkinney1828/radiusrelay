import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { isCycleComplete } from '@/lib/household-logic';
import {
  format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type CalendarEvent = {
  date: string;
  householdId: string;
  identifier: string;
  kind: 'touch' | 'ar-target' | 'scheduled' | 'nudge' | 'completed';
};

function getChipStyle(kind: CalendarEvent['kind']): string {
  switch (kind) {
    case 'touch': return 'bg-indigo-100 text-indigo-700';
    case 'ar-target': return 'bg-red-100 text-red-700';
    case 'scheduled': return 'bg-purple-100 text-purple-700';
    case 'nudge': return 'bg-amber-100 text-amber-700';
    case 'completed': return 'bg-green-100 text-green-700';
  }
}

function getDotColor(kind: CalendarEvent['kind']): string {
  switch (kind) {
    case 'touch': return 'bg-indigo-500';
    case 'ar-target': return 'bg-red-500';
    case 'scheduled': return 'bg-purple-500';
    case 'nudge': return 'bg-amber-500';
    case 'completed': return 'bg-green-500';
  }
}

function getKindLabel(kind: CalendarEvent['kind']): string {
  switch (kind) {
    case 'touch': return '· Touch';
    case 'ar-target': return '· AR';
    case 'scheduled': return '· Sched';
    case 'nudge': return '· Nudge';
    case 'completed': return '· Done';
  }
}

interface CalendarTabProps {
  onSelectClient: (id: string) => void;
}

export default function CalendarTab({ onSelectClient }: CalendarTabProps) {
  const { households, interactions } = useData();

  const events = useMemo(() => {
    const result: CalendarEvent[] = [];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 18);
    const cutoffStr = format(cutoff, 'yyyy-MM-dd');

    for (const h of households.filter(h => h.is_active)) {
      const cycleComplete = isCycleComplete(h);

      if (h.next_quarterly_touch) {
        const suppressTouch = !cycleComplete &&
          h.next_review_target &&
          h.next_review_target < h.next_quarterly_touch;
        if (!suppressTouch) {
          result.push({
            date: h.next_quarterly_touch,
            householdId: h.id,
            identifier: h.identifier,
            kind: 'touch',
          });
        }
      }

      if (h.next_review_target && !cycleComplete) {
        result.push({
          date: h.next_review_target,
          householdId: h.id,
          identifier: h.identifier,
          kind: 'ar-target',
        });
      }

      if (h.annual_review_scheduled && h.annual_review_status === 'Scheduled') {
        result.push({
          date: h.annual_review_scheduled,
          householdId: h.id,
          identifier: h.identifier,
          kind: 'scheduled',
        });
      }

      if (
        h.next_follow_up &&
        (h.annual_review_status === 'Working to Schedule' ||
          h.annual_review_status === 'Postponed')
      ) {
        result.push({
          date: h.next_follow_up,
          householdId: h.id,
          identifier: h.identifier,
          kind: 'nudge',
        });
      }
    }

    for (const i of interactions) {
      if (i.marks_ar && i.ar_status === 'Completed' && i.date >= cutoffStr) {
        const h = households.find(hh => hh.id === i.household_id);
        if (h && h.is_active) {
          result.push({
            date: i.date,
            householdId: h.id,
            identifier: h.identifier,
            kind: 'completed',
          });
        }
      }
    }

    return result;
  }, [households, interactions]);

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  return (
    <div className="flex flex-col">
      {/* Month navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 text-muted-foreground">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 text-center border-b">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-[11px] font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {gridDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const dayEvents = eventsByDate[dateStr] || [];
          const visibleEvents = dayEvents.slice(0, 2);
          const overflowCount = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={dateStr}
              onClick={() => dayEvents.length > 0 && setDayModalDate(dateStr)}
              className={`min-h-[72px] border-b border-r p-1 flex flex-col gap-0.5
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${dayEvents.length > 0 ? 'cursor-pointer hover:bg-secondary/50' : ''}`}
            >
              {/* Day number */}
              <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>

              {/* Event chips */}
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visibleEvents.map((e, idx) => (
                  <div
                    key={idx}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onSelectClient(e.householdId);
                    }}
                    className={`text-[10px] font-medium px-1 py-0.5 rounded truncate cursor-pointer ${getChipStyle(e.kind)}`}
                  >
                    {e.identifier} {getKindLabel(e.kind)}
                  </div>
                ))}
                {overflowCount > 0 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{overflowCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-t text-[11px] text-muted-foreground">
        {[
          { kind: 'touch' as const, label: 'Quarterly Touch' },
          { kind: 'ar-target' as const, label: 'AR Target' },
          { kind: 'scheduled' as const, label: 'Scheduled' },
          { kind: 'nudge' as const, label: 'Follow-up' },
          { kind: 'completed' as const, label: 'Completed' },
        ].map(({ kind, label }) => (
          <div key={kind} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-sm ${getChipStyle(kind).split(' ')[0]}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Day modal */}
      {dayModalDate && (() => {
        const modalEvents = eventsByDate[dayModalDate] || [];
        return (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
            onClick={() => setDayModalDate(null)}>
            <div className="bg-background rounded-xl shadow-lg w-80 max-h-96 overflow-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-sm">
                  {format(parseISO(dayModalDate), 'MMMM d, yyyy')}
                </span>
                <button onClick={() => setDayModalDate(null)}
                  className="text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {modalEvents.map((e, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setDayModalDate(null);
                      onSelectClient(e.householdId);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer ${getChipStyle(e.kind)}`}
                  >
                    {e.identifier}
                    {getKindLabel(e.kind)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
