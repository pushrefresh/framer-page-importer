/**
 * Validation panel component showing errors and warnings
 */

import React, { useState } from "react";
import type { ValidationResult, ValidationError } from "../types";
import { colors } from "./styles";

interface ValidationPanelProps {
  validation: ValidationResult;
  onJumpToNode?: (nodeId: string) => void;
}

const ValidationItem: React.FC<{
  item: ValidationError;
  isError: boolean;
  onJumpToNode?: (nodeId: string) => void;
}> = ({ item, isError, onJumpToNode }) => {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        fontSize: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: isError ? "rgba(255, 59, 48, 0.05)" : "rgba(255, 159, 10, 0.05)",
      }}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isError ? colors.error : colors.warning}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 2 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ color: "rgba(255,255,255,0.9)", marginBottom: 2 }}>{item.message}</div>
        {item.nodePath && (
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{item.nodePath}</span>
            {item.nodeId && onJumpToNode && (
              <button
                style={{
                  background: "none",
                  border: "none",
                  color: "#0099FF",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 11,
                  fontWeight: 500,
                }}
                onClick={() => onJumpToNode(item.nodeId!)}
              >
                Jump
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ validation, onJumpToNode }) => {
  const [showWarnings, setShowWarnings] = useState(true);
  const { errors, warnings } = validation;

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return (
      <div
        style={{
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            padding: "8px 10px",
            backgroundColor: "rgba(52, 199, 89, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
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
          <span style={{ color: colors.success, fontWeight: 500 }}>All validations passed</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Errors section */}
      {hasErrors && (
        <>
          <div
            style={{
              padding: "8px 10px",
              backgroundColor: "rgba(255, 59, 48, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: colors.error,
              fontWeight: 500,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errors.length} error{errors.length !== 1 ? "s" : ""} — fix before generating
          </div>
          <div style={{ maxHeight: 100, overflow: "auto" }}>
            {errors.map((error, index) => (
              <ValidationItem
                key={`error-${index}`}
                item={error}
                isError={true}
                onJumpToNode={onJumpToNode}
              />
            ))}
          </div>
        </>
      )}

      {/* Warnings section */}
      {hasWarnings && (
        <>
          <div
            style={{
              padding: "8px 10px",
              backgroundColor: "rgba(255, 159, 10, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: colors.warning,
              fontWeight: 500,
              cursor: "pointer",
            }}
            onClick={() => setShowWarnings(!showWarnings)}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ flex: 1 }}>
              {warnings.length} warning{warnings.length !== 1 ? "s" : ""}
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: showWarnings ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.12s ease",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {showWarnings && (
            <div style={{ maxHeight: 100, overflow: "auto" }}>
              {warnings.map((warning, index) => (
                <ValidationItem
                  key={`warning-${index}`}
                  item={warning}
                  isError={false}
                  onJumpToNode={onJumpToNode}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
