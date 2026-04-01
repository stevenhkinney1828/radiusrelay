export type ARStatus =
  | 'Ready to Schedule'
  | 'Working to Schedule'
  | 'Scheduled'
  | 'Completed'
  | 'Postponed'
  | 'Skipped';

export type TouchStatus =
  | 'Completed'
  | 'Attempted - email'
  | 'Attempted - phone'
  | 'Skipped';

export type InteractionType =
  | 'Quarterly check-in'
  | 'Annual review meeting'
  | 'Ad hoc call';

export type CadenceDays = 30 | 45 | 60 | 90 | 120;

export interface Household {
  id: string;
  identifier: string;
  cadence_days: CadenceDays;
  last_counted_touch: string | null;
  next_quarterly_touch: string | null;
  annual_review_status: ARStatus;
  annual_review_scheduled: string | null;
  last_completed_review: string | null;
  next_review_target: string | null;
  next_follow_up: string | null;
  note: string;
  plan_note: string;
  is_active: boolean;
}

export interface Interaction {
  id: string;
  household_id: string;
  date: string;
  type: InteractionType;
  touch_status: TouchStatus | null;
  counts_cadence: boolean;
  marks_ar: boolean;
  ar_status: ARStatus | null;
  plan_updated: boolean;
  follow_up: string | null;
  note: string;
  is_seed?: boolean;
}

export type SortOption = 'az' | 'next-ar' | 'next-touch' | 'ar-status';
export type FilterOption = 'all' | 'overdue';
