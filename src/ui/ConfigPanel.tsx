/**
 * Configuration panel for generation options
 */

import React, { useState, useEffect } from "react";
import type { GenerationConfig } from "../types";
import type { ClassificationSummary } from "../parsers";
import { getTemplateCandidates } from "../framer/pages";
import { colors, spacing, radius } from "./styles";

interface ConfigPanelProps {
  config: GenerationConfig;
  onChange: (config: GenerationConfig) => void;
  nodeCount: number;
  selectedCount: number;
  importMode: "static" | "cms";
  classificationSummary?: ClassificationSummary;
}

interface FramerPage {
  id: string;
  name: string;
  path: string;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      marginBottom: spacing.md,
    }}
  >
    {children}
  </div>
);

const FormGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginBottom: spacing.lg }}>{children}</div>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label
    style={{
      display: "block",
      marginBottom: spacing.xs,
      fontSize: 12,
      fontWeight: 500,
      color: colors.textSecondary,
    }}
  >
    {children}
  </label>
);

const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: spacing.xs,
      lineHeight: 1.4,
    }}
  >
    {children}
  </div>
);

const InfoBox: React.FC<{ children: React.ReactNode; variant?: "default" | "primary" }> = ({
  children,
  variant = "default",
}) => (
  <div
    style={{
      padding: spacing.md,
      backgroundColor: variant === "primary" ? `${colors.primary}11` : colors.backgroundTertiary,
      borderRadius: radius.md,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 1.5,
    }}
  >
    {children}
  </div>
);

const Select: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ value, onChange, disabled, children }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    style={{
      width: "100%",
      padding: `${spacing.sm}px ${spacing.md}px`,
      borderRadius: radius.md,
      border: `1px solid ${colors.divider}`,
      backgroundColor: colors.backgroundTertiary,
      color: colors.text,
      fontSize: 13,
      outline: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "border-color 0.15s ease",
      opacity: disabled ? 0.6 : 1,
    }}
  >
    {children}
  </select>
);

const Checkbox: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}> = ({ checked, onChange, children }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: spacing.sm,
      cursor: "pointer",
      fontSize: 13,
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{
        width: 14,
        height: 14,
        cursor: "pointer",
        accentColor: colors.primary,
        margin: 0,
      }}
    />
    <span style={{ color: colors.text }}>{children}</span>
  </label>
);

