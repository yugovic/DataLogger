import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error('UI ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center text-center p-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">エラーが発生しました</h2>
            <p className="text-gray-600 mb-4">ページを再読み込みするか、しばらくしてから再度お試しください。</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => window.location.reload()}>再読み込み</button>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}

export default ErrorBoundary;

