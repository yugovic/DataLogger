// モダンなタブコンポーネント
import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

interface ModernTabsProps {
  tabs: Tab[];
  defaultActiveKey?: string;
}

export const ModernTabs: React.FC<ModernTabsProps> = ({ 
  tabs, 
  defaultActiveKey 
}) => {
  const [activeKey, setActiveKey] = useState(defaultActiveKey || tabs[0]?.id);
  const activeTab = tabs.find(tab => tab.id === activeKey);

  return (
    <div className="h-full flex flex-col">
      {/* タブヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveKey(tab.id)}
                className={`
                  group relative py-4 px-1 flex items-center space-x-2
                  text-sm font-medium transition-all duration-200
                  border-b-2 -mb-px
                  ${activeKey === tab.id
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon && (
                  <span className={`
                    ${activeKey === tab.id ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-500'}
                  `}>
                    {tab.icon}
                  </span>
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 bg-white overflow-auto">
        {activeTab && (
          <div className="animate-fade-in">
            {activeTab.content}
          </div>
        )}
      </div>
    </div>
  );
};