import { useState } from 'react';
import { DataProvider } from '@/context/DataContext';
import TabLayout from '@/components/TabLayout';
import ClientsTab from '@/components/ClientsTab';
import ReviewsTab from '@/components/ReviewsTab';
import TouchesTab from '@/components/TouchesTab';
import ClientDetail from '@/components/ClientDetail';
import ARWorkflow from '@/components/ARWorkflow';
import TouchWorkflow from '@/components/TouchWorkflow';
import AdHocWorkflow from '@/components/AdHocWorkflow';
import CalendarTab from '@/components/CalendarTab';
import AddClientModal from '@/components/AddClientModal';
import QuickLogModal from '@/components/QuickLogModal';
import UndoToast from '@/components/UndoToast';
import type { InteractionType } from '@/types';

type Screen =
  | { type: 'tabs' }
  | { type: 'detail'; id: string }
  | { type: 'ar-workflow'; id: string }
  | { type: 'touch-workflow'; id: string }
  | { type: 'adhoc-workflow'; id: string };

function AppContent() {
  const [screen, setScreen] = useState<Screen>({ type: 'tabs' });
  const [showAddClient, setShowAddClient] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [showQuickLog, setShowQuickLog] = useState(false);

  const goToDetail = (id: string) => setScreen({ type: 'detail', id });
  const goToTabs = () => setScreen({ type: 'tabs' });

  const handleQuickLogSelect = (householdId: string, type: InteractionType) => {
    switch (type) {
      case 'Annual review meeting':
        setScreen({ type: 'ar-workflow', id: householdId });
        break;
      case 'Quarterly check-in':
        setScreen({ type: 'touch-workflow', id: householdId });
        break;
      case 'Ad hoc call':
        setScreen({ type: 'adhoc-workflow', id: householdId });
        break;
    }
  };

  return (
    <>
      {screen.type === 'tabs' && (
        <TabLayout
          onAddClient={() => setShowAddClient(true)}
          onQuickLog={() => setShowQuickLog(true)}
        >
          {(activeTab) => (
            <>
              {activeTab === 'clients' && <ClientsTab onSelectClient={goToDetail} />}
              {activeTab === 'reviews' && (
                <ReviewsTab
                  onSelectClient={(id) => setScreen({ type: 'ar-workflow', id })}
                />
              )}
              {activeTab === 'touches' && (
                <TouchesTab
                  onSelectClient={(id) => setScreen({ type: 'touch-workflow', id })}
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarTab onSelectClient={goToDetail} onEditClient={(id) => setEditClientId(id)} />
              )}
            </>
          )}
        </TabLayout>
      )}

      {screen.type === 'detail' && (
        <div className="mobile-container bg-background">
          <ClientDetail
            householdId={screen.id}
            onBack={goToTabs}
            onEdit={() => setEditClientId(screen.id)}
            onARWorkflow={() => setScreen({ type: 'ar-workflow', id: screen.id })}
            onTouchWorkflow={() => setScreen({ type: 'touch-workflow', id: screen.id })}
          />
        </div>
      )}

      {screen.type === 'ar-workflow' && (
        <div className="mobile-container bg-background">
          <ARWorkflow
            householdId={screen.id}
            onBack={() => setScreen({ type: 'detail', id: screen.id })}
          />
        </div>
      )}

      {screen.type === 'touch-workflow' && (
        <div className="mobile-container bg-background">
          <TouchWorkflow
            householdId={screen.id}
            onBack={() => setScreen({ type: 'detail', id: screen.id })}
          />
        </div>
      )}

      {screen.type === 'adhoc-workflow' && (
        <div className="mobile-container bg-background">
          <AdHocWorkflow
            householdId={screen.id}
            onBack={() => setScreen({ type: 'detail', id: screen.id })}
          />
        </div>
      )}

      {showAddClient && (
        <AddClientModal onClose={() => setShowAddClient(false)} />
      )}

      {editClientId && (
        <AddClientModal
          editId={editClientId}
          onClose={() => setEditClientId(null)}
          onDeleted={() => {
            setEditClientId(null);
            setScreen({ type: 'tabs' });
          }}
        />
      )}

      {showQuickLog && (
        <QuickLogModal
          onClose={() => setShowQuickLog(false)}
          onSelectWorkflow={handleQuickLogSelect}
        />
      )}

      <UndoToast />
    </>
  );
}

export default function Index() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
