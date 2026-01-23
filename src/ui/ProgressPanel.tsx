/**
 * Progress panel showing generation status
 */

import React from "react";
import type { GenerationProgress, OperationResult } from "../types";
import { colors, spacing, radius } from "./styles";

interface ProgressPanelProps {
  progress: GenerationProgress;
  onCancel?: () => void;
}

const getStatusIcon = (result: OperationResult): React.ReactNode => {
  if (!result.success) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.error}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }

  switch (result.type) {
    case "create_page":
    case "create_cms_item":
    case "create_collection":
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.success}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case "update_page":
    case "update_cms_item":
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.primary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case "skip_page":
    case "skip_cms_item":
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textTertiary}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      );
    default:
      return null;
  }
};

const getStatusLabel = (result: OperationResult): string => {
  switch (result.type) {
    case "create_page":
      return "Created";
    case "update_page":
      return "Updated";
    case "skip_page":
      return "Skipped";
    case "create_cms_item":
      return "Created";
    case "update_cms_item":
      return "Updated";
    case "skip_cms_item":
      return "Skipped";
    case "create_collection":
      return "Collection";
    default:
      return result.type;
  }
};

const getBadgeStyle = (result: OperationResult): React.CSSProperties => {
  const base: React.CSSProperties = {
    padding: "2px 8px",
    borderRadius: radius.sm,
    fontSize: 10,
    fontWeight: 600,
    minWidth: 56,
    textAlign: "center",
  };

  if (!result.success) {
    return { ...base, backgroundColor: `${colors.error}20`, color: colors.error };
  }

  if (result.type.includes("create")) {
    return { ...base, backgroundColor: `${colors.success}20`, color: colors.success };
  }

  if (result.type.includes("update")) {
    return { ...base, backgroundColor: colors.primaryDimmed, color: colors.primary };
  }

  return { ...base, backgroundColor: colors.backgroundTertiary, color: colors.textSecondary };
};

export const ProgressPanel: React.FC<ProgressPanelProps> = ({ progress, onCancel }) => {
  const { total, completed, currentOperation, results } = progress;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = completed >= total;

  return (
    <div>
      {/* Progress bar */}
      <div style={{ marginBottom: spacing.lg }}>
        <div
          style={{
            height: 4,
            backgroundColor: colors.backgroundTertiary,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: isComplete ? colors.success : colors.primary,
              transition: "width 0.3s ease",
              borderRadius: 2,
              width: `${percentage}%`,
            }}
          />
        </div>
        <div
          style={{
            marginTop: spacing.sm,
            fontSize: 12,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {isComplete ? (
            <span style={{ color: colors.success, fontWeight: 500 }}>Complete!</span>
          ) : (
            <>
              <span style={{ fontWeight: 500 }}>{completed}</span> / {total} — {currentOperation}
            </>
          )}
        </div>
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <div
          style={{
            border: `1px solid ${colors.divider}`,
            borderRadius: radius.md,
            maxHeight: 250,
            overflow: "auto",
          }}
        >
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                padding: `${spacing.sm}px ${spacing.md}px`,
                borderBottom: index < results.length - 1 ? `1px solid ${colors.divider}` : undefined,
                display: "flex",
                alignItems: "center",
                gap: spacing.sm,
                fontSize: 12,
                backgroundColor: result.success ? "transparent" : `${colors.error}08`,
              }}
            >
              {getStatusIcon(result)}
              <span style={getBadgeStyle(result)}>{getStatusLabel(result)}</span>
              <span
                style={{
                  flex: 1,
                  color: colors.text,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {result.nodeName}
              </span>
              <span
                style={{
                  color: colors.textTertiary,
                  fontSize: 11,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 140,
                }}
              >
                {result.nodePath}
              </span>
              {result.error && (
                <span
                  style={{
                    color: colors.error,
                    fontSize: 11,
                    maxWidth: 180,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={result.error}
                >
                  {result.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel button */}
      {!isComplete && onCancel && (
        <div style={{ marginTop: spacing.lg, textAlign: "center" }}>
          <button
            style={{
              padding: `${spacing.sm}px ${spacing.lg}px`,
              borderRadius: radius.md,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: colors.backgroundTertiary,
              color: colors.text,
              transition: "all 0.15s ease",
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
