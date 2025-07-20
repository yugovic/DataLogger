import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              エラーが発生しました
            </h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-700 mb-4">
                アプリケーションでエラーが発生しました。
              </p>
              <details className="mb-4">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  エラー詳細を表示
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded overflow-x-auto text-sm">
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.error?.stack}
                </pre>
              </details>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                ページを再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}