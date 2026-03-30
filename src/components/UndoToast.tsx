import { useData } from '@/context/DataContext';

export default function UndoToast() {
  const { undoAvailable, undo, dismissUndo } = useData();

  if (!undoAvailable || !undo) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 max-w-[440px] w-[calc(100%-2rem)] bg-foreground text-background rounded-lg px-4 py-3 flex items-center justify-between shadow-lg animate-slide-up">
      <span className="text-sm">Action saved</span>
      <div className="flex items-center gap-2">
        <button onClick={undo} className="text-sm font-medium underline">Undo</button>
        <button onClick={dismissUndo} className="text-sm opacity-60">✕</button>
      </div>
    </div>
  );
}
