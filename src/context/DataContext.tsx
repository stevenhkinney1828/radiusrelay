import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { addDays, format, startOfMonth, addYears, parseISO } from 'date-fns';
import type { Household, Interaction, CadenceDays, ARStatus, InteractionType, TouchStatus } from '@/types';
import { replayInteractions } from '@/lib/household-logic';

// Generate a UUID without external dep
function genId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
}

interface UndoState {
  households: Household[];
  interactions: Interaction[];
}

interface DataContextType {
  households: Household[];
  interactions: Interaction[];
  addHousehold: (data: {
    identifier: string;
    planDate: string;
    cadenceDays: CadenceDays;
    nextTouch?: string;
    nextReviewTarget?: string;
    note?: string;
    planNote?: string;
  }) => string;
  updateHousehold: (id: string, updates: Partial<Household>) => void;
  deleteHousehold: (id: string) => void;
  addInteraction: (data: Omit<Interaction, 'id'>) => void;
  updateInteraction: (id: string, updates: Partial<Interaction>) => void;
  deleteInteraction: (id: string) => void;
  undo: (() => void) | null;
  dismissUndo: () => void;
  undoAvailable: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export function useData(): DataContextType {
  const ctx = useContext(DataContext);
  if (!ctx) {
    // During Vite HMR, the context can become stale — reload instead of crashing
    if (import.meta.hot) {
      window.location.reload();
      // Return a stub to avoid the throw while reload is pending
      return {} as DataContextType;
    }
    throw new Error('useData must be used within DataProvider');
  }
  return ctx;
}

// Force full reload when this module is updated to prevent stale context
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    window.location.reload();
  });
}

const DEMO_HOUSEHOLDS: Household[] = [
  {
    id: 'demo-steven',
    identifier: 'Steven',
    cadence_days: 90,
    last_counted_touch: '2026-01-15',
    next_quarterly_touch: '2026-04-15',
    annual_review_status: 'Completed',
    annual_review_scheduled: null,
    last_completed_review: '2026-01-15',
    next_review_target: '2027-01-01',
    next_follow_up: null,
    note: '',
    plan_note: '',
    is_active: true,
  },
  {
    id: 'demo-kevin',
    identifier: 'Kevin',
    cadence_days: 90,
    last_counted_touch: '2025-03-02',
    next_quarterly_touch: '2026-03-15',
    annual_review_status: 'Completed',
    annual_review_scheduled: null,
    last_completed_review: '2025-03-02',
    next_review_target: '2026-03-01',
    next_follow_up: null,
    note: '',
    plan_note: '',
    is_active: true,
  },
  {
    id: 'demo-charles',
    identifier: 'Charles',
    cadence_days: 90,
    last_counted_touch: '2025-04-15',
    next_quarterly_touch: '2026-07-04',
    annual_review_status: 'Completed',
    annual_review_scheduled: null,
    last_completed_review: '2025-04-15',
    next_review_target: '2026-04-01',
    next_follow_up: null,
    note: '',
    plan_note: '',
    is_active: true,
  },
  {
    id: 'demo-debbie',
    identifier: 'Debbie',
    cadence_days: 90,
    last_counted_touch: '2026-03-15',
    next_quarterly_touch: '2026-06-13',
    annual_review_status: 'Completed',
    annual_review_scheduled: null,
    last_completed_review: '2026-03-15',
    next_review_target: '2027-03-01',
    next_follow_up: null,
    note: '',
    plan_note: '',
    is_active: true,
  },
  {
    id: 'demo-martha',
    identifier: 'Martha',
    cadence_days: 90,
    last_counted_touch: '2026-02-03',
    next_quarterly_touch: '2026-05-04',
    annual_review_status: 'Completed',
    annual_review_scheduled: null,
    last_completed_review: '2026-02-03',
    next_review_target: '2027-02-01',
    next_follow_up: null,
    note: '',
    plan_note: '',
    is_active: true,
  },
  {
    id: 'demo-tara',
    identifier: 'Tara',
    cadence_days: 90,
    last_counted_touch: '2025-10-15',
    next_quarterly_touch: '2026-05-15',
    annual_review_status: 'Completed',
    annual_review_scheduled: null,
    last_completed_review: '2025-07-01',
    next_review_target: '2026-07-01',
    next_follow_up: null,
    note: '',
    plan_note: '',
    is_active: true,
  },
];

