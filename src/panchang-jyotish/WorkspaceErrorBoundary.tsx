import { Component, type ErrorInfo, type ReactNode } from "react";
import { l } from "../useUiLanguage";

type Props = { children: ReactNode; language: "ne" | "en"; resetKey: string };
type State = { failed: boolean };
/** Catch failed dynamic imports and synchronous workspace render errors independently of the directory. */
export class WorkspaceErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    // Do not log saved birth-chart inputs or chart content.
    if (import.meta.env.DEV) console.error("Panchang workspace render failed", error.name, info.componentStack);
  }
  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="ap-pj-loading" role="alert">
      <p>{l(this.props.language, "यो गणक लोड हुन सकेन। अन्य सुविधा अझै उपलब्ध छन्।", "This calculator could not load. Other features remain available.")}</p>
      <button type="button" className="ap-pjw-secondary" onClick={() => this.setState({ failed: false })}>{l(this.props.language, "फेरि प्रयास", "Try again")}</button>
    </div>;
  }
}
