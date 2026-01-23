/**
 * Results summary component showing final generation stats
 */

import React from "react";
import type { GenerationSummary } from "../types";
import { colors, spacing, radius } from "./styles";

interface ResultsSummaryProps {
  summary: GenerationSummary;
  onReset: () => void;
  onViewLogs: () => void;
}

const StatCard: React.FC<{
  label: string;
  value: number;
  color?: string;
}> = ({ label, value, color = colors.text }) => (
  <div
    style={{
      padding: spacing.lg,
      borderRadius: radius.md,
      backgroundColor: colors.backgroundSecondary,
      textAlign: "center",
      border: `1px solid ${colors.divider}`,
    }}
  >
    <div
      style={{
        fontSize: 28,
        fontWeight: 600,
        marginBottom: spacing.xs,
        letterSpacing: "-0.02em",
        color,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 11,
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </div>
  </div>
);

const Button: React.FC<{
  onClick: () => void;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}> = ({ onClick, variant = "secondary", children }) => (
  <button
    onClick={onClick}
    style={{
      padding: `${spacing.sm}px ${spacing.lg}px`,
      borderRadius: radius.md,
      border: "none",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
      transition: "all 0.15s ease",
      backgroundColor: variant === "primary" ? colors.primary : colors.backgroundTertiary,
      color: variant === "primary" ? colors.textReversed : colors.text,
    }}
  >
    {children}
  </button>
);

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({
  summary,
  onReset,
  onViewLogs,
}) => {
  const {
    pagesCreated,
    pagesUpdated,
    pagesSkipped,
    cmsItemsCreated,
    cmsItemsUpdated,
    cmsItemsSkipped,
    collectionCreated,
    errors,
    duration,
  } = summary;

  const totalPages = pagesCreated + pagesUpdated + pagesSkipped;
  const totalCmsItems = cmsItemsCreated + cmsItemsUpdated + cmsItemsSkipped;
  const hasPages = totalPages > 0;
  const hasCms = totalCmsItems > 0 || collectionCreated;
  const hasErrors = errors.length > 0;

  const durationSeconds = (duration / 1000).toFixed(1);

  return (
    <div>
      {/* Success/error header */}
      <div
        style={{
          padding: spacing.xl,
          backgroundColor: hasErrors ? `${colors.warning}15` : `${colors.success}15`,
          borderRadius: radius.lg,
          textAlign: "center",
          marginBottom: spacing.xl,
        }}
      >
        {hasErrors ? (
          <>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.warning}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: spacing.sm }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 600, color: colors.warning }}>
              Completed with {errors.length} error{errors.length !== 1 ? "s" : ""}
            </div>
          </>
        ) : (
          <>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.success}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: spacing.sm }}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 600, color: colors.success }}>
              Generation Complete
            </div>
          </>
        )}
        <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs }}>
          Completed in {durationSeconds}s
        </div>
      </div>

      {/* Static pages stats */}
      {hasPages && (
        <div style={{ marginBottom: spacing.xl }}>
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
            Static Pages
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.md }}>
            <StatCard label="Created" value={pagesCreated} color={colors.success} />
            <StatCard label="Updated" value={pagesUpdated} color={colors.primary} />
            <StatCard label="Skipped" value={pagesSkipped} color={colors.textTertiary} />
          </div>
        </div>
      )}

      {/* CMS stats */}
      {hasCms && (
        <div style={{ marginBottom: spacing.xl }}>
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
            CMS Items
          </div>
          {collectionCreated && (
            <div
              style={{
                marginBottom: spacing.md,
                padding: spacing.sm,
                backgroundColor: `${colors.success}15`,
                borderRadius: radius.md,
                fontSize: 12,
                color: colors.success,
                display: "flex",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Collection created
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.md }}>
            <StatCard label="Created" value={cmsItemsCreated} color={colors.success} />
            <StatCard label="Updated" value={cmsItemsUpdated} color={colors.primary} />
            <StatCard label="Skipped" value={cmsItemsSkipped} color={colors.textTertiary} />
          </div>
        </div>
      )}

      {/* Errors list */}
      {hasErrors && (
        <div style={{ marginBottom: spacing.xl }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: colors.error,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: spacing.md,
            }}
          >
            Errors
          </div>
          <div
            style={{
              border: `1px solid ${colors.error}33`,
              borderRadius: radius.md,
              maxHeight: 150,
              overflow: "auto",
            }}
          >
            {errors.map((error, index) => (
              <div
                key={index}
                style={{
                  padding: spacing.md,
                  borderBottom: index < errors.length - 1 ? `1px solid ${colors.divider}` : undefined,
                  fontSize: 12,
                  backgroundColor: `${colors.error}08`,
                }}
              >
                <div style={{ color: colors.text, marginBottom: 2, fontWeight: 500 }}>
                  {error.nodeName}
                  <span style={{ color: colors.textTertiary, marginLeft: 8, fontWeight: 400 }}>
                    {error.nodePath}
                  </span>
                </div>
                <div style={{ color: colors.error }}>{error.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: spacing.sm,
          justifyContent: "center",
        }}
      >
        <Button onClick={onViewLogs}>View Logs</Button>
        <Button onClick={onReset} variant="primary">
          Import Another File
        </Button>
      </div>
    </div>
  );
};
