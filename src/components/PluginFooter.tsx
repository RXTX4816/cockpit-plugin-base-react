import { type ReactNode } from "react";
import { PageSection, Label } from "@patternfly/react-core";

interface FooterLink {
  label: string;
  href: string;
}

interface Props {
  /** Plugin version string (e.g. from package.json). */
  version?: string;
  /** Links rendered in the bottom row. */
  links?: FooterLink[];
  /** Extra labels or badges rendered next to the version in the top row. */
  children?: ReactNode;
  className?: string;
}

export function PluginFooter({ version, links, children, className }: Props) {
  return (
    <PageSection
      className={className}
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 1,
        borderTop: "1px solid var(--pf-t--global--border--color--default)",
        padding: "0.5rem 1.5rem",
        fontSize: 13,
        textAlign: "center",
        backgroundColor: "var(--pf-t--global--background--color--primary--default)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {(version !== undefined || children) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", alignItems: "center" }}>
            {version !== undefined && (
              <Label isCompact color="grey">v{version}</Label>
            )}
            {children}
          </div>
        )}
        {links && links.length > 0 && (
          <div style={{ display: "flex", flexDirection: "row", gap: 16, justifyContent: "center" }}>
            {links.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--pf-t--global--color--brand--default, #06c)", textDecoration: "none" }}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
    </PageSection>
  );
}
