import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-white">
        <div className="max-w-sm w-full bg-white/10 rounded-brand-lg p-6 backdrop-blur-sm text-center">
          <div className="inline-flex w-14 h-14 rounded-full bg-brand-red items-center justify-center mb-4">
            <span className="material-symbols-outlined !text-3xl" aria-hidden="true">error</span>
          </div>
          <h1 className="font-display font-black text-lg mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-xs text-white/70 mb-4">
            แอปหยุดทำงานชั่วคราว ข้อมูลของคุณยังปลอดภัย ลองกด Refresh เพื่อเริ่มใหม่
          </p>
          <pre className="text-[10px] font-mono text-white/50 bg-black/30 rounded p-2 mb-4 overflow-x-auto text-left">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 min-h-[48px] bg-brand-gold text-brand-navy font-bold rounded-brand"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
}