const RadioOption: React.FC<{
  name: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}> = ({ name, checked, onChange, children }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: spacing.sm,
      cursor: "pointer",
      fontSize: 13,
    }}
  >
    <input
      type="radio"
      name={name}
      checked={checked}
      onChange={onChange}
      style={{
        width: 14,
        height: 14,
        cursor: "pointer",
        accentColor: colors.primary,
        margin: 0,
      }}
    />
    <span style={{ color: colors.text }}>{children}</span>
  </label>
);

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onChange,
  nodeCount,
  selectedCount,
  importMode,
  classificationSummary,
}) => {
  const [templatePages, setTemplatePages] = useState<FramerPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const pages = await getTemplateCandidates();
        setTemplatePages(pages);
      } catch (error) {
        console.error("Failed to fetch Framer data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const updateStaticPages = (updates: Partial<typeof config.staticPages>) => {
    onChange({
      ...config,
      staticPages: { ...config.staticPages, ...updates },
    });
  };

  const updateCms = (updates: Partial<typeof config.cms>) => {
    onChange({
      ...config,
      cms: { ...config.cms, ...updates },
    });
  };

  const effectiveCount = selectedCount > 0 ? selectedCount : nodeCount;

  return (
    <div>
      {/* Static Pages Section */}
      {importMode === "static" && (
        <div style={{ marginBottom: spacing.xl }}>
          <SectionTitle>Static Page Options</SectionTitle>

          <FormGroup>
            <Label>Template Page (optional)</Label>
            <Select
              value={config.staticPages.templatePageId || ""}
              onChange={(value) => updateStaticPages({ templatePageId: value || undefined })}
              disabled={loading}
            >
              <option value="">No template - create blank pages</option>
              {templatePages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name} ({page.path})
                </option>
              ))}
            </Select>
            <Hint>Select an existing page to use as a layout template</Hint>
          </FormGroup>

          <FormGroup>
            <Label>If page already exists</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              <RadioOption
                name="existingBehavior"
                checked={config.staticPages.skipExisting && !config.staticPages.updateExisting}
                onChange={() => updateStaticPages({ skipExisting: true, updateExisting: false })}
              >
                Skip (don't modify existing pages)
              </RadioOption>
              <RadioOption
                name="existingBehavior"
                checked={config.staticPages.updateExisting}
                onChange={() => updateStaticPages({ skipExisting: false, updateExisting: true })}
              >
                Update (modify existing page names)
              </RadioOption>
            </div>
          </FormGroup>

          <InfoBox>
            {classificationSummary ? (
              <>
                Will create up to{" "}
                {classificationSummary.staticCount + classificationSummary.cmsHubs.length} static
                page
                {classificationSummary.staticCount + classificationSummary.cmsHubs.length !== 1
                  ? "s"
                  : ""}
                {classificationSummary.cmsHubs.length > 0 && (
                  <>
                    {" "}
                    (includes {classificationSummary.cmsHubs.length} CMS index page
                    {classificationSummary.cmsHubs.length !== 1 ? "s" : ""})
                  </>
                )}
                {selectedCount > 0 ? " - selected nodes only" : ""}
              </>
            ) : (
              <>
                Will create up to {effectiveCount} static page
                {effectiveCount !== 1 ? "s" : ""}
                {selectedCount > 0 ? " (selected nodes only)" : " (all nodes)"}
              </>
            )}
          </InfoBox>
        </div>
      )}

      {/* CMS Section */}
      {importMode === "cms" && (
        <div style={{ marginBottom: spacing.xl }}>
          <SectionTitle>CMS Collection Options</SectionTitle>

          {/* Detected CMS structure */}
          {classificationSummary && classificationSummary.cmsHubs.length > 0 && (
            <div
              style={{
                padding: spacing.md,
                backgroundColor: colors.primaryDimmed,
                borderRadius: radius.md,
                marginBottom: spacing.lg,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: spacing.xs,
                  color: colors.text,
                  fontSize: 12,
                }}
              >
                Detected CMS Structure
              </div>
              <div style={{ color: colors.textSecondary, fontSize: 12 }}>
                {classificationSummary.cmsHubs.length} collection
                {classificationSummary.cmsHubs.length !== 1 ? "s" : ""} with{" "}
                {classificationSummary.totalCmsItems} item
                {classificationSummary.totalCmsItems !== 1 ? "s" : ""}:
              </div>
              <ul
                style={{
                  margin: `${spacing.xs}px 0 0 ${spacing.md}px`,
                  padding: 0,
                  color: colors.textSecondary,
                  fontSize: 12,
                }}
              >
                {classificationSummary.cmsHubs.map((hub, i) => (
                  <li key={i} style={{ marginBottom: 2 }}>
                    <strong style={{ color: colors.text }}>{hub.collectionName}</strong> (
                    {hub.itemCount} item{hub.itemCount !== 1 ? "s" : ""})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Collection selector */}
          {classificationSummary && classificationSummary.cmsHubs.length > 0 && (
            <FormGroup>
              <Label>Import from detected collection</Label>
              <Select
                value={config.cms.selectedCollectionName || ""}
                onChange={(value) => {
                  const selectedName = value || undefined;
                  updateCms({
                    selectedCollectionName: selectedName,
                    collectionName: selectedName || config.cms.collectionName,
                  });
                }}
              >
                <option value="">All detected items</option>
                {classificationSummary.cmsHubs.map((hub) => (
                  <option key={hub.path} value={hub.collectionName}>
                    {hub.collectionName} ({hub.itemCount} items)
                  </option>
                ))}
              </Select>
              <Hint>Select a specific collection to import, or import all CMS items</Hint>
            </FormGroup>
          )}

          {/* Info about current collection */}
          <InfoBox variant="primary">
            Items will be added to the current CMS collection
          </InfoBox>

          {/* Optional fields */}
          <FormGroup>
            <Label>Include optional fields</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: spacing.sm }}>
              <Checkbox
                checked={config.cms.includeSeoTitle}
                onChange={(checked) => updateCms({ includeSeoTitle: checked })}
              >
                SEO Title (if available in source)
              </Checkbox>
              <Checkbox
                checked={config.cms.includeDescription}
                onChange={(checked) => updateCms({ includeDescription: checked })}
              >
                Description (if available in source)
              </Checkbox>
              <Checkbox
                checked={config.cms.includeOrder}
                onChange={(checked) => updateCms({ includeOrder: checked })}
              >
                Order (numeric sort order)
              </Checkbox>
            </div>
          </FormGroup>

          {/* CMS template page */}
          <FormGroup>
            <Label>CMS Detail Template (optional)</Label>
            <Select
              value={config.cms.templatePageId || ""}
              onChange={(value) => updateCms({ templatePageId: value || undefined })}
              disabled={loading}
            >
              <option value="">No template - manually create later</option>
              {templatePages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name} ({page.path})
                </option>
              ))}
            </Select>
            <Hint>Note: CMS page binding may require manual setup in Framer</Hint>
          </FormGroup>

          {/* Update existing */}
          <Checkbox
            checked={config.cms.updateExisting}
            onChange={(checked) => updateCms({ updateExisting: checked })}
          >
            Update existing items (match by path)
          </Checkbox>

          <div style={{ marginTop: spacing.lg }}>
            <InfoBox>
              {classificationSummary ? (
                config.cms.selectedCollectionName ? (
                  <>
                    Will create items for collection "{config.cms.selectedCollectionName}" (
                    {classificationSummary.cmsHubs.find(
                      (h) => h.collectionName === config.cms.selectedCollectionName
                    )?.itemCount || 0}{" "}
                    items)
                  </>
                ) : (
                  <>
                    Will create up to {classificationSummary.totalCmsItems} CMS item
                    {classificationSummary.totalCmsItems !== 1 ? "s" : ""} across{" "}
                    {classificationSummary.cmsHubs.length} collection
                    {classificationSummary.cmsHubs.length !== 1 ? "s" : ""}
                  </>
                )
              ) : (
                <>
                  Will create up to {effectiveCount} CMS item
                  {effectiveCount !== 1 ? "s" : ""}
                  {selectedCount > 0 ? " (selected nodes only)" : " (all nodes)"}
                </>
              )}
            </InfoBox>
          </div>
        </div>
      )}
    </div>
  );
};
