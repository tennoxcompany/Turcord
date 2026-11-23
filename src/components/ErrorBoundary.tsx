import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Beklenmeyen bir hata oluştu.' };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          friendly = `Veritabanı erişim hatası (${parsed.operationType || 'işlem'}): ${parsed.error}`;
        }
      } catch {
        // Not JSON
      }

      return (
        <div className="min-h-screen bg-[#111214] text-[#F2F3F5] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#1E1F22] border border-[#2B2D31] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold font-display text-white">Bir sorun oluştu</h2>
            </div>
            <p className="text-sm text-[#B5BAC1] leading-relaxed break-words">{friendly}</p>
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
