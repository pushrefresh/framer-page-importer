/**
 * Log panel component showing operation logs
 */

import React, { useRef, useEffect } from "react";
import type { LogEntry } from "../types";
import { colors, spacing, radius } from "./styles";

interface LogPanelProps {
  logs: LogEntry[];
  maxHeight?: number;
}

const getLogColor = (level: LogEntry["level"]): string => {
  switch (level) {
    case "error":
      return colors.error;
    case "warn":
      return colors.warning;
    case "success":
      return colors.success;
    case "info":
    default:
      return colors.textSecondary;
  }
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const LogPanel: React.FC<LogPanelProps> = ({ logs, maxHeight = 200 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div
        style={{
          borderRadius: radius.md,
          backgroundColor: colors.backgroundSecondary,
          maxHeight,
          overflow: "auto",
          fontFamily: "var(--framer-font-mono, monospace)",
          fontSize: 11,
          border: `1px solid ${colors.divider}`,
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: spacing.xxl,
            color: colors.textSecondary,
          }}
        >
          No logs yet
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        borderRadius: radius.md,
        backgroundColor: colors.backgroundSecondary,
        maxHeight,
        overflow: "auto",
        fontFamily: "var(--framer-font-mono, monospace)",
        fontSize: 11,
        border: `1px solid ${colors.divider}`,
      }}
    >
      {logs.map((log, index) => (
        <div
          key={index}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            borderBottom: index < logs.length - 1 ? `1px solid ${colors.divider}` : undefined,
            display: "flex",
            gap: spacing.sm,
          }}
        >
          <span style={{ color: colors.textTertiary, flexShrink: 0 }}>
            {formatTime(log.timestamp)}
          </span>
          <span
            style={{
              flex: 1,
              wordBreak: "break-word",
              color: getLogColor(log.level),
            }}
          >
            {log.message}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Hook for managing log entries
 */
export function useLogs() {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);

  const addLog = React.useCallback((level: LogEntry["level"], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date(),
        level,
        message,
      },
    ]);
  }, []);

  const info = React.useCallback((message: string) => addLog("info", message), [addLog]);
  const warn = React.useCallback((message: string) => addLog("warn", message), [addLog]);
  const error = React.useCallback((message: string) => addLog("error", message), [addLog]);
  const success = React.useCallback((message: string) => addLog("success", message), [addLog]);

  const clear = React.useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    info,
    warn,
    error,
    success,
    clear,
  };
}
