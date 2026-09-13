import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Button,
  Content,
  EmptyState,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  SearchInput,
} from "@patternfly/react-core";
import { useTranslation } from "react-i18next";

/** One bundled package, as emitted by `writeThirdPartyNotices({ includeText: true })`. */
export interface NoticePackage {
  name: string;
  version: string;
  license: string;
  publisher?: string;
  url?: string;
  /** Full license text. Absent when the JSON was generated without `includeText`. */
  licenseText?: string;
}

/** The `third-party-notices.json` sidecar, imported into the plugin's bundle. */
export interface NoticesData {
  generatedAt?: string;
  packageCount?: number;
  licenses?: string[];
  packages: NoticePackage[];
}

interface Props {
  /** Controls modal visibility. */
  isOpen: boolean;
  /** Called when the user closes the modal. */
  onClose: () => void;
  /** Parsed `third-party-notices.json`, generated at build time. */
  notices: NoticesData;
  /** Name of the plugin itself, for the intro line. */
  productName?: string;
  /** SPDX id of the plugin's own license, for the intro line. */
  licenseName?: string;
  /** Where the plugin's own source lives — the AGPL §13 offer, if applicable. */
  sourceUrl?: string;
}

/**
 * Lists every third-party package bundled into the plugin's JavaScript, with its
 * license text in full.
 *
 * Cockpit serves the bundle to the browser, so the copy of those MIT / BSD / ISC /
 * Apache / OFL packages that actually reaches a user travels over the network — and
 * their licenses require the notices to travel with it. The `.txt` sitting in
 * `/usr/share/doc` on the server only covers the packaged copy, so this modal is what
 * covers the served one.
 *
 * Feed it the JSON produced by `writeThirdPartyNotices({ includeText: true })`.
 */
export function ThirdPartyNoticesModal({
  isOpen,
  onClose,
  notices,
  productName,
  licenseName,
  sourceUrl,
}: Props) {
  const { t, i18n } = useTranslation();
  // Same translate-with-fallback idiom the other base components use, except the
  // fallback has to interpolate too — i18next only does that on the initialised path,
  // and several of these strings carry {{...}} placeholders.
  const tf = (key: string, fallback: string, opts?: Record<string, unknown>) => {
    if (i18n.isInitialized) return t(key, fallback, opts);
    if (!opts) return fallback;
    return fallback.replace(/\{\{(\w+)\}\}/g, (m, name) =>
      name in opts ? String(opts[name]) : m,
    );
  };

  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const packages = useMemo(() => notices?.packages ?? [], [notices]);

  const matches = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return packages;
    return packages.filter(
      p =>
        p.name.toLowerCase().includes(needle) ||
        p.license.toLowerCase().includes(needle) ||
        (p.publisher ?? "").toLowerCase().includes(needle),
    );
  }, [packages, filter]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="large"
      aria-label={tf("notices.aria_label", "Open source licenses")}
    >
      <ModalHeader title={tf("notices.title", "Open source licenses")} />
      <ModalBody>
        {productName && licenseName && (
          <Content component="p">
            {tf("notices.intro", "{{product}} is licensed under {{license}}.", {
              product: productName,
              license: licenseName,
            })}
          </Content>
        )}
        {sourceUrl && (
          <Content component="p">
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              {tf("notices.source_link", "Get the source code")}
            </a>
          </Content>
        )}
        <Content component="p">
          {tf(
            "notices.summary",
            "It bundles the following {{count}} open source packages. Each package's own license and copyright notice is reproduced in full below.",
            { count: packages.length },
          )}
        </Content>
        {notices?.licenses?.length ? (
          <LabelGroup categoryName={tf("notices.licenses_used", "Licenses")} numLabels={12}>
            {notices.licenses.map(id => (
              <Label key={id} isCompact color="blue">{id}</Label>
            ))}
          </LabelGroup>
        ) : null}

        <div style={{ margin: "var(--pf-t--global--spacer--md) 0" }}>
          <SearchInput
            value={filter}
            onChange={(_e, v) => setFilter(v)}
            onClear={() => setFilter("")}
            placeholder={tf("notices.filter_placeholder", "Filter by name, license or publisher")}
            aria-label={tf("notices.filter_placeholder", "Filter by name, license or publisher")}
          />
        </div>

        {matches.length === 0 ? (
          <EmptyState
            titleText={tf("notices.no_matches", "No packages match this filter")}
            headingLevel="h3"
          />
        ) : (
          <Accordion asDefinitionList={false}>
            {matches.map(pkg => {
              const key = `${pkg.name}@${pkg.version}`;
              const isExpanded = expanded === key;
              return (
                <AccordionItem key={key} isExpanded={isExpanded}>
                  <AccordionToggle
                    id={`tpn-toggle-${key}`}
                    onClick={() => setExpanded(isExpanded ? null : key)}
                  >
                    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "baseline" }}>
                      <strong>{pkg.name}</strong>
                      <span>{pkg.version}</span>
                      <Label isCompact color="blue">{pkg.license}</Label>
                    </span>
                  </AccordionToggle>
                  {/* AccordionContent keeps its children mounted and merely `hidden`, so
                      render the body only while expanded — otherwise every one of the
                      ~46 full license texts sits in the DOM at once. */}
                  <AccordionContent id={`tpn-content-${key}`} aria-labelledby={`tpn-toggle-${key}`}>
                    {!isExpanded ? null : <>
                    {pkg.publisher && <Content component="p">{pkg.publisher}</Content>}
                    {pkg.url && (
                      <Content component="p">
                        <a href={pkg.url} target="_blank" rel="noopener noreferrer">{pkg.url}</a>
                      </Content>
                    )}
                    {pkg.licenseText ? (
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          maxHeight: "40vh",
                          overflow: "auto",
                          fontSize: "var(--pf-t--global--font--size--body--sm)",
                          background: "var(--pf-t--global--background--color--secondary--default)",
                          padding: "var(--pf-t--global--spacer--sm)",
                        }}
                      >
                        {pkg.licenseText}
                      </pre>
                    ) : (
                      <Content component="p">
                        {tf(
                          "notices.no_text",
                          "No license text shipped with this package — see the package homepage above.",
                        )}
                      </Content>
                    )}
                    </>}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          {tf("common.close", "Close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
