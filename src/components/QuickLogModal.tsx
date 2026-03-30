import { useState } from 'react';
import { useData } from '@/context/DataContext';
import type { InteractionType } from '@/types';

interface QuickLogModalProps {
  onClose: () => void;
  onSelectWorkflow: (householdId: string, type: InteractionType) => void;
}

export default function QuickLogModal({ onClose, onSelectWorkflow }: QuickLogModalProps) {
  const { households } = useData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = households.filter(h => h.is_active).sort((a, b) => a.identifier.localeCompare(b.identifier));

  const types: { label: string; value: InteractionType }[] = [
    { label: 'Annual Review', value: 'Annual review meeting' },
    { label: 'Quarterly Touch', value: 'Quarterly check-in' },
    { label: 'Ad Hoc Call', value: 'Ad hoc call' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end justify-center" onClick={onClose}>
      <div className="bg-card w-full max-w-[480px] rounded-t-xl p-5 animate-slide-up max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {!selectedId ? (
          <>
            <h2 className="text-lg font-semibold mb-3">Pick a client</h2>
            {active.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedId(h.id)}
                className="w-full text-left px-3 py-2.5 text-sm border-b hover:bg-accent transition-colors"
              >
                {h.identifier}
              </button>
            ))}
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-3">What kind?</h2>
            {types.map(t => (
              <button
                key={t.value}
                onClick={() => { onSelectWorkflow(selectedId, t.value); onClose(); }}
                className="w-full text-left px-3 py-3 text-sm border-b hover:bg-accent transition-colors"
              >
                {t.label}
              </button>
            ))}
            <button onClick={() => setSelectedId(null)} className="w-full text-left px-3 py-2 text-xs text-muted-foreground mt-2">
              ← Pick different client
            </button>
          </>
        )}

        <button onClick={onClose} className="w-full mt-3 py-2 text-sm border rounded-md bg-card">
          Cancel
        </button>
      </div>
    </div>
  );
}
