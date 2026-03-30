import { useState } from 'react';
import { ClipboardList, Phone, Users, Calendar, Plus } from 'lucide-react';

interface TabLayoutProps {
  children: (activeTab: string) => React.ReactNode;
  onAddClient?: () => void;
  onQuickLog?: () => void;
}

const tabs = [
  { id: 'reviews', label: 'Reviews', icon: ClipboardList },
  { id: 'touches', label: 'Touches', icon: Phone },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

export default function TabLayout({ children, onAddClient, onQuickLog }: TabLayoutProps) {
  const [activeTab, setActiveTab] = useState('clients');

  return (
    <div className="mobile-container relative bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Radius</h1>
        <div className="flex items-center gap-2">
          {activeTab === 'clients' && onAddClient && (
            <button
              onClick={onAddClient}
              className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
            >
              <Plus size={14} />
              Client
            </button>
          )}
          {onQuickLog && (
            <button
              onClick={onQuickLog}
              className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md border bg-card"
            >
              <Plus size={14} />
              Log
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {children(activeTab)}
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <div className="tab-bar-inner">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
