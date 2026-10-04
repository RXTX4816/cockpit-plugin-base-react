import type { ReactNode } from "react";
import { Page, PageSection } from "@patternfly/react-core";
import { ErrorBoundary } from "./ErrorBoundary";
import { ToastProvider } from "./ToastProvider";
import { i18n } from "../i18n";

const DEFAULT_FALLBACK_TITLE = "Error loading plugin";

interface PluginPageProps {
  children: ReactNode;
  /**
   * Rendered as a Page sibling after PageSection (not inside it), so content
   * relying on being a direct Page child — e.g. a sticky footer — keeps working.
   */
  footer?: ReactNode;
  /** Title shown in the ErrorBoundary fallback. Defaults to "Error loading plugin". */
  fallbackTitle?: string;
  /** Additional className applied to the outer Page element. */
  className?: string;
}

/**
 * Root layout wrapper for a Cockpit plugin page.
 *
 * Composes ErrorBoundary + ToastProvider + PatternFly Page/PageSection so that
 * every plugin starts with the same accessible shell without copy-pasting boilerplate.
 *
 * @example
 * ```tsx
 * export function App() {
 *   return (
 *     <PluginPage fallbackTitle="Error loading My Plugin">
 *       <MyContent />
 *     </PluginPage>
 *   );
 * }
 * ```
 */
export function PluginPage({ children, footer, fallbackTitle, className }: PluginPageProps) {
  return (
    <ErrorBoundary fallbackTitle={fallbackTitle ?? (i18n.isInitialized ? i18n.t("pluginPage.errorTitle", DEFAULT_FALLBACK_TITLE) : DEFAULT_FALLBACK_TITLE)}>
      <ToastProvider>
        <Page className={`pf-m-no-sidebar${className ? ` ${className}` : ""}`}>
          <PageSection hasBodyWrapper={false} isFilled>
            {children}
          </PageSection>
          {footer}
        </Page>
      </ToastProvider>
    </ErrorBoundary>
  );
}
