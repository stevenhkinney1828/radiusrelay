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
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [legendFilter, setLegendFilter] = useState<CalendarEvent['kind'] | null>(null);

  const kindFullLabel: Record<CalendarEvent['kind'], string> = {
    touch: 'Quarterly Touch',
    'ar-target': 'Annual Review Target',
    scheduled: 'Scheduled Meetings',
    nudge: 'Follow-up Nudges',
    completed: 'Completed Reviews',
  };

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

  const quarterMonths = useMemo(() => [
    startOfMonth(new Date()),
    startOfMonth(addMonths(new Date(), 1)),
    startOfMonth(addMonths(new Date(), 2)),
  ], []);

  const quarterGrids = useMemo(() => {
    return quarterMonths.map(month => {
      const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
      return {
        month,
        days: eachDayOfInterval({ start, end }),
      };
    });
  }, [quarterMonths]);

  return (
    <div className="flex flex-col">
      {/* View toggle */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b">
        <button
          onClick={() => setViewMode('month')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${viewMode === 'month' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
        >
          Month
        </button>
        <button
          onClick={() => setViewMode('quarter')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${viewMode === 'quarter' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
        >
          Quarter
        </button>
      </div>

      {/* Month navigation header - only in month view */}
      {viewMode === 'month' && (
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
      )}

      {/* Month view */}
      {viewMode === 'month' && (
        <>
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
                  <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>
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
              <button
                key={kind}
                onClick={() => setLegendFilter(kind)}
                className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${getDotColor(kind)}`} />
                <span className="text-[10px] text-muted-foreground underline decoration-dotted">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Quarter view */}
      {viewMode === 'quarter' && (
        <div className="overflow-y-auto pb-20">
          {quarterGrids.map(({ month, days }) => (
            <div key={format(month, 'yyyy-MM')} className="mb-6">
              <button
                onClick={() => {
                  setCurrentMonth(month);
                  setViewMode('month');
                }}
                className="w-full flex items-center justify-between px-4 py-2 border-b bg-secondary/40"
              >
                <span className="text-sm font-semibold text-blue-600">
                  {format(month, 'MMMM yyyy')}
                </span>
                <span className="text-xs text-muted-foreground">
                  Tap to view →
                </span>
              </button>
              <div className="grid grid-cols-7 border-b">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isCurrentMonth = isSameMonth(day, month);
                  const isToday = isSameDay(day, new Date());
                  const dayEvents = eventsByDate[dateStr] || [];
                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setCurrentMonth(month);
                          setViewMode('month');
                          setDayModalDate(dateStr);
                        }
                      }}
                      className={`min-h-[44px] border-b border-r p-1
                        ${!isCurrentMonth ? 'bg-muted/30' : 'bg-background'}
                        ${isToday ? 'bg-blue-50' : ''}
                        ${dayEvents.length > 0 ? 'cursor-pointer' : ''}`}
                    >
                      <div className={`text-[10px] font-medium mb-1 w-4 h-4 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-primary text-primary-foreground' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {format(day, 'd')}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-0.5">
                          {dayEvents.slice(0, 4).map((e, idx) => (
                            <div
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full ${getDotColor(e.kind)}`}
                            />
                          ))}
                          {dayEvents.length > 4 && (
                            <span className="text-[8px] text-muted-foreground leading-none">
                              +{dayEvents.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-t">
            {[
              { kind: 'touch' as const, label: 'Quarterly Touch' },
              { kind: 'ar-target' as const, label: 'AR Target' },
              { kind: 'scheduled' as const, label: 'Scheduled' },
              { kind: 'nudge' as const, label: 'Follow-up' },
              { kind: 'completed' as const, label: 'Completed' },
            ].map(({ kind, label }) => (
              <button
                key={kind}
                onClick={() => setLegendFilter(kind)}
                className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${getDotColor(kind)}`} />
                <span className="text-[10px] text-muted-foreground underline decoration-dotted">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Legend Detail Modal */}
      {legendFilter && (() => {
        const year = currentMonth.getFullYear();
        const currentYear = new Date().getFullYear();
        const isCurrentYear = year === currentYear;
        const legendDetailMonths = Array.from({ length: 12 }, (_, i) => {
          const monthStart = new Date(year, i, 1);
          const monthKey = format(monthStart, 'yyyy-MM');
          const label = format(monthStart, 'MMMM yyyy');
          const monthEvents = events
            .filter(e => e.kind === legendFilter && e.date.startsWith(monthKey))
            .sort((a, b) => a.date.localeCompare(b.date));
          return { label, monthEvents };
        });

        return (
          <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-[480px] mx-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-10">
              <div>
                <h2 className="text-base font-semibold">{kindFullLabel[legendFilter]}</h2>
                <span className="text-xs text-muted-foreground">
                  {year} · {isCurrentYear ? 'Current year' : `${year - currentYear > 0 ? '+' : ''}${year - currentYear} year${Math.abs(year - currentYear) !== 1 ? 's' : ''} from today`}
                </span>
              </div>
              <button
                onClick={() => setLegendFilter(null)}
                className="flex items-center gap-1 text-sm text-muted-foreground"
              >
                <X size={16} /> Close
              </button>
            </div>
            {!isCurrentYear && (
              <div className={`px-4 py-2.5 flex items-center gap-2 text-sm font-medium ${year < currentYear ? 'bg-amber-100 text-amber-800 border-b border-amber-200' : 'bg-blue-100 text-blue-800 border-b border-blue-200'}`}>
                <span className="text-base">{year < currentYear ? '⚠️' : '🔭'}</span>
                <span>{year < currentYear ? `You are viewing ${year} — this is historical data` : `You are viewing ${year} — this is future data`}</span>
              </div>
            )}
            <div className={`h-1 w-full ${getDotColor(legendFilter)}`} />
            {year < currentYear && legendFilter !== 'completed' && (
              <div className="px-4 py-2 bg-secondary/40 border-b">
                <p className="text-xs text-muted-foreground">
                  Historical data is only available for Completed reviews. Current scheduled dates for touches, targets, and nudges reflect today's values only.
                </p>
              </div>
            )}
            <div className="overflow-y-auto flex-1 pb-8">
              {legendDetailMonths.map(({ label, monthEvents }) => (
                <div key={label}>
                  <div className="px-4 py-2 bg-secondary/40 border-b">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">{label}</span>
                    {monthEvents.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">({monthEvents.length})</span>
                    )}
                  </div>
                  {monthEvents.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground border-b">None</div>
                  ) : (
                    monthEvents.map((e, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setLegendFilter(null);
                          onSelectClient(e.householdId);
                        }}
                        className="flex items-center justify-between pl-8 pr-4 py-3 border-b border-l-2 border-l-secondary ml-4 cursor-pointer active:bg-accent transition-colors"
                      >
                        <span className="text-sm font-medium">{e.identifier}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getChipStyle(e.kind)}`}>
                          {format(parseISO(e.date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
