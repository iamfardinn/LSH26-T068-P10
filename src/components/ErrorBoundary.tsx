import { Component, type ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';

interface State {
  error: Error | null;
}

/**
 * The pre-migration vanilla-JS build wrapped its entire render pass in
 * one try/catch so a bug showed a single visible error banner instead
 * of silently corrupting a number or leaving a blank page. This is the
 * React equivalent of that same safety net.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('Meter Sense crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
            <AlertOctagon size={20} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Something went wrong building the page.</div>
              <p className="mt-1 text-sm">
                {this.state.error.message} — open the browser console for the full stack trace.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
