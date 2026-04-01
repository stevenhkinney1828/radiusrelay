import { addDays, addYears, format, parseISO, startOfMonth } from 'date-fns';
import type { Household, Interaction, ARStatus } from '@/types';

/**
 * Check if an annual review cycle is complete.
 * This is the most critical function in the app.
 */
export function isCycleComplete(household: Household): boolean {
  if (household.annual_review_status !== 'Completed') return false;
  if (!household.last_completed_review) return false;

  const completedYear = parseISO(household.last_completed_review).getFullYear();
  const currentYear = new Date().getFullYear();
  return completedYear === currentYear;
}

/**
 * Get the display AR status. Substitutes "Ready to Schedule"
 * when stored status is Completed but cycle is not done.
 */
export function getDisplayARStatus(household: Household): ARStatus {
  if (household.annual_review_status === 'Completed' && !isCycleComplete(household)) {
    return 'Ready to Schedule';
  }
  return household.annual_review_status;
}

/**
 * Determine if a client should be suppressed from touch lists.
 */
export function shouldSuppressTouch(household: Household): boolean {
  const status = household.annual_review_status;
  if (status === 'Scheduled' || status === 'Working to Schedule') return true;

  if (household.next_review_target && household.next_quarterly_touch && !isCycleComplete(household)) {
    const reviewTarget = parseISO(household.next_review_target);
    const nextTouch = parseISO(household.next_quarterly_touch);
    if (reviewTarget < nextTouch) return true;
  }

  return false;
}

/**
 * Replay all interactions for a household from oldest to newest,
 * recalculating the household's current state.
 */
export function replayInteractions(
  household: Household,
  interactions: Interaction[]
): Household {
  // Sort by date, then ensure completions sort last for same-date entries
  const sorted = [...interactions]
    .filter(i => i.household_id === household.id)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      // Completions sort last
      const aIsCompletion = a.marks_ar && a.ar_status === 'Completed';
      const bIsCompletion = b.marks_ar && b.ar_status === 'Completed';
      if (aIsCompletion && !bIsCompletion) return 1;
      if (!aIsCompletion && bIsCompletion) return -1;
      return 0;
    });

  let h = { ...household };

  for (const interaction of sorted) {
    if (interaction.type === 'Quarterly check-in') {
      if (interaction.touch_status === 'Completed' || interaction.touch_status === 'Attempted - email' || interaction.touch_status === 'Attempted - phone') {
        h.last_counted_touch = interaction.date;
        h.next_quarterly_touch = format(addDays(parseISO(interaction.date), h.cadence_days), 'yyyy-MM-dd');
      } else if (interaction.touch_status === 'Skipped') {
        h.next_quarterly_touch = format(addDays(parseISO(interaction.date), 45), 'yyyy-MM-dd');
      }

      if (interaction.follow_up) {
        h.next_follow_up = interaction.follow_up;
      }
    }

    if (interaction.type === 'Ad hoc call') {
      if (interaction.counts_cadence) {
        h.last_counted_touch = interaction.date;
        h.next_quarterly_touch = format(addDays(parseISO(interaction.date), h.cadence_days), 'yyyy-MM-dd');
      }
    }

    if (interaction.type === 'Annual review meeting' && interaction.ar_status) {
      h.annual_review_status = interaction.ar_status;

      switch (interaction.ar_status) {
        case 'Working to Schedule':
          h.next_follow_up = interaction.follow_up || format(addDays(parseISO(interaction.date), 14), 'yyyy-MM-dd');
          h.annual_review_scheduled = null;
          break;

        case 'Scheduled':
          h.annual_review_scheduled = interaction.follow_up || interaction.date;
          break;

        case 'Completed':
          h.last_completed_review = interaction.date;
          if (interaction.is_seed) {
            // Seed interaction: only set last_completed_review and status.
            // Do NOT reset next_review_target, next_quarterly_touch, or last_counted_touch
            // — those come from the Add Client form.
          } else {
            // Non-seed: always run full reset regardless of plan_updated
            const reviewDate = parseISO(interaction.date);
            h.next_review_target = format(startOfMonth(addYears(reviewDate, 1)), 'yyyy-MM-dd');
            h.last_counted_touch = interaction.date;
            h.next_quarterly_touch = format(addDays(reviewDate, h.cadence_days), 'yyyy-MM-dd');
          }
          h.annual_review_scheduled = null;
          h.next_follow_up = null;
          break;

        case 'Postponed':
          h.next_follow_up = interaction.follow_up || null;
          h.annual_review_scheduled = null;
          break;

        case 'Skipped':
          if (h.next_review_target) {
            h.next_review_target = format(addYears(parseISO(h.next_review_target), 1), 'yyyy-MM-dd');
          }
          h.next_follow_up = format(addDays(parseISO(interaction.date), 90), 'yyyy-MM-dd');
          h.annual_review_scheduled = null;
          break;
      }
    }
  }

  return h;
}

/**
 * Get the CSS class for an AR status badge.
 */
export function getARStatusBadgeClass(status: ARStatus): string {
  const map: Record<ARStatus, string> = {
    'Ready to Schedule': 'status-badge-ready',
    'Working to Schedule': 'status-badge-working',
    'Scheduled': 'status-badge-scheduled',
    'Completed': 'status-badge-completed',
    'Postponed': 'status-badge-postponed',
    'Skipped': 'status-badge-skipped',
  };
  return `status-badge ${map[status]}`;
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string | null, fmt: string = 'MMM d, yyyy'): string {
  if (!dateStr) return '—';
  return format(parseISO(dateStr), fmt);
}

export function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return '—';
  return format(parseISO(dateStr), 'MMM yyyy');
}
