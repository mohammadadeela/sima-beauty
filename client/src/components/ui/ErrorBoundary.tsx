import { Component, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";

/** A calm full-page message with one way forward. Used when something breaks. */
export function Problem({ title, text, action = "Try again", onAction }: { title: string; text: string; action?: string; onAction: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <Logo className="text-[3rem]" />
      <h1 className="mt-8 text-3xl font-semibold sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-sm text-[15.5px] text-ink-soft">{text}</p>
      <button onClick={onAction} className="btn-pink mt-7">{action}</button>
    </div>
  );
}

/**
 * Catches any unexpected error in the page so a shopper never sees a blank
 * white screen or a technical message.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[page error]", error);
  }
  componentDidUpdate(prev: { resetKey?: string }) {
    // Moving to another page clears the error.
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <Problem title="Something went wrong" text="This page hit a problem. Your bag is safe. Reload to carry on." action="Reload the page" onAction={() => window.location.reload()} />;
  }
}