const DEMO_INTERACTIONS: Interaction[] = [
  {
    id: 'demo-steven-seed',
    household_id: 'demo-steven',
    date: '2026-01-15',
    type: 'Annual review meeting',
    touch_status: null,
    counts_cadence: false,
    marks_ar: true,
    ar_status: 'Completed',
    plan_updated: false,
    follow_up: null,
    note: 'Initial financial plan',
    is_seed: true,
  },
  {
    id: 'demo-kevin-seed',
    household_id: 'demo-kevin',
    date: '2025-03-02',
    type: 'Annual review meeting',
    touch_status: null,
    counts_cadence: false,
    marks_ar: true,
    ar_status: 'Completed',
    plan_updated: false,
    follow_up: null,
    note: 'Initial financial plan',
    is_seed: true,
  },
  {
    id: 'demo-charles-seed',
    household_id: 'demo-charles',
    date: '2025-04-15',
    type: 'Annual review meeting',
    touch_status: null,
    counts_cadence: false,
    marks_ar: true,
    ar_status: 'Completed',
    plan_updated: false,
    follow_up: null,
    note: 'Initial financial plan',
    is_seed: true,
  },
  {
    id: 'demo-debbie-seed',
    household_id: 'demo-debbie',
    date: '2026-03-15',
    type: 'Annual review meeting',
    touch_status: null,
    counts_cadence: false,
    marks_ar: true,
    ar_status: 'Completed',
    plan_updated: false,
    follow_up: null,
    note: 'Initial financial plan',
    is_seed: true,
  },
  {
    id: 'demo-martha-seed',
    household_id: 'demo-martha',
    date: '2025-02-10',
    type: 'Annual review meeting',
    touch_status: null,
    counts_cadence: false,
    marks_ar: true,
    ar_status: 'Completed',
    plan_updated: false,
    follow_up: null,
    note: 'Annual review',
    is_seed: true,
  },
  {
    id: 'demo-martha-touch-1',
    household_id: 'demo-martha',
    date: '2025-05-05',
    type: 'Quarterly check-in',
    touch_status: 'Completed',
    counts_cadence: true,
    marks_ar: false,
    ar_status: null,
    plan_updated: false,
    follow_up: null,
    note: '',
  },
  {
    id: 'demo-martha-touch-2',
    household_id: 'demo-martha',
    date: '2025-08-04',
    type: 'Quarterly check-in',
    touch_status: 'Attempted - email',
    counts_cadence: false,
    marks_ar: false,
    ar_status: null,
    plan_updated: false,
    follow_up: null,
    note: 'Sent email, no response',
  },
  {
    id: 'demo-martha-adhoc',
    household_id: 'demo-martha',
    date: '2025-09-22',
    type: 'Ad hoc call',
    touch_status: null,
    counts_cadence: false,
    marks_ar: false,
    ar_status: null,
    plan_updated: false,
    follow_up: null,
    note: 'Client called about market volatility',
  },
  {
    id: 'demo-martha-touch-3',
    household_id: 'demo-martha',
    date: '2025-11-03',
    type: 'Quarterly check-in',
    touch_status: 'Completed',
    counts_cadence: true,
    marks_ar: false,
    ar_status: null,
    plan_updated: false,
    follow_up: null,
    note: '',
  },
  {
    id: 'demo-martha-ar-2026',
    household_id: 'demo-martha',
    date: '2026-02-03',
    type: 'Annual review meeting',
    touch_status: null,
    counts_cadence: true,
    marks_ar: true,
    ar_status: 'Completed',
    plan_updated: true,
    follow_up: null,
    note: 'Annual review completed, plan updated',
  },
  {
    id: 'demo-tara-seed',
    household_id: 'demo-tara',
    date: '2025-07-01',
    type: 'Annual review meeting',
    touch_status: null,
    counts_cadence: false,
    marks_ar: true,
    ar_status: 'Completed',
    plan_updated: false,
    follow_up: null,
    note: 'Initial financial plan',
  },
];
export function DataProvider({ children }: { children: ReactNode }) {
  const [households, setHouseholds] = useState<Household[]>(DEMO_HOUSEHOLDS);
  const [interactions, setInteractions] = useState<Interaction[]>(DEMO_INTERACTIONS);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const saveUndo = useCallback(() => {
    setUndoState({ households: [...households], interactions: [...interactions] });
    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(() => setUndoState(null), 3000);
    setUndoTimer(timer);
  }, [households, interactions, undoTimer]);

  const replayForHousehold = useCallback((householdId: string, hList: Household[], iList: Interaction[]) => {
    return hList.map(h => {
      if (h.id !== householdId) return h;
      return replayInteractions(h, iList);
    });
  }, []);

  const addHousehold = useCallback((data: {
    identifier: string;
    planDate: string;
    cadenceDays: CadenceDays;
    nextTouch?: string;
    nextReviewTarget?: string;
    note?: string;
    planNote?: string;
  }): string => {
    saveUndo();
    const id = genId();
    const planDate = parseISO(data.planDate);
    const defaultNextTouch = format(addDays(planDate, data.cadenceDays), 'yyyy-MM-dd');
    const defaultNextReview = format(startOfMonth(addYears(planDate, 1)), 'yyyy-MM-dd');

    const newHousehold: Household = {
      id,
      identifier: data.identifier,
      cadence_days: data.cadenceDays,
      last_counted_touch: null,
      next_quarterly_touch: data.nextTouch || defaultNextTouch,
      annual_review_status: 'Completed' as ARStatus,
      annual_review_scheduled: null,
      last_completed_review: data.planDate,
      next_review_target: data.nextReviewTarget || defaultNextReview,
      next_follow_up: null,
      note: data.note || '',
      plan_note: data.planNote || '',
      is_active: true,
    };

    // Seed interaction
    const seedInteraction: Interaction = {
      id: genId(),
      household_id: id,
      date: data.planDate,
      type: 'Annual review meeting',
      touch_status: null,
      counts_cadence: false,
      marks_ar: true,
      ar_status: 'Completed',
      plan_updated: false, // CRITICAL: must be false
      follow_up: null,
      note: data.planNote || 'Initial financial plan',
      is_seed: true,
    };

    setHouseholds(prev => [...prev, newHousehold]);
    setInteractions(prev => [...prev, seedInteraction]);
    return id;
  }, [saveUndo]);

  const updateHousehold = useCallback((id: string, updates: Partial<Household>) => {
    saveUndo();
    setHouseholds(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  }, [saveUndo]);

  const deleteHousehold = useCallback((id: string) => {
    saveUndo();
    setHouseholds(prev => prev.filter(h => h.id !== id));
    setInteractions(prev => prev.filter(i => i.household_id !== id));
  }, [saveUndo]);

  const addInteraction = useCallback((data: Omit<Interaction, 'id'>) => {
    saveUndo();
    const newInteraction: Interaction = { ...data, id: genId() };
    setInteractions(prev => {
      const updated = [...prev, newInteraction];
      setHouseholds(hPrev => replayForHousehold(data.household_id, hPrev, updated));
      return updated;
    });
  }, [saveUndo, replayForHousehold]);

  const updateInteraction = useCallback((id: string, updates: Partial<Interaction>) => {
    saveUndo();
    setInteractions(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, ...updates } : i);
      const interaction = updated.find(i => i.id === id);
      if (interaction) {
        setHouseholds(hPrev => replayForHousehold(interaction.household_id, hPrev, updated));
      }
      return updated;
    });
  }, [saveUndo, replayForHousehold]);

  const deleteInteraction = useCallback((id: string) => {
    saveUndo();
    setInteractions(prev => {
      const interaction = prev.find(i => i.id === id);
      const updated = prev.filter(i => i.id !== id);
      if (interaction) {
        setHouseholds(hPrev => replayForHousehold(interaction.household_id, hPrev, updated));
      }
      return updated;
    });
  }, [saveUndo, replayForHousehold]);

  const undo = undoState ? () => {
    setHouseholds(undoState.households);
    setInteractions(undoState.interactions);
    setUndoState(null);
    if (undoTimer) clearTimeout(undoTimer);
  } : null;

  const dismissUndo = useCallback(() => {
    setUndoState(null);
    if (undoTimer) clearTimeout(undoTimer);
  }, [undoTimer]);

  return (
    <DataContext.Provider value={{
      households,
      interactions,
      addHousehold,
      updateHousehold,
      deleteHousehold,
      addInteraction,
      updateInteraction,
      deleteInteraction,
      undo,
      dismissUndo,
      undoAvailable: !!undoState,
    }}>
      {children}
    </DataContext.Provider>
  );
}
