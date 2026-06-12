import React from 'react';

export const SimpleModernCarSetup: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold">
            <span className="text-blue-600">VELOCITY</span>
            <span className="text-gray-900 ml-1">LOGGER</span>
          </h1>
        </div>
      </header>
      
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">車両セットアップ記録システム</h2>
            <p className="text-gray-600">モダンUIのテスト実装です。</p>
          </div>
        </div>
      </main>
    </div>
  );
};