import React from 'react';

export const TestComponent: React.FC = () => {
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold">テストコンポーネント</h1>
      <p>このコンポーネントが表示されれば、基本的なレンダリングは機能しています。</p>
    </div>
  );
};