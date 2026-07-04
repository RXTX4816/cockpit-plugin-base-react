import { Component, type ReactNode } from "react";
import { EmptyState, EmptyStateBody } from "@patternfly/react-core";
import { i18n } from "../i18n";

const DEFAULT_TITLE = "Something went wrong";

interface Props {
  children: ReactNode;
  /** Heading shown in the PatternFly EmptyState fallback. Defaults to `"Something went wrong"`. */
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

/**
 * React error boundary that catches unhandled render errors and displays a
 * PatternFly `EmptyState` fallback instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <EmptyState
          headingLevel="h2"
          titleText={
            this.props.fallbackTitle
            ?? (i18n.isInitialized ? i18n.t("errorBoundary.title", DEFAULT_TITLE) : DEFAULT_TITLE)
          }
        >
          <EmptyStateBody>{this.state.error.message}</EmptyStateBody>
        </EmptyState>
      );
    }
    return this.props.children;
  }
}
